import { useState, type FormEvent } from 'react'
import { Button } from './ui/Button'

interface TickerInputProps {
  onSubmit: (ticker: string) => void
  disabled?: boolean
}

const TICKER_REGEX = /^[A-Z]{4}\d{1,2}(\.SA)?$/

function normalize(raw: string): string | null {
  const upper = raw.trim().toUpperCase()
  if (!TICKER_REGEX.test(upper)) return null
  return upper.endsWith('.SA') ? upper : `${upper}.SA`
}

export function TickerInput({ onSubmit, disabled = false }: TickerInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const normalized = normalize(value)
    if (!normalized) {
      setError('Ticker inválido. Use o formato PETR4 ou PETR4.SA.')
      return
    }
    setError(null)
    onSubmit(normalized)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full max-w-md">
      <div className="flex gap-2 w-full">
        <input
          type="text"
          placeholder="PETR4.SA"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          aria-label="Ticker"
          aria-describedby={error ? 'ticker-error' : undefined}
          className="flex-1 bg-dark-frost text-polar-white border border-light-gray/50 rounded-lg px-4 py-2.5 text-sm font-mono placeholder:text-dim-gray focus:outline-none focus:border-data-blue disabled:opacity-40 transition-colors"
        />
        <Button type="submit" disabled={disabled}>
          Analisar
        </Button>
      </div>
      {error && (
        <p id="ticker-error" role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </form>
  )
}
