import { useState } from 'react'
import { getCompanyMeta, COMPANY_DOMAIN } from '../lib/companyMeta'

interface CompanyLogoProps {
  ticker: string
  size?: number
}

export function CompanyLogo({ ticker, size = 34 }: CompanyLogoProps) {
  const base = ticker.replace(/\.SA$/i, '').toUpperCase()
  const meta = getCompanyMeta(ticker)
  const domain = COMPANY_DOMAIN[base]
  const [imgError, setImgError] = useState(false)

  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.24, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(71,159,250,0.08)',
      border: '1px solid rgba(71,159,250,0.16)',
      overflow: 'hidden',
    }}>
      {domain && !imgError ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt={meta.name}
          width={size * 0.65}
          height={size * 0.65}
          onError={() => setImgError(true)}
          style={{ objectFit: 'contain' }}
        />
      ) : (
        <span style={{
          fontSize: size * 0.26, fontWeight: 700, fontFamily: 'monospace',
          color: '#479ffa',
        }}>
          {meta.initials}
        </span>
      )}
    </div>
  )
}
