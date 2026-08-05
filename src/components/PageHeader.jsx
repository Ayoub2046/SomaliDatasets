export default function PageHeader({ icon, title, subtitle, action }) {
  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div className="d-flex align-items-center gap-3">
        <div className="brand-ring d-grid place-items-center rounded-4 p-3" style={{ background: 'rgba(158,254,5,0.1)' }}>
          <i className={`bi ${icon} fs-3 text-lime`} />
        </div>
        <div>
          <h4 className="fw-bold mb-0">{title}</h4>
          {subtitle && <div className="text-muted small">{subtitle}</div>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}