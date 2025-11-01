# 📧 TempMail Service

Dịch vụ email tạm thời với FastAPI backend và React frontend.

## 🎯 Tính năng

- 📧 Tạo email tạm thời ngẫu nhiên
- 📬 Nhận email real-time
- 🗑️ Tự động xóa sau 24h
- 🛡️ Bảo vệ email chính khỏi spam
- 📱 Giao diện responsive

## 🚀 Quick Start

### Backend (FastAPI)
```bash
# Cài đặt dependencies
pip install fastapi uvicorn sqlalchemy alembic python-multipart email-validator python-dotenv pydantic pydantic-settings

# Chạy server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

## 🌐 URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📁 Cấu trúc Project

```
tempmail_hungvu/
├── app/                    # FastAPI backend
│   ├── routers/           # API routes
│   ├── services/          # Business logic
│   └── models.py          # Database models
├── frontend/              # React frontend
│   ├── src/
│   │   ├── pages/         # React pages
│   │   └── services/      # API services
│   └── README_TEMPMAIL.md # Setup guide
├── storage/               # File storage
└── data/                  # SQLite database
```

## ⚙️ Cấu hình

### Environment Variables (.env)
```
DATABASE_URL=sqlite:///tempmail.db
DEBUG=True
STORAGE_PATH=./storage
MAX_INBOX_LIFETIME_HOURS=24
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_EMAIL_DOMAIN=tempmail.com
```

## 📖 Documentation

- **Setup chi tiết**: `frontend/README_TEMPMAIL.md`
- **API Documentation**: http://localhost:8000/docs

## 🛡️ Security Notes

⚠️ **Không sử dụng cho:**
- Tài khoản ngân hàng
- Thông tin nhạy cảm
- Email quan trọng

✅ **Phù hợp cho:**
- Đăng ký dịch vụ thử nghiệm
- Download tài liệu
- Newsletter tạm thời

2. Copy environment file:
```bash
cp .env.example .env
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start development server:
```bash
npm run dev
```

5. Run tests:
```bash
npm test
```

## Architecture

- **Backend**: Node.js + Express
- **Database**: SQLite (easily switchable to PostgreSQL)
- **SMTP Server**: Built-in SMTP server for receiving emails
- **Security**: Rate limiting, input validation, secure file handling

