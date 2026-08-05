// Shared Chart.js options tuned for the CaawiyeAI brand.
export const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
  },
}

export const lineOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: 'rgba(158,254,5,0.08)' }, ticks: { maxTicksLimit: 7 } },
    y: { beginAtZero: true, grid: { color: 'rgba(209,210,212,0.1)' } },
  },
}

export const barOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, grid: { color: 'rgba(209,210,212,0.1)' } },
  },
}