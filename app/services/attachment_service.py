import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException
from app.config import settings
from app.models import Attachment
from sqlalchemy.orm import Session

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal"""
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

def validate_file_size(size: int) -> bool:
    """Validate file size against maximum limit"""
    max_size = settings.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024
    return size <= max_size

async def save_attachment(
    db: Session,
    message_id: str,
    filename: str,
    content_type: str,
    file_content: bytes
) -> Attachment:
    """
    Save attachment to disk and create database record.
    Security: Validates file size and sanitizes filename.
    """
    # Security: Validate file size
    if not validate_file_size(len(file_content)):
        max_mb = settings.MAX_ATTACHMENT_SIZE_MB
        raise HTTPException(
            status_code=413,
            detail=f"Attachment size exceeds maximum of {max_mb}MB"
        )
    
    # Security: Sanitize filename
    sanitized_filename = sanitize_filename(filename)
    
    # Generate unique file path
    file_id = str(uuid.uuid4())
    file_ext = Path(sanitized_filename).suffix
    file_path = os.path.join(settings.ATTACHMENTS_PATH, f"{file_id}{file_ext}")
    
    # Security: Ensure path is within attachments directory
    resolved_path = os.path.realpath(file_path)
    resolved_dir = os.path.realpath(settings.ATTACHMENTS_PATH)
    
    if not resolved_path.startswith(resolved_dir):
        raise HTTPException(status_code=400, detail="Invalid file path")
    
    try:
        # Write file to disk
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Create database record
        attachment = Attachment(
            message_id=message_id,
            filename=sanitized_filename,
            content_type=content_type,
            size=len(file_content),
            file_path=file_path
        )
        
        db.add(attachment)
        db.commit()
        db.refresh(attachment)
        
        return attachment
    except Exception as e:
        # Clean up file if database operation fails
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to save attachment: {str(e)}")

def read_attachment_file(attachment: Attachment) -> bytes:
    """
    Read attachment file from disk.
    Security: Validates file path to prevent directory traversal.
    """
    if not attachment or not attachment.file_path:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Security: Ensure file path is within attachments directory
    resolved_path = os.path.realpath(attachment.file_path)
    resolved_dir = os.path.realpath(settings.ATTACHMENTS_PATH)
    
    if not resolved_path.startswith(resolved_dir):
        raise HTTPException(status_code=400, detail="Invalid file path")
    
    if not os.path.exists(resolved_path):
        raise HTTPException(status_code=404, detail="Attachment file not found")
    
    with open(resolved_path, "rb") as f:
        return f.read()

def delete_attachment_file(attachment: Attachment):
    """Delete attachment file from disk"""
    if attachment and attachment.file_path:
        try:
            resolved_path = os.path.realpath(attachment.file_path)
            resolved_dir = os.path.realpath(settings.ATTACHMENTS_PATH)
            
            if resolved_path.startswith(resolved_dir) and os.path.exists(resolved_path):
                os.remove(resolved_path)
        except Exception as e:
            # Log error but don't fail
            print(f"Error deleting attachment file: {e}")

