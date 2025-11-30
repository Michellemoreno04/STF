
import './App.css'
import PanelVentas from './components/panel/panel'
import { useAuth } from './components/panel/auth/authContext'
import Login from './components/panel/auth/login'


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

export default App
