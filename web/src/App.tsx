import { Routes, Route, Navigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { Analysis } from './pages/Analysis'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/analysis/:jobId" element={<Analysis />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
