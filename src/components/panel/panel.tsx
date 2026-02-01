import { CircleUserRound, LogOut, UserCog, ChevronDown, Bell, Calendar, Trophy, RadarIcon, BellRing } from "lucide-react";


import { StatCards } from "./statCard/statCard";
import { Table } from "./table/table";
import { useAuth } from "./auth/authContext";
import ProfileModal from "./auth/ProfileModal";
import { Link } from "react-router-dom"
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useEffect, useState, useCallback } from "react";
import { RankingComponente } from "./ranking/rankingComponente";
import { useNavigate } from "react-router-dom";
import { Check, X, Swords } from "lucide-react";

export default function PanelVentas() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingChallenges, setPendingChallenges] = useState<any[]>([]);
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
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

  // Listener for pending challenges
  useEffect(() => {
    if (!user) return;
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const todayDate = `${year}-${month}-${day}`;
    // const todayDate = new Date().toISOString().split('T')[0]; // Removed UTC calculation
    const q = query(
      collection(db, "challenges"),
      where("opponentId", "==", user.uid),
      where("date", "==", todayDate),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const challenges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingChallenges(challenges);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAcceptChallenge = async (challengeId: string) => {
    try {
      await updateDoc(doc(db, "challenges", challengeId), { status: "accepted" });
      navigate('/challenge');
      setShowNotifications(false);
    } catch (error) {
      console.error("Error accepting challenge:", error);
    }
  };

  const handleDeclineChallenge = async (challengeId: string) => {
    try {
      await updateDoc(doc(db, "challenges", challengeId), { status: "declined" });
    } catch (error) {
      console.error("Error declining challenge:", error);
    }
  };


  const handleSignOut = () => {
    logout();
    setOpenMenu(false);
  };






  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-900 selection:bg-indigo-500/30">
      {/* Modern Animated Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-slate-50"></div>
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-r from-indigo-400/20 to-purple-400/20 blur-3xl opacity-60 animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-r from-blue-400/20 to-cyan-400/20 blur-3xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-r from-violet-400/20 to-fuchsia-400/20 blur-3xl opacity-60 animate-blob animation-delay-4000"></div>

        {/* Header Gradient Mesh */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-600/5 to-transparent"></div>
      </div>

      <div className="relative z-10 max-w-[95rem] mx-auto p-4 md:p-8">
        {/* Header */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-10">
          <div className="bg-white/40 backdrop-blur-md p-6 rounded-[2rem] border border-white/60 shadow-xl shadow-indigo-100/20">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-2 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              STF Panel
            </h1>
            <p className="text-slate-500 flex flex-row items-center text-lg font-medium">
              Welcome back,
              <span className="text-slate-800 font-bold ml-1.5 flex items-center gap-1.5 px-3 py-1 bg-white/60 rounded-full shadow-sm text-sm border border-white/80">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                {userInfo.displayName}
              </span>
            </p>
          </div>

          {/* User & Nav Actions */}
          <div className="glass p-2.5 rounded-[2rem] flex items-center gap-2 self-start xl:self-auto shadow-2xl shadow-indigo-200/20">
            <nav className="flex items-center">
              {[
                { to: "/alarm", icon: <BellRing size={20} />, label: "Alarm" },
                { to: "/daily-ranking", icon: <RadarIcon size={20} />, label: "Ranking" },
                { to: "/challenge", icon: <Trophy size={20} />, label: "Challenge" },
                { to: "/previous-months", icon: <Calendar size={20} />, label: "History" },
              ].map((item, index) => (
                <Link
                  key={index}
                  to={item.to}
                  className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl text-slate-500 hover:text-indigo-600 hover:bg-white transition-all duration-300 group relative overflow-hidden"
                >
                  <div className="relative z-10 transition-transform group-hover:-translate-y-0.5 duration-300">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>

            <div className="w-px h-10 bg-slate-200 mx-1"></div>

            <div className="flex items-center gap-2 pr-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-3.5 rounded-full transition-all duration-300 ${showNotifications ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300' : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-indigo-600 shadow-sm border border-slate-100'}`}
                >
                  <Bell size={20} />
                  {pendingChallenges.length > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-rose-500 rounded-full border-2 border-white animate-bounce"></span>
                  )}
                </button>

                {/* Dropdown Notifications */}
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <div className="absolute right-0 mt-4 w-96 bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl py-4 z-50 border border-white/50 animate-in fade-in slide-in-from-top-4 duration-300 origin-top-right">
                      <div className="px-6 py-3 border-b border-indigo-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 text-lg">Notifications</h3>
                        <span className="text-xs font-bold px-2 py-1 bg-indigo-100 text-indigo-600 rounded-lg">{pendingChallenges.length} new</span>
                      </div>

                      <div className="max-h-[350px] overflow-y-auto px-2">
                        {pendingChallenges.length === 0 ? (
                          <div className="p-10 text-center text-slate-400 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                              <Bell size={24} className="opacity-30" />
                            </div>
                            <p className="text-sm font-medium">No new notifications</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 p-2">
                            {pendingChallenges.map(challenge => (
                              <div key={challenge.id} className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-300 group">
                                <div className="flex gap-4 mb-4">
                                  <div className="mt-1">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                                      <Swords size={20} />
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-sm text-slate-800 leading-relaxed">
                                      <span className="font-bold text-indigo-600">{challenge.challengerName}</span> has challenged you!
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goal</span>
                                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md capitalize">{challenge.goalType}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleAcceptChallenge(challenge.id)}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold tracking-wide uppercase rounded-xl transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-95 flex items-center justify-center gap-2"
                                  >
                                    <Check size={16} /> Accept
                                  </button>
                                  <button
                                    onClick={() => handleDeclineChallenge(challenge.id)}
                                    className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold tracking-wide uppercase rounded-xl transition-all hover:border-slate-300 active:scale-95 flex items-center justify-center gap-2"
                                  >
                                    <X size={16} /> Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setOpenMenu(!openMenu)}
                  className={`flex items-center gap-3 p-1.5 pl-2 pr-4 rounded-full transition-all duration-200 border ${openMenu ? 'bg-white border-indigo-200 shadow-md ring-2 ring-indigo-50' : 'bg-transparent border-transparent hover:bg-white/50 hover:border-white/80'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    {userInfo.photoURL ? (
                      <img src={userInfo.photoURL} alt="User" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <CircleUserRound size={20} />
                    )}
                  </div>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${openMenu ? 'rotate-180 text-indigo-500' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {openMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpenMenu(false)} />
                    <div className="absolute right-0 mt-4 w-64 bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl p-2 z-40 border border-white/50 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                      <div className="px-4 py-4 mb-2 bg-slate-50/50 rounded-2xl border border-slate-100/50 mx-1 mt-1">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {user?.displayName || 'Usuario'}
                        </p>
                        <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                          {user?.email}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <button
                          onClick={() => {
                            setOpenMenu(false);
                            setIsProfileModalOpen(true);
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl flex items-center gap-3 transition-colors group"
                        >
                          <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                            <UserCog size={16} />
                          </div>
                          Edit Profile
                        </button>

                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-3 transition-colors group"
                        >
                          <div className="p-2 bg-rose-50 text-rose-400 rounded-lg group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">
                            <LogOut size={16} />
                          </div>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
          />
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left column: Stats */}
          <div className="lg:col-span-3 space-y-6 relative z-20">
            <StatCards stats={stats} />
          </div>


          {/* Middle column: Table */}
          <main className="lg:col-span-6 flex flex-col h-full min-h-[500px]">
            <div className="flex items-center justify-between mb-6 px-2">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Overview</h2>
                <p className="text-slate-500 text-sm font-medium">Manage your daily sales</p>
              </div>
              <div className="glass px-4 py-2 rounded-xl flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-sm font-bold text-slate-700">Daily Revenue: <span className="text-emerald-600 ml-1 text-base">${stats.dailyRevenue}</span></p>
              </div>
            </div>

            <div className="flex-1">
              <Table onProductDeleted={fetchStats} onProductAdded={fetchStats} />
            </div>
          </main>

          {/* Right column: Ranking */}
          <div className="lg:col-span-3 h-full min-h-[500px]">
            <RankingComponente />
          </div>
        </div>
      </div>
    </div>
  );
}

