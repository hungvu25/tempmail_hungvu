from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Inbox, Message
from app.services.email_parser import parse_email
from app.services.attachment_service import save_attachment
from app.services.websocket_manager import broadcast_new_message
from app.config import settings

router = APIRouter()

@router.post("/mail")
async def receive_mail(request: Request, db: Session = Depends(get_db)):
    """
    Receive email from Postfix pipe script.
    Accepts multipart/form-data with raw email content.
    """
    try:
        # Read raw email content
        content_type = request.headers.get("content-type", "")
        
        if "multipart/form-data" in content_type:
            form = await request.form()
            email_field = form.get("email")
            if email_field:
                raw_email = await email_field.read()
            else:
                raw_email = await request.body()
        else:
            # Direct raw email
            raw_email = await request.body()
        
        if not raw_email:
            raise HTTPException(status_code=400, detail="No email content received")
        
        # Validate size
        max_size = settings.MAX_EMAIL_SIZE_MB * 1024 * 1024
        if len(raw_email) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"Email size exceeds maximum of {settings.MAX_EMAIL_SIZE_MB}MB"
            )
        
        # Parse email
        parsed = parse_email(raw_email)
        to_address = parsed["to_address"].lower().strip()
        
        if not to_address:
            raise HTTPException(status_code=400, detail="No recipient address found")
        
        # Find inbox
        inbox = db.query(Inbox).filter(Inbox.email == to_address).first()
        
        if not inbox:
            # Inbox doesn't exist - silently accept (Postfix expects 200)
            return Response(status_code=200, content="OK")
        
        if not inbox.is_valid():
            # Inbox expired - silently accept
            return Response(status_code=200, content="OK")
        
        # Create message record
        message = Message(
            inbox_id=inbox.id,
            from_address=parsed["from_address"],
            to_address=parsed["to_address"],
            subject=parsed["subject"],
            text_content=parsed["text_content"],
            html_content=parsed["html_content"],
            raw_message=parsed["raw_message"]
        )
        
        db.add(message)
        db.flush()  # Get message.id
        
        # Save attachments
        for att in parsed["attachments"]:
            try:
                await save_attachment(
                    db=db,
                    message_id=message.id,
                    filename=att["filename"],
                    content_type=att["content_type"],
                    file_content=att["content"]
                )
            except Exception as e:
                # Log but continue processing
                print(f"Error saving attachment: {e}")
        
        # Update inbox last activity
        from datetime import datetime
        inbox.last_activity = datetime.utcnow()
        
        db.commit()
        db.refresh(message)
        
        # Broadcast new message event via WebSocket
        await broadcast_new_message(inbox.id, message.id)
        
        # Return 200 OK for Postfix
        return Response(status_code=200, content="OK")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing inbound email: {e}")
        # Still return 200 to prevent Postfix from retrying
        return Response(status_code=200, content="OK")

