export default function StatCard({ icon, label, value, accent = 'lime', sub }) {
  const accentMap = {
    lime: { bg: 'rgba(158,254,5,0.15)', color: '#9efe05' },
    leaf: { bg: 'rgba(147,197,66,0.15)', color: '#93c542' },
    lily: { bg: 'rgba(170,242,40,0.15)', color: '#aaf228' },
    gray: { bg: 'rgba(209,210,212,0.12)', color: '#d1d2d4' },
  }
  const a = accentMap[accent] || accentMap.lime
  return (
    <div className="card h-100 hover-lift">
      <div className="card-body d-flex align-items-center gap-3">
        <div className="stat-icon" style={{ background: a.bg, color: a.color }}>
          <i className={`bi ${icon}`} />
        </div>
        <div className="flex-grow-1">
          <div className="micro-title">{label}</div>
          <div className="fs-3 fw-bold">{value}</div>
          {sub && <div className="small text-muted">{sub}</div>}
        </div>
      </div>
    </div>
  )
}