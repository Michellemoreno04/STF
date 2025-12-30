import { CircleUserRound, LogOut, UserCog, ChevronDown } from "lucide-react";


import { StatCards } from "./statCard/statCard";
import { Table } from "./table/table";
import { useAuth } from "./auth/authContext";
import ProfileModal from "./auth/ProfileModal";
import { Link } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useEffect, useState, useCallback } from "react";
import { RankingComponente } from "./ranking/rankingComponente";

export default function PanelVentas() {
  const { user, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [userInfo, setUserInfo] = useState({
    displayName: "",
    email: "",
    photoURL: "",
  });

  const [stats, setStats] = useState({
    lines: 0,
    devices: 0,
    internet: 0,
    asurion: 0,
    tv: 0,
    revenue: 0,
    phone: 0,
    dailyRevenue: 0,
  });

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const userRef = doc(db, "users", user.uid, "monthly_stats", currentMonth);
    // Consultar el documento de estadísticas diarias
    const todayDate = new Date().toISOString().split('T')[0];
    const dailyRef = doc(db, "users", user.uid, "daily_stats", todayDate);
    let dailyRev = 0;

    try {
      const dailySnap = await getDoc(dailyRef);
      if (dailySnap.exists()) {
        dailyRev = dailySnap.data().revenue || 0;
      }
    } catch (error) {
      console.error("Error fetching daily revenue:", error);
    }


    try {
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStats({
          lines: data.totalLines || 0,
          devices: data.totalDevices || 0,
          internet: data.totalInternet || 0,
          asurion: data.totalAsurion || 0,
          tv: data.totalTv || 0,
          revenue: data.totalRevenue || 0,
          phone: data.totalPhone || 0,
          dailyRevenue: dailyRev || 0,
        });
      } else {
        setStats({
          lines: 0,
          devices: 0,
          internet: 0,
          asurion: 0,
          tv: 0,
          revenue: 0,
          phone: 0,
          dailyRevenue: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [user]);

  // aqui se obtendra la info del usuario de la db
  const getUserInfo = async () => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    try {
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserInfo({
          displayName: data.displayName || "",
          email: data.email || "",
          photoURL: data.photoURL || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }



  useEffect(() => {
    fetchStats();
    getUserInfo();
  }, [fetchStats, user]);

  const handleSignOut = () => {
    logout();
    setOpenMenu(false);
  };





  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-900">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-b-[3rem] shadow-2xl z-0"></div>

      <div className="relative z-10 max-w-8xl mx-auto p-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 text-white">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-1">STF Panel</h1>
            <p className="text-indigo-100 flex flex-row text-lg font-light">
              Welcome back
              <span className="text-white font-bold ml-1">
                {userInfo.displayName}
              </span>
            </p>
          </div>

          {/* navbar */}
          <div className="flex items-center gap-6 mt-4 md:mt-0 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 shadow-lg">
            <nav className="flex items-center gap-6 mr-4">
              <Link
                to="/previous-months"
                className="text-indigo-100 font-medium hover:text-white transition-colors relative group"
              >
                Previous Months
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all group-hover:w-full"></span>
              </Link>
            </nav>
            <button
              onClick={() => setOpenMenu(!openMenu)}
              className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-white/10 transition-colors border border-transparent hover:border-white/20"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <CircleUserRound size={20} />
              </div>
              <ChevronDown size={16} className={`text-indigo-100 transition-transform duration-200 ${openMenu ? 'rotate-180' : ''}`} />
            </button>
            <div className="relative">


              {openMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setOpenMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 z-40 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.displayName || 'Usuario'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setOpenMenu(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                    >
                      <UserCog size={16} />
                      Editar Perfil
                    </button>

                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <LogOut size={16} />
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>






          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
          />


        </header>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* Left column: Stats & Info */}
          <div className="lg:col-span-1 space-y-6 relative z-20">
            {/* Stats Grid */}
            <StatCards stats={stats} />
          </div>


          {/* Right column: Table & Filters */}
          <main className="lg:col-span-3">
            <p className="text-sm ml-5 font-bold text-white">Daily Revenue: ${stats.dailyRevenue}</p>
            <Table onProductDeleted={fetchStats} onProductAdded={fetchStats} />
          </main>
          <RankingComponente />
        </div>
      </div>
    </div>

  );
}

