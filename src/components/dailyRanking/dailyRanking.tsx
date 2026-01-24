import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, query, collectionGroup, doc, updateDoc, addDoc, orderBy, deleteDoc } from "firebase/firestore";
import { useAuth } from "../panel/auth/authContext";
import { Trophy, TrendingUp, ArrowLeft, Plus, Users, Target, Rocket, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

interface DailyRankingUser {
    id: string;
    name: string;
    lines: number;
    data: number;
    revenue: number;
    avatar: string;
    groupId?: string;
}

interface RankingGroup {
    id: string;
    name: string;
    createdBy: string;
    createdAt: any;
}

export const DailyRanking = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<DailyRankingUser[]>([]);
    const [groups, setGroups] = useState<RankingGroup[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('global');
    const [loading, setLoading] = useState(true);
    const [isOptedIn, setIsOptedIn] = useState(false);
    const [updatingOptIn, setUpdatingOptIn] = useState(false);
    const [userGroupId, setUserGroupId] = useState<string | null>(null);
    const [showAddGroupModal, setShowAddGroupModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [creatingGroup, setCreatingGroup] = useState(false);

    // Fetch user's opt-in and group status (Real-time)
    useEffect(() => {
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setIsOptedIn(data.dailyRankingOptIn || false);
                setUserGroupId(data.dailyRankingGroupId || null);
                // Only set once or if not set to global
                if (data.dailyRankingGroupId && selectedGroupId === 'global') {
                    setSelectedGroupId(data.dailyRankingGroupId);
                }
            }
        });
        return () => unsubscribe();
    }, [user]);

    // Fetch groups (Real-time)
    useEffect(() => {
        const q = query(collection(db, "rankingGroups"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const groupsData: RankingGroup[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as RankingGroup));
            setGroups(groupsData);
        });
        return () => unsubscribe();
    }, []);

    const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
    const [statsByUserId, setStatsByUserId] = useState<Record<string, any>>({});

    // Fetch user profiles (Real-time)
    useEffect(() => {
        const usersCollection = collection(db, 'users');
        const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
            const profiles: Record<string, any> = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                profiles[doc.id] = {
                    name: data.displayName || 'Unknown User',
                    avatar: data.photoURL || `https://ui-avatars.com/api/?name=${data.displayName || 'User'}&background=random`,
                    optedIn: data.dailyRankingOptIn || false,
                    groupId: data.dailyRankingGroupId
                };
            });
            setUserProfiles(profiles);
        });
        return () => unsubscribe();
    }, []);

    // Fetch daily stats (Real-time)
    useEffect(() => {
        const todayDate = new Date().toISOString().split('T')[0];
        const q = query(collectionGroup(db, 'daily_stats'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const stats: Record<string, any> = {};
            snapshot.docs.forEach(doc => {
                if (doc.id === todayDate) {
                    const userId = doc.ref.parent.parent?.id;
                    if (userId) {
                        stats[userId] = doc.data();
                    }
                }
            });
            setStatsByUserId(stats);
        });
        return () => unsubscribe();
    }, []);

    // Combine users and stats
    useEffect(() => {
        const rankingData: DailyRankingUser[] = Object.keys(userProfiles)
            .filter(userId => {
                const profile = userProfiles[userId];
                const passesOptIn = profile.optedIn;
                const passesGroup = selectedGroupId === 'global' || profile.groupId === selectedGroupId;
                return passesOptIn && passesGroup;
            })
            .map(userId => {
                const stats = statsByUserId[userId];
                return {
                    id: userId,
                    name: userProfiles[userId].name,
                    avatar: userProfiles[userId].avatar,
                    groupId: userProfiles[userId].groupId,
                    lines: stats?.totalLines || 0,
                    data: stats?.totalInternet || 0,
                    revenue: stats?.revenue || 0
                };
            });

        rankingData.sort((a, b) => b.revenue - a.revenue);
        setUsers(rankingData);
        if (loading) setLoading(false);
    }, [userProfiles, statsByUserId, selectedGroupId]);

    const handleAddGroup = async () => {
        if (!newGroupName.trim() || !user) return;
        setCreatingGroup(true);
        try {
            const groupRef = await addDoc(collection(db, "rankingGroups"), {
                name: newGroupName.trim(),
                createdBy: user.uid,
                createdAt: new Date().toISOString()
            });
            // Automatically join the created group
            await handleJoinGroup(groupRef.id);
            setNewGroupName("");
            setShowAddGroupModal(false);
        } catch (error) {
            console.error("Error creating group:", error);
        } finally {
            setCreatingGroup(false);
        }
    };

    const handleJoinGroup = async (groupId: string | null) => {
        if (!user) return;
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                dailyRankingGroupId: groupId
            });
            setUserGroupId(groupId);
            if (groupId) setSelectedGroupId(groupId);
        } catch (error) {
            console.error("Error joining group:", error);
        }
    };

    const handleOptInToggle = async () => {
        if (!user) return;
        setUpdatingOptIn(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                dailyRankingOptIn: !isOptedIn
            });
            setIsOptedIn(!isOptedIn);
        } catch (error) {
            console.error("Error updating opt-in status:", error);
        } finally {
            setUpdatingOptIn(false);
        }
    };

    const deleteGroup = async (groupId: string) => {
        if (!user) return;
        try {
            const confirm = await Swal.fire({
                title: "Are you sure you want to delete this group?",
                text: "All users in this group will be removed from the group.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#ef4444",
                cancelButtonColor: "#6b7280",
                confirmButtonText: "Yes, delete it!"
            });
            if (!confirm.isConfirmed) return;



            const groupRef = doc(db, "rankingGroups", groupId);
            await deleteDoc(groupRef);
            setUserGroupId(null);
            setSelectedGroupId('global');
        } catch (error) {
            console.error("Error deleting group:", error);
        }
    };

    const currentUserRank = users.findIndex(u => u.id === user?.uid) + 1;
    const currentUserData = users.find(u => u.id === user?.uid);

    return (
        <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-8 selection:bg-indigo-500/30">
            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="space-y-2">
                        <button
                            onClick={() => navigate('/')}
                            className="group flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors mb-4"
                        >
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="font-medium">Back to Dashboard</span>
                        </button>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-2xl shadow-lg shadow-yellow-500/20">
                                <Trophy className="text-[#0f172a]" size={32} />
                            </div>
                            Daily Ranking
                        </h1>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/10">
                        <div className={`flex flex-col px-4 ${isOptedIn ? 'text-green-400' : 'text-gray-400'}`}>
                            <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Status</span>
                            <span className="font-bold text-sm tracking-wide">{isOptedIn ? 'OPTED IN' : 'OPTED OUT'}</span>
                        </div>
                        <button
                            onClick={handleOptInToggle}
                            disabled={updatingOptIn}
                            className={`
                                relative p-3 rounded-xl transition-all duration-300 cursor-pointer
                                ${isOptedIn ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-white/10 text-white/50 hover:bg-white/20'}
                                ${updatingOptIn ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
                            `}
                        >
                            <Target size={24} className={updatingOptIn ? 'animate-pulse' : ''} />
                        </button>
                    </div>
                </div>

                {/* Group Selection Section */}
                <div className="mb-10 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-300">
                            <Users size={18} />
                            <h2 className="font-bold uppercase tracking-widest text-sm">Competition Groups</h2>
                        </div>
                        <button
                            onClick={() => setShowAddGroupModal(true)}
                            className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            <Plus size={18} />
                            Create Group
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setSelectedGroupId('global')}
                            className={`
                                px-6 py-3 rounded-2xl font-bold transition-all border-2 cursor-pointer
                                ${selectedGroupId === 'global'
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                                    : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/10'}
                            `}
                        >
                            Global
                        </button>
                        {groups.map((group) => (
                            <div key={group.id} className="relative group">
                                <button
                                    onClick={() => setSelectedGroupId(group.id)}
                                    className={`
                                        px-6 py-3 rounded-2xl font-bold transition-all border-2 cursor-pointer
                                        ${selectedGroupId === group.id
                                            ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30'
                                            : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-white/10'}
                                    `}
                                >
                                    {group.name}
                                </button>
                                {group.createdBy === user?.uid && (
                                    <button
                                        onClick={() => deleteGroup(group.id)}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 cursor-pointer rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        title="Delete this group"
                                    >
                                        <Minus size={14} className="text-[#0f172a]" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar / Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        {isOptedIn && currentUserData ? (
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                                <Rocket className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                                <div className="relative z-10">
                                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Your Ranking</p>
                                    <h3 className="text-6xl font-black mb-6">#{currentUserRank}</h3>

                                    <div className="space-y-4">
                                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                                            <p className="text-indigo-200 text-[10px] uppercase font-bold mb-1">Total Revenue</p>
                                            <p className="text-2xl font-black">${currentUserData.revenue.toLocaleString()}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                                                <p className="text-indigo-200 text-[10px] uppercase font-bold mb-1">Lines</p>
                                                <p className="text-xl font-black">{currentUserData.lines}</p>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                                                <p className="text-indigo-200 text-[10px] uppercase font-bold mb-1">Data</p>
                                                <p className="text-xl font-black">{currentUserData.data}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {userGroupId !== selectedGroupId && selectedGroupId !== 'global' && (
                                        <button
                                            onClick={() => handleJoinGroup(selectedGroupId)}
                                            className="w-full mt-6 py-3 bg-white text-indigo-700 rounded-2xl font-bold hover:bg-indigo-50 transition-colors shadow-xl"
                                        >
                                            Join this Group
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-4">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
                                    <Target className="text-indigo-400 opacity-50" size={32} />
                                </div>
                                <div className="space-y-2">
                                    <p className="font-bold text-lg">Not competing</p>
                                    <p className="text-sm text-white/40">Opt-in to see your stats in the ranking and compete with others.</p>
                                </div>
                                {!isOptedIn && (
                                    <button
                                        onClick={handleOptInToggle}
                                        className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all"
                                    >
                                        Join Now
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <TrendingUp size={18} className="text-green-400" />
                                Daily Info
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-white/40 text-sm">Active Members</span>
                                    <span className="font-bold">{users.length}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-white/40 text-sm">Date</span>
                                    <span className="font-bold text-sm">
                                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard Table */}
                    <div className="lg:col-span-3">
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-2xl font-bold tracking-tight">Leaderboard</h3>
                                <div className="px-4 py-1.5 bg-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold uppercase tracking-widest border border-indigo-500/20">
                                    {selectedGroupId === 'global' ? 'All Users' : groups.find(g => g.id === selectedGroupId)?.name}
                                </div>
                            </div>

                            <div className="p-4">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                        <p className="text-white/40 font-medium italic">Ranking the best...</p>
                                    </div>
                                ) : users.length === 0 ? (
                                    <div className="text-center py-20 space-y-4">
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                            <Trophy size={40} className="text-white/10" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold text-white/60">No participants yet</p>
                                            <p className="text-sm text-white/30">Be the first to join the competition in this group!</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {users.map((rankUser, index) => (
                                            <div
                                                key={rankUser.id}
                                                className={`
                                                    relative group rounded-2xl p-4 transition-all duration-500
                                                    ${rankUser.id === user?.uid
                                                        ? 'bg-indigo-600/20 border border-indigo-500 shadow-xl shadow-indigo-500/10'
                                                        : 'bg-white/5 hover:bg-white/10 border border-transparent'}
                                                `}
                                            >
                                                <div className="flex items-center gap-6">
                                                    {/* Rank */}
                                                    <div className={`
                                                        flex items-center justify-center w-12 h-12 rounded-xl font-black text-xl shrink-0
                                                        ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-[#0f172a] shadow-lg shadow-yellow-500/20' :
                                                            index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-[#0f172a]' :
                                                                index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-700 text-[#0f172a]' :
                                                                    'bg-white/5 text-white/40'}
                                                    `}>
                                                        {index + 1}
                                                    </div>

                                                    {/* User Info */}
                                                    <div className="flex items-center gap-4 flex-1">
                                                        <img
                                                            src={rankUser.avatar}
                                                            alt={rankUser.name}
                                                            className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10"
                                                        />
                                                        <div>
                                                            <p className="font-bold text-lg group-hover:text-indigo-300 transition-colors">
                                                                {rankUser.name}
                                                                {rankUser.id === user?.uid && <span className="ml-2 text-[10px] bg-indigo-500 px-2 py-0.5 rounded-full text-white uppercase tracking-widest leading-none">You</span>}
                                                            </p>
                                                            <p className="text-xs text-white/40 uppercase tracking-widest font-bold">
                                                                {groups.find(g => g.id === rankUser.groupId)?.name || 'No Group'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Main Stat */}
                                                    <div className="flex items-center gap-4 md:gap-8">
                                                        <div className="flex gap-3 md:gap-6">
                                                            <div className="text-center">
                                                                <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Lines</p>
                                                                <p className="text-sm md:text-md font-bold text-indigo-400">{rankUser.lines}</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Data</p>
                                                                <p className="text-sm md:text-md font-bold text-purple-400">{rankUser.data}</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/5 px-4 md:px-6 py-2 md:py-3 rounded-2xl border border-white/5 min-w-[90px] md:min-w-[120px] text-right">
                                                            <p className="text-[10px] uppercase font-bold text-white/40 leading-tight">Revenue</p>
                                                            <p className="text-lg md:text-xl font-black text-indigo-400">${rankUser.revenue.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Group Modal */}
            {showAddGroupModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-md"
                        onClick={() => setShowAddGroupModal(false)}
                    />
                    <div className="relative bg-[#1e293b] w-full max-w-md rounded-[2rem] border border-white/10 shadow-2xl p-8 space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black">Create Group</h3>
                            <p className="text-white/40 text-sm">Start a new competition group and invite others to join.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-indigo-400 tracking-widest pl-1">Group Name</label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="e.g. Dream Team, Sales Alphas..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setShowAddGroupModal(false)}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddGroup}
                                disabled={creatingGroup || !newGroupName.trim()}
                                className={`
                                    flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/30
                                    ${(creatingGroup || !newGroupName.trim()) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}
                                `}
                            >
                                {creatingGroup ? 'Creating...' : 'Create & Join'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
