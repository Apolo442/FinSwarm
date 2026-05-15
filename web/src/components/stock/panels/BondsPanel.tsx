export function BondsPanel() {
  return (
    <div className="glass" style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📜</div>
      <h3 style={{ fontSize: 18, color: '#e6e6e6', fontWeight: 600, marginBottom: 8 }}>
        Títulos corporativos — em breve
      </h3>
      <p style={{ fontSize: 13, color: '#868f97', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
        Integração com fontes de dados de bonds corporativos (Anbima / B3) planejada
        para uma próxima versão. Por enquanto, foque na análise de ações na barra acima.
      </p>
    </div>
  )
}
