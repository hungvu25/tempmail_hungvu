# Complete Postfix Email Server Setup Guide

## Prerequisites

- Ubuntu 22.04 server
- Root or sudo access
- Domain name pointing to your server IP
- Mail server subdomain (e.g., mail.yourdomain.com)

## Step 1: Install Postfix and Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Postfix and mail utilities
sudo apt install -y postfix postfix-pcre mailutils

# During installation, select:
# - Internet Site
# - Your domain (e.g., yourdomain.com)
```

## Step 2: Install Mail Pipe Script

```bash
# Create directory for mailpipe
sudo mkdir -p /opt/mailpipe
sudo cp mailpipe.py /opt/mailpipe/
sudo chmod +x /opt/mailpipe/mailpipe.py
sudo chown root:root /opt/mailpipe/mailpipe.py

# Create wrapper script for environment variables
sudo tee /opt/mailpipe/run_mailpipe.sh > /dev/null << 'EOF'
#!/bin/bash
export MAILPIPE_BACKEND_URL="http://localhost:8000"
export MAX_EMAIL_SIZE_MB=10
export MAX_ATTACHMENT_SIZE_MB=5
export TEMP_DIR="/tmp/mailpipe"
/opt/mailpipe/mailpipe.py
EOF

sudo chmod +x /opt/mailpipe/run_mailpipe.sh
sudo chown root:root /opt/mailpipe/run_mailpipe.sh

# Install Python dependencies
sudo apt install -y python3 python3-pip
sudo pip3 install requests
```

## Step 3: Configure Postfix

### Edit `/etc/postfix/main.cf`

```bash
sudo cp /etc/postfix/main.cf /etc/postfix/main.cf.backup
sudo nano /etc/postfix/main.cf
```

Replace or add these settings:

```
# Basic settings
myhostname = mail.yourdomain.com
mydomain = yourdomain.com
myorigin = $mydomain
inet_interfaces = all
inet_protocols = ipv4

# Virtual domain settings
virtual_mailbox_domains = hash:/etc/postfix/virtual_domains
virtual_mailbox_maps = hash:/etc/postfix/virtual
virtual_transport = pipe
virtual_minimum_uid = 100
virtual_uid_maps = static:5000
virtual_gid_maps = static:5000

# Security settings
disable_vrfy_command = yes
smtpd_helo_required = yes
smtpd_recipient_restrictions = 
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_unauth_destination,
    reject_rbl_client zen.spamhaus.org,
    reject_rbl_client bl.spamcop.net,
    permit

# TLS/SSL settings
smtpd_tls_security_level = may
smtpd_tls_cert_file = /etc/letsencrypt/live/mail.yourdomain.com/fullchain.pem
smtpd_tls_key_file = /etc/letsencrypt/live/mail.yourdomain.com/privkey.pem
smtpd_tls_protocols = !SSLv2, !SSLv3
smtpd_tls_ciphers = high
smtpd_tls_mandatory_ciphers = high
smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3

# Enable STARTTLS
smtpd_tls_auth_only = yes
smtp_tls_security_level = may
smtp_tls_note_starttls_offer = yes

# Logging
maillog_file = /var/log/mail.log
```

### Edit `/etc/postfix/master.cf`

```bash
sudo nano /etc/postfix/master.cf
```

Add or modify the pipe transport:

```
pipe    unix  -       n       n       -       -       pipe
  flags=DRhu user=postfix argv=/opt/mailpipe/run_mailpipe.sh
```

### Create `/etc/postfix/virtual_domains`

```bash
sudo tee /etc/postfix/virtual_domains > /dev/null << EOF
yourdomain.com    OK
EOF

sudo postmap /etc/postfix/virtual_domains
```

### Create `/etc/postfix/virtual` (Catch-all)

```bash
sudo tee /etc/postfix/virtual > /dev/null << EOF
# Catch-all for yourdomain.com - pipe all emails to mailpipe
@yourdomain.com    pipe:[/opt/mailpipe/run_mailpipe.sh]
EOF

sudo postmap /etc/postfix/virtual
```

## Step 4: Install and Configure OpenDKIM

```bash
# Install OpenDKIM
sudo apt install -y opendkim opendkim-tools

# Add postfix user to opendkim group
sudo usermod -a -G opendkim postfix
```

### Configure OpenDKIM: `/etc/opendkim.conf`

```bash
sudo cp /etc/opendkim.conf /etc/opendkim.conf.backup
sudo nano /etc/opendkim.conf
```

Add/update:

```
# Basic configuration
Syslog                  yes
SyslogSuccess           yes
LogWhy                  yes
Canonicalization        relaxed/simple

# Sign all emails from your domain
Domain                  yourdomain.com
Selector                default

# Key files
KeyFile                 /etc/opendkim/keys/default.private
SelectorFile            /etc/opendkim/selectors.conf

# Hashing algorithm
MinimumKeyBits          1024
Mode                    sv
PidFile                 /var/run/opendkim/opendkim.pid
SignatureAlgorithm      rsa-sha256

# Internal hosts (to not sign)
InternalHosts           refile:/etc/opendkim/TrustedHosts
ExternalIgnoreList      refile:/etc/opendkim/TrustedHosts

# Socket
Socket                  inet:8891@localhost

# User settings
UserID                  opendkim:opendkim

# Temporary directory
TemporaryDirectory      /var/tmp

# Subdomains
SubDomains              yes
```

### Create `/etc/opendkim/TrustedHosts`

```bash
sudo mkdir -p /etc/opendkim
sudo tee /etc/opendkim/TrustedHosts > /dev/null << EOF
127.0.0.1
localhost
::1
yourdomain.com
*.yourdomain.com
EOF
```

### Create `/etc/opendkim/KeyTable`

```bash
sudo tee /etc/opendkim/KeyTable > /dev/null << EOF
default._domainkey.yourdomain.com yourdomain.com:default:/etc/opendkim/keys/default.private
EOF
```

### Create `/etc/opendkim/SigningTable`

```bash
sudo tee /etc/opendkim/SigningTable > /dev/null << EOF
*@yourdomain.com default._domainkey.yourdomain.com
EOF
```

### Generate DKIM Keys

```bash
# Create keys directory
sudo mkdir -p /etc/opendkim/keys
sudo chown opendkim:opendkim /etc/opendkim/keys
sudo chmod 700 /etc/opendkim/keys

# Generate keys
sudo opendkim-genkey -D /etc/opendkim/keys -d yourdomain.com -s default

# Set permissions
sudo chown opendkim:opendkim /etc/opendkim/keys/default.*
sudo chmod 600 /etc/opendkim/keys/default.private
sudo chmod 644 /etc/opendkim/keys/default.txt

# View public key (for DNS)
sudo cat /etc/opendkim/keys/default.txt
```

### Get DKIM DNS Record

```bash
# Extract the DKIM public key
sudo cat /etc/opendkim/keys/default.txt | grep -oP '"\K[^"]+'
```

### Configure Postfix for OpenDKIM

Edit `/etc/postfix/main.cf` and add:

```
# OpenDKIM
milter_protocol = 6
milter_default_action = accept
smtpd_milters = inet:localhost:8891
non_smtpd_milters = inet:localhost:8891
```

## Step 5: DNS Records Configuration

### SPF Record (TXT)

Add to your DNS:

```
Type: TXT
Name: @ (or yourdomain.com)
Value: v=spf1 mx a ip4:YOUR_SERVER_IP ~all
```

Example:
```
v=spf1 mx a ip4:192.0.2.1 ~all
```

### DKIM Record (TXT)

Add to your DNS:

```
Type: TXT
Name: default._domainkey
Value: (from /etc/opendkim/keys/default.txt - copy the entire "p=" line)
```

Example format:
```
"v=DKIM1; h=sha256; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
```

### DMARC Record (TXT)

Add to your DNS:

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:admin@yourdomain.com; sp=none; aspf=r;
```

For stricter policy:
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc@yourdomain.com; sp=quarantine; aspf=r;
```

### MX Record

Add to your DNS:

```
Type: MX
Name: @ (or yourdomain.com)
Priority: 10
Value: mail.yourdomain.com
```

### A Record for Mail Server

```
Type: A
Name: mail
Value: YOUR_SERVER_IP
```

## Step 6: Request PTR Record (Reverse DNS)

### For Cloud Providers

**AWS EC2:**
- Contact AWS Support
- Provide: Instance ID, IP address, domain (mail.yourdomain.com)
- Request: PTR record for IP → mail.yourdomain.com

**DigitalOcean:**
- Via API or Support ticket
- Request: PTR record for droplet IP → mail.yourdomain.com

**Linode:**
- In Linode Manager → Networking
- Click "Edit RDNS" for your IP
- Set: mail.yourdomain.com

**Google Cloud:**
- `gcloud compute addresses update ADDRESS --reverse-dns-name mail.yourdomain.com`

**Azure:**
- Via PowerShell or Support
- `New-AzureRmPublicIpAddress` with `-ReverseFqdn mail.yourdomain.com`

### For VPS Providers

Contact your provider's support with:
```
Subject: PTR Record Request
IP Address: YOUR_SERVER_IP
Hostname: mail.yourdomain.com

Please create a reverse DNS (PTR) record pointing YOUR_SERVER_IP to mail.yourdomain.com
```

### Verify PTR Record

```bash
dig -x YOUR_SERVER_IP
# Should return: mail.yourdomain.com
```

## Step 7: Install and Configure TLS (Let's Encrypt)

```bash
# Install certbot
sudo apt install -y certbot

# Stop postfix temporarily (if running)
sudo systemctl stop postfix

# Obtain certificate for mail subdomain
sudo certbot certonly --standalone -d mail.yourdomain.com

# Or if you have web server running:
# sudo certbot certonly --nginx -d mail.yourdomain.com
```

### Auto-renewal Setup

```bash
# Test renewal
sudo certbot renew --dry-run

# Add renewal hook to restart postfix
sudo tee /etc/letsencrypt/renewal-hooks/deploy/postfix-reload.sh > /dev/null << 'EOF'
#!/bin/bash
systemctl reload postfix
systemctl reload opendkim
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/postfix-reload.sh
```

## Step 8: Install and Configure Fail2ban

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create local config
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Add/update in `jail.local`:

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@yourdomain.com
sendername = Fail2Ban
action = %(action_)s

[postfix-sasl]
enabled = true
port = smtp,465,587,submission
filter = postfix-sasl
logpath = /var/log/mail.log
maxretry = 3
bantime = 86400

[postfix]
enabled = true
port = smtp,465,587,submission
filter = postfix
logpath = /var/log/mail.log
maxretry = 5
bantime = 3600

[pure-ftpd]
enabled = false

[dovecot]
enabled = false
```

### Create Postfix Filter

```bash
sudo tee /etc/fail2ban/filter.d/postfix.conf > /dev/null << 'EOF'
[Definition]
failregex = ^%(__prefix_line)s.*\[<HOST>\]:.*reject: RCPT from .*: (?:Client host|Recipient address) rejected
            ^%(__prefix_line)s.*\[<HOST>\]:.*reject: .* from .*\[<HOST>\]:.*: .*$
            ^%(__prefix_line)s.*\[<HOST>\]:.*NOQUEUE: reject: RCPT from .*\[<HOST>\]: .*$
            ^%(__prefix_line)s.*\[<HOST>\]:.*reject: DATA from .*\[<HOST>\]:.*: .*$
            ^%(__prefix_line)s.*\[<HOST>\]:.*reject: MAIL from .*\[<HOST>\]:.*: .*$
            ^%(__prefix_line)s.*\[<HOST>\]:.*reject: VRFY from .*\[<HOST>\]:.*: .*$
            ^%(__prefix_line)s.*\[<HOST>\]:.*reject.*550.*$
ignoreregex =
EOF

sudo systemctl restart fail2ban
```

## Step 9: Start and Enable Services

```bash
# Start OpenDKIM
sudo systemctl enable opendkim
sudo systemctl start opendkim

# Start Postfix
sudo systemctl enable postfix
sudo systemctl start postfix

# Start Fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Step 10: Verify Configuration

### Check Postfix Status

```bash
sudo systemctl status postfix
sudo postfix check
sudo postmap /etc/postfix/virtual
```

### Check OpenDKIM Status

```bash
sudo systemctl status opendkim
sudo opendkim-testkey -d yourdomain.com -s default -vvv
```

### Check Fail2ban Status

```bash
sudo systemctl status fail2ban
sudo fail2ban-client status
sudo fail2ban-client status postfix
```

### Test Email Reception

```bash
# Send test email
echo "Test email body" | mail -s "Test Subject" test@yourdomain.com

# Check mail logs
sudo tail -f /var/log/mail.log

# Check if mailpipe received it
sudo journalctl -u postfix -f | grep mailpipe
```

### Verify DNS Records

```bash
# Check MX
dig MX yourdomain.com

# Check SPF
dig TXT yourdomain.com | grep spf

# Check DKIM
dig TXT default._domainkey.yourdomain.com

# Check DMARC
dig TXT _dmarc.yourdomain.com

# Check PTR
dig -x YOUR_SERVER_IP
```

## Step 11: Firewall Configuration

```bash
# Allow mail ports
sudo ufw allow 25/tcp   # SMTP
sudo ufw allow 587/tcp  # Submission
sudo ufw allow 465/tcp  # SMTPS
sudo ufw allow 80/tcp   # HTTP (for certbot)
sudo ufw allow 443/tcp  # HTTPS

# If using UFW
sudo ufw enable
sudo ufw status
```

## Troubleshooting

### Postfix not receiving emails
```bash
sudo tail -f /var/log/mail.log
sudo postfix check
```

### OpenDKIM not signing
```bash
sudo opendkim-testkey -d yourdomain.com -s default -vvv
sudo systemctl status opendkim
```

### Fail2ban not banning
```bash
sudo fail2ban-client status postfix
sudo tail -f /var/log/fail2ban.log
```

### Test mailpipe manually
```bash
cat test_email.eml | sudo -u postfix /opt/mailpipe/run_mailpipe.sh
```

## Quick Reference: Key Files

- `/etc/postfix/main.cf` - Main Postfix config
- `/etc/postfix/master.cf` - Postfix services config
- `/etc/postfix/virtual` - Virtual mailbox mapping
- `/etc/opendkim.conf` - OpenDKIM config
- `/etc/opendkim/keys/default.private` - DKIM private key
- `/etc/fail2ban/jail.local` - Fail2ban config
- `/opt/mailpipe/mailpipe.py` - Mail pipe script

