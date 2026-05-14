import { Routes, Route, Navigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { Analysis } from './pages/Analysis'
import { StockDetail } from './pages/StockDetail'

function GradientBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Blob top-left — Solar Flare #ffa16c */}
      <div
        style={{
          position: 'absolute',
          top: '-18%',
          left: '-12%',
          width: '72vw',
          height: '72vw',
          borderRadius: '62% 38% 54% 46% / 48% 57% 43% 52%',
          background:
            'radial-gradient(ellipse at 35% 38%, rgba(255,161,108,0.22) 0%, rgba(255,161,108,0.06) 45%, transparent 70%)',
          filter: 'blur(72px)',
        }}
      />
      {/* Blob bottom-right — Slate #868f97 */}
      <div
        style={{
          position: 'absolute',
          bottom: '-22%',
          right: '-8%',
          width: '68vw',
          height: '68vw',
          borderRadius: '44% 56% 38% 62% / 57% 38% 62% 43%',
          background:
            'radial-gradient(ellipse at 65% 62%, rgba(134,143,151,0.20) 0%, rgba(134,143,151,0.05) 45%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />
      {/* Small accent blob center-right — Solar Flare leve */}
      <div
        style={{
          position: 'absolute',
          top: '38%',
          right: '8%',
          width: '28vw',
          height: '28vw',
          borderRadius: '52% 48% 61% 39% / 46% 55% 45% 54%',
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255,161,108,0.08) 0%, transparent 65%)',
          filter: 'blur(60px)',
        }}
      />
    </div>
  )
}

export default function App() {
  return (
    <>
      <GradientBackground />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stock/:ticker" element={<StockDetail />} />
        <Route path="/analysis/:jobId" element={<Analysis />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
