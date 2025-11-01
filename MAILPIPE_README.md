# Mail Pipe Script - Quick Start

## Files Created

1. **mailpipe.py** - Production-ready mail pipe script
2. **postfix_config.md** - Detailed Postfix configuration guide
3. **test_mailpipe.sh** - Test script (Linux/Unix)
4. **sample_email.eml** - Sample email for testing

## Quick Setup

### 1. Install Dependencies

```bash
pip install requests
```

Or add to requirements.txt (already included).

### 2. Make Script Executable

```bash
chmod +x mailpipe.py
```

### 3. Configure Environment (Optional)

```bash
export MAILPIPE_BACKEND_URL="http://localhost:8000"
export MAX_EMAIL_SIZE_MB=10
export MAX_ATTACHMENT_SIZE_MB=5
```

### 4. Test Locally

```bash
# Test with sample email
cat sample_email.eml | python3 mailpipe.py

# Or pipe directly
echo -e "From: test@example.com\nTo: inbox@yourdomain.com\nSubject: Test\n\nBody" | python3 mailpipe.py
```

### 5. Postfix Virtual Map

Add to `/etc/postfix/virtual`:

```
@yourdomain.com    pipe:[python3 /absolute/path/to/mailpipe.py]
```

Then:

```bash
postmap /etc/postfix/virtual
postfix reload
```

## Features

✅ Reads RFC822 from stdin  
✅ Parses headers, text/html, attachments  
✅ Streams to backend as multipart/form-data  
✅ Retries on transient errors (3 attempts, exponential backoff)  
✅ Logs to syslog  
✅ Security: Size limits, filename sanitization, temp file cleanup  
✅ Production-ready error handling  

## Script Security

- ✅ Email size limit (10MB default, configurable)
- ✅ Attachment size limit (5MB default, configurable)
- ✅ Filename sanitization (prevents directory traversal)
- ✅ Secure temp directory handling
- ✅ Proper exit codes for Postfix

## Exit Codes

- `0` - Success
- `75` - Temporary failure (Postfix will retry)
- `1` - Permanent failure or error

## Logging

Logs to syslog (or stderr if syslog unavailable):

```
mailpipe[12345]: INFO: Processing email: from=sender@example.com, to=test@yourdomain.com, size=1234 bytes
mailpipe[12345]: INFO: Successfully sent email to backend (attempt 1)
```

## Testing Checklist

- [ ] Script is executable (`chmod +x`)
- [ ] Backend is running and accessible
- [ ] Test email processes successfully
- [ ] Test with attachment
- [ ] Check syslog for messages
- [ ] Verify email appears in backend API
- [ ] Test Postfix integration
- [ ] Monitor for errors

See `postfix_config.md` for detailed Postfix setup instructions.

