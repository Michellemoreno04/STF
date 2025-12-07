
import './App.css'
import PanelVentas from './components/panel/panel'
import { useAuth } from './components/panel/auth/authContext'
import Login from './components/panel/auth/login'
import { Routes, Route } from 'react-router-dom'
import { PassMonth } from './components/panel/statCard/previousMonths'

function App() {
  const { user, loading } = useAuth();



  return (

    <div>
      {
        loading ? (
          <p>Loading...</p>
        ) : user ? (
          <PanelVentas />
        ) : (
          <Login />
        )
      }
    </div>


  )
}

function Router() {
  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/previous-months" element={<PassMonth />} />
    </Routes>
  )
}

export default Router
