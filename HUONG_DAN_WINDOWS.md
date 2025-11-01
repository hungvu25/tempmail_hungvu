# Hướng Dẫn Chạy TempMail Trên Windows (Tiếng Việt)

## 🚀 Cài Đặt Nhanh

### Bước 1: Cài Đặt Phần Mềm Cần Thiết

1. **Python 3.11+**: https://www.python.org/downloads/
   - ✅ Nhớ tick "Add Python to PATH"
   
2. **Node.js 20+**: https://nodejs.org/

3. **PostgreSQL (Tùy chọn)**: https://www.postgresql.org/download/windows/
   - Hoặc dùng SQLite (đơn giản hơn, không cần cài)

### Bước 2: Clone/Mở Project

Mở Command Prompt hoặc PowerShell tại thư mục project:
```bash
cd C:\Users\admin\Desktop\tempmail_hungvu
```

### Bước 3: Setup Backend

```bash
# 1. Tạo virtual environment
python -m venv venv

# 2. Activate virtual environment
venv\Scripts\activate

# 3. Cài đặt packages
pip install -r requirements.txt

# 4. Tạo file .env (copy từ .env.windows.example)
copy .env.windows.example .env

# 5. Tạo thư mục
mkdir storage
mkdir storage\attachments
mkdir data

# 6. Chạy migrations (nếu dùng SQLite có thể bỏ qua)
alembic upgrade head

# 7. Chạy backend
uvicorn app.main:app --reload --port 8000
```

### Bước 4: Setup Frontend (Terminal mới)

```bash
# 1. Vào thư mục frontend
cd frontend

# 2. Cài đặt dependencies
npm install

# 3. Tạo file .env
echo VITE_API_URL=http://localhost:8000 > .env
echo VITE_WS_URL=ws://localhost:8000 >> .env

# 4. Chạy frontend
npm run dev
```

### Bước 5: Mở Trình Duyệt

- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs

## 📝 Cách Test

### 1. Tạo Inbox

1. Mở http://localhost:3000
2. Nhập email (ví dụ: `test@example.com`) hoặc click "Generate"
3. Click "Create Inbox"
4. Copy email address được tạo

### 2. Gửi Test Email

**Cách 1: Dùng Script Python**

```bash
# Đảm bảo backend đang chạy
python test_send_email.py test@example.com
```

**Cách 2: Dùng API Docs**

1. Mở http://localhost:8000/docs
2. Vào endpoint `/api/inbound/mail`
3. Click "Try it out"
4. Upload file `test_email.txt` (sửa email trong file trước)
5. Click "Execute"

**Cách 3: Dùng Postman**

- Method: POST
- URL: `http://localhost:8000/api/inbound/mail`
- Body → form-data → Key: `email`, Type: File → Chọn `test_email.txt`

### 3. Xem Email Đã Nhận

1. Refresh trang inbox trên frontend
2. Hoặc vào http://localhost:8000/docs → `/api/messages/inbox/{inbox_id}`

## ⚡ Chạy Nhanh với Script

Double-click file `run_dev.bat` để tự động:
- Activate virtual environment
- Start backend server
- Start frontend server

## 🔧 Cấu Hình

### Database: SQLite (Khuyến nghị cho test)

File `.env`:
```env
DATABASE_URL=sqlite:///./data/tempmail.db
DEBUG=true
```

### Database: PostgreSQL

1. Khởi động PostgreSQL service
2. Tạo database:
   ```sql
   CREATE DATABASE tempmail;
   ```
3. File `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/tempmail
   ```

## 🐛 Troubleshooting

### Backend không chạy

**Lỗi: Module not found**
```bash
venv\Scripts\activate
pip install -r requirements.txt
```

**Lỗi: Port 8000 đã dùng**
```bash
# Đổi port
uvicorn app.main:app --reload --port 8001
# Và update VITE_API_URL trong frontend/.env
```

**Lỗi: Database connection**
- Kiểm tra file `.env` có đúng không
- Nếu SQLite: đảm bảo thư mục `data` đã tạo
- Nếu PostgreSQL: kiểm tra service đã chạy

### Frontend không chạy

**Lỗi: Cannot connect to backend**
- Kiểm tra backend đang chạy
- Kiểm tra `frontend/.env` file
- Kiểm tra CORS trong backend

### Không gửi được email

- Đảm bảo backend đang chạy
- Kiểm tra email address đúng với inbox đã tạo
- Xem logs trong terminal backend

## 📋 Checklist Test

- [ ] Backend chạy được (http://localhost:8000/docs)
- [ ] Frontend chạy được (http://localhost:3000)
- [ ] Tạo inbox thành công
- [ ] Gửi test email thành công
- [ ] Xem được email trong inbox
- [ ] Xem được message details
- [ ] Download attachment (nếu có)
- [ ] WebSocket real-time updates hoạt động

## 📂 Cấu Trúc Thư Mục

```
tempmail_hungvu/
├── venv/                    # Python virtual environment
├── app/                     # Backend code
├── frontend/                # Frontend code
├── storage/                 # Storage
│   └── attachments/        # Attachments
├── data/                    # SQLite database
├── .env                     # Backend config
├── frontend/.env            # Frontend config
├── run_dev.bat              # Script chạy nhanh
└── test_send_email.py       # Script test email
```

## 🚀 Sau Khi Test Thành Công

1. **Deploy lên VPS Ubuntu**
   - Follow `POSTFIX_SETUP.md`
   - Setup Postfix, OpenDKIM, DNS records

2. **Production Setup**
   - Dùng PostgreSQL
   - Setup SSL
   - Configure reverse proxy

## 💡 Tips

- Giữ 2 terminal windows: 1 cho backend, 1 cho frontend
- Dùng `run_dev.bat` để chạy cả 2 cùng lúc
- Check logs trong terminal để debug
- API docs ở http://localhost:8000/docs rất hữu ích để test

## 📞 Cần Giúp?

- Check logs trong terminal
- Xem `WINDOWS_SETUP.md` (tiếng Anh, chi tiết hơn)
- Test từng bước một, không làm tất cả cùng lúc

