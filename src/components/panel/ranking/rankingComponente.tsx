import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, onSnapshot, query, collectionGroup, getDocs } from "firebase/firestore";
import { Search, Trophy, Medal } from "lucide-react";

interface RankingUser {
    id: string;
    name: string;
    lines: number;
    data: number;
    revenue: number;
    avatar: string;
}

export const RankingComponente = () => {
    const [users, setUsers] = useState<RankingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [queryText, setQueryText] = useState('');

    useEffect(() => {
        const fetchRankingData = async () => {
            setLoading(true);
            try {
                // 1. Fetch all user profiles first to have names and avatars
                const usersCollection = collection(db, 'users');
                const usersSnapshot = await getDocs(usersCollection);
                const userProfiles: Record<string, { name: string, avatar: string }> = {};

                usersSnapshot.forEach(doc => {
                    const data = doc.data();
                    userProfiles[doc.id] = {
                        name: data.displayName || 'Unknown User',
                        avatar: data.photoURL || `https://ui-avatars.com/api/?name=${data.displayName || 'User'}&background=random`
                    };
                });

                // 2. Set up real-time listener for monthly stats
                const date = new Date();
                const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                const q = query(collectionGroup(db, 'monthly_stats'));

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const statsByUserId: Record<string, any> = {};

                    snapshot.docs.forEach(doc => {
                        // Check if this document corresponds to the current month
                        if (doc.id === currentMonth) {
                            const userId = doc.ref.parent.parent?.id; // users/{userId}/monthly_stats/{month}
                            if (userId) {
                                statsByUserId[userId] = doc.data();
                            }
                        }
                    });

                    // Include all user profiles, even if they don't have stats for this month
                    const rankingData: RankingUser[] = Object.keys(userProfiles).map(userId => {
                        const stats = statsByUserId[userId];
                        return {
                            id: userId,
                            name: userProfiles[userId].name,
                            avatar: userProfiles[userId].avatar,
                            lines: stats?.totalLines || 0,
                            data: stats?.totalInternet || 0,
                            revenue: stats?.totalRevenue || 0
                        };
                    });

                    // Sort by lines descending
                    rankingData.sort((a, b) => b.lines - a.lines);
                    setUsers(rankingData);
                    setLoading(false);
                });

                return unsubscribe;

            } catch (error) {
                console.error("Error fetching ranking data:", error);
                setLoading(false);
            }
        };

        const cleanup = fetchRankingData();
        return () => {
            cleanup.then(unsubscribe => unsubscribe && unsubscribe());
        };
    }, []);

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(queryText.toLowerCase())
    );

    if (loading) {
        return (
            <div className="glass-card w-full h-full p-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="glass-card w-full h-full flex flex-col p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl shadow-lg shadow-indigo-200/50">
                        <Trophy className="text-white" size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Top Performers</h2>
                        <p className="text-xs text-slate-500 font-medium">Monthly Leaderboard</p>
                    </div>
                </div>
                <div className="px-3 py-1.5 bg-indigo-50 rounded-lg text-xs font-bold text-indigo-600 border border-indigo-100/50 shadow-sm">
                    {new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })}
                </div>
            </div>

            {/* Search */}
            <div className="relative w-full group mb-5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input
                    type="text"
                    placeholder="Search user..."
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-700 placeholder:text-slate-400"
                />
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto -mx-2 px-2 custom-scrollbar">
                <div className="flex flex-col gap-2.5">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                <Trophy size={28} className="text-slate-300" />
                            </div>
                            <div>
                                <p className="font-medium text-slate-600">No data available</p>
                                <p className="text-xs mt-1">Check back later for rankings</p>
                            </div>
                        </div>
                    ) : (
                        filteredUsers.map((user, index) => (
                            <div
                                key={user.id}
                                className={`
                                    group relative rounded-2xl p-4 border transition-all duration-300
                                    ${index < 3
                                        ? 'bg-gradient-to-br from-white to-slate-50/50 border-slate-200 hover:border-indigo-300 shadow-md hover:shadow-xl hover:shadow-indigo-100/50'
                                        : 'bg-white/70 border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md hover:shadow-indigo-50'
                                    }
                                    hover:-translate-y-0.5
                                `}
                            >
                                {/* Rank Badge */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`
                                        relative flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm shrink-0 shadow-md transition-all duration-300 group-hover:scale-105
                                        ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-yellow-200' :
                                            index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-slate-200' :
                                                index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-200' :
                                                    'text-slate-600 bg-slate-100 border border-slate-200'}
                                    `}>
                                        {index < 3 ? <Medal size={18} /> : `#${index + 1}`}
                                    </div>

                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 truncate text-base">{user.name}</p>
                                        <p className="text-xs text-slate-500 font-medium">Position #{index + 1}</p>
                                    </div>

                                    {/* Avatar */}
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-10 h-10 rounded-full border-2 border-white shadow-md ring-2 ring-slate-100 group-hover:ring-indigo-200 transition-all"
                                    />
                                </div>

                                {/* Metrics */}
                                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-indigo-50/70 border border-indigo-100/70 group-hover:bg-indigo-50 transition-colors">
                                        <span className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider mb-1">Lines</span>
                                        <span className="text-indigo-700 font-bold text-sm">{user.lines}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-pink-50/70 border border-pink-100/70 group-hover:bg-pink-50 transition-colors">
                                        <span className="text-[10px] text-pink-500 uppercase font-bold tracking-wider mb-1">Data</span>
                                        <span className="text-pink-700 font-bold text-sm">{user.data}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-50/70 border border-emerald-100/70 group-hover:bg-emerald-50 transition-colors">
                                        <span className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider mb-1">Rev</span>
                                        <span className="text-emerald-700 font-bold text-sm">${user.revenue.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

