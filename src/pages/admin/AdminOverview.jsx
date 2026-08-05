import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { data } from '../../services/dataService'
import StatCard from '../../components/StatCard'
import { Doughnut, Line, Bar } from '../../charts'
import { CHART_COLORS } from '../../styles/brand'
import { doughnutOptions, lineOptions, barOptions } from '../../charts/options'

const dayLabels = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.now() - (13 - i) * 86400000)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
})

export default function AdminOverview() {
  const [stats, setStats] = useState(null)
  const [datasets, setDatasets] = useState([])

  useEffect(() => {
    data.getStats().then(setStats).catch(() => {})
    data.getDatasets({ limit: 600 }).then(setDatasets).catch(() => {})
  }, [])

  const total = stats?.totalDatasets || 0
  const accepted = stats?.accepted || 0
  const rejected = stats?.rejected || 0
  const pending = stats?.pending || 0
  const pct = total ? Math.round((accepted / total) * 100) : 0

  const daily = Array(14).fill(0)
  const genderCounts = { male: 0, female: 0, other: 0 }
  const ageCounts = {}

  datasets.forEach((d) => {
    const daysAgo = Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000)
    if (daysAgo >= 0 && daysAgo < 14) daily[13 - daysAgo] += 1
    if (d.gender) genderCounts[d.gender] = (genderCounts[d.gender] || 0) + 1
    if (d.age_group) ageCounts[d.age_group] = (ageCounts[d.age_group] || 0) + 1
  })

  const statusData = {
    labels: ['Accepted', 'Rejected', 'Pending'],
    datasets: [{ data: [accepted, rejected, pending], backgroundColor: ['#9efe05', '#ef4444', '#d1d2d4'], borderWidth: 0 }],
  }
  const trendData = {
    labels: dayLabels,
    datasets: [{ label: 'Clips', data: daily, borderColor: CHART_COLORS.lime, backgroundColor: 'rgba(158,254,5,0.15)', fill: true, tension: 0.35 }],
  }
  const genderData = {
    labels: ['Male', 'Female', 'Other'],
    datasets: [{ data: Object.values(genderCounts), backgroundColor: ['#9efe05', '#93c542', '#d1d2d4'], borderWidth: 0 }],
  }
  const ageData = {
    labels: Object.keys(ageCounts),
    datasets: [{ data: Object.values(ageCounts), backgroundColor: ['#aaf228', '#9efe05', '#93c542', '#a9e63c', '#d1d2d4'], borderRadius: 8 }],
  }

  return (
    <div>
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard icon="bi-collection" label="Total Datasets" value={total.toLocaleString()} accent="lime" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon="bi-check2-circle" label="Accepted" value={accepted.toLocaleString()} accent="leaf" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon="bi-hourglass-split" label="Pending" value={pending.toLocaleString()} accent="gray" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon="bi-people" label="Contributors" value={(stats?.contributors || 0).toLocaleString()} accent="lily" />
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span className="fw-semibold">Mashruuc goal — {(stats?.goal || 1000000).toLocaleString()}</span>
          <span className="fw-bold text-lime">{pct}%</span>
        </div>
        <div className="progress" style={{ height: 16 }}>
          <div className="progress-bar" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#9efe05,#aaf228)' }} />
        </div>
        <div className="small text-muted mt-2">
          {accepted.toLocaleString()} accepted · <span className="text-danger">{rejected.toLocaleString()} rejected</span> ·{' '}
          <span className="text-lime">{pct}% acceptance rate</span>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-pie-chart text-lime me-2" />Status overview</h6>
            <div style={{ maxWidth: 260, margin: '0 auto' }}>
              <Doughnut data={statusData} options={doughnutOptions} />
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-graph-up text-lime me-2" />Daily submissions</h6>
            <Line data={trendData} options={lineOptions} />
          </div>
        </div>
        <div className="col-md-6">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-people text-lime me-2" />Gender distribution</h6>
            <div style={{ maxWidth: 280, margin: '0 auto' }}>
              <Doughnut data={genderData} options={doughnutOptions} />
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-bar-chart text-lime me-2" />Age groups</h6>
            <Bar data={ageData} options={barOptions} />
          </div>
        </div>
      </div>

      <div className="card p-4 mt-4">
        <h6 className="fw-bold mb-3"><i className="bi bi-lightning-charge text-lime me-2" />Quick actions</h6>
        <div className="row g-3">
          {[
            ['/admin/datasets', 'bi-list-check', 'Review Datasets'],
            ['/admin/sentences', 'bi-fonts', 'Sentences'],
            ['/admin/charts', 'bi-pie-chart', 'Analytics'],
            ['/admin/settings', 'bi-filetype-csv', 'Export CSV'],
          ].map(([to, icon, label]) => (
            <div className="col-6 col-md-3" key={to}>
              <Link to={to} className="text-decoration-none">
                <div className="card text-center p-3 hover-lift">
                  <i className={`bi ${icon} fs-3 text-lime`} />
                  <div className="fw-semibold small mt-1">{label}</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}