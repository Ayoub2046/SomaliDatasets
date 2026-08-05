import { useEffect, useMemo, useState } from 'react'
import { data } from '../../services/dataService'
import PageHeader from '../../components/PageHeader'
import { Doughnut, Bar, PolarArea, Radar } from '../../charts'
import { doughnutOptions, barOptions } from '../../charts/options'

const PALETTE = ['#9efe05', '#93c542', '#a9e63c', '#aaf228', '#d1d2d4']

const barData = (obj) => ({
  labels: Object.keys(obj),
  datasets: [{ data: Object.values(obj), backgroundColor: PALETTE.slice(0, Math.max(Object.keys(obj).length, 1)), borderRadius: 8 }],
})

const donutData = (obj) => ({
  labels: Object.keys(obj),
  datasets: [{ data: Object.values(obj), backgroundColor: PALETTE.slice(0, Math.max(Object.keys(obj).length, 1)) }],
})

export default function AdminCharts() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    data.getDatasets({ limit: 600 }).then(setRows).catch(() => {})
  }, [])

  const stats = useMemo(() => {
    const age = {}
    const device = {}
    const gender = { male: 0, female: 0, other: 0 }
    const noise = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    rows.forEach((d) => {
      if (d.age_group) age[d.age_group] = (age[d.age_group] || 0) + 1
      if (d.device) device[d.device] = (device[d.device] || 0) + 1
      if (d.gender) gender[d.gender] = (gender[d.gender] || 0) + 1
      const n = d.noise || 1
      if (noise[n] !== undefined) noise[n] += 1
    })

    return {
      age: barData(age),
      gender: donutData(gender),
      device: donutData(device),
      noiseRadar: {
        labels: Object.keys(noise).map((k) => `${k}/5`),
        datasets: [
          {
            data: Object.values(noise),
            backgroundColor: 'rgba(158,254,5,0.2)',
            borderColor: '#9efe05',
            borderWidth: 2,
            pointBackgroundColor: '#9efe05',
          },
        ],
      },
    }
  }, [rows])

  return (
    <div>
      <PageHeader icon="bi-pie-chart" title="Charts & Analytics" subtitle="Dhakdhaqan guud oo waqti-dhab ah" />

      <div className="row g-4">
        <div className="col-md-6 col-xl-4">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-bar-chart text-lime me-2" />Age groups</h6>
            <Bar data={stats.age} options={barOptions} />
          </div>
        </div>
        <div className="col-md-6 col-xl-4">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-people text-lime me-2" />Gender distribution</h6>
            <Doughnut data={stats.gender} options={doughnutOptions} />
          </div>
        </div>
        <div className="col-md-6 col-xl-4">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-phone text-lime me-2" />Device usage</h6>
            <PolarArea data={stats.device} options={doughnutOptions} />
          </div>
        </div>
        <div className="col-md-8">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-broadcast text-lime me-2" />Noise level distribution</h6>
            <Radar data={stats.noiseRadar} options={doughnutOptions} />
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-4 h-100">
            <h6 className="fw-bold mb-3"><i className="bi bi-check2-circle text-lime me-2" />Device breakdown</h6>
            <Doughnut data={stats.device} options={doughnutOptions} />
          </div>
        </div>
      </div>
    </div>
  )
}