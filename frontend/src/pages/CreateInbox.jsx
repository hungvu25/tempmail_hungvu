import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createInbox } from '../services/api'

function CreateInbox() {
  const [inbox, setInbox] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const generateRandomEmail = () => {
    const random = Math.random().toString(36).substring(2, 10)
    const domain = import.meta.env.VITE_EMAIL_DOMAIN || 'tempmail.com'
    return `${random}@${domain}`
  }

  const generateInbox = async () => {
    setLoading(true)
    setError(null)

    try {
      // Tạo email ngẫu nhiên
      const emailAddress = generateRandomEmail()
      
      // Gọi API tạo inbox
      const response = await createInbox(emailAddress)
      
      setInbox({
        email: emailAddress,
        id: response.id
      })
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Không thể tạo email tạm thời')
    } finally {
      setLoading(false)
    }
  }

  const openInbox = () => {
    if (inbox) {
      navigate(`/inbox/${inbox.id}`)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Đã copy email vào clipboard!')
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📧 TempMail
          </h1>
          <p className="text-gray-600">
            Email tạm thời - Bảo vệ email thật của bạn
          </p>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateInbox}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 mb-8 text-lg w-full"
        >
          {loading ? '🔄 Đang tạo...' : '✨ Tạo Email Mới'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            ❌ {error}
          </div>
        )}

        {/* Email Display */}
        {inbox && (
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <p className="text-gray-700 mb-3 text-lg">✅ Email của bạn:</p>
            
            {/* Email Display */}
            <div className="bg-white rounded-lg p-4 mb-4 border-2 border-green-200">
              <p className="text-xl font-mono text-green-600 break-all font-semibold">
                {inbox.email}
              </p>
              <button
                onClick={() => copyToClipboard(inbox.email)}
                className="mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition-colors duration-200"
              >
                📋 Copy Email
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={openInbox}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                � Mở Hộp Thư
              </button>
              
              <button
                onClick={() => setInbox(null)}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                🔄 Tạo Email Khác
              </button>
            </div>

            {/* Usage tip */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              💡 Sử dụng email này để đăng ký dịch vụ và bảo vệ email chính của bạn
            </div>
          </div>
        )}

        {/* Instructions */}
        {!inbox && (
          <div className="mt-8 text-sm text-gray-600 text-left">
            <h3 className="font-semibold mb-3 text-gray-700">
              🎯 TempMail là gì?
            </h3>
            <ul className="list-disc list-inside space-y-2">
              <li>Email tạm thời để bảo vệ email thật</li>
              <li>Nhận email xác thực mà không spam</li>
              <li>Tự động xóa sau 24 giờ</li>
              <li>Hoàn toàn miễn phí và ẩn danh</li>
            </ul>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-700 text-xs">
                ⚠️ Không sử dụng cho thông tin quan trọng hoặc tài khoản ngân hàng
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateInbox

