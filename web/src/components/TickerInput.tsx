import { useState, type FormEvent } from 'react'

interface TickerInputProps {
  onSubmit: (ticker: string) => void
  disabled?: boolean
  large?: boolean
}

const TICKER_REGEX = /^[A-Z]{4}\d{1,2}(\.SA)?$/

function normalize(raw: string): string | null {
  const upper = raw.trim().toUpperCase()
  if (!TICKER_REGEX.test(upper)) return null
  return upper.endsWith('.SA') ? upper : `${upper}.SA`
}

export function TickerInput({ onSubmit, disabled = false, large = false }: TickerInputProps) {
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

  const inputClass = large
    ? 'flex-1 bg-surface text-text-primary border-none ring-1 ring-text-slate/40 rounded-xl px-6 py-4 text-lg font-mono placeholder:text-text-slate focus:outline-none focus:ring-text-silver disabled:opacity-40 transition-all'
    : 'flex-1 bg-surface text-text-primary border-none ring-1 ring-text-slate/40 rounded-lg px-4 py-2.5 text-sm font-mono placeholder:text-text-slate focus:outline-none focus:ring-text-silver disabled:opacity-40 transition-all'

  const btnClass = large
    ? 'bg-text-smoke text-bg rounded-xl px-8 py-4 text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed'
    : 'bg-text-smoke text-bg rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
      <div className="flex gap-2 w-full">
        <input
          type="text"
          placeholder="PETR4.SA"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          aria-label="Ticker"
          aria-describedby={error ? 'ticker-error' : undefined}
          className={inputClass}
        />
        <button type="submit" disabled={disabled} className={btnClass}>
          Analisar
        </button>
      </div>
      {error && (
        <p id="ticker-error" role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </form>
  )
}
