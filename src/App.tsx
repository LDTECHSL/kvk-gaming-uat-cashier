import { Route, Routes, Navigate } from "react-router-dom"
import Login from "./pages/login"
import Payments from "./pages/payments"
import SettingsPage from "./pages/settings"
import AdminLayout from "./layouts/admin-layout"
import Dayend from "./pages/dayend"
import PCSettings from "./pages/pc-settings"
import PS5Settings from "./pages/ps5-settings"
import MovieRoomsSettings from "./pages/movie-rooms-settings"
import PoolSettings from "./pages/pool-settings"
import Bookings from "./pages/bookings"
import Today from "./pages/today"
import Games from "./pages/games"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      {/* Admin Dashboard Routes */}
      <Route element={<AdminLayout><PCSettings /></AdminLayout>} path="/pc-settings" />
      <Route element={<AdminLayout><PS5Settings /></AdminLayout>} path="/ps5-settings" />
      <Route element={<AdminLayout><MovieRoomsSettings /></AdminLayout>} path="/movie-rooms-settings" />
      <Route element={<AdminLayout><PoolSettings /></AdminLayout>} path="/pool-settings" />
      <Route element={<AdminLayout><Bookings /></AdminLayout>} path="/bookings" />
      <Route element={<AdminLayout><Today /></AdminLayout>} path="/today" />
      <Route element={<AdminLayout><Games /></AdminLayout>} path="/games" />
      <Route element={<AdminLayout><Payments /></AdminLayout>} path="/payments" />
      <Route element={<AdminLayout><Dayend /></AdminLayout>} path="/dayend" />
      <Route element={<AdminLayout><SettingsPage /></AdminLayout>} path="/settings" />
      
      {/* Redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  )
}

export default App
