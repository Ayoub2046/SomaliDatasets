import { useEffect, useState } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { data } from '../services/dataService'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { CHART_COLORS } from '../styles/brand'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement)

const dayLabels = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.now() - (13 - i) * 86400000)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
})

export default function Statistics() {
  const [stats, setStats] = useState(null)
  const [datasets, setDatasets] = useState([])

  useEffect(() => {
    data.getStats().then(setStats).catch(() => {})
    data.getDatasets({ limit: 500 }).then(setDatasets).catch(() => {})
  }, [])

  if (!stats) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-lime" />
      </div>
    )
  }

  const accepted = stats.accepted
  const rejected = stats.rejected
  const pending = stats.pending
  const total = stats.totalDatasets
  const pct = Math.min(100, Math.round((accepted / total) * 100) || 0)

  const statusChart = {
    labels: ['Accepted', 'Rejected', 'Pending'],
    datasets: [
      {
        data: [accepted, rejected, pending],
        backgroundColor: [CHART_COLORS.lime, '#ef4444', CHART_COLORS.gray],
        borderWidth: 0,
      },
    ],
  }

  const genderCounts = { male: 0, female: 0, other: 0 }
  const ageCounts = { '13-17': 0, '18-29': 0, '30-49': 0, '50-64': 0, '65+': 0 }
  const deviceCounts = { Desktop: 0, Mobile: 0, Unknown: 0 }
  const daily = Array(14).fill(0)

  datasets.forEach((d) => {
    if (d.gender) genderCounts[d.gender] = (genderCounts[d.gender] || 0) + 1
    if (d.age_group) ageCounts[d.age_group] = (ageCounts[d.age_group] || 0) + 1
    const dev = d.device || 'Unknown'
    deviceCounts[dev] = (deviceCounts[dev] || 0) + 1
    const daysAgo = Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000)
    if (daysAgo >= 0 && daysAgo < 14) daily[13 - daysAgo] += 1
  })

  const ageChart = {
    labels: Object.keys(ageCounts),
    datasets: [
      {
        label: 'Recordings',
        data: Object.values(ageCounts),
        backgroundColor: [CHART_COLORS.lime, CHART_COLORS.lily, CHART_COLORS.leaf, CHART_COLORS.lightGreen, CHART_COLORS.gray],
        borderRadius: 8,
      },
    ],
  }

  const trendChart = {
    labels: dayLabels,
    datasets: [
      {
        label: 'Clips per day',
        data: daily,
        borderColor: CHART_COLORS.lime,
        backgroundColor: 'rgba(158,254,5,0.15)',
        fill: true,
        tension: 0.35,
      },
    ],
  }

  const deviceChart = {
    labels: Object.keys(deviceCounts),
    datasets: [
      {
        data: Object.values(deviceCounts),
        backgroundColor: [CHART_COLORS.lime, CHART_COLORS.leaf, CHART_COLORS.gray],
        borderWidth: 0,
      },
    ],
  }

  return (
    <div className="container py-5">
      <PageHeader icon="bi-bar-chart" title="Statistics" subtitle="Guud ahaan natiijooyinka mashruuca" />

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <StatCard icon="bi-collection" label="Total Audio" value={total.toLocaleString()} accent="lime" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon="bi-fonts" label="Total Sentences" value={stats.totalSentences || '—'} accent="leaf" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon="bi-check2-circle" label="Accepted" value={accepted.toLocaleString()} accent="lily" />
        </div>
        <div className="col-6 col-md-3">
          <StatCard icon="bi-hourglass-split" label="Remaining" value={(stats.goal - total).toLocaleString()} accent="gray" />
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="fw-semibold">Dataset goal — 1,000,000</span>
          <span className="text-lime fw-bold">{pct}%</span>
        </div>
        <div className="progress" style={{ height: 18 }}>
          <div className="progress-bar" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#9efe05,#aaf228)' }} />
        </div>
        <div className="small text-muted mt-2">
          {accepted.toLocaleString()} of {stats.goal.toLocaleString()} accepted clips — {stats.contributors.toLocaleString()} contributors
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-5">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3">Review status</h6>
            <div className="doughnut-wrap" style={{ maxWidth: 260, margin: '0 auto' }}>
              <Doughnut data={statusChart} options={options('Status')} />
            </div>
            <div className="row text-center mt-3">
              <div className="col"><div className="fw-bold text-lime">{accepted}</div><div className="micro-title">Accepted</div></div>
              <div className="col"><div className="fw-bold text-danger">{rejected}</div><div className="micro-title">Rejected</div></div>
              <div className="col"><div className="fw-bold text-muted">{pending}</div><div className="micro-title">Pending</div></div>
            </div>
          </div>
        </div>

        <div className="col-md-7">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3">Daily submissions (14 days)</h6>
            <Line data={trendChart} options={options('Clips')} />
          </div>
        </div>

        <div className="col-md-6">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3">Recordings by age group</h6>
            <Bar data={ageChart} options={options('Recordings')} />
          </div>
        </div>

        <div className="col-md-6">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3">Recordings by device</h6>
            <Doughnut data={deviceChart} options={options('Device')} />
          </div>
        </div>
      </div>
    </div>
  )
}

function options(label) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: label === 'Status' || label === 'Device' },
      tooltip: { enabled: true },
    },
  }
}