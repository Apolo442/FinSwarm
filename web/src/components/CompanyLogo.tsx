import { useState, useEffect } from 'react'
import { BarChart2 } from 'lucide-react'
import { COMPANY_DOMAIN, LOGO_URL_OVERRIDE } from '../lib/companyMeta'

interface CompanyLogoProps {
  ticker: string
  size?: number
}

export function CompanyLogo({ ticker, size = 34 }: CompanyLogoProps) {
  const base   = ticker.replace(/\.SA$/i, '').toUpperCase()
  const domain = COMPANY_DOMAIN[base]

  // srcs: override direto → clearbit (fundo transparente) → FMP fallback → placeholder
  const override = LOGO_URL_OVERRIDE[base]
  const srcs = [
    ...(override ? [override] : []),
    ...(domain && !override ? [`https://logo.clearbit.com/${domain}`] : []),
    ...(!override ? [`https://financialmodelingprep.com/image-stock/${base}.SA.png`] : []),
  ]

  const [stage, setStage] = useState(0)
  useEffect(() => { setStage(0) }, [base])

  const src     = srcs[stage]
  const showImg = stage < srcs.length

  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.24, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(160,168,180,0.12)',
      border: '1px solid rgba(160,168,180,0.28)',
      overflow: 'hidden',
    }}>
      {showImg ? (
        <img
          key={src}
          src={src}
          alt={base}
          width={size * 0.8}
          height={size * 0.8}
          onError={() => setStage(s => s + 1)}
          style={{ objectFit: 'contain', borderRadius: size * 0.18 }}
        />
      ) : (
        <BarChart2
          size={Math.round(size * 0.46)}
          color="#9ca6b2"
          strokeWidth={1.8}
        />
      )}
    </div>
  )
}
