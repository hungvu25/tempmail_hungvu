#!/bin/bash
# Quick setup script - Run with caution!
# Review each section before executing

set -e

DOMAIN="yourdomain.com"  # CHANGE THIS
MAILHOST="mail.$DOMAIN"    # CHANGE THIS
SERVER_IP=""              # CHANGE THIS

echo "=== Postfix Email Server Setup ==="
echo "Domain: $DOMAIN"
echo "Mail Host: $MAILHOST"
echo "Server IP: $SERVER_IP"
echo ""
read -p "Press Enter to continue or Ctrl+C to abort..."

# Step 1: Install packages
echo "Step 1: Installing packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y postfix postfix-pcre mailutils opendkim opendkim-tools certbot fail2ban python3 python3-pip

# Step 2: Setup mailpipe
echo "Step 2: Setting up mailpipe..."
sudo mkdir -p /opt/mailpipe
sudo cp mailpipe.py /opt/mailpipe/
sudo chmod +x /opt/mailpipe/mailpipe.py

sudo tee /opt/mailpipe/run_mailpipe.sh > /dev/null << 'EOF'
#!/bin/bash
export MAILPIPE_BACKEND_URL="http://localhost:8000"
export MAX_EMAIL_SIZE_MB=10
export MAX_ATTACHMENT_SIZE_MB=5
export TEMP_DIR="/tmp/mailpipe"
/opt/mailpipe/mailpipe.py
EOF

sudo chmod +x /opt/mailpipe/run_mailpipe.sh
sudo pip3 install requests

# Step 3: Configure Postfix virtual domains
echo "Step 3: Configuring Postfix virtual domains..."
sudo tee /etc/postfix/virtual_domains > /dev/null << EOF
$DOMAIN    OK
EOF

sudo tee /etc/postfix/virtual > /dev/null << EOF
@$DOMAIN    pipe:[/opt/mailpipe/run_mailpipe.sh]
EOF

sudo postmap /etc/postfix/virtual_domains
sudo postmap /etc/postfix/virtual

# Step 4: Setup OpenDKIM
echo "Step 4: Setting up OpenDKIM..."
sudo mkdir -p /etc/opendkim/keys
sudo chown opendkim:opendkim /etc/opendkim/keys
sudo chmod 700 /etc/opendkim/keys

sudo tee /etc/opendkim/TrustedHosts > /dev/null << EOF
127.0.0.1
localhost
::1
$DOMAIN
*.$DOMAIN
EOF

sudo opendkim-genkey -D /etc/opendkim/keys -d $DOMAIN -s default
sudo chown opendkim:opendkim /etc/opendkim/keys/default.*
sudo chmod 600 /etc/opendkim/keys/default.private
sudo chmod 644 /etc/opendkim/keys/default.txt

# Step 5: Configure OpenDKIM
sudo tee /etc/opendkim/KeyTable > /dev/null << EOF
default._domainkey.$DOMAIN $DOMAIN:default:/etc/opendkim/keys/default.private
EOF

sudo tee /etc/opendkim/SigningTable > /dev/null << EOF
*@$DOMAIN default._domainkey.$DOMAIN
EOF

# Step 6: Display DKIM key
echo ""
echo "=== DKIM Public Key (add to DNS) ==="
echo "Type: TXT"
echo "Name: default._domainkey"
sudo cat /etc/opendkim/keys/default.txt
echo ""

# Step 7: Setup certbot
echo "Step 7: Setting up TLS certificate..."
echo "You need to run certbot manually:"
echo "sudo certbot certonly --standalone -d $MAILHOST"

# Step 8: Start services
echo "Step 8: Starting services..."
sudo systemctl enable opendkim postfix fail2ban
sudo systemctl restart opendkim postfix fail2ban

echo ""
echo "=== Setup Complete ==="
echo "Next steps:"
echo "1. Edit /etc/postfix/main.cf (see postfix/main.cf.minimal)"
echo "2. Edit /etc/postfix/master.cf (see postfix/master.cf.additions)"
echo "3. Run: sudo certbot certonly --standalone -d $MAILHOST"
echo "4. Update DNS records (MX, SPF, DKIM, DMARC, PTR)"
echo "5. Request PTR record from your provider"
echo "6. Configure Fail2ban (see POSTFIX_SETUP.md)"

