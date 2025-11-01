# Hướng Dẫn Quản Lý Domain - Tiếng Việt

## Tổng Quan

Để thêm một domain mới vào hệ thống TempMail, bạn cần:
1. **Quản lý DNS** - Ở nhà cung cấp domain (Namecheap, GoDaddy, Cloudflare, etc.)
2. **Cấu hình Postfix** - Trên server Ubuntu để nhận email

## Phần 1: Quản Lý DNS (Ở Nhà Cung Cấp Domain)

### Bước 1: Xác Định Nhà Cung Cấp

Domain của bạn được mua ở đâu? Đăng nhập vào:
- **Namecheap**: https://www.namecheap.com/ → Advanced DNS
- **GoDaddy**: https://www.godaddy.com/ → DNS Management
- **Cloudflare**: https://dash.cloudflare.com/ → DNS → Records
- **FPT, Mat Bao, P.A**: Trang quản lý của họ

### Bước 2: Thêm DNS Records

Thêm các records sau:

#### ✅ MX Record (Bắt buộc)
```
Type: MX
Name: @ (hoặc để trống)
Priority: 10
Value: mail.yourdomain.com
```

#### ✅ A Record (Mail Server)
```
Type: A
Name: mail
Value: IP_CỦA_VPS (ví dụ: 192.0.2.1)
```

#### ✅ SPF Record
```
Type: TXT
Name: @
Value: v=spf1 mx a ip4:IP_CỦA_VPS ~all
```

#### ✅ DKIM Record (Sau khi tạo key trên server)
```
Type: TXT
Name: default._domainkey
Value: (lấy từ server - xem bước 3)
```

#### ✅ DMARC Record
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:admin@yourdomain.com;
```

## Phần 2: Thêm Domain Vào Server (Postfix)

### Cách 1: Dùng Script Tự Động (Khuyến nghị)

```bash
# Download script
chmod +x add_domain.sh

# Chạy script
sudo ./add_domain.sh yourdomain.com
```

Script sẽ tự động:
- ✅ Thêm domain vào Postfix
- ✅ Tạo DKIM keys
- ✅ Cấu hình OpenDKIM
- ✅ Reload services

### Cách 2: Thêm Thủ Công

#### Bước 1: Thêm vào virtual_domains

```bash
sudo nano /etc/postfix/virtual_domains
```

Thêm dòng:
```
yourdomain.com    OK
```

#### Bước 2: Thêm vào virtual (catch-all)

```bash
sudo nano /etc/postfix/virtual
```

Thêm:
```
@yourdomain.com    pipe:[/opt/mailpipe/run_mailpipe.sh]
```

#### Bước 3: Compile và Reload

```bash
sudo postmap /etc/postfix/virtual_domains
sudo postmap /etc/postfix/virtual
sudo postfix check
sudo systemctl reload postfix
```

#### Bước 4: Tạo DKIM Key

```bash
# Tạo thư mục
sudo mkdir -p /etc/opendkim/keys/yourdomain
sudo chown opendkim:opendkim /etc/opendkim/keys/yourdomain
sudo chmod 700 /etc/opendkim/keys/yourdomain

# Generate key
sudo opendkim-genkey -D /etc/opendkim/keys/yourdomain -d yourdomain.com -s default

# Set permissions
sudo chown opendkim:opendkim /etc/opendkim/keys/yourdomain/default.*
sudo chmod 600 /etc/opendkim/keys/yourdomain/default.private

# Xem public key (copy vào DNS)
sudo cat /etc/opendkim/keys/yourdomain/default.txt
```

#### Bước 5: Update OpenDKIM Config

```bash
sudo nano /etc/opendkim/KeyTable
```

Thêm:
```
default._domainkey.yourdomain.com yourdomain.com:default:/etc/opendkim/keys/yourdomain/default.private
```

```bash
sudo nano /etc/opendkim/SigningTable
```

Thêm:
```
*@yourdomain.com default._domainkey.yourdomain.com
```

```bash
sudo systemctl reload opendkim
```

## Ví Dụ Cụ Thể: Thêm Domain tempmail.vn

### 1. Trên Server (Ubuntu)

```bash
# Dùng script tự động
sudo ./add_domain.sh tempmail.vn

# Hoặc thủ công:
echo "tempmail.vn    OK" | sudo tee -a /etc/postfix/virtual_domains
echo "@tempmail.vn    pipe:[/opt/mailpipe/run_mailpipe.sh]" | sudo tee -a /etc/postfix/virtual
sudo postmap /etc/postfix/virtual_domains
sudo postmap /etc/postfix/virtual
sudo systemctl reload postfix
```

### 2. Ở Nhà Cung Cấp DNS

Đăng nhập và thêm:

**MX Record:**
- Type: MX
- Name: @
- Priority: 10
- Value: mail.tempmail.vn

**A Record:**
- Type: A
- Name: mail
- Value: 192.0.2.1 (IP của VPS)

**SPF:**
- Type: TXT
- Name: @
- Value: `v=spf1 mx a ip4:192.0.2.1 ~all`

**DKIM:** (Sau khi chạy script, lấy từ output)
- Type: TXT
- Name: default._domainkey
- Value: (copy từ output của script)

**DMARC:**
- Type: TXT
- Name: _dmarc
- Value: `v=DMARC1; p=none; rua=mailto:admin@tempmail.vn;`

## Kiểm Tra Domain Đã Hoạt Động

### Test DNS

```bash
# Kiểm tra MX
dig MX tempmail.vn

# Kiểm tra A
dig A mail.tempmail.vn

# Kiểm tra SPF
dig TXT tempmail.vn | grep spf

# Kiểm tra DKIM
dig TXT default._domainkey.tempmail.vn
```

### Test Gửi Email

```bash
# Gửi test email
echo "Test email" | mail -s "Test" test@tempmail.vn

# Xem logs
sudo tail -f /var/log/mail.log | grep tempmail.vn
```

### Test Trong Frontend

1. Mở frontend: http://your-server:3000
2. Tạo inbox với email `test@tempmail.vn`
3. Gửi email đến địa chỉ đó
4. Kiểm tra email xuất hiện trong inbox

## Quản Lý Nhiều Domain

### List Tất Cả Domains

```bash
# Xem tất cả domains đã thêm
sudo postmap -s /etc/postfix/virtual_domains
```

### Thêm Nhiều Domain Cùng Lúc

```bash
# Tạo file domains.txt
cat > domains.txt << EOF
domain1.com
domain2.com
domain3.com
EOF

# Thêm từng domain
while read domain; do
    sudo ./add_domain.sh $domain
done < domains.txt
```

### Xóa Domain

```bash
# Xóa khỏi virtual_domains
sudo sed -i '/^domain.com/d' /etc/postfix/virtual_domains

# Xóa khỏi virtual
sudo sed -i '/@domain.com/d' /etc/postfix/virtual

# Compile lại
sudo postmap /etc/postfix/virtual_domains
sudo postmap /etc/postfix/virtual
sudo systemctl reload postfix
```

## Troubleshooting

### Domain không nhận được email

**Check 1: DNS MX Record**
```bash
dig MX yourdomain.com
# Phải trả về mail.yourdomain.com
```

**Check 2: Postfix Virtual Mapping**
```bash
sudo postmap -q @yourdomain.com /etc/postfix/virtual
# Phải trả về pipe command
```

**Check 3: Logs**
```bash
sudo tail -f /var/log/mail.log
# Xem có lỗi gì không
```

### Email bị reject

- ✅ Kiểm tra SPF record
- ✅ Kiểm tra DKIM key
- ✅ Kiểm tra PTR record (reverse DNS)
- ✅ Kiểm tra reputation của IP

## Tóm Tắt Quy Trình

```
1. Mua domain (nếu chưa có)
   ↓
2. SSH vào VPS Ubuntu
   ↓
3. Chạy: sudo ./add_domain.sh yourdomain.com
   ↓
4. Copy DKIM key từ output
   ↓
5. Vào nhà cung cấp DNS, thêm:
   - MX record
   - A record (mail)
   - SPF (TXT)
   - DKIM (TXT)
   - DMARC (TXT)
   ↓
6. Đợi DNS propagate (5-30 phút)
   ↓
7. Test gửi email
   ↓
8. Kiểm tra trong frontend
```

## Lưu Ý

1. **DNS Propagation**: Sau khi thêm DNS records, phải đợi 5-30 phút để propagate
2. **Backup**: Luôn backup config trước khi sửa
3. **Test**: Test từng domain một trước khi thêm nhiều domain
4. **DKIM**: Mỗi domain nên có DKIM key riêng (an toàn hơn)

