from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.models import Inbox
from datetime import datetime

router = APIRouter()

class InboxCreate(BaseModel):
    email: EmailStr

class InboxResponse(BaseModel):
    id: str
    email: str
    created_at: datetime
    expires_at: datetime
    last_activity: datetime
    
    class Config:
        from_attributes = True

@router.post("/", response_model=InboxResponse, status_code=201)
async def create_inbox(inbox_data: InboxCreate, db: Session = Depends(get_db)):
    """Create a new inbox"""
    email = inbox_data.email.lower().strip()
    
    # Check if inbox already exists
    existing = db.query(Inbox).filter(Inbox.email == email).first()
    
    if existing:
        if existing.is_valid():
            # Return existing valid inbox
            return InboxResponse.from_orm(existing)
        else:
            # Delete expired inbox
            db.delete(existing)
            db.commit()
    
    # Create new inbox
    inbox = Inbox(email=email)
    db.add(inbox)
    db.commit()
    db.refresh(inbox)
    
    return InboxResponse.from_orm(inbox)

@router.get("/{inbox_id}", response_model=InboxResponse)
async def get_inbox(inbox_id: str, db: Session = Depends(get_db)):
    """Get inbox details"""
    inbox = db.query(Inbox).filter(Inbox.id == inbox_id).first()
    
    if not inbox:
        raise HTTPException(status_code=404, detail="Inbox not found")
    
    if not inbox.is_valid():
        raise HTTPException(status_code=410, detail="Inbox has expired")
    
    return InboxResponse.from_orm(inbox)

