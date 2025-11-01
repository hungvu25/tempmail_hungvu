# Postfix Configuration for Mail Pipe

## Mail Pipe Script Setup

### 1. Install Dependencies

```bash
pip install requests
```

### 2. Set Permissions

```bash
# Make script executable
chmod +x mailpipe.py

# Ensure script is owned by postfix user (or appropriate user)
# If running as root postfix, use:
chown postfix:postfix mailpipe.py

# Set secure permissions (executable by owner only)
chmod 755 mailpipe.py  # or 750 if more restrictive
```

### 3. Test Locally

```bash
# Test with a sample email
cat sample_email.eml | python3 mailpipe.py

# Or pipe from stdin
echo -e "From: test@example.com\nTo: inbox@yourdomain.com\nSubject: Test\n\nBody" | python3 mailpipe.py

# Test with verbose logging (if you add debug mode)
PYTHONUNBUFFERED=1 python3 mailpipe.py < sample_email.eml
```

### 4. Postfix Virtual Configuration

Edit `/etc/postfix/main.cf` and ensure:

```
virtual_transport = pipe
virtual_mailbox_domains = yourdomain.com
virtual_mailbox_maps = hash:/etc/postfix/virtual
```

Create/edit `/etc/postfix/virtual`:

```
# Format: address    transport:destination
@yourdomain.com    pipe:[python3 path/to/mailpipe.py]
```

Or for specific addresses:

```
test@yourdomain.com    pipe:[python3 /opt/mailpipe/mailpipe.py]
inbox@yourdomain.com   pipe:[python3 /opt/mailpipe/mailpipe.py]
*@yourdomain.com       pipe:[python3 /opt/mailpipe/mailpipe.py]
```

**Note:** The square brackets `[]` tell Postfix to use the pipe transport.

### 5. Postfix Master Configuration

In `/etc/postfix/master.cf`, ensure pipe transport is configured:

```
pipe    unix  -       n       n       -       -       pipe
  flags=DRhu user=vmail argv=/usr/bin/python3 /opt/mailpipe/mailpipe.py
```

Or simpler (if script is executable):

```
pipe    unix  -       n       n       -       -       pipe
  flags=DRhu user=postfix argv=/opt/mailpipe/mailpipe.py
```

### 6. Compile and Reload Postfix

```bash
# Compile virtual map
postmap /etc/postfix/virtual

# Test configuration
postfix check

# Reload Postfix
systemctl reload postfix
# or
postfix reload
```

## Environment Variables

Set these in your system environment or create a wrapper script:

```bash
# /opt/mailpipe/run_mailpipe.sh
#!/bin/bash
export MAILPIPE_BACKEND_URL="http://localhost:8000"
export MAX_EMAIL_SIZE_MB=10
export MAX_ATTACHMENT_SIZE_MB=5
export TEMP_DIR="/tmp/mailpipe"
/opt/mailpipe/mailpipe.py
```

Then use this wrapper in Postfix virtual map:
```
@yourdomain.com    pipe:[bash /opt/mailpipe/run_mailpipe.sh]
```

## Testing

### Test Email Creation

Create `test_email.eml`:

```
From: sender@example.com
To: test@yourdomain.com
Subject: Test Email
Content-Type: text/plain

This is a test email body.
```

### Send Test Email

```bash
# Using sendmail
sendmail test@yourdomain.com < test_email.eml

# Using swaks (if installed)
swaks --to test@yourdomain.com --from sender@example.com --server localhost
```

### Check Logs

```bash
# Syslog
journalctl -u postfix -f

# Or
tail -f /var/log/mail.log

# Python script logs
journalctl -f | grep mailpipe
```

## Security Considerations

1. **File Permissions**: Script should be readable/executable only by Postfix user
2. **Temp Directory**: Use secure temp directory with proper permissions
3. **Size Limits**: Already enforced in script (MAX_EMAIL_SIZE, MAX_ATTACHMENT_SIZE)
4. **User**: Run as non-root user (postfix or dedicated user)
5. **Network**: Backend should be on localhost or secure network

## Troubleshooting

### Script not receiving email
- Check Postfix logs: `journalctl -u postfix`
- Verify virtual map is compiled: `postmap /etc/postfix/virtual`
- Check script permissions and path

### Backend connection errors
- Verify backend is running: `curl http://localhost:8000/health`
- Check BACKEND_URL environment variable
- Check firewall rules

### Permission denied
- Ensure script is executable: `chmod +x mailpipe.py`
- Check Postfix user can execute: `sudo -u postfix /path/to/mailpipe.py < test_email.eml`

## Example Complete Virtual Map

```
# /etc/postfix/virtual
# Catch-all for yourdomain.com
@yourdomain.com    pipe:[python3 /opt/mailpipe/mailpipe.py]

# Specific addresses
support@yourdomain.com    pipe:[python3 /opt/mailpipe/mailpipe.py]
noreply@yourdomain.com   pipe:[python3 /opt/mailpipe/mailpipe.py]
```

## Monitoring

Add to your monitoring system:
- Script exit codes (0 = success, 75 = tempfail)
- Backend response times
- Email processing rate
- Attachment size distribution

