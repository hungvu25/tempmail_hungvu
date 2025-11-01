# Quản Lý Domain - Hướng Dẫn Thêm Domain Vào Hệ Thống

## Tổng Quan

Có 2 phần cần quản lý domain:
1. **DNS Records** - Ở nhà cung cấp domain (Namecheap, GoDaddy, Cloudflare, etc.)
2. **Postfix Configuration** - Trên server để nhận email cho domain đó

## Phần 1: Quản Lý DNS Records (Ở Nhà Cung Cấp Domain)

### Bước 1: Xác Định Nhà Cung Cấp Domain

Domain của bạn đã được mua ở đâu?
- **Namecheap**: https://www.namecheap.com/
- **GoDaddy**: https://www.godaddy.com/
- **Cloudflare**: https://www.cloudflare.com/
- **FPT, Mat Bao, P.A Việt Nam**: Các nhà cung cấp Việt Nam
- **Domain khác**: Kiểm tra email khi mua domain

### Bước 2: Đăng Nhập Vào DNS Manager

1. Đăng nhập vào tài khoản nhà cung cấp domain
2. Tìm phần "DNS Management" hoặc "DNS Settings"
3. Chọn domain cần quản lý

### Bước 3: Thêm DNS Records Cần Thiết

Cần thêm các records sau:

#### A) MX Record (Bắt buộc - để nhận email)

```
Type: MX
Name: @ (hoặc để trống)
Priority: 10
Value: mail.yourdomain.com
TTL: 3600 (hoặc Auto)
```

#### B) A Record cho Mail Server

```
Type: A
Name: mail
Value: YOUR_SERVER_IP (IP của VPS Ubuntu)
TTL: 3600
```

#### C) SPF Record

```
Type: TXT
Name: @
Value: v=spf1 mx a ip4:YOUR_SERVER_IP ~all
TTL: 3600
```

#### D) DKIM Record

Sau khi setup OpenDKIM trên server, lấy public key:
```bash
sudo cat /etc/opendkim/keys/default.txt
```

Thêm vào DNS:
```
Type: TXT
Name: default._domainkey
Value: (copy toàn bộ nội dung từ default.txt)
```

#### E) DMARC Record

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:admin@yourdomain.com; sp=none;
TTL: 3600
```

## Phần 2: Thêm Domain Vào Postfix

### Bước 1: Thêm Domain Vào Virtual Domains

Edit file `/etc/postfix/virtual_domains`:

```bash
sudo nano /etc/postfix/virtual_domains
```

Thêm dòng mới cho mỗi domain:
```
yourdomain.com    OK
domain2.com       OK
domain3.com       OK
```

### Bước 2: Thêm Catch-All Rule Cho Domain

Edit file `/etc/postfix/virtual`:

```bash
sudo nano /etc/postfix/virtual
```

Thêm cho mỗi domain:
```
# Domain 1
@yourdomain.com    pipe:[/opt/mailpipe/run_mailpipe.sh]

# Domain 2
@domain2.com       pipe:[/opt/mailpipe/run_mailpipe.sh]

# Domain 3 - Specific addresses
test@domain3.com   pipe:[/opt/mailpipe/run_mailpipe.sh]
inbox@domain3.com  pipe:[/opt/mailpipe/run_mailpipe.sh]
*@domain3.com      pipe:[/opt/mailpipe/run_mailpipe.sh]
```

**Format:**
- `@domain.com` = Catch-all (tất cả email đến domain này)
- `test@domain.com` = Chỉ address cụ thể
- `*@domain.com` = Catch-all (giống @domain.com)

### Bước 3: Compile và Reload Postfix

```bash
# Compile virtual maps
sudo postmap /etc/postfix/virtual_domains
sudo postmap /etc/postfix/virtual

# Check configuration
sudo postfix check

# Reload Postfix
sudo systemctl reload postfix
```

### Bước 4: Cập Nhật OpenDKIM (Nếu dùng nhiều domain)

#### Option A: Mỗi domain một selector riêng (Khuyến nghị)

```bash
# Tạo key cho domain mới
sudo mkdir -p /etc/opendkim/keys/domain2
sudo chown opendkim:opendkim /etc/opendkim/keys/domain2
sudo chmod 700 /etc/opendkim/keys/domain2

# Generate key
sudo opendkim-genkey -D /etc/opendkim/keys/domain2 -d domain2.com -s default

# Set permissions
sudo chown opendkim:opendkim /etc/opendkim/keys/domain2/default.*
sudo chmod 600 /etc/opendkim/keys/domain2/default.private
```

Update `/etc/opendkim/KeyTable`:
```
default._domainkey.yourdomain.com yourdomain.com:default:/etc/opendkim/keys/default.private
default._domainkey.domain2.com domain2.com:default:/etc/opendkim/keys/domain2/default.private
```

Update `/etc/opendkim/SigningTable`:
```
*@yourdomain.com default._domainkey.yourdomain.com
*@domain2.com default._domainkey.domain2.com
```

#### Option B: Dùng chung một key (Đơn giản hơn)

Chỉ cần thêm domain vào `/etc/opendkim/SigningTable`:
```
*@yourdomain.com default._domainkey.yourdomain.com
*@domain2.com default._domainkey.yourdomain.com
*@domain3.com default._domainkey.yourdomain.com
```

Reload OpenDKIM:
```bash
sudo systemctl reload opendkim
```

## Phần 3: Quản Lý Domain Trong Backend (Optional)

### Thêm Domain vào Database

Có thể tạo API endpoint để quản lý domains trong backend. Thêm vào `app/models.py`:

```python
class Domain(Base):
    __tablename__ = "domains"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    domain_name = Column(String, unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
```

Và tạo router để quản lý.

## Script Tự Động Thêm Domain

Tạo file `add_domain.sh`:

```bash
#!/bin/bash
# Script để thêm domain mới vào Postfix

if [ -z "$1" ]; then
    echo "Usage: ./add_domain.sh domain.com"
    exit 1
fi

DOMAIN=$1

# Backup files
sudo cp /etc/postfix/virtual_domains /etc/postfix/virtual_domains.backup
sudo cp /etc/postfix/virtual /etc/postfix/virtual.backup

# Add to virtual_domains
echo "$DOMAIN    OK" | sudo tee -a /etc/postfix/virtual_domains

# Add to virtual (catch-all)
echo "@$DOMAIN    pipe:[/opt/mailpipe/run_mailpipe.sh]" | sudo tee -a /etc/postfix/virtual

# Compile maps
sudo postmap /etc/postfix/virtual_domains
sudo postmap /etc/postfix/virtual

# Reload Postfix
sudo systemctl reload postfix

echo "Domain $DOMAIN đã được thêm thành công!"
echo ""
echo "Bước tiếp theo:"
echo "1. Thêm DNS records (MX, A, SPF, DKIM, DMARC)"
echo "2. Generate DKIM key: sudo opendkim-genkey -D /etc/opendkim/keys/$DOMAIN -d $DOMAIN -s default"
echo "3. Update OpenDKIM config"
echo "4. Thêm DKIM public key vào DNS"
```

Chạy:
```bash
chmod +x add_domain.sh
sudo ./add_domain.sh yourdomain.com
```

## Ví Dụ Cụ Thể

### Thêm Domain: tempmail.vn

#### 1. DNS Records (Ở nhà cung cấp domain)

```
MX: @ → mail.tempmail.vn (10)
A: mail → 192.0.2.1
TXT: @ → v=spf1 mx a ip4:192.0.2.1 ~all
TXT: default._domainkey → (từ server)
TXT: _dmarc → v=DMARC1; p=none; rua=mailto:admin@tempmail.vn;
```

#### 2. Trên Server

```bash
# Add to virtual_domains
echo "tempmail.vn    OK" | sudo tee -a /etc/postfix/virtual_domains

# Add to virtual
echo "@tempmail.vn    pipe:[/opt/mailpipe/run_mailpipe.sh]" | sudo tee -a /etc/postfix/virtual

# Compile
sudo postmap /etc/postfix/virtual_domains
sudo postmap /etc/postfix/virtual

# Reload
sudo systemctl reload postfix

# Generate DKIM key
sudo mkdir -p /etc/opendkim/keys/tempmail
sudo opendkim-genkey -D /etc/opendkim/keys/tempmail -d tempmail.vn -s default
sudo chown opendkim:opendkim /etc/opendkim/keys/tempmail/default.*
sudo chmod 600 /etc/opendkim/keys/tempmail/default.private

# View public key
sudo cat /etc/opendkim/keys/tempmail/default.txt
```

#### 3. Update OpenDKIM Config

Edit `/etc/opendkim/KeyTable`:
```
default._domainkey.tempmail.vn tempmail.vn:default:/etc/opendkim/keys/tempmail/default.private
```

Edit `/etc/opendkim/SigningTable`:
```
*@tempmail.vn default._domainkey.tempmail.vn
```

```bash
sudo systemctl reload opendkim
```

## Kiểm Tra Domain Đã Hoạt Động

### Test DNS Records

```bash
# Check MX
dig MX tempmail.vn

# Check A
dig A mail.tempmail.vn

# Check SPF
dig TXT tempmail.vn | grep spf

# Check DKIM
dig TXT default._domainkey.tempmail.vn

# Check DMARC
dig TXT _dmarc.tempmail.vn
```

### Test Nhận Email

```bash
# Gửi test email
echo "Test" | mail -s "Test" test@tempmail.vn

# Check logs
sudo tail -f /var/log/mail.log | grep tempmail.vn

# Check mailpipe
sudo journalctl -u postfix -f | grep tempmail.vn
```

### Test Trong Frontend

1. Tạo inbox với email `test@tempmail.vn`
2. Gửi email đến địa chỉ đó
3. Kiểm tra email xuất hiện trong inbox

## Troubleshooting

### Domain không nhận được email

**Check 1: DNS Records**
```bash
dig MX yourdomain.com
# Phải trả về mail.yourdomain.com
```

**Check 2: Postfix Config**
```bash
sudo postmap /etc/postfix/virtual_domains
sudo postmap /etc/postfix/virtual
sudo postfix check
```

**Check 3: Virtual Mapping**
```bash
sudo postmap -q @yourdomain.com /etc/postfix/virtual
# Phải trả về pipe command
```

**Check 4: Logs**
```bash
sudo tail -f /var/log/mail.log
# Xem có lỗi gì không
```

### Email bị reject

- Kiểm tra SPF, DKIM, DMARC records
- Kiểm tra PTR record (reverse DNS)
- Kiểm tra reputation của IP

### Domain không có trong virtual_domains

```bash
# List all domains
sudo postmap -s /etc/postfix/virtual_domains
```

## Best Practices

1. **Một domain = Một DKIM key riêng** (an toàn hơn)
2. **Luôn backup config trước khi sửa**
3. **Test từng domain một** trước khi thêm nhiều domain
4. **Monitor logs** sau khi thêm domain mới
5. **Verify DNS** trước khi test email

## Quản Lý Nhiều Domain

### File Structure

```
/etc/postfix/
├── virtual_domains        # List tất cả domains
├── virtual                # Mapping emails → pipe command
└── virtual_domains.backup

/etc/opendkim/keys/
├── domain1/
│   └── default.private
├── domain2/
│   └── default.private
└── domain3/
    └── default.private
```

### Automation Script

Tạo script để quản lý nhiều domains dễ dàng hơn. Xem `add_domain.sh` ở trên.

## Tóm Tắt Quy Trình

1. ✅ **Mua domain** (nếu chưa có)
2. ✅ **Thêm DNS records** (MX, A, SPF, DKIM, DMARC)
3. ✅ **Thêm domain vào Postfix** (`virtual_domains` + `virtual`)
4. ✅ **Generate DKIM keys** cho domain
5. ✅ **Update OpenDKIM config**
6. ✅ **Reload services** (Postfix, OpenDKIM)
7. ✅ **Test** gửi/nhận email
8. ✅ **Verify** DNS propagation

