# DNS Records Configuration Example

Replace `yourdomain.com` and `YOUR_SERVER_IP` with your actual values.

## Required DNS Records

### 1. MX Record

```
Type: MX
Name: @ (or yourdomain.com)
Priority: 10
Value: mail.yourdomain.com
TTL: 3600
```

### 2. A Record for Mail Server

```
Type: A
Name: mail
Value: YOUR_SERVER_IP (e.g., 192.0.2.1)
TTL: 3600
```

### 3. SPF Record (TXT)

```
Type: TXT
Name: @ (or yourdomain.com)
Value: v=spf1 mx a ip4:YOUR_SERVER_IP ~all
TTL: 3600
```

More permissive (allows all servers):
```
v=spf1 mx a ip4:YOUR_SERVER_IP ip6:YOUR_SERVER_IP ~all
```

Strict (only specified):
```
v=spf1 mx a ip4:YOUR_SERVER_IP -all
```

### 4. DKIM Record (TXT)

First, get your DKIM public key:
```bash
sudo cat /etc/opendkim/keys/default.txt
```

Then add to DNS:

```
Type: TXT
Name: default._domainkey
Value: (entire content from default.txt, including quotes if present)
TTL: 3600
```

Example:
```
"v=DKIM1; h=sha256; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
```

### 5. DMARC Record (TXT)

For monitoring (recommended first):
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:admin@yourdomain.com; sp=none; aspf=r;
TTL: 3600
```

For quarantine:
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; sp=quarantine; aspf=r; pct=100
TTL: 3600
```

For rejection (strictest):
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com; ruf=mailto:dmarc@yourdomain.com; sp=reject; aspf=r;
TTL: 3600
```

### 6. PTR Record (Reverse DNS)

**Request from your hosting provider or cloud provider.**

PTR should point:
```
IP: YOUR_SERVER_IP → mail.yourdomain.com
```

## Verification Commands

```bash
# Check MX
dig MX yourdomain.com +short

# Check A record
dig A mail.yourdomain.com +short

# Check SPF
dig TXT yourdomain.com +short | grep spf

# Check DKIM
dig TXT default._domainkey.yourdomain.com +short

# Check DMARC
dig TXT _dmarc.yourdomain.com +short

# Check PTR
dig -x YOUR_SERVER_IP +short
```

## DNS Propagation

- DNS changes typically propagate within 1-24 hours
- Use `dig` to check specific DNS servers
- Online tools: dnschecker.org, mxtoolbox.com

## Testing Tools

- **MXToolbox**: https://mxtoolbox.com/
  - SPF Record Lookup
  - DKIM Record Lookup
  - DMARC Record Lookup
  - Email Header Analyzer

- **Google Admin Toolbox**:
  - https://toolbox.googleapps.com/apps/checkmx/check

- **Mail-Tester**:
  - https://www.mail-tester.com/
  - Send test email to get score

