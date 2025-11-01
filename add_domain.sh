#!/bin/bash
# Script để thêm domain mới vào Postfix và OpenDKIM
# Usage: ./add_domain.sh domain.com

if [ -z "$1" ]; then
    echo "Usage: ./add_domain.sh domain.com"
    echo "Example: ./add_domain.sh tempmail.vn"
    exit 1
fi

DOMAIN=$1
DOMAIN_DIR=$(echo $DOMAIN | tr '.' '_')

echo "========================================"
echo "Adding domain: $DOMAIN"
echo "========================================"

# Backup files
echo "Creating backups..."
sudo cp /etc/postfix/virtual_domains /etc/postfix/virtual_domains.backup.$(date +%Y%m%d_%H%M%S)
sudo cp /etc/postfix/virtual /etc/postfix/virtual.backup.$(date +%Y%m%d_%H%M%S)

# Check if domain already exists
if grep -q "^$DOMAIN" /etc/postfix/virtual_domains; then
    echo "⚠️  Domain $DOMAIN already exists in virtual_domains"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Add to virtual_domains
echo "Adding $DOMAIN to virtual_domains..."
echo "$DOMAIN    OK" | sudo tee -a /etc/postfix/virtual_domains

# Add to virtual (catch-all)
echo "Adding catch-all rule for $DOMAIN..."
echo "@$DOMAIN    pipe:[/opt/mailpipe/run_mailpipe.sh]" | sudo tee -a /etc/postfix/virtual

# Compile maps
echo "Compiling Postfix maps..."
sudo postmap /etc/postfix/virtual_domains
sudo postmap /etc/postfix/virtual

# Check Postfix configuration
echo "Checking Postfix configuration..."
if sudo postfix check; then
    echo "✅ Postfix configuration is valid"
else
    echo "❌ Postfix configuration has errors!"
    echo "Restoring backups..."
    sudo cp /etc/postfix/virtual_domains.backup.* /etc/postfix/virtual_domains
    sudo cp /etc/postfix/virtual.backup.* /etc/postfix/virtual
    exit 1
fi

# Reload Postfix
echo "Reloading Postfix..."
sudo systemctl reload postfix

echo ""
echo "========================================"
echo "Setting up OpenDKIM for $DOMAIN"
echo "========================================"

# Create DKIM keys directory
DKIM_DIR="/etc/opendkim/keys/$DOMAIN_DIR"
echo "Creating DKIM directory: $DKIM_DIR"
sudo mkdir -p "$DKIM_DIR"
sudo chown opendkim:opendkim "$DKIM_DIR"
sudo chmod 700 "$DKIM_DIR"

# Generate DKIM key
echo "Generating DKIM key..."
sudo opendkim-genkey -D "$DKIM_DIR" -d "$DOMAIN" -s default

# Set permissions
sudo chown opendkim:opendkim "$DKIM_DIR/default.*"
sudo chmod 600 "$DKIM_DIR/default.private"
sudo chmod 644 "$DKIM_DIR/default.txt"

# Update OpenDKIM KeyTable
echo "Updating OpenDKIM KeyTable..."
KEY_ENTRY="default._domainkey.$DOMAIN $DOMAIN:default:$DKIM_DIR/default.private"
if ! grep -q "$KEY_ENTRY" /etc/opendkim/KeyTable 2>/dev/null; then
    echo "$KEY_ENTRY" | sudo tee -a /etc/opendkim/KeyTable
else
    echo "⚠️  KeyTable entry already exists"
fi

# Update OpenDKIM SigningTable
echo "Updating OpenDKIM SigningTable..."
SIGNING_ENTRY="*@$DOMAIN default._domainkey.$DOMAIN"
if ! grep -q "$SIGNING_ENTRY" /etc/opendkim/SigningTable 2>/dev/null; then
    echo "$SIGNING_ENTRY" | sudo tee -a /etc/opendkim/SigningTable
else
    echo "⚠️  SigningTable entry already exists"
fi

# Reload OpenDKIM
echo "Reloading OpenDKIM..."
sudo systemctl reload opendkim

# Test DKIM key
echo "Testing DKIM key..."
if sudo opendkim-testkey -d "$DOMAIN" -s default -vvv; then
    echo "✅ DKIM key is valid"
else
    echo "⚠️  DKIM key test failed (may need to wait for DNS propagation)"
fi

echo ""
echo "========================================"
echo "✅ Domain $DOMAIN added successfully!"
echo "========================================"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Add DNS records:"
echo "   MX:   @ → mail.$DOMAIN (priority 10)"
echo "   A:    mail → YOUR_SERVER_IP"
echo "   SPF:  @ → v=spf1 mx a ip4:YOUR_SERVER_IP ~all"
echo ""
echo "2. Add DKIM public key to DNS:"
echo "   Type: TXT"
echo "   Name: default._domainkey"
echo "   Value:"
sudo cat "$DKIM_DIR/default.txt"
echo ""
echo "3. Add DMARC record:"
echo "   Type: TXT"
echo "   Name: _dmarc"
echo "   Value: v=DMARC1; p=none; rua=mailto:admin@$DOMAIN;"
echo ""
echo "4. Request PTR record from your hosting provider"
echo ""
echo "5. Test email delivery:"
echo "   echo 'Test' | mail -s 'Test' test@$DOMAIN"
echo ""
echo "6. Check logs:"
echo "   sudo tail -f /var/log/mail.log | grep $DOMAIN"
echo ""

