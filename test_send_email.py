"""
Script để test gửi email vào backend (không cần Postfix)
Chạy trên Windows để test inbound email API
"""
import requests
import sys

def send_test_email(inbox_email, subject="Test Email", body="This is a test email"):
    """Gửi test email đến inbox"""
    
    # Tạo raw email content
    raw_email = f"""From: sender@example.com
To: {inbox_email}
Subject: {subject}
Content-Type: text/plain

{body}
"""
    
    # Gửi đến backend
    try:
        response = requests.post(
            "http://localhost:8000/api/inbound/mail",
            files={"email": ("email.eml", raw_email.encode('utf-8'), "message/rfc822")},
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"✅ Email sent successfully to {inbox_email}")
            print(f"   Response: {response.text}")
            return True
        else:
            print(f"❌ Failed to send email. Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Is it running on http://localhost:8000?")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def send_test_email_with_attachment(inbox_email):
    """Gửi test email có attachment"""
    
    raw_email = f"""From: sender@example.com
To: {inbox_email}
Subject: Test Email with Attachment
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain

This is a test email with an attachment.

--boundary123
Content-Disposition: attachment; filename="test.txt"
Content-Type: text/plain

This is attachment content.
--boundary123--
"""
    
    try:
        response = requests.post(
            "http://localhost:8000/api/inbound/mail",
            files={"email": ("email.eml", raw_email.encode('utf-8'), "message/rfc822")},
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"✅ Email with attachment sent successfully to {inbox_email}")
            return True
        else:
            print(f"❌ Failed. Status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_send_email.py <inbox_email> [subject] [body]")
        print("\nExample:")
        print("  python test_send_email.py test@example.com")
        print("  python test_send_email.py test@example.com 'Hello' 'Test message'")
        sys.exit(1)
    
    inbox_email = sys.argv[1]
    subject = sys.argv[2] if len(sys.argv) > 2 else "Test Email"
    body = sys.argv[3] if len(sys.argv) > 3 else "This is a test email body."
    
    print(f"Sending test email to {inbox_email}...")
    print(f"Subject: {subject}")
    print(f"Body: {body}\n")
    
    # Gửi email thường
    send_test_email(inbox_email, subject, body)
    
    # Gửi email có attachment
    print("\nSending email with attachment...")
    send_test_email_with_attachment(inbox_email)

