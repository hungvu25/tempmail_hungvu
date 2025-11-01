# Quick Setup Checklist

## Prerequisites
- [ ] Ubuntu 22.04 server
- [ ] Domain name configured
- [ ] Server IP address
- [ ] Root/sudo access

## Installation (Run commands sequentially)

### 1. Install Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y postfix postfix-pcre mailutils opendkim opendkim-tools certbot fail2ban python3 python3-pip
```

### 2. Setup Mailpipe
```bash
sudo mkdir -p /opt/mailpipe
sudo cp mailpipe.py /opt/mailpipe/
sudo chmod +x /opt/mailpipe/mailpipe.py
sudo pip3 install requests
```

Create `/opt/mailpipe/run_mailpipe.sh`:
```bash
#!/bin/bash
export MAILPIPE_BACKEND_URL="http://localhost:8000"
export MAX_EMAIL_SIZE_MB=10
export MAX_ATTACHMENT_SIZE_MB=5
export TEMP_DIR="/tmp/mailpipe"
/opt/mailpipe/mailpipe.py
```
```bash
sudo chmod +x /opt/mailpipe/run_mailpipe.sh
```

### 3. Configure Postfix

Edit `/etc/postfix/main.cf` (see `postfix/main.cf.minimal`)

Edit `/etc/postfix/master.cf` - add pipe transport:
```
pipe    unix  -       n       n       -       -       pipe
  flags=DRhu user=postfix argv=/opt/mailpipe/run_mailpipe.sh
```

Create `/etc/postfix/virtual_domains`:
```
yourdomain.com    OK
```

Create `/etc/postfix/virtual`:
```
@yourdomain.com    pipe:[/opt/mailpipe/run_mailpipe.sh]
```

Apply changes:
```bash
sudo postmap /etc/postfix/virtual_domains
sudo postmap /etc/postfix/virtual
sudo postfix check
```

### 4. Setup OpenDKIM

Generate keys:
```bash
sudo mkdir -p /etc/opendkim/keys
sudo chown opendkim:opendkim /etc/opendkim/keys
sudo chmod 700 /etc/opendkim/keys
sudo opendkim-genkey -D /etc/opendkim/keys -d yourdomain.com -s default
sudo chown opendkim:opendkim /etc/opendkim/keys/default.*
sudo chmod 600 /etc/opendkim/keys/default.private
```

Get DKIM public key:
```bash
sudo cat /etc/opendkim/keys/default.txt
```

Configure OpenDKIM (see POSTFIX_SETUP.md for full config)

### 5. DNS Records

Add to your DNS provider:
- [ ] MX: `@ → mail.yourdomain.com (priority 10)`
- [ ] A: `mail → YOUR_SERVER_IP`
- [ ] SPF: `@ → v=spf1 mx a ip4:YOUR_SERVER_IP ~all`
- [ ] DKIM: `default._domainkey → (from default.txt)`
- [ ] DMARC: `_dmarc → v=DMARC1; p=none; rua=mailto:admin@yourdomain.com`
- [ ] PTR: Request from provider (IP → mail.yourdomain.com)

### 6. TLS Certificate

```bash
sudo systemctl stop postfix
sudo certbot certonly --standalone -d mail.yourdomain.com
```

### 7. Configure Fail2ban

Edit `/etc/fail2ban/jail.local` - enable postfix section

### 8. Start Services

```bash
sudo systemctl enable opendkim postfix fail2ban
sudo systemctl restart opendkim postfix fail2ban
sudo systemctl status postfix
```

### 9. Verify

```bash
# Check Postfix
sudo postfix check
sudo tail -f /var/log/mail.log

# Check OpenDKIM
sudo opendkim-testkey -d yourdomain.com -s default -vvv

# Check DNS
dig MX yourdomain.com
dig TXT yourdomain.com | grep spf
dig TXT default._domainkey.yourdomain.com
dig -x YOUR_SERVER_IP

# Test email
echo "Test" | mail -s "Test" test@yourdomain.com
```

## Troubleshooting

- Postfix logs: `sudo tail -f /var/log/mail.log`
- OpenDKIM logs: `sudo journalctl -u opendkim -f`
- Fail2ban: `sudo fail2ban-client status postfix`

## Files to Edit

1. `/etc/postfix/main.cf` - Main config
2. `/etc/postfix/master.cf` - Add pipe transport
3. `/etc/postfix/virtual` - Virtual mapping
4. `/etc/opendkim.conf` - OpenDKIM config
5. `/etc/fail2ban/jail.local` - Fail2ban config

