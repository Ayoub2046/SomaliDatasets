// Central Chart.js component registry + plugin registration.
import {
  Chart,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Filler,
} from 'chart.js'
import { Doughnut, Pie, Line, Bar, PolarArea, Radar } from 'react-chartjs-2'

Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, RadialLinearScale, Filler)

export { Doughnut, Pie, Line, Bar, PolarArea, Radar }