import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getMessage, downloadAttachment } from '../services/api'

function MessageView() {
  const { inboxId, messageId } = useParams()
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('text') // 'text' or 'html'

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const data = await getMessage(messageId)
        setMessage(data)
        // Default to HTML if available, otherwise text
        if (data.html_content) {
          setActiveTab('html')
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load message')
      } finally {
        setLoading(false)
      }
    }

    fetchMessage()
  }, [messageId])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  const handleAttachmentDownload = (attachmentId, filename) => {
    const url = downloadAttachment(attachmentId)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600">Loading message...</div>
      </div>
    )
  }

  if (error || !message) {
    return (
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg px-8 pt-6 pb-8">
        <div className="text-red-600 mb-4">{error || 'Message not found'}</div>
        <Link to={`/inbox/${inboxId}`} className="text-blue-600 hover:underline">
          ← Back to inbox
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        to={`/inbox/${inboxId}`}
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        ← Back to inbox
      </Link>

      {/* Message Card */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {message.subject || '(No Subject)'}
          </h2>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-semibold text-gray-700">From:</span>{' '}
              <span className="text-gray-900">{message.from_address}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">To:</span>{' '}
              <span className="text-gray-900">{message.to_address}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Date:</span>{' '}
              <span className="text-gray-900">{formatDate(message.received_at)}</span>
            </div>
          </div>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="px-6 py-4 border-b border-gray-200 bg-yellow-50">
            <h3 className="font-semibold text-gray-800 mb-2">Attachments:</h3>
            <div className="space-y-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📎</span>
                    <div>
                      <p className="font-medium text-gray-900">{attachment.filename}</p>
                      <p className="text-xs text-gray-500">
                        {(attachment.size / 1024).toFixed(2)} KB • {attachment.content_type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAttachmentDownload(attachment.id, attachment.filename)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Tabs */}
        {(message.text_content || message.html_content) && (
          <div className="border-b border-gray-200">
            <div className="flex">
              {message.text_content && (
                <button
                  onClick={() => setActiveTab('text')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'text'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Text
                </button>
              )}
              {message.html_content && (
                <button
                  onClick={() => setActiveTab('html')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'html'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  HTML
                </button>
              )}
            </div>
          </div>
        )}

        {/* Message Body */}
        <div className="px-6 py-4">
          {activeTab === 'text' && message.text_content ? (
            <div className="whitespace-pre-wrap text-gray-900 font-mono text-sm">
              {message.text_content}
            </div>
          ) : activeTab === 'html' && message.html_content ? (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: message.html_content }}
            />
          ) : (
            <div className="text-gray-500 italic">No content available</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessageView

