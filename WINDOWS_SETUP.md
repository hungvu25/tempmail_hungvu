# Hướng Dẫn Chạy TempMail Trên Windows

## Chuẩn Bị

### 1. Cài Đặt Python 3.11+

Download từ: https://www.python.org/downloads/
- ✅ Tick "Add Python to PATH" khi cài đặt
- Kiểm tra: `python --version` trong Command Prompt

### 2. Cài Đặt Node.js 20+

Download từ: https://nodejs.org/
- Kiểm tra: `node --version` và `npm --version`

### 3. Cài Đặt PostgreSQL (Hoặc dùng SQLite)

**Option 1: PostgreSQL (Khuyến nghị)**
- Download: https://www.postgresql.org/download/windows/
- Hoặc dùng Portable: https://www.postgresql.org/download/windows/ (không cần cài)
- Ghi nhớ password khi cài đặt

**Option 2: SQLite (Đơn giản hơn cho test)**
- SQLite đã có sẵn với Python, không cần cài thêm

### 4. Cài Đặt Git (Optional)

Download từ: https://git-scm.com/download/win

## Setup Backend (FastAPI)

### Bước 1: Tạo Virtual Environment

Mở Command Prompt hoặc PowerShell, vào thư mục project:

```bash
cd C:\Users\admin\Desktop\tempmail_hungvu

# Tạo virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Bạn sẽ thấy (venv) ở đầu dòng command
```

### Bước 2: Cài Đặt Dependencies

```bash
# Cài đặt packages
pip install -r requirements.txt

# Nếu có lỗi với psycopg2, dùng:
pip install psycopg2-binary
```

### Bước 3: Cấu Hình Database

**Option A: Dùng SQLite (Đơn giản - Khuyến nghị cho test)**

Tạo file `.env` trong thư mục gốc:

```env
# .env file
DATABASE_URL=sqlite:///./data/tempmail.db
DEBUG=true
STORAGE_PATH=./storage
ATTACHMENTS_PATH=./storage/attachments
MAX_INBOX_LIFETIME_HOURS=24
MAX_ATTACHMENT_SIZE_MB=5
MAX_EMAIL_SIZE_MB=10
CLEANUP_INTERVAL_MINUTES=60
```

**Cần sửa database.py để hỗ trợ SQLite:**

Sửa file `app/database.py`:

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Support both PostgreSQL and SQLite
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL.replace("sqlite://", "sqlite:///"),
        connect_args={"check_same_thread": False}  # SQLite specific
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        echo=settings.DEBUG
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Option B: Dùng PostgreSQL**

1. Khởi động PostgreSQL service
2. Tạo database:
   ```sql
   CREATE DATABASE tempmail;
   CREATE USER tempmail WITH PASSWORD 'tempmail';
   GRANT ALL PRIVILEGES ON DATABASE tempmail TO tempmail;
   ```
3. File `.env`:
   ```env
   DATABASE_URL=postgresql://tempmail:tempmail@localhost:5432/tempmail
   ```

### Bước 4: Chạy Migrations

```bash
# Chạy migrations
alembic upgrade head
```

Nếu dùng SQLite, có thể bỏ qua bước này (tables sẽ tự tạo).

### Bước 5: Tạo Thư Mục Storage

```bash
mkdir storage
mkdir storage\attachments
```

### Bước 6: Chạy Backend Server

```bash
# Đảm bảo virtual environment đã activate
venv\Scripts\activate

# Chạy server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server sẽ chạy tại: http://localhost:8000
API docs: http://localhost:8000/docs

## Setup Frontend (React)

### Bước 1: Vào Thư Mục Frontend

```bash
cd frontend
```

### Bước 2: Cài Đặt Dependencies

```bash
npm install
```

### Bước 3: Tạo File .env

Tạo file `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### Bước 4: Chạy Frontend

```bash
npm run dev
```

Frontend sẽ chạy tại: http://localhost:3000

## Test Ứng Dụng

### 1. Test Backend API

Mở browser: http://localhost:8000/docs

**Test tạo inbox:**
1. Vào `/api/inboxes/` POST endpoint
2. Click "Try it out"
3. Nhập email: `test@example.com`
4. Click "Execute"
5. Copy `id` từ response

**Test lấy messages:**
1. Vào `/api/messages/inbox/{inbox_id}`
2. Paste `id` vào `inbox_id`
3. Execute

### 2. Test Frontend

Mở: http://localhost:3000

1. Tạo inbox mới
2. Copy email address được tạo
3. Gửi test email (xem phần dưới)

### 3. Test Gửi Email (Mock)

Vì trên Windows không có Postfix, ta sẽ test bằng cách gửi HTTP request trực tiếp:

**Tạo file test email:**

Tạo `test_email.txt`:
```
From: sender@example.com
To: test@example.com
Subject: Test Email
Content-Type: text/plain

This is a test email body.
```

**Gửi qua API:**

Dùng Postman, curl, hoặc Python script:

**Option 1: Dùng Python**

Tạo file `test_send_email.py`:

```python
import requests

# Email address bạn vừa tạo trong frontend
inbox_email = "test@example.com"

# Đọc test email
with open("test_email.txt", "rb") as f:
    email_content = f.read()

# Gửi đến backend
response = requests.post(
    "http://localhost:8000/api/inbound/mail",
    files={"email": ("email.eml", email_content, "message/rfc822")}
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
```

Chạy:
```bash
python test_send_email.py
```

**Option 2: Dùng curl**

```bash
curl -X POST http://localhost:8000/api/inbound/mail -F "email=@test_email.txt"
```

**Option 3: Dùng Postman**

1. Method: POST
2. URL: `http://localhost:8000/api/inbound/mail`
3. Body → form-data
4. Key: `email`, Type: File, Value: chọn `test_email.txt`

### 4. Kiểm Tra Email Đã Được Nhận

1. Refresh frontend inbox view
2. Hoặc gọi API: `GET /api/messages/inbox/{inbox_id}`

## Troubleshooting

### Backend không chạy được

**Lỗi: Module not found**
```bash
# Đảm bảo virtual environment đã activate
venv\Scripts\activate

# Reinstall packages
pip install -r requirements.txt
```

**Lỗi: Database connection**
- Kiểm tra `.env` file có đúng không
- Nếu dùng PostgreSQL: kiểm tra service đã chạy chưa
- Nếu dùng SQLite: kiểm tra thư mục `data` đã được tạo

**Lỗi: Port 8000 đã được sử dụng**
```bash
# Đổi port
uvicorn app.main:app --reload --port 8001
```

### Frontend không chạy được

**Lỗi: npm install failed**
```bash
# Clear cache và reinstall
npm cache clean --force
npm install
```

**Lỗi: Cannot connect to backend**
- Kiểm tra backend đã chạy chưa
- Kiểm tra `frontend/.env` file
- Kiểm tra CORS settings trong backend

### WebSocket không hoạt động

WebSocket cần backend chạy. Đảm bảo:
- Backend đang chạy trên port 8000
- Frontend config đúng `VITE_WS_URL`

## Cấu Trúc Thư Mục Sau Khi Setup

```
tempmail_hungvu/
├── venv/                    # Python virtual environment
├── app/                     # Backend code
├── frontend/                # Frontend code
├── storage/                 # Storage folder
│   └── attachments/        # Attachments sẽ được lưu here
├── data/                    # SQLite database (nếu dùng)
├── .env                     # Backend config
├── frontend/.env            # Frontend config
├── requirements.txt         # Python dependencies
└── package.json            # Node dependencies
```

## Các Tính Năng Cần Test

### ✅ Đã có thể test:
- [x] Tạo inbox
- [x] Xem danh sách inbox
- [x] Gửi email qua HTTP API (mock)
- [x] Xem messages
- [x] Xem message details
- [x] Download attachments (nếu có)
- [x] WebSocket real-time updates

### ❌ Không thể test trên Windows:
- [ ] Postfix pipe (cần Linux)
- [ ] DKIM signing
- [ ] Real SMTP reception

## Bước Tiếp Theo Sau Khi Test Thành Công

1. **Deploy lên VPS Ubuntu:**
   - Follow `POSTFIX_SETUP.md`
   - Setup Postfix và mailpipe
   - Configure DNS records

2. **Production Setup:**
   - Dùng PostgreSQL thay vì SQLite
   - Setup SSL certificates
   - Configure reverse proxy (nginx)
   - Setup monitoring

## Quick Commands Cheat Sheet

```bash
# Backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm run dev

# Database migrations
alembic upgrade head

# Test email API
python test_send_email.py
```

## Script Helper cho Windows

Tạo file `run_dev.bat` để chạy nhanh:

```batch
@echo off
echo Starting TempMail Development...

echo Activating virtual environment...
call venv\Scripts\activate

echo Starting backend...
start "Backend Server" cmd /k "uvicorn app.main:app --reload --port 8000"

timeout /t 3

echo Starting frontend...
cd frontend
start "Frontend Server" cmd /k "npm run dev"

echo Both servers starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
pause
```

Chạy: Double-click `run_dev.bat` hoặc `.\run_dev.bat`

