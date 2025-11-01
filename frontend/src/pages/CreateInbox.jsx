import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createInbox } from '../services/api'

function CreateInbox() {
  const [inbox, setInbox] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const generateInbox = async () => {
    setLoading(true)
    setError(null)

    try {
      // Tạo mã 6 chữ số ngẫu nhiên
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const domain = 'yourdomain.com' // Thay bằng domain của bạn
      const emailAddress = `${code}@${domain}`
      
      // Gọi API tạo inbox
      const response = await createInbox(emailAddress)
      
      setInbox({
        code,
        email: emailAddress,
        id: response.id
      })
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Không thể tạo mã')
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
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            TempMail Generator
          </h1>
          <p className="text-gray-600">
            Tạo email tạm thời với mã xác thực
          </p>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateInbox}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 mb-8 text-lg"
        >
          {loading ? 'Đang tạo...' : 'LẤY MÃ'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Code Display */}
        {inbox && (
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <p className="text-gray-700 mb-3 text-lg">Mã của bạn là:</p>
            <p className="text-4xl font-bold text-green-600 tracking-wider mb-4">
              {inbox.code}
            </p>
            
            {/* Email Display */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-500 mb-2">Email address:</p>
              <p className="text-lg font-mono text-gray-800 break-all">
                {inbox.email}
              </p>
              <button
                onClick={() => copyToClipboard(inbox.email)}
                className="mt-2 text-blue-500 hover:text-blue-700 text-sm"
              >
                📋 Copy email
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={openInbox}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                📧 Xem Inbox
              </button>
              
              <button
                onClick={() => setInbox(null)}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                🔄 Tạo mã mới
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!inbox && (
          <div className="mt-8 text-sm text-gray-600 text-left">
            <p className="mb-3 font-semibold">
              📝 Hướng dẫn sử dụng:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Nhấn "LẤY MÃ" để tạo email tạm thời</li>
              <li>Sử dụng email này để đăng ký dịch vụ</li>
              <li>Tin nhắn sẽ hiển thị ngay lập tức</li>
              <li>Email tự động xóa sau 24 giờ</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreateInbox

