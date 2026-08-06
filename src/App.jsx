import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import AdminGuard from './components/AdminGuard'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Record from './pages/Record'
import Profile from './pages/Profile'
import Leaderboard from './pages/Leaderboard'
import Statistics from './pages/Statistics'
import Verify from './pages/Verify'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminDatasets from './pages/admin/AdminDatasets'
import AdminSentences from './pages/admin/AdminSentences'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCharts from './pages/admin/AdminCharts'
import AdminSettings from './pages/admin/AdminSettings'

export default function App() {
  return (
    <>
      <Navbar />
      <main className="flex-grow-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/record"
            element={
              <ProtectedRoute>
                <Record />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/verify" element={<Verify />} />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="datasets" element={<AdminDatasets />} />
            <Route path="sentences" element={<AdminSentences />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="charts" element={<AdminCharts />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}