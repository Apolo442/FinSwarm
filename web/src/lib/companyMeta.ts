interface CompanyMeta { name: string; initials: string }

const META: Record<string, CompanyMeta> = {
  PETR4: { name: 'Petrobras',        initials: 'PB' },
  VALE3: { name: 'Vale',             initials: 'VA' },
  ITUB4: { name: 'Itaú',             initials: 'IT' },
  BBDC4: { name: 'Bradesco',         initials: 'BD' },
  ABEV3: { name: 'Ambev',            initials: 'AB' },
  WEGE3: { name: 'WEG',              initials: 'WG' },
  B3SA3: { name: 'B3',               initials: 'B3' },
  BBAS3: { name: 'Banco do Brasil',  initials: 'BN' },
  MGLU3: { name: 'Magalu',           initials: 'MG' },
  RENT3: { name: 'Localiza',         initials: 'LC' },
}

export function getCompanyMeta(ticker: string): CompanyMeta {
  const base = ticker.replace(/\.SA$/i, '').toUpperCase()
  return META[base] ?? { name: base, initials: base.slice(0, 2) }
}
