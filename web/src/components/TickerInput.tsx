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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xl">
      <div className="flex gap-3 w-full">
        <input
          type="text"
          placeholder="PETR4.SA"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          aria-label="Ticker"
          className="flex-1 bg-transparent text-pure-white border border-pure-white rounded-pill px-5 py-2.5 placeholder:text-ash-text focus:outline-none focus:border-golden disabled:opacity-50"
        />
        <Button type="submit" disabled={disabled}>
          Analisar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-status-failed">
          {error}
        </p>
      )}
    </form>
  )
}
