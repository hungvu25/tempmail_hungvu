# 📧 TempMail - Hướng dẫn Setup

## 🎯 TempMail là gì?

TempMail là dịch vụ email tạm thời giúp:
- 🛡️ Tạo email ảo để đăng ký dịch vụ
- 🚫 Bảo vệ email thật khỏi spam
- ✉️ Nhận email xác thực mà không lộ thông tin
- 🗑️ Tự động xóa sau thời gian nhất định

## ⚙️ Cấu hình Domain

### Bước 1: Cập nhật file .env
```bash
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_EMAIL_DOMAIN=tempmail.com  # Domain cho email tạm thời
```

### Bước 2: Thêm domain vào server
```bash
# Chạy script trong thư mục gốc
./add_domain.sh tempmail.com
```

## 🌐 Cấu hình DNS Records

Thêm các DNS records sau tại nhà cung cấp domain:

```dns
# MX Record - Để nhận email
Type: MX
Name: @
Value: mail.tempmail.com
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
Value: v=DMARC1; p=none; rua=mailto:dmarc@tempmail.com
```

## 🧪 Test Domain

### Test DNS:
```bash
# Kiểm tra MX record
nslookup -type=MX tempmail.com

# Hoặc dùng dig
dig MX tempmail.com
```

### Test gửi email:
```bash
# Gửi email test
echo "Test email content" | mail -s "Test Subject" test123@tempmail.com

# Xem logs
sudo tail -f /var/log/mail.log
```

## 🚀 Chạy Frontend

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

## 🐳 Chạy với Docker

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose up -d
```

## ✅ Tính năng hiện có:

- 🎨 Giao diện đẹp, dễ sử dụng
- 🔀 Tạo email tạm thời ngẫu nhiên 
- 📋 Copy email vào clipboard
- 📬 Xem inbox real-time
- 📨 Nhận email từ bất kỳ nguồn nào
- ⏰ Auto-delete sau 24h
- 📱 Responsive design
- 🇻🇳 Tiếng Việt

## 🎯 Use Cases:

- 📝 Đăng ký dịch vụ thử nghiệm
- 📥 Download file cần email xác thực
- 📰 Đăng ký newsletter tạm thời
- 🧪 Test email functionality
- 🛡️ Bảo vệ email chính khỏi spam

## ⚠️ Lưu ý bảo mật:

### 🚫 Không sử dụng cho:
- 🏦 Tài khoản ngân hàng
- 💎 Email quan trọng
- 🔐 Thông tin cá nhân nhạy cảm
- 💰 Tài khoản có giá trị cao

### ✅ Phù hợp cho:
- 🆓 Đăng ký dịch vụ thử nghiệm
- 📁 Download tài liệu
- 📧 Newsletter tạm thời
- 🌐 Test website

## 🔧 Troubleshooting

### Email không nhận được:
1. Kiểm tra DNS records
2. Xem mail logs: `sudo tail -f /var/log/mail.log`
3. Kiểm tra firewall port 25
4. Verify domain propagation

### Frontend không connect được backend:
1. Kiểm tra VITE_API_URL trong .env
2. Đảm bảo backend đang chạy
3. Check CORS settings

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
- Logs trong `/var/log/mail.log`
- Browser console errors
- Network connectivity
- Domain DNS propagation