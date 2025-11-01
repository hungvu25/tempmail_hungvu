from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
from app.database import Base
from app.config import settings
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Inbox(Base):
    __tablename__ = "inboxes"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    last_activity = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    messages = relationship("Message", back_populates="inbox", cascade="all, delete-orphan")
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not self.expires_at:
            lifetime = timedelta(hours=settings.MAX_INBOX_LIFETIME_HOURS)
            self.expires_at = datetime.utcnow() + lifetime
    
    def is_valid(self):
        return datetime.utcnow() < self.expires_at

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    inbox_id = Column(String, ForeignKey("inboxes.id", ondelete="CASCADE"), nullable=False, index=True)
    from_address = Column(String, nullable=False)
    to_address = Column(String, nullable=False)
    subject = Column(Text)
    text_content = Column(Text)
    html_content = Column(Text)
    raw_message = Column(Text)
    received_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    
    # Relationships
    inbox = relationship("Inbox", back_populates="messages")
    attachments = relationship("Attachment", back_populates="message", cascade="all, delete-orphan")

class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    message_id = Column(String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    file_path = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relationships
    message = relationship("Message", back_populates="attachments")

