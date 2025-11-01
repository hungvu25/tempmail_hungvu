from email import message_from_bytes
from email.utils import parseaddr
from email.header import decode_header
import base64

def decode_mime_header(header_value):
    """Decode MIME header values"""
    if not header_value:
        return ""
    
    decoded_parts = decode_header(header_value)
    decoded_string = ""
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            decoded_string += part.decode(encoding or "utf-8", errors="ignore")
        else:
            decoded_string += part
    return decoded_string

def parse_email(raw_email: bytes) -> dict:
    """
    Parse raw email bytes into structured format.
    Handles multipart emails and extracts attachments.
    """
    msg = message_from_bytes(raw_email)
    
    # Extract headers
    subject = decode_mime_header(msg.get("Subject", ""))
    from_addr = parseaddr(msg.get("From", ""))[1] or "unknown@unknown.com"
    to_addr = parseaddr(msg.get("To", ""))[1] or ""
    
    # Extract body and attachments
    text_content = ""
    html_content = ""
    attachments = []
    
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition", ""))
            
            # Skip multipart containers
            if content_type.startswith("multipart/"):
                continue
            
            # Handle attachments
            if "attachment" in content_disposition:
                filename = part.get_filename()
                if filename:
                    filename = decode_mime_header(filename)
                    payload = part.get_payload(decode=True)
                    if payload:
                        attachments.append({
                            "filename": filename,
                            "content_type": content_type,
                            "content": payload
                        })
                continue
            
            # Handle body content
            payload = part.get_payload(decode=True)
            if payload:
                try:
                    if content_type == "text/plain":
                        text_content = payload.decode("utf-8", errors="ignore")
                    elif content_type == "text/html":
                        html_content = payload.decode("utf-8", errors="ignore")
                except Exception:
                    pass
    else:
        # Single part message
        payload = msg.get_payload(decode=True)
        if payload:
            try:
                if msg.get_content_type() == "text/html":
                    html_content = payload.decode("utf-8", errors="ignore")
                else:
                    text_content = payload.decode("utf-8", errors="ignore")
            except Exception:
                pass
    
    return {
        "from_address": from_addr,
        "to_address": to_addr,
        "subject": subject,
        "text_content": text_content,
        "html_content": html_content,
        "attachments": attachments,
        "raw_message": raw_email.decode("utf-8", errors="ignore")
    }

