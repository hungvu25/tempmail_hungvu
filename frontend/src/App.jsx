import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import CreateInbox from './pages/CreateInbox'
import InboxView from './pages/InboxView'
import MessageView from './pages/MessageView'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<CreateInbox />} />
          <Route path="/inbox/:inboxId" element={<InboxView />} />
          <Route path="/inbox/:inboxId/message/:messageId" element={<MessageView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

