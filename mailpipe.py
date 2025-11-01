#!/usr/bin/env python3
"""
Production-ready mail pipe script for Postfix.
Reads RFC822 email from stdin and forwards to FastAPI backend.
"""

import sys
import os
import tempfile
import logging
import logging.handlers
import requests
from email import message_from_file
from email.utils import parseaddr
from email.header import decode_header
from io import BytesIO
from pathlib import Path
from typing import List, Tuple, Optional
import time
import shutil

# Configuration
BACKEND_URL = os.getenv("MAILPIPE_BACKEND_URL", "http://localhost:8000")
ENDPOINT = f"{BACKEND_URL}/api/inbound/mail"
MAX_EMAIL_SIZE = int(os.getenv("MAX_EMAIL_SIZE_MB", "10")) * 1024 * 1024  # 10MB default
MAX_ATTACHMENT_SIZE = int(os.getenv("MAX_ATTACHMENT_SIZE_MB", "5")) * 1024 * 1024  # 5MB default
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds
TEMP_DIR = os.getenv("TEMP_DIR", "/tmp/mailpipe")

# Ensure temp directory exists
os.makedirs(TEMP_DIR, mode=0o700, exist_ok=True)

# Setup syslog logging
logger = logging.getLogger("mailpipe")
logger.setLevel(logging.INFO)

# Use syslog handler if available, otherwise fallback to stderr
try:
    if os.path.exists("/dev/log"):
        handler = logging.handlers.SysLogHandler(address="/dev/log")
    else:
        # Fallback for systems without /dev/log
        handler = logging.StreamHandler(sys.stderr)
except Exception:
    handler = logging.StreamHandler(sys.stderr)

formatter = logging.Formatter("%(name)s[%(process)d]: %(levelname)s: %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)


def decode_header_value(header_value: str) -> str:
    """Decode MIME header values."""
    if not header_value:
        return ""
    
    decoded_parts = decode_header(header_value)
    decoded_string = ""
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            try:
                decoded_string += part.decode(encoding or "utf-8", errors="ignore")
            except Exception:
                decoded_string += part.decode("utf-8", errors="ignore")
        else:
            decoded_string += str(part)
    return decoded_string


def parse_email(input_stream) -> Tuple[bytes, Optional[str], Optional[str]]:
    """
    Parse email from input stream.
    Returns: (raw_email_bytes, from_address, to_address)
    """
    try:
        # Read raw email (limit size for security)
        raw_email = input_stream.read(MAX_EMAIL_SIZE + 1)
        
        if len(raw_email) > MAX_EMAIL_SIZE:
            logger.error(f"Email exceeds maximum size: {len(raw_email)} bytes")
            return None, None, None
        
        # Parse email to extract addresses
        email_file = BytesIO(raw_email)
        msg = message_from_file(email_file)
        
        from_addr = parseaddr(msg.get("From", ""))[1] or "unknown@unknown.com"
        to_addr = parseaddr(msg.get("To", ""))[1] or ""
        
        # Also check Delivered-To header (common in Postfix)
        if not to_addr:
            to_addr = parseaddr(msg.get("Delivered-To", ""))[1] or ""
        
        logger.info(f"Processing email: from={from_addr}, to={to_addr}, size={len(raw_email)} bytes")
        
        return raw_email, from_addr, to_addr
        
    except Exception as e:
        logger.error(f"Error parsing email: {e}", exc_info=True)
        return None, None, None


def extract_attachments(msg) -> List[Tuple[str, bytes, str]]:
    """
    Extract attachments from email message.
    Returns: List of (filename, content, content_type)
    """
    attachments = []
    temp_files = []
    
    try:
        if not msg.is_multipart():
            return attachments
        
        for part in msg.walk():
            content_disposition = str(part.get("Content-Disposition", ""))
            content_type = part.get_content_type()
            
            # Skip multipart containers
            if content_type.startswith("multipart/"):
                continue
            
            # Check if this is an attachment
            if "attachment" in content_disposition or part.get_filename():
                filename = part.get_filename()
                if filename:
                    filename = decode_header_value(filename)
                    
                    # Security: Sanitize filename
                    filename = sanitize_filename(filename)
                    
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            # Check attachment size
                            if len(payload) > MAX_ATTACHMENT_SIZE:
                                logger.warning(
                                    f"Attachment {filename} exceeds maximum size: {len(payload)} bytes"
                                )
                                continue
                            
                            attachments.append((
                                filename,
                                payload,
                                content_type
                            ))
                            logger.debug(f"Extracted attachment: {filename} ({len(payload)} bytes)")
                    
                    except Exception as e:
                        logger.warning(f"Error extracting attachment {filename}: {e}")
                        continue
        
        return attachments
        
    except Exception as e:
        logger.error(f"Error extracting attachments: {e}", exc_info=True)
        # Clean up any temp files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception:
                pass
        return attachments


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal."""
    if not filename:
        return "unnamed"
    
    # Remove path separators and dangerous characters
    sanitized = filename.replace("/", "_").replace("\\", "_")
    sanitized = sanitized.replace("..", "_")
    sanitized = "".join(c for c in sanitized if c.isalnum() or c in "._-")
    
    # Limit length
    if len(sanitized) > 255:
        ext = Path(sanitized).suffix
        sanitized = sanitized[:255 - len(ext)] + ext
    
    return sanitized or "unnamed"


def send_to_backend(raw_email: bytes, attachments: List[Tuple[str, bytes, str]]) -> bool:
    """
    Send email to backend API with retry logic.
    Returns: True if successful, False otherwise.
    """
    for attempt in range(MAX_RETRIES):
        try:
            # Prepare multipart form data
            files = [("email", ("email.eml", raw_email, "message/rfc822"))]
            
            # Add attachments if any
            for filename, content, content_type in attachments:
                files.append(("attachments", (filename, content, content_type)))
            
            # Send request
            response = requests.post(
                ENDPOINT,
                files=files,
                timeout=30,
                headers={
                    "User-Agent": "Postfix-MailPipe/1.0"
                }
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully sent email to backend (attempt {attempt + 1})")
                return True
            elif response.status_code in [500, 502, 503, 504]:
                # Transient error - retry
                logger.warning(
                    f"Transient error {response.status_code} from backend (attempt {attempt + 1}/{MAX_RETRIES})"
                )
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY * (2 ** attempt))  # Exponential backoff
                    continue
            else:
                # Permanent error - don't retry
                logger.error(f"Permanent error {response.status_code} from backend: {response.text}")
                return False
        
        except requests.exceptions.Timeout:
            logger.warning(f"Request timeout (attempt {attempt + 1}/{MAX_RETRIES})")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (2 ** attempt))
                continue
        
        except requests.exceptions.ConnectionError as e:
            logger.warning(f"Connection error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAY * (2 ** attempt))
                continue
        
        except Exception as e:
            logger.error(f"Unexpected error sending to backend: {e}", exc_info=True)
            return False
    
    logger.error(f"Failed to send email after {MAX_RETRIES} attempts")
    return False


def main():
    """Main entry point for mail pipe."""
    exit_code = 0
    
    try:
        # Check if stdin is available
        if sys.stdin.isatty():
            logger.error("Script must be run as a pipe, not interactively")
            sys.exit(1)
        
        # Parse email from stdin
        raw_email, from_addr, to_addr = parse_email(sys.stdin.buffer)
        
        if not raw_email:
            logger.error("Failed to parse email or email too large")
            sys.exit(1)
        
        if not to_addr:
            logger.warning("No recipient address found in email")
            # Continue anyway - backend will handle
        
        # Parse email for attachments (if needed for logging)
        try:
            email_file = BytesIO(raw_email)
            msg = message_from_file(email_file)
            attachments = extract_attachments(msg)
            
            if attachments:
                logger.info(f"Found {len(attachments)} attachment(s)")
        except Exception as e:
            logger.warning(f"Could not extract attachments for logging: {e}")
            attachments = []
        
        # Send to backend
        success = send_to_backend(raw_email, attachments)
        
        if not success:
            exit_code = 75  # EX_TEMPFAIL - Postfix will retry
            logger.error("Failed to send email to backend")
        else:
            logger.info(f"Email processed successfully: to={to_addr}")
    
    except KeyboardInterrupt:
        logger.warning("Interrupted by user")
        exit_code = 1
    
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        exit_code = 75  # EX_TEMPFAIL
    
    finally:
        # Cleanup temp directory (remove old files)
        try:
            cleanup_temp_files()
        except Exception as e:
            logger.warning(f"Error cleaning up temp files: {e}")
    
    sys.exit(exit_code)


def cleanup_temp_files(max_age_hours: int = 24):
    """Clean up old temporary files."""
    try:
        now = time.time()
        for filename in os.listdir(TEMP_DIR):
            filepath = os.path.join(TEMP_DIR, filename)
            try:
                file_age = now - os.path.getmtime(filepath)
                if file_age > max_age_hours * 3600:
                    os.remove(filepath)
                    logger.debug(f"Cleaned up old temp file: {filename}")
            except Exception:
                pass
    except Exception as e:
        logger.warning(f"Error during temp file cleanup: {e}")


if __name__ == "__main__":
    main()

