
import './App.css'
import PanelVentas from './components/panel/panel'
import { useAuth } from './components/panel/auth/authContext'
import Login from './components/panel/auth/login'
import { Challenge } from './components/challenge/challenge'
import { useEffect } from 'react'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import Swal from 'sweetalert2'
import { useNavigate, Routes, Route } from 'react-router-dom'
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
  const { user } = useAuth();
  const navigate = useNavigate();

  // Global Notification Listener
  useEffect(() => {
    if (!user) return;
    const todayDate = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, "challenges"),
      where("opponentId", "==", user.uid),
      where("date", "==", todayDate),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          Swal.fire({
            title: '⚔️ New Challenge!',
            text: `${data.challengerName} has challenged you to a ${data.goalType.toUpperCase()} battle!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Accept Battle',
            cancelButtonText: 'Decline',
            confirmButtonColor: '#4f46e5',
            backdrop: `rgba(0,0,123,0.4)`
          }).then(async (result) => {
            if (result.isConfirmed) {
              await updateDoc(doc(db, "challenges", change.doc.id), { status: "accepted" });
              navigate('/challenge');
            } else if (result.dismiss === Swal.DismissReason.cancel) {
              await updateDoc(doc(db, "challenges", change.doc.id), { status: "declined" });
            }
          });
        }
      });
    });

    return () => unsubscribe();
  }, [user, navigate]);

  return (
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/previous-months" element={<PassMonth />} />
      <Route path="/challenge" element={<Challenge />} />
    </Routes>
  )
}

export default Router
