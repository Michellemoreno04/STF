import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, onSnapshot, query, collectionGroup, getDocs } from "firebase/firestore";
import { Search } from "lucide-react";

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

                // We use collectionGroup to query all 'monthly_stats' subcollections across all users
                // Note: This requires an index in Firestore. If it fails, check console for the link to create it.


                // Actually, a better scalable way is to query collectionGroup('monthly_stats') 
                // but we need to know WHICH month. 
                // Let's use the N-listeners approach for now as it guarantees we get the right document 
                // and we already have the user IDs. 
                // Wait, onSnapshot inside a loop is tricky.

                // Let's go with collectionGroup and filter.
                const q = query(collectionGroup(db, 'monthly_stats'));

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const rankingData: RankingUser[] = [];

                    snapshot.docs.forEach(doc => {
                        // Check if this document corresponds to the current month
                        if (doc.id === currentMonth) {
                            const userId = doc.ref.parent.parent?.id; // users/{userId}/monthly_stats/{month}
                            if (userId && userProfiles[userId]) {
                                const data = doc.data();
                                rankingData.push({
                                    id: userId,
                                    name: userProfiles[userId].name,
                                    avatar: userProfiles[userId].avatar,
                                    lines: data.totalLines || 0,
                                    data: data.totalInternet || 0,
                                    revenue: data.totalRevenue || 0
                                });
                            }
                        }
                    });

                    // Sort by revenue descending
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
            <div className="w-full h-[90%] bg-white/80 border border-white/20 rounded-3xl p-4 shadow-xl flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full h-[90%] bg-white/80 border border-white/20 rounded-3xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Top Performers</h2>
                <div className="px-3 py-1 bg-indigo-100 rounded-full text-xs font-medium text-indigo-600 border border-indigo-200">
                    This Month
                </div>
            </div>
            <div className="relative flex-1 max-w-md mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar "
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-600 placeholder:text-slate-400"
                />
            </div>

            <div className=" h-[90%] flex flex-col gap-4 overflow-y-auto ">
                {filteredUsers.length === 0 ? (
                    <div className="text-center text-slate-500 py-4">No data available for this month</div>
                ) : (
                    filteredUsers.map((user, index) => (
                        <div key={user.id} className="group bg-white hover:bg-indigo-50/50 transition-all duration-300 rounded-2xl p-3 border border-slate-100 hover:border-indigo-100 shadow-sm hover:shadow-md">
                            {/* Top Row: Rank, Avatar, Name */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`
                                    flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm shrink-0 shadow-sm
                                    ${index === 0 ? 'bg-yellow-100 text-yellow-600 border border-yellow-200' :
                                        index === 1 ? 'bg-gray-100 text-gray-600 border border-gray-200' :
                                            index === 2 ? 'bg-orange-100 text-orange-600 border border-orange-200' :
                                                'text-slate-500 bg-slate-50 border border-slate-100'}
                                `}>
                                    {index + 1}
                                </div>
                                <span className="font-bold text-slate-700 truncate flex-1">{user.name}</span>
                            </div>

                            {/* Bottom Row: Metrics */}
                            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 border border-blue-100">
                                    <span className="text-[10px] text-blue-400 uppercase font-bold mb-0.5">Lines</span>
                                    <span className="text-blue-600 font-bold text-sm">{user.lines}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-50 border border-purple-100">
                                    <span className="text-[10px] text-purple-400 uppercase font-bold mb-0.5">Data</span>
                                    <span className="text-purple-600 font-bold text-sm">{user.data}</span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                                    <span className="text-[10px] text-emerald-400 uppercase font-bold mb-0.5">Revenue</span>
                                    <span className="text-emerald-600 font-bold text-sm">${user.revenue.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

