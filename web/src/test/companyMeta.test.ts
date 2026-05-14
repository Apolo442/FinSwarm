import { describe, it, expect } from 'vitest'
import { getCompanyMeta } from '../lib/companyMeta'

describe('getCompanyMeta', () => {
  it('retorna meta para ticker conhecido sem sufixo', () => {
    const m = getCompanyMeta('PETR4')
    expect(m.name).toBe('Petrobras')
    expect(m.initials).toBe('PB')
  })

  it('retorna meta para ticker com sufixo .SA', () => {
    const m = getCompanyMeta('VALE3.SA')
    expect(m.name).toBe('Vale')
    expect(m.initials).toBe('VA')
  })

  it('fallback para ticker desconhecido: iniciais = 2 primeiras letras', () => {
    const m = getCompanyMeta('XPTO3')
    expect(m.initials).toBe('XP')
    expect(m.name).toBe('XPTO3')
  })
})
