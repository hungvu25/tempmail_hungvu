"""
Background tasks for cleanup and maintenance
"""
import asyncio
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import Inbox, Message, Attachment
from app.services.attachment_service import delete_attachment_file
from app.config import settings

async def cleanup_expired_inboxes():
    """Periodically clean up expired inboxes and their data"""
    while True:
        try:
            await asyncio.sleep(settings.CLEANUP_INTERVAL_MINUTES * 60)
            
            db = SessionLocal()
            try:
                # Find expired inboxes
                now = datetime.utcnow()
                expired_inboxes = db.query(Inbox).filter(Inbox.expires_at < now).all()
                
                deleted_inboxes = 0
                deleted_messages = 0
                deleted_attachments = 0
                
                for inbox in expired_inboxes:
                    # Get all messages for this inbox
                    messages = db.query(Message).filter(Message.inbox_id == inbox.id).all()
                    
                    # Delete attachments
                    for message in messages:
                        attachments = db.query(Attachment).filter(Attachment.message_id == message.id).all()
                        for attachment in attachments:
                            delete_attachment_file(attachment)
                            db.delete(attachment)
                            deleted_attachments += 1
                    
                    # Delete messages (cascade will handle it, but we do it explicitly)
                    for message in messages:
                        db.delete(message)
                        deleted_messages += 1
                    
                    # Delete inbox
                    db.delete(inbox)
                    deleted_inboxes += 1
                
                db.commit()
                
                if deleted_inboxes > 0:
                    print(f"Cleanup: Deleted {deleted_inboxes} inboxes, {deleted_messages} messages, {deleted_attachments} attachments")
            
            except Exception as e:
                db.rollback()
                print(f"Error during cleanup: {e}")
            finally:
                db.close()
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in cleanup task: {e}")

