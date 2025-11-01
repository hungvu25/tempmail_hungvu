# Hướng dẫn Setup TempMail

## 1. TempMail là gì?

TempMail là dịch vụ email tạm thời giúp:
- Tạo email ảo để đăng ký dịch vụ
- Bảo vệ email thật khỏi spam
- Nhận email xác thực mà không lộ thông tin
- Tự động xóa sau thời gian nhất định

## 2. Cấu hình Domain

### Bước 1: Cập nhật file .env
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_EMAIL_DOMAIN=tempmail.com  # Domain cho email tạm thời
```

### Bước 2: Thêm domain vào server
```bash
# Chạy script trong thư mục gốc
./add_domain.sh tempmail.com
```

## 2. Cấu hình DNS Records

Thêm các DNS records sau tại nhà cung cấp domain:

```
# MX Record - Để nhận email
Type: MX
Name: @
Value: mail.yourdomain.com
Priority: 10

# A Record - Cho mail server
Type: A
Name: mail
Value: [IP_SERVER_CUA_BAN]

# SPF Record - Chống spam
Type: TXT
Name: @
Value: v=spf1 mx ~all

# DMARC Record (Optional)
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

## 3. Test Domain

### Test DNS:
```bash
# Kiểm tra MX record
nslookup -type=MX yourdomain.com

# Hoặc dùng dig
dig MX yourdomain.com
```

### Test gửi email:
```bash
# Gửi email test
echo "Test email content" | mail -s "Test Subject" 123456@yourdomain.com

# Xem logs
sudo tail -f /var/log/mail.log
```

## 4. Chạy Frontend

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 5. Chạy với Docker

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose up -d
```

## Tính năng đã có:

✅ Giao diện giống ảnh mẫu với nút "LẤY MÃ"
✅ Tự động tạo mã 6 chữ số
✅ Hiển thị email address đầy đủ
✅ Copy email vào clipboard
✅ Điều hướng đến inbox để xem tin nhắn
✅ Giao diện responsive
✅ Tiếng Việt

## Lưu ý:

1. Thay `yourdomain.com` bằng domain thật của bạn
2. Đảm bảo server đã cấu hình Postfix đúng
3. DNS records cần thời gian để propagate (5-60 phút)
4. Kiểm tra firewall cho port 25 (SMTP)