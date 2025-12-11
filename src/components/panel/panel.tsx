import { CirclePlus, CircleUserRound } from "lucide-react";

import ModalAddProducts from "./sweetAlert/addProductModal";
import { StatCards } from "./statCard/statCard";
import { Table } from "./table/table";
import { useAuth } from "./auth/authContext";
import { Link } from "react-router-dom"


import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useEffect, useState, useCallback } from "react";

export default function PanelVentas() {
  const { user, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState(false);
  const [stats, setStats] = useState({
    lines: 0,
    devices: 0,
    internet: 0,
    asurion: 0,
    tv: 0,
    revenue: 0,
    phone: 0
  });

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const date = new Date();
    const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const userRef = doc(db, "users", user.uid, "monthly_stats", currentMonth);

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
        });
      } else {
        setStats({
          lines: 0,
          devices: 0,
          internet: 0,
          asurion: 0,
          tv: 0,
          revenue: 0,
          phone: 0
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-3 text-white">
          <div >

            <h1 className="text-4xl font-bold tracking-tight mb-1">STF Panel</h1>
            <p className="text-indigo-100 flex flex-row text-lg font-light">
              Welcome back
              <span className="text-white font-bold ml-1">
                {user?.displayName
                  ? user.displayName.charAt(0).toUpperCase() + user.displayName.slice(1)
                  : ""}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-4 mt-4 md:mt-0">
            {/* <div className="glass px-6 py-3 rounded-2xl flex flex-col items-end border-0 bg-white/10 backdrop-blur-md">
              <span className="text-indigo-600  text-xs font-medium uppercase tracking-wider">Revenue Total</span>
              <span className="text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</span>
            </div> */}
            <ModalAddProducts onClose={() => console.log('cerrado')} onProductAdded={fetchStats} />

            <CircleUserRound size={24}
              onClick={() => setOpenMenu(!openMenu)}
              className="cursor-pointer"
            />
            {openMenu && (
              <div >
                <button onClick={handleSignOut} className="cursor-pointer hover:text-indigo-600 transition-colors"> cerrar sesion </button>
              </div>
            )}

          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left column: Stats & Info */}
          <aside className="lg:col-span-1 space-y-6 relative z-20">
            {/* Stats Grid */}
            <StatCards stats={stats} />

            {/* Quick Actions / Help */}
            <div className="glass p-6 rounded-3xl border border-white/60 shadow-lg bg-white/80">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <CirclePlus size={18} className="text-indigo-600" />
                Quick Actions
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <Link to="/previous-months" className="flex items-center gap-2 p-2 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  Last month view
                </Link>

                <li className="flex items-center gap-2 p-2 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Sales performance
                </li>
              </ul>
            </div>
          </aside>

          {/* Right column: Table & Filters */}
          <main className="lg:col-span-3 space-y-6">

            <Table onProductDeleted={fetchStats} />
          </main>
        </div>
      </div>
    </div>

  );
}

