#!/bin/bash
# Test script for mailpipe.py

set -e

echo "Testing mailpipe.py..."

# Create test email
cat > /tmp/test_email.eml << 'EOF'
From: test@example.com
To: inbox@yourdomain.com
Subject: Test Email
Date: $(date -R)
Content-Type: text/plain; charset=utf-8

This is a test email body.
EOF

# Test 1: Basic functionality
echo "Test 1: Basic email processing"
cat /tmp/test_email.eml | python3 mailpipe.py
echo "✓ Test 1 passed"

# Test 2: Email with attachment
echo "Test 2: Email with attachment"
cat > /tmp/test_with_attachment.eml << 'EOF'
From: test@example.com
To: inbox@yourdomain.com
Subject: Test with Attachment
Date: $(date -R)
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="boundary123"

--boundary123
Content-Type: text/plain

Email body with attachment.

--boundary123
Content-Disposition: attachment; filename="test.txt"
Content-Type: text/plain

This is a test attachment.
--boundary123--
EOF

cat /tmp/test_with_attachment.eml | python3 mailpipe.py
echo "✓ Test 2 passed"

# Test 3: Check permissions
echo "Test 3: Checking script permissions"
if [ -x mailpipe.py ]; then
    echo "✓ Script is executable"
else
    echo "✗ Script is not executable - run: chmod +x mailpipe.py"
    exit 1
fi

# Test 4: Check backend connectivity
echo "Test 4: Checking backend connectivity"
BACKEND_URL=${MAILPIPE_BACKEND_URL:-http://localhost:8000}
if curl -f -s "${BACKEND_URL}/health" > /dev/null; then
    echo "✓ Backend is reachable"
else
    echo "⚠ Backend is not reachable at ${BACKEND_URL}"
    echo "  Set MAILPIPE_BACKEND_URL environment variable if different"
fi

echo ""
echo "All tests completed!"
echo ""
echo "Next steps:"
echo "1. Set up Postfix virtual map (see postfix_config.md)"
echo "2. Compile virtual map: postmap /etc/postfix/virtual"
echo "3. Reload Postfix: systemctl reload postfix"
echo "4. Send a test email to your domain"

