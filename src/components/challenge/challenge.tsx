import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Swords, Trophy, Target, Check } from "lucide-react";
import { collection, doc, getDocs, onSnapshot, addDoc, updateDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../panel/auth/authContext";
import Swal from "sweetalert2";

interface UserProfile {
    id: string;
    name: string;
    avatar: string;
    email: string;

}

interface DailyStats {
    revenue: number;
    lines: number;
    data: number;
}

type GoalType = 'revenue' | 'lines' | 'data';

interface ChallengeData {
    id: string;
    challengerId: string;
    challengerName: string;
    challengerAvatar?: string;
    opponentId: string;
    opponentName: string;
    opponentAvatar?: string;
    goalType: GoalType;
    status: 'pending' | 'accepted' | 'declined' | 'completed';
    date: string;
}

export const Challenge = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // UI State
    const [viewState, setViewState] = useState<'dashboard' | 'search' | 'goal_selection' | 'arena'>('dashboard');
    const [selectedOpponent, setSelectedOpponent] = useState<UserProfile | null>(null);
    const [selectedGoal, setSelectedGoal] = useState<GoalType>('revenue');
    const [activeChallenges, setActiveChallenges] = useState<ChallengeData[]>([]);
    const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [myStats, setMyStats] = useState<DailyStats>({ revenue: 0, lines: 0, data: 0 });
    const [opponentStats, setOpponentStats] = useState<DailyStats>({ revenue: 0, lines: 0, data: 0 });

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "users"));
                const usersList: UserProfile[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (doc.id !== user?.uid) { // Don't include self
                        usersList.push({
                            id: doc.id,
                            name: data.displayName || "Unknown User",
                            avatar: data.photoURL || `https://ui-avatars.com/api/?name=${data.displayName || 'User'}&background=random`,
                            email: data.email || ""
                        });
                    }
                });
                setUsers(usersList);
                setFilteredUsers(usersList);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching users:", error);
                setLoading(false);
            }
        };

        const checkActiveChallenges = async () => {
            if (!user) return;
            const todayDate = new Date().toISOString().split('T')[0];

            // Check if I am challenger or opponent in an active challenge for today
            const challengesRef = collection(db, "challenges");

            // Query 1: I am challenger
            const q1 = query(
                challengesRef,
                where("challengerId", "==", user.uid),
                where("date", "==", todayDate),
                where("status", "in", ["pending", "accepted"])
            );

            // Query 2: I am opponent
            const q2 = query(
                challengesRef,
                where("opponentId", "==", user.uid),
                where("date", "==", todayDate),
                where("status", "in", ["pending", "accepted"])
            );

            // Accessing Firestore multiple times in parallel
            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

            const challengesMap = new Map<string, ChallengeData>();

            snap1.forEach(doc => {
                challengesMap.set(doc.id, { id: doc.id, ...doc.data() } as ChallengeData);
            });
            snap2.forEach(doc => {
                challengesMap.set(doc.id, { id: doc.id, ...doc.data() } as ChallengeData);
            });

            const allChallenges = Array.from(challengesMap.values());
            setActiveChallenges(allChallenges);

            // If we are navigating from a notification (optional enhancement later), we could auto-select
            // For now, default to dashboard
            setViewState('dashboard');
        };

        if (user) {
            fetchUsers();
            checkActiveChallenges();
        }
    }, [user]);

    useEffect(() => {
        setFilteredUsers(
            users.filter((u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [searchQuery, users]);

    // Listener for stats (Depends on selectedChallengeId)
    useEffect(() => {
        if (!user || !selectedChallengeId) return;

        const currentChallenge = activeChallenges.find(c => c.id === selectedChallengeId);
        if (!currentChallenge) return;

        const isAmChallenger = currentChallenge.challengerId === user.uid;
        const opponentId = isAmChallenger ? currentChallenge.opponentId : currentChallenge.challengerId;

        // Update selected opponent for display
        setSelectedOpponent({
            id: opponentId,
            name: isAmChallenger ? currentChallenge.opponentName : currentChallenge.challengerName,
            avatar: `https://ui-avatars.com/api/?name=${isAmChallenger ? currentChallenge.opponentName : currentChallenge.challengerName}&background=random`,
            email: ""
        });

        const todayDate = new Date().toISOString().split('T')[0];

        // Listen to my stats
        const myStatsRef = doc(db, "users", user.uid, "daily_stats", todayDate);
        const unsubFromMyStats = onSnapshot(myStatsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setMyStats({
                    revenue: data.revenue || 0,
                    lines: data.lines || 0,
                    data: data.data || 0
                });
            } else {
                setMyStats({ revenue: 0, lines: 0, data: 0 });
            }
        });

        // Listen to opponent stats
        const oppStatsRef = doc(db, "users", opponentId, "daily_stats", todayDate);
        const unsubFromOpponent = onSnapshot(oppStatsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setOpponentStats({
                    revenue: data.revenue || 0,
                    lines: data.lines || 0,
                    data: data.data || 0
                });
            } else {
                setOpponentStats({ revenue: 0, lines: 0, data: 0 });
            }
        });

        return () => {
            unsubFromMyStats();
            unsubFromOpponent();
        };

    }, [user, selectedChallengeId, activeChallenges]);

    // para terminar la batalla
    // para terminar la batalla
    const terminarBattle = async () => {
        if (!selectedChallengeId || !user) return;

        const currentChallenge = activeChallenges.find(c => c.id === selectedChallengeId);
        if (!currentChallenge) return;

        // Determine winner
        let myVal = 0;
        let oppVal = 0;

        if (currentChallenge.goalType === 'revenue') {
            myVal = myStats.revenue;
            oppVal = opponentStats.revenue;
        } else if (currentChallenge.goalType === 'lines') {
            myVal = myStats.lines;
            oppVal = opponentStats.lines;
        } else {
            myVal = myStats.data;
            oppVal = opponentStats.data;
        }

        const iWin = myVal > oppVal;
        const tie = myVal === oppVal;

        let title = '';
        let text = '';
        let icon: 'success' | 'error' | 'info' = 'info';

        if (tie) {
            title = 'It\'s a Tie!';
            text = 'Great effort from both sides!';
            icon = 'info';
        } else if (iWin) {
            title = 'Victory!';
            text = `${user?.displayName} has won the challenge!`;
            icon = 'success';
        } else {
            title = 'Defeat';
            text = `${user?.displayName} has lost the challenge!`;
            icon = 'error';
        }

        try {
            await updateDoc(doc(db, "challenges", selectedChallengeId), {
                status: 'completed',
                winnerId: tie ? 'tie' : (iWin ? user.uid : (currentChallenge.challengerId === user.uid ? currentChallenge.opponentId : currentChallenge.challengerId))
            });

            await Swal.fire({
                title,
                text,
                icon,
                confirmButtonText: 'Back to Dashboard',
                background: '#1e293b',
                color: '#fff'
            });

            // Update local state
            setActiveChallenges(prev => prev.filter(c => c.id !== selectedChallengeId));
            setSelectedChallengeId(null);
            setViewState('dashboard');

        } catch (error) {
            console.error("Error completing challenge:", error);
            Swal.fire('Error', 'Could not complete challenge', 'error');
        }
    }

    const MetricCard = ({ title, myVal, oppVal, format = (v: number) => v.toString() }: { title: string, myVal: number, oppVal: number, format?: (v: number) => string }) => {
        const total = myVal + oppVal;
        const myPercent = total === 0 ? 50 : (myVal / total) * 100;
        const iWin = myVal > oppVal;
        const tie = myVal === oppVal;

        return (
            <div className={`
                bg-white/10 backdrop-blur-md border rounded-2xl p-6 relative overflow-hidden group hover:bg-white/15 transition-all
                ${selectedGoal === title.toLowerCase().split(' ')[0] || (activeChallenges.find(c => c.id === selectedChallengeId)?.goalType === title.toLowerCase().split(' ')[0]) ? 'border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.2)]' : 'border-white/20'}
            `}>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        {(selectedGoal === title.toLowerCase().split(' ')[0] || activeChallenges.find(c => c.id === selectedChallengeId)?.goalType === title.toLowerCase().split(' ')[0]) && (
                            <Target size={16} className="text-yellow-400" />
                        )}
                        <h3 className="text-lg font-semibold text-white/90">{title}</h3>
                    </div>

                    {total > 0 && !tie && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${iWin ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                            {iWin ? 'WINNING' : 'LOSING'}
                        </span>
                    )}
                </div>

                <div className="flex justify-between items-end mb-2">
                    <div className="text-left">
                        <span className="block text-2xl font-bold text-white">{format(myVal)}</span>
                        <span className="text-xs text-indigo-200">{user?.displayName}</span> {/* aqui ponemos el nombre del jugador */}
                    </div>
                    <div className="text-right">
                        <span className="block text-2xl font-bold text-white">{format(oppVal)}</span>
                        <span className="text-xs text-indigo-200">{selectedOpponent?.name.split(' ')[0]}</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-3 bg-white/10 rounded-full overflow-hidden flex relative">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-1000 ease-out flex items-center justify-end pr-1"
                        style={{ width: `${myPercent}%` }}
                    >
                        {myPercent > 10 && <div className="h-full w-0.5 bg-white/30 blur-[1px]" />}
                    </div>
                    <div className="h-full bg-pink-500 flex-1 transition-all duration-1000 ease-out" />

                    {/* Center Marker */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 -translate-x-1/2" />
                </div>
            </div>
        );
    };

    const handleSelectOpponent = (u: UserProfile) => {
        setSelectedOpponent(u);
        setViewState('goal_selection');
    };

    const handleSendChallenge = async () => {
        if (!user || !selectedOpponent) return;
        setLoading(true);




        try {
            const todayDate = new Date().toISOString().split('T')[0];
            const challengeData = {
                challengerId: user.uid,
                challengerName: user.displayName || "Unknown",
                challengerAvatar: user.photoURL || "",
                opponentId: selectedOpponent.id,
                opponentName: selectedOpponent.name,
                goalType: selectedGoal,
                status: 'pending',
                date: todayDate,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, "challenges"), challengeData);
            const newChallenge = { id: docRef.id, ...challengeData, status: 'pending', date: todayDate } as any;

            setActiveChallenges(prev => [...prev, newChallenge]);
            setSelectedChallengeId(docRef.id);
            setViewState('arena');
        } catch (error) {
            console.error("Error sending challenge:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-indigo-500/30">
            {/* Background Gradients */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-600/20 to-transparent opacity-50" />
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl opacity-30" />
                <div className="absolute top-40 -left-20 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl opacity-30" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors text-indigo-300 hover:text-white">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                        {viewState === 'dashboard' ? 'Battle Arena' : 'New Challenge'}
                    </h1>
                </div>

                {viewState === 'dashboard' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* New Challenge Button */}
                        <button
                            onClick={() => setViewState('search')}
                            className="w-full bg-indigo-600 cursor-pointer hover:bg-indigo-500 text-white rounded-2xl p-4 mb-8 flex items-center justify-center gap-2 font-bold shadow-lg shadow-indigo-500/30 transition-all transform hover:-translate-y-1"
                        >
                            <Swords size={20} />
                            Start New Battle
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeChallenges.map(challenge => {
                                const isAmChallenger = challenge.challengerId === user?.uid;
                                const opponentName = isAmChallenger ? challenge.opponentName : challenge.challengerName;

                                // We don't have opponentAvatar in DB yet unless we update send logic, so we use fallback or challengerAvatar if we are the opponent
                                const displayAvatar = isAmChallenger
                                    ? `https://ui-avatars.com/api/?name=${opponentName}&background=random`
                                    : (challenge.challengerAvatar || `https://ui-avatars.com/api/?name=${opponentName}&background=random`);

                                return (
                                    <div
                                        key={challenge.id}
                                        onClick={() => {
                                            setSelectedChallengeId(challenge.id);
                                            setViewState('arena');
                                        }}
                                        className="bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-white/10 rounded-3xl p-6 cursor-pointer transition-all group relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-br from-indigo-500 to-purple-500">
                                                    <img src={displayAvatar} className="w-full h-full rounded-full bg-slate-900 object-cover" alt={opponentName} />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-white leading-tight">{opponentName}</h3>
                                                    <p className="text-xs text-indigo-300 flex items-center gap-1">
                                                        {challenge.status === 'pending' ? 'Waiting response...' : 'Active Battle'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`p-2 rounded-xl bg-white/5 border border-white/5 ${challenge.goalType === 'revenue' ? 'text-green-400' : challenge.goalType === 'lines' ? 'text-blue-400' : 'text-purple-400'}`}>
                                                {challenge.goalType === 'revenue' && <Target size={18} />}
                                                {challenge.goalType === 'lines' && <Swords size={18} />}
                                                {challenge.goalType === 'data' && <Trophy size={18} />}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-sm text-slate-400">
                                            <span>Goal: <span className="text-white capitalize">{challenge.goalType}</span></span>
                                            <span className="text-xs opacity-50">{challenge.date}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {activeChallenges.length === 0 && (
                            <div className="text-center py-20 opacity-50">
                                <Swords size={48} className="mx-auto mb-4 text-slate-500" />
                                <p>No active battles today.</p>
                                <div className="text-indigo-200  ">
                                    <p>Compete with your friends and see who performs better today!</p>
                                    <p className="text-xs mt-2">Gift unless a chocolate who wins!</p>
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {viewState === 'search' && (
                    // SELECT OPPONENT VIEW
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-10">
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/20">
                                <Swords size={32} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Choose your opponent</h2>
                            <p className="text-indigo-200">Challenge a friend to see who performs better today</p>
                        </div>
                        {/* Search Input logic is same... */}
                        <div className="relative max-w-lg mx-auto mb-8">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={20} />
                            <input
                                type="text"
                                placeholder="Search friend..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white placeholder:text-white/30 transition-all"
                            />
                        </div>

                        {loading ? (
                            <div className="flex justify-center p-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
                                {filteredUsers.map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={() => handleSelectOpponent(u)}
                                        className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/30 rounded-2xl transition-all group text-left cursor-pointer"
                                    >
                                        <div className="relative">
                                            <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full border-2 border-white/10 group-hover:border-indigo-400 transition-colors" />
                                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-slate-900" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-white truncate">{u.name}</h3>
                                            <p className="text-xs text-indigo-300 truncate">Tap to challenge</p>
                                        </div>
                                    </button>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <div className="col-span-full text-center py-10 text-white/30">
                                        No users found
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {viewState === 'goal_selection' && selectedOpponent && (
                    <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 rounded-full mx-auto mb-4 p-1 bg-gradient-to-br from-pink-500 to-purple-500">
                                <img src={selectedOpponent.avatar} className="w-full h-full rounded-full object-cover bg-slate-800" alt="Opponent" />
                            </div>
                            <h2 className="text-2xl font-bold mb-1">Challenge {selectedOpponent.name.split(' ')[0]}</h2>
                            <p className="text-indigo-200">Select the goal for this battle</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            {[
                                { id: 'revenue', label: 'Revenue', icon: <Target className="w-6 h-6" />, desc: 'Highest total sales' },
                                { id: 'lines', label: 'Lines', icon: <Swords className="w-6 h-6" />, desc: 'Most lines sold' },
                                { id: 'data', label: 'Data', icon: <Trophy className="w-6 h-6" />, desc: 'Most data plans' },
                            ].map((goal) => (
                                <button
                                    key={goal.id}
                                    onClick={() => setSelectedGoal(goal.id as GoalType)}
                                    className={`p-6 rounded-2xl border transition-all text-left relative overflow-hidden
                                        ${selectedGoal === goal.id
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-500/30 ring-2 ring-indigo-400 cursor-pointer'
                                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 cursor-pointer'
                                        }
                                    `}
                                >
                                    <div className={`p-3 rounded-xl inline-flex mb-4 ${selectedGoal === goal.id ? 'bg-white/20' : 'bg-white/5'}`}>
                                        {goal.icon}
                                    </div>
                                    <h3 className="text-lg font-bold mb-1">{goal.label}</h3>
                                    <p className={`text-sm ${selectedGoal === goal.id ? 'text-indigo-100' : 'text-slate-400'}`}>{goal.desc}</p>

                                    {selectedGoal === goal.id && (
                                        <div className="absolute top-4 right-4 text-white">
                                            <Check size={20} className="stroke-[3]" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setViewState('search')}
                                className="flex-1 py-4 rounded-xl font-bold text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendChallenge}
                                disabled={loading}
                                className="flex-1 py-4 rounded-xl font-bold bg-white text-indigo-600 hover:bg-indigo-50 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                            >
                                {loading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>}
                                START CHALLENGE
                            </button>
                        </div>
                    </div>
                )}


                {viewState === 'arena' && selectedOpponent && (
                    // ARENA VIEW
                    <div className="animate-in zoom-in-95 duration-500">
                        {/* Comparison Header */}
                        <div className="flex items-center justify-between mb-10 relative">
                            {/* Me */}
                            <div className="flex flex-col items-center gap-3 w-1/3">
                                <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-br from-indigo-500 to-blue-500 shadow-lg shadow-indigo-500/30">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 ">
                                        <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'Me'}&background=random`} className="w-full h-full object-cover" alt={user?.displayName?.split('')[0] || 'Me'} />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-lg text-white">{user?.displayName || 'Me'}</h3>
                                    <p className="text-xs text-indigo-300 font-mono">CHALLENGER</p>
                                </div>
                            </div>

                            {/* VS Badge */}
                            <div className="absolute left-1/2 top-10 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border-4 border-slate-800 shadow-2xl">
                                    <span className="font-black text-2xl italic bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">VS</span>
                                </div>
                            </div>

                            {/* Opponent */}
                            <div className="flex flex-col items-center gap-3 w-1/3">
                                <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-br from-pink-500 to-purple-500 shadow-lg shadow-pink-500/30">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-800">
                                        <img src={selectedOpponent.avatar} className="w-full h-full object-cover" alt={selectedOpponent.name || 'Opponent'} />
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h3 className="font-bold text-lg text-white">{selectedOpponent.name || 'Opponent'}</h3>
                                    <p className="text-xs text-pink-300 font-mono">OPPONENT</p>
                                </div>
                            </div>
                        </div>

                        {/* Cards Grid */}
                        <div className="grid grid-cols-1 gap-4 mb-8">
                            <MetricCard
                                title="Revenue"
                                myVal={myStats.revenue}
                                oppVal={opponentStats.revenue}
                                format={(v) => `$${v.toFixed(2)}`}
                            />
                            <MetricCard
                                title="Lines Sold"
                                myVal={myStats.lines}
                                oppVal={opponentStats.lines}
                            />
                            <MetricCard
                                title="Data Adds"
                                myVal={myStats.data}
                                oppVal={opponentStats.data}
                            />
                        </div>

                        <div className="text-center">
                            <button
                                onClick={() => {
                                    setSelectedOpponent(null);
                                    setSelectedChallengeId(null);
                                    setViewState('dashboard');
                                }}
                                className="px-6 py-2 cursor-pointer rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                            >
                                Back to Dashboard
                            </button>
                            <button
                                className="px-6 py-2 cursor-pointer rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                                onClick={terminarBattle}
                            >
                                Terminar Battle
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
