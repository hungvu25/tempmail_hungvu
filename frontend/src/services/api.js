import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const createInbox = async (email) => {
  const response = await api.post('/api/inboxes/', { email })
  return response.data
}

export const getInbox = async (inboxId) => {
  const response = await api.get(`/api/inboxes/${inboxId}`)
  return response.data
}

export const getMessages = async (inboxId, page = 1, limit = 20) => {
  const response = await api.get(`/api/messages/inbox/${inboxId}`, {
    params: { page, limit },
  })
  return response.data
}

export const getMessage = async (messageId) => {
  const response = await api.get(`/api/messages/${messageId}`)
  return response.data
}

export const downloadAttachment = (attachmentId) => {
  return `${API_BASE_URL}/api/attachments/${attachmentId}`
}

export default api

