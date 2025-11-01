from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel
from app.database import get_db
from app.models import Inbox, Message, Attachment
from datetime import datetime
from typing import List, Optional

router = APIRouter()

class MessageResponse(BaseModel):
    id: str
    from_address: str
    to_address: str
    subject: Optional[str]
    text_content: Optional[str]
    html_content: Optional[str]
    received_at: datetime
    attachment_count: int = 0
    
    class Config:
        from_attributes = True

class MessageDetailResponse(MessageResponse):
    attachments: List[dict]

@router.get("/inbox/{inbox_id}", response_model=dict)
async def list_messages(
    inbox_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List messages for an inbox"""
    # Verify inbox exists and is valid
    inbox = db.query(Inbox).filter(Inbox.id == inbox_id).first()
    if not inbox:
        raise HTTPException(status_code=404, detail="Inbox not found")
    
    if not inbox.is_valid():
        raise HTTPException(status_code=410, detail="Inbox has expired")
    
    # Update last activity
    inbox.last_activity = datetime.utcnow()
    db.commit()
    
    # Get messages with pagination
    offset = (page - 1) * limit
    messages = db.query(Message).filter(Message.inbox_id == inbox_id)\
        .order_by(desc(Message.received_at))\
        .offset(offset)\
        .limit(limit)\
        .all()
    
    total = db.query(Message).filter(Message.inbox_id == inbox_id).count()
    
    # Format response
    message_list = []
    for msg in messages:
        attachment_count = db.query(Attachment).filter(Attachment.message_id == msg.id).count()
        message_list.append({
            "id": msg.id,
            "from_address": msg.from_address,
            "to_address": msg.to_address,
            "subject": msg.subject,
            "text_content": msg.text_content,
            "html_content": msg.html_content,
            "received_at": msg.received_at,
            "attachment_count": attachment_count
        })
    
    return {
        "messages": message_list,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": (total + limit - 1) // limit
        }
    }

@router.get("/{message_id}", response_model=MessageDetailResponse)
async def get_message(message_id: str, db: Session = Depends(get_db)):
    """Get a specific message"""
    message = db.query(Message).filter(Message.id == message_id).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Get attachments
    attachments = db.query(Attachment).filter(Attachment.message_id == message_id).all()
    
    return MessageDetailResponse(
        id=message.id,
        from_address=message.from_address,
        to_address=message.to_address,
        subject=message.subject,
        text_content=message.text_content,
        html_content=message.html_content,
        received_at=message.received_at,
        attachment_count=len(attachments),
        attachments=[
            {
                "id": att.id,
                "filename": att.filename,
                "content_type": att.content_type,
                "size": att.size
            }
            for att in attachments
        ]
    )

