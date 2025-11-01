from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Attachment, Message, Inbox
from app.services.attachment_service import read_attachment_file

router = APIRouter()

@router.get("/{attachment_id}")
async def download_attachment(attachment_id: str, db: Session = Depends(get_db)):
    """Download an attachment"""
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Verify message and inbox are valid
    message = db.query(Message).filter(Message.id == attachment.message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    inbox = db.query(Inbox).filter(Inbox.id == message.inbox_id).first()
    if inbox:
        if not inbox.is_valid():
            raise HTTPException(status_code=410, detail="Inbox has expired")
        
        # Update inbox last activity
        from datetime import datetime
        inbox.last_activity = datetime.utcnow()
        db.commit()
    
    try:
        # Read file with security validation
        file_content = read_attachment_file(attachment)
        
        return Response(
            content=file_content,
            media_type=attachment.content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{attachment.filename}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read attachment: {str(e)}")

