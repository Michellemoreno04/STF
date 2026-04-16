import { useEffect, useState, type ReactElement } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../auth/authContext";
import {
    History,
    ArrowLeft,
    Search,
    Calendar,
    Clock,
    ChevronRight,
    Smartphone,
    Wifi,
    Shield,
    Phone,
    Package,
    Filter,
    CheckCircle2,
    XCircle,
    Clock4,
    AlertCircle,
    ChevronDown,
    Trash2,
    Edit2,
    User,
    Users,
    Hash,
    X,
    Save,
    Share2,
    MessageSquare,
    Globe
} from "lucide-react";
import Swal from "sweetalert2";
import { CommunityFeed } from "../ranking/CommunityFeed";
import { useNavigate } from "react-router-dom";

interface ProductHistoryItem {
    id: string;
    date: string;
    hour: string;
    product: string;
    quantity: number;
    revenue: number;
    type: string;
    status: string;
    clientName?: string;
    accountNumber?: string;
}

interface RankingGroup {
    id: string;
    name: string;
    createdBy: string;
    createdAt: any;
}

const statusConfig = {
    pending: {
        label: "Pending",
        color: "bg-amber-100 text-amber-600 border-amber-200",
        icon: <Clock4 size={12} className="mr-1" />,
    },
    complete: {
        label: "Complete",
        color: "bg-emerald-100 text-emerald-600 border-emerald-200",
        icon: <CheckCircle2 size={12} className="mr-1" />,
    },
    cancelled: {
        label: "Cancelled",
        color: "bg-rose-100 text-rose-600 border-rose-200",
        icon: <XCircle size={12} className="mr-1" />,
    },
    "no-schedule": {
        label: "No Schedule",
        color: "bg-slate-100 text-slate-600 border-slate-200",
        icon: <AlertCircle size={12} className="mr-1" />,
    },
};

export const DataHistory = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [history, setHistory] = useState<ProductHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("All");
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);
    const [editingItem, setEditingItem] = useState<ProductHistoryItem | null>(null);
    const [editValues, setEditValues] = useState({ clientName: "", accountNumber: "" });

    // Modals & Creation States
    const [showShareModal, setShowShareModal] = useState(false);
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [selectedItemToShare, setSelectedItemToShare] = useState<ProductHistoryItem | null>(null);
    const [groups, setGroups] = useState<RankingGroup[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>("global");
    const [newGroupName, setNewGroupName] = useState("");
    const [isPublishing, setIsPublishing] = useState(false);
    const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
    const [userGroupId, setUserGroupId] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, "users", user.uid, "dataHistory"),
            orderBy("date", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as ProductHistoryItem[];
            setHistory(items);
            setLoading(false);
        });

        // Sync user group status
        const userRef = doc(db, "users", user.uid);
        const userUnsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserGroupId(docSnap.data().dailyRankingGroupId || null);
            }
        });

        return () => {
            unsubscribe();
            userUnsubscribe();
        };
    }, [user]);

    // Fetch Groups
    useEffect(() => {
        const q = query(collection(db, "publications"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const groupsData: RankingGroup[] = snapshot.docs.map((groupDoc) => {
                const data = groupDoc.data();
                return {
                    id: groupDoc.id,
                    name: data.name || "Grupo sin nombre",
                    createdBy: data.createdBy || "",
                    createdAt: data.createdAt || null
                };
            });
            setGroups(groupsData);
        });
        return () => unsubscribe();
    }, []);

    const handleUpdateStatus = async (itemId: string, newStatus: string) => {
        if (!user) return;
        setUpdatingId(itemId);
        try {
            const docRef = doc(db, "users", user.uid, "dataHistory", itemId);
            await updateDoc(docRef, { status: newStatus });
            setShowStatusMenu(null);
        } catch (error) {
            console.error("Error updating status:", error);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!user) return;
        
        const result = await Swal.fire({
            title: '¿Borrar registro?',
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#f1f5f9',
            confirmButtonText: 'Sí, borrar',
            cancelButtonText: 'Cancelar',
            customClass: {
                popup: 'rounded-3xl',
                confirmButton: 'rounded-xl px-6 py-2',
                cancelButton: 'rounded-xl px-6 py-2 !text-slate-600'
            }
        });

        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(db, "users", user.uid, "dataHistory", itemId));
                Swal.fire({
                    icon: 'success',
                    title: 'Borrado',
                    timer: 1500,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
            } catch (error) {
                console.error("Error deleting:", error);
            }
        }
    };

    const handleEditClick = (item: ProductHistoryItem) => {
        setEditingItem(item);
        setEditValues({
            clientName: item.clientName || "",
            accountNumber: item.accountNumber || ""
        });
    };

    const handleSaveEdit = async () => {
        if (!user || !editingItem) return;
        setUpdatingId(editingItem.id);
        try {
            const docRef = doc(db, "users", user.uid, "dataHistory", editingItem.id);
            await updateDoc(docRef, {
                clientName: editValues.clientName,
                accountNumber: editValues.accountNumber
            });
            setEditingItem(null);
            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                timer: 1500,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        } catch (error) {
            console.error("Error updating client info:", error);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleCreateGroup = async () => {
        if (!user || !newGroupName.trim()) return;
        setIsCreatingNewGroup(true);
        try {
            const groupRef = doc(collection(db, "publications"));
            await setDoc(groupRef, {
                name: newGroupName.trim(),
                createdBy: user.uid,
                createdAt: serverTimestamp()
            });
            
            // Auto-join the created group
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                dailyRankingGroupId: groupRef.id
            });

            Swal.fire({
                icon: 'success',
                title: 'Grupo Creado',
                text: `Has creado el grupo "${newGroupName.trim()}" exitosamente.`,
                timer: 2000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
            setShowCreateGroupModal(false);
            setNewGroupName("");
        } catch (error) {
            console.error("Error creating group:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo crear el grupo.',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false
            });
        } finally {
            setIsCreatingNewGroup(false);
        }
    };

    const handlePublish = async (item: ProductHistoryItem, groupId: string = "global", groupName?: string) => {
        if (!user) return;
        setIsPublishing(true);
        
        try {
            const finalGroupId = groupId;
            const finalGroupName = groupName || "Global";

            await addDoc(collection(db, "publications", finalGroupId, "posts"), {
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                userAvatar: user.photoURL || '',
                product: item.product,
                status: item.status || "pending",
                clientName: item.clientName || "",
                accountNumber: item.accountNumber || "",
                revenue: item.revenue,
                type: item.type,
                groupId: finalGroupId,
                groupName: finalGroupName,
                timestamp: serverTimestamp()
            });

            Swal.fire({
                icon: 'success',
                title: '¡Publicado!',
                text: `Tu venta se ha compartido en ${finalGroupName}.`,
                timer: 2000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
            setShowShareModal(false);
            setNewGroupName("");
        } catch (error) {
            console.error("Error publishing:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo publicar la venta.',
                toast: true,
                position: 'top-end',
                timer: 3000,
                showConfirmButton: false
            });
        } finally {
            setIsPublishing(false);
        }
    };

    const filteredHistory = history.filter((item) => {
        const matchesSearch = item.product.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === "All" || item.type === filterType;
        return matchesSearch && matchesFilter;
    });

    const getIcon = (type: string) => {
        const icons: Record<string, ReactElement> = {
            "Devices": <Smartphone className="text-blue-500" />,
            "Data": <Wifi className="text-emerald-500" />,
            "Line": <Wifi className="text-purple-500" />,
            "Other": <Shield className="text-amber-500" />,
            "Phone": <Phone className="text-rose-500" />
        };
        return icons[type] || <Package className="text-slate-500" />;
    };

    const formatDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return isoString;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => window.history.back()}
                            className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors group"
                        >
                            <ArrowLeft size={20} className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-xl">
                                    <History className="text-indigo-600" size={24} />
                                </div>
                                Data History
                            </h1>
                            <p className="text-slate-500 font-medium">Review all your previous transactions</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 shadow-sm"
                            />
                        </div>

                        <div className="relative w-full sm:w-auto">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full sm:w-auto pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 shadow-sm appearance-none cursor-pointer"
                            >
                                <option value="All">All Types</option>
                                <option value="Devices">Devices</option>
                                <option value="Data">Data</option>
                                <option value="Line">Lines</option>
                                <option value="Phone">Phone</option>
                                <option value="Bundle">Bundles</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Community Sidebar */}
                    <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-100 lg:pr-8 pb-8 lg:pb-0 order-2 lg:order-1">
                        <div className="sticky top-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 rounded-xl">
                                        <MessageSquare className="text-emerald-600" size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Comunidad & Grupos</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tus Espacios</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowCreateGroupModal(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 group"
                                    title="Crear Grupo"
                                >
                                    <Users size={16} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-bold whitespace-nowrap">Crear Grupo</span>
                                </button>
                            </div>
                            
                            {/* Grupos como lista de chats */}
                            <div className="mb-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Grupos Disponibles</h3>
                                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {groups.map((group) => (
                                        <button
                                            key={group.id}
                                            onClick={() => navigate(`/group/${group.id}`)}
                                            className="w-full text-left p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-300 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="w-12 h-12 rounded-[1.2rem] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center border border-indigo-100/50 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                                        <Users size={22} className="text-indigo-600" />
                                                    </div>
                                                    {userGroupId === group.id && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 text-base mb-0.5">{group.name}</h4>
                                                    <p className="text-[11px] text-slate-500 font-medium">Click para entrar al chat grupal</p>
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                                                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </button>
                                    ))}
                                    {groups.length === 0 && (
                                        <div className="text-center py-8">
                                            <p className="text-slate-400 text-sm font-medium">Aún no hay grupos creados</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] border border-slate-100 p-2 shadow-sm">
                                <CommunityFeed />
                            </div>
                        </div>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-7 space-y-4 order-1 lg:order-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 animate-pulse">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full mb-4"></div>
                            <div className="h-4 w-32 bg-slate-100 rounded-full"></div>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No records found</h3>
                            <p className="text-slate-500">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        filteredHistory.map((item) => (
                            <div
                                key={item.id}
                                className="group relative bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all duration-300 flex flex-col md:flex-row md:items-center gap-6"
                            >
                                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-inner shrink-0 bg-slate-50 group-hover:scale-110 transition-transform duration-300`}>
                                    {getIcon(item.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                                            {item.type}
                                        </span>
                                        
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowStatusMenu(showStatusMenu === item.id ? null : item.id)}
                                                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all flex items-center gap-1 ${
                                                    statusConfig[item.status as keyof typeof statusConfig]?.color || statusConfig.pending.color
                                                } ${updatingId === item.id ? 'opacity-50 animate-pulse' : 'hover:scale-105 active:scale-95'}`}
                                            >
                                                {statusConfig[item.status as keyof typeof statusConfig]?.icon || statusConfig.pending.icon}
                                                {statusConfig[item.status as keyof typeof statusConfig]?.label || 'Pending'}
                                                <ChevronDown size={10} className={`transition-transform ${showStatusMenu === item.id ? 'rotate-180' : ''}`} />
                                            </button>

                                            {showStatusMenu === item.id && (
                                                <>
                                                    <div 
                                                        className="fixed inset-0 z-10" 
                                                        onClick={() => setShowStatusMenu(null)}
                                                    />
                                                    <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                                                        {Object.entries(statusConfig).map(([key, config]) => (
                                                            <button
                                                                key={key}
                                                                onClick={() => handleUpdateStatus(item.id, key)}
                                                                className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center transition-colors"
                                                            >
                                                                <span className={`w-2 h-2 rounded-full mr-3 ${config.color.split(' ')[0]}`} />
                                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                                                                    {config.label}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 truncate mb-1">
                                        {item.product}
                                    </h3>
                                    
                                    {(item.clientName || item.accountNumber) && (
                                        <div className="flex flex-wrap gap-3 mb-3">
                                            {item.clientName && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100/50">
                                                    <User size={12} />
                                                    <span className="text-[11px] font-bold">{item.clientName}</span>
                                                </div>
                                            )}
                                            {item.accountNumber && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-100">
                                                    <Hash size={12} />
                                                    <span className="text-[11px] font-bold">{item.accountNumber}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} />
                                            {formatDate(item.date)}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={14} />
                                            {item.hour || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:flex-col md:items-end gap-4 md:gap-1 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                                    <div className="flex items-center gap-2 md:mb-2">
                                        <button
                                            onClick={() => {
                                                setSelectedItemToShare(item);
                                                setSelectedGroupId(userGroupId || "global");
                                                setShowShareModal(true);
                                            }}
                                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100 shadow-sm"
                                            title="Publicar en comunidad"
                                        >
                                            <Share2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleEditClick(item)}
                                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100 shadow-sm"
                                            title="Edit Info"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100 shadow-sm"
                                            title="Delete Record"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="flex flex-col items-end">
                                        <div className="text-sm font-bold text-slate-400 md:hidden uppercase tracking-widest">Revenue</div>
                                        <div className="text-3xl font-black text-indigo-600 leading-none">
                                            ${(item.revenue || 0).toFixed(2)}
                                        </div>
                                        <div className="hidden md:flex items-center gap-1.5 text-slate-400 mt-1">
                                            <span className="text-xs font-bold uppercase">Qty:</span>
                                            <span className="text-sm font-bold text-slate-600">{item.quantity}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute top-1/2 -translate-y-1/2 right-4 hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <ChevronRight size={20} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/50 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-xl">
                                    <Edit2 className="text-indigo-600" size={20} />
                                </div>
                                Edit Details
                            </h2>
                            <button 
                                onClick={() => setEditingItem(null)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    Client Name
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Enter customer name"
                                        value={editValues.clientName}
                                        onChange={(e) => setEditValues({ ...editValues, clientName: e.target.value })}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    Account Number
                                </label>
                                <div className="relative group">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Account #..."
                                        value={editValues.accountNumber}
                                        onChange={(e) => setEditValues({ ...editValues, accountNumber: e.target.value })}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-10">
                            <button
                                onClick={() => setEditingItem(null)}
                                className="py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={updatingId === editingItem.id}
                                className="py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group"
                            >
                                <Save size={18} className="group-hover:scale-110 transition-transform" />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share to Group Modal */}
            {showShareModal && selectedItemToShare && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/50 animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-xl">
                                    <Share2 className="text-emerald-600" size={20} />
                                </div>
                                Compartir Venta
                            </h2>
                            <button 
                                onClick={() => {
                                    setShowShareModal(false);
                                }}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Producto a compartir</p>
                                <div className="flex items-center gap-3 text-slate-700">
                                    <div className="p-2 bg-white rounded-xl shadow-sm">
                                        {getIcon(selectedItemToShare.type)}
                                    </div>
                                    <span className="font-bold text-lg">{selectedItemToShare.product}</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                                    ¿En qué grupo quieres compartirlo?
                                </label>
                                
                                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar p-1">
                                    {/* Global Option */}
                                    <button
                                        onClick={() => {
                                            setSelectedGroupId("global");
                                        }}
                                        className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                                            selectedGroupId === "global"
                                                ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm" 
                                                : "border-slate-100 hover:border-indigo-200 text-slate-600 bg-white"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${selectedGroupId === "global" ? "bg-indigo-100" : "bg-slate-50"}`}>
                                                <Globe size={18} className={selectedGroupId === "global" ? "text-indigo-600" : "text-slate-400"} />
                                            </div>
                                            <div className="text-left">
                                                <span className="font-bold block">Comunidad Global</span>
                                                <span className="text-[10px] text-slate-400 font-medium">Todos podrán ver tu venta</span>
                                            </div>
                                        </div>
                                        {selectedGroupId === "global" && (
                                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                                <CheckCircle2 size={12} className="text-white" />
                                            </div>
                                        )}
                                    </button>

                                    {/* My Active Group */}
                                    {userGroupId && groups.find(g => g.id === userGroupId) && (
                                        <button
                                            onClick={() => {
                                            setSelectedGroupId(userGroupId);
                                        }}
                                        className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                                            selectedGroupId === userGroupId
                                                ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm" 
                                                : "border-slate-100 hover:border-emerald-200 text-slate-600 bg-white"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${selectedGroupId === userGroupId ? "bg-emerald-100" : "bg-slate-50"}`}>
                                                <Users size={18} className={selectedGroupId === userGroupId ? "text-emerald-600" : "text-slate-400"} />
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold block">{groups.find(g => g.id === userGroupId)?.name}</span>
                                                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase rounded">Mi Grupo</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-medium">Solo tu grupo podrá ver esta venta</span>
                                            </div>
                                        </div>
                                        {selectedGroupId === userGroupId && (
                                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                                <CheckCircle2 size={12} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                    )}

                                    {/* Other Groups */}
                                    <div className="my-2 px-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Otros Grupos</p>
                                    </div>

                                    {groups.filter(g => g.id !== userGroupId).map((group) => (
                                        <button
                                            key={group.id}
                                            onClick={() => {
                                            setSelectedGroupId(group.id);
                                        }}
                                        className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                                            selectedGroupId === group.id
                                                ? "border-indigo-500 bg-indigo-50 text-indigo-700" 
                                                : "border-slate-100 hover:border-indigo-200 text-slate-600 bg-white"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${selectedGroupId === group.id ? "bg-indigo-100" : "bg-slate-50"}`}>
                                                <Users size={18} className={selectedGroupId === group.id ? "text-indigo-600" : "text-slate-400"} />
                                            </div>
                                            <span className="font-bold">{group.name}</span>
                                        </div>
                                        {selectedGroupId === group.id && (
                                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                                <CheckCircle2 size={12} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                const group = groups.find(g => g.id === selectedGroupId);
                                handlePublish(
                                    selectedItemToShare, 
                                    selectedGroupId,
                                    group?.name || "Global"
                                );
                            }}
                            disabled={isPublishing}
                            className="w-full mt-8 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPublishing ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Publicar Ahora</span>
                                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
            {/* Create Group Modal */}
            {showCreateGroupModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 border border-white/50 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-xl">
                                    <Users className="text-indigo-600" size={20} />
                                </div>
                                Crear Nuevo Grupo
                            </h2>
                            <button 
                                onClick={() => {
                                    setShowCreateGroupModal(false);
                                    setNewGroupName("");
                                }}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                    Nombre del Grupo
                                </label>
                                <div className="relative group">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Ej: Team Ventas, Mastermind..."
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 underline-offset-0"
                                        autoFocus
                                    />
                                </div>
                                <p className="mt-3 text-[10px] text-slate-400 font-bold uppercase px-1">
                                    Al crear un grupo, otros usuarios podrán unirse y ver publicaciones específicas de este grupo.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 mt-10">
                            <button
                                onClick={handleCreateGroup}
                                disabled={isCreatingNewGroup || !newGroupName.trim()}
                                className="py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreatingNewGroup ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Crear Grupo</span>
                                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataHistory;
