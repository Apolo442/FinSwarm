interface CompanyMeta { name: string; initials: string }

export const COMPANY_DOMAIN: Record<string, string> = {
  PETR4:  'petrobras.com.br',
  VALE3:  'vale.com',
  ITUB4:  'itau.com.br',
  BBDC4:  'bradesco.com.br',
  ABEV3:  'ambev.com.br',
  WEGE3:  'weg.net',
  B3SA3:  'b3.com.br',
  BBAS3:  'bb.com.br',
  MGLU3:  'magazineluiza.com.br',
  RENT3:  'localiza.com',
  SUZB3:  'suzano.com.br',
  JBSS3:  'jbs.com.br',
  LREN3:  'lojasrenner.com.br',
  GGBR4:  'gerdau.com',
  EMBR3:  'embraer.com',
  RADL3:  'raiadrogasil.com.br',
  EQTL3:  'equatorialenergia.com.br',
  RDOR3:  'rededor.com.br',
  TOTS3:  'totvs.com',
  BPAC11: 'btgpactual.com',
}

const META: Record<string, CompanyMeta> = {
  PETR4:  { name: 'Petrobras',       initials: 'PB' },
  VALE3:  { name: 'Vale',            initials: 'VA' },
  ITUB4:  { name: 'Itaú',            initials: 'IT' },
  BBDC4:  { name: 'Bradesco',        initials: 'BD' },
  ABEV3:  { name: 'Ambev',           initials: 'AB' },
  WEGE3:  { name: 'WEG',             initials: 'WG' },
  B3SA3:  { name: 'B3',              initials: 'B3' },
  BBAS3:  { name: 'Banco do Brasil', initials: 'BB' },
  MGLU3:  { name: 'Magalu',          initials: 'MG' },
  RENT3:  { name: 'Localiza',        initials: 'LC' },
  SUZB3:  { name: 'Suzano',          initials: 'SZ' },
  JBSS3:  { name: 'JBS',             initials: 'JB' },
  LREN3:  { name: 'Renner',          initials: 'LR' },
  GGBR4:  { name: 'Gerdau',          initials: 'GD' },
  EMBR3:  { name: 'Embraer',         initials: 'EB' },
  RADL3:  { name: 'Raia Drogasil',   initials: 'RD' },
  EQTL3:  { name: 'Equatorial',      initials: 'EQ' },
  RDOR3:  { name: 'Rede D\'Or',      initials: 'RO' },
  TOTS3:  { name: 'Totvs',           initials: 'TV' },
  BPAC11: { name: 'BTG Pactual',     initials: 'BT' },
}

// URLs diretas para logos que não existem no clearbit nem no FMP
export const LOGO_URL_OVERRIDE: Record<string, string> = {
  WEGE3: 'https://upload.wikimedia.org/wikipedia/commons/8/81/Weg_logo_blue_vector.svg',
}

export function getCompanyMeta(ticker: string): CompanyMeta {
  const base = ticker.replace(/\.SA$/i, '').toUpperCase()
  return META[base] ?? { name: base, initials: base.slice(0, 2) }
}
