import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getInbox, getMessages } from '../services/api'
import websocketManager from '../services/websocket'

function InboxView() {
  const { inboxId } = useParams()
  const [inbox, setInbox] = useState(null)
  const [messages, setMessages] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [polling, setPolling] = useState(true)
  const pollingIntervalRef = useRef(null)

  // Fetch inbox details
  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const data = await getInbox(inboxId)
        setInbox(data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load inbox')
        if (err.response?.status === 410) {
          // Inbox expired
          setPolling(false)
        }
      }
    }

    fetchInbox()
  }, [inboxId])

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const data = await getMessages(inboxId, pagination.page, pagination.limit)
      setMessages(data.messages || [])
      setPagination(data.pagination || pagination)
    } catch (err) {
      console.error('Error fetching messages:', err)
      if (err.response?.status === 410) {
        // Inbox expired
        setPolling(false)
        setError('This inbox has expired')
      }
    } finally {
      setLoading(false)
    }
  }, [inboxId, pagination.page, pagination.limit])

  // Initial fetch and polling
  useEffect(() => {
    fetchMessages()

    // Set up polling
    if (polling) {
      pollingIntervalRef.current = setInterval(() => {
        fetchMessages()
      }, 5000) // Poll every 5 seconds
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [inboxId, polling, fetchMessages])

  // WebSocket connection
  useEffect(() => {
    if (!inbox) return

    const handleNewMessage = (data) => {
      console.log('New message received via WebSocket:', data)
      // Refresh messages when new message arrives
      fetchMessages()
    }

    websocketManager.connect(inboxId, handleNewMessage)

    return () => {
      websocketManager.disconnect(inboxId)
    }
  }, [inboxId, inbox, fetchMessages])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  if (loading && !inbox) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center animate-pulse">
              📧
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Đang tải...</h2>
          <p className="text-gray-600">Đang tải thông tin inbox</p>
        </div>
      </div>
    )
  }

  if (error && !inbox) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center">
              ❌
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Lỗi</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <Link 
            to="/" 
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            ← Tạo inbox mới
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-blue-500 hover:text-blue-700 font-medium flex items-center gap-2"
              >
                ← Trở về
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800">TempMail Inbox</h1>
                <p className="text-sm text-gray-600">{inbox?.email}</p>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              {inbox && (
                <div>
                  <p>Hết hạn: {new Date(inbox.expires_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Messages List */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Tin nhắn ({pagination.total})
            </h3>
          </div>

          {loading && messages.length === 0 ? (
            <div className="text-center py-8 text-gray-600">Đang tải tin nhắn...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="mb-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto flex items-center justify-center">
                  📧
                </div>
              </div>
              <p className="text-lg mb-2">Chưa có tin nhắn nào</p>
              <p className="text-sm">Chia sẻ địa chỉ email để nhận tin nhắn tại đây</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {messages.map((message) => (
                  <Link
                    key={message.id}
                    to={`/inbox/${inboxId}/message/${message.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 truncate">
                            {message.from_address}
                          </span>
                          {message.attachment_count > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              📎 {message.attachment_count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {message.subject || '(Không có tiêu đề)'}
                        </p>
                        {message.text_content && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {message.text_content.substring(0, 100)}
                            {message.text_content.length > 100 && '...'}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <p className="text-sm text-gray-500">
                          {formatDate(message.received_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Trang {pagination.page} / {pagination.total_pages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })
                        fetchMessages()
                      }}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => {
                        setPagination({ ...pagination, page: Math.min(pagination.total_pages, pagination.page + 1) })
                        fetchMessages()
                      }}
                      disabled={pagination.page === pagination.total_pages}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default InboxView

