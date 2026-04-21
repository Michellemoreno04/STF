import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp, getDocs, writeBatch, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../auth/authContext";
import {
    ArrowLeft,
    Clock,
    TrendingUp,
    Package,
    MessageSquare,
    Plus,
    Check,
    Globe,
    Target,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Clock4,
    User,
    Hash,
    Trash2,
    Phone,
    PhoneOff,
    ChevronDown
} from "lucide-react";
import Swal from "sweetalert2";

interface Publication {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    product: string;
    status?: string;
    clientName?: string;
    accountNumber?: string;
    revenue: number;
    type: string;
    groupId?: string;
    groupName?: string;
    callingByUserId?: string;
    callingByUserName?: string;
    timestamp: any;
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

export const GroupPage = () => {
    const { groupId } = useParams<{ groupId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [groupName, setGroupName] = useState<string>("Loading Group...");
    const [publications, setPublications] = useState<Publication[]>([]);
    const [loading, setLoading] = useState(true);
    const [userGroupId, setUserGroupId] = useState<string | null>(null);
    const [joining, setJoining] = useState(false);
    const [groupCreatedBy, setGroupCreatedBy] = useState<string>("");
    const [deletingGroup, setDeletingGroup] = useState(false);
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
    const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const isGroupCreator = !!user && user.uid === groupCreatedBy;

    // Fetch group details & mark as seen
    useEffect(() => {
        if (!groupId) return;
        const fetchGroup = async () => {
            const groupRef = doc(db, "publications", groupId);
            const groupSnap = await getDoc(groupRef);
            if (groupSnap.exists()) {
                setGroupName(groupSnap.data().name);
                setGroupCreatedBy(groupSnap.data().createdBy || "");
            } else {
                setGroupName("Group not found");
            }
        };
        fetchGroup();

        // Mark this group as seen to clear the notification dot
        if (user) {
            const userRef = doc(db, "users", user.uid);
            updateDoc(userRef, {
                [`lastSeenGroups.${groupId}`]: serverTimestamp()
            }).catch((err) => console.error("Error marking group as seen:", err));
        }
    }, [groupId, user]);

    // Fetch publications for this group
    useEffect(() => {
        if (!groupId) return;

        const q = query(
            collection(db, "publications", groupId, "posts"),
            orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Publication[];
            setPublications(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching group publications:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [groupId]);

    // Fetch current user group status
    useEffect(() => {
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserGroupId(docSnap.data().dailyRankingGroupId || null);
            }
        });
        return () => unsubscribe();
    }, [user]);

    const handleJoinGroup = async () => {
        if (!user || !groupId) return;
        setJoining(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                dailyRankingGroupId: groupId
            });
            Swal.fire({
                icon: 'success',
                title: '¡Te has unido!',
                text: `Ahora eres miembro de ${groupName}`,
                timer: 2000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        } catch (error) {
            console.error("Error joining group:", error);
        } finally {
            setJoining(false);
        }
    };

    const handleUploadSale = async () => {
        if (!user || !groupId) return;

        const { value: formValues } = await Swal.fire({
            title: `Publicar en ${groupName}`,
            html:
                '<div class="flex flex-col gap-4">' +
                '<input id="swal-product" class="swal2-input !m-0" placeholder="¿Qué vendiste?">' +
                '<input id="swal-revenue" type="number" class="swal2-input !m-0" placeholder="Revenue ($)">' +
                '<select id="swal-type" class="swal2-input !m-0">' +
                '<option value="Devices">Devices</option>' +
                '<option value="Data">Data</option>' +
                '<option value="Line">Line</option>' +
                '<option value="Other">Other</option>' +
                '</select>' +
                '</div>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Publicar',
            confirmButtonColor: '#4f46e5',
            preConfirm: () => {
                const prod = (document.getElementById('swal-product') as HTMLInputElement).value;
                const rev = (document.getElementById('swal-revenue') as HTMLInputElement).value;
                const type = (document.getElementById('swal-type') as HTMLSelectElement).value;
                if (!prod || !rev) {
                    Swal.showValidationMessage('Por favor completa los campos');
                    return false;
                }
                return { product: prod, revenue: rev, type: type }
            }
        });

        if (formValues) {
            try {
                await addDoc(collection(db, "publications", groupId, "posts"), {
                    userId: user.uid,
                    userName: user.displayName || 'Anonymous',
                    userAvatar: user.photoURL || '',
                    product: formValues.product,
                    revenue: parseFloat(formValues.revenue),
                    type: formValues.type,
                    groupId: groupId,
                    groupName: groupName,
                    timestamp: serverTimestamp()
                });

                // Update lastPostAt to trigger notification dots for other users
                const groupRef = doc(db, "publications", groupId);
                await updateDoc(groupRef, {
                    lastPostAt: serverTimestamp()
                });

                // Mark as seen for the publisher
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, {
                    [`lastSeenGroups.${groupId}`]: serverTimestamp()
                });

                Swal.fire({
                    icon: 'success',
                    title: '¡Venta publicada!',
                    timer: 1500,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
            } catch (error) {
                console.error("Error publishing sale:", error);
            }
        }
    };

    const handleDeleteGroup = async () => {
        if (!user || !groupId || !isGroupCreator || deletingGroup) return;

        const result = await Swal.fire({
            title: "¿Eliminar grupo?",
            text: "Se eliminará el grupo y todas sus publicaciones. Esta acción no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#f1f5f9",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            customClass: {
                popup: "rounded-3xl",
                confirmButton: "rounded-xl px-6 py-2",
                cancelButton: "rounded-xl px-6 py-2 !text-slate-600",
            },
        });

        if (!result.isConfirmed) return;

        setDeletingGroup(true);
        try {
            const postsRef = collection(db, "publications", groupId, "posts");
            const postsSnapshot = await getDocs(postsRef);
            const batch = writeBatch(db);

            postsSnapshot.docs.forEach((postDoc) => {
                batch.delete(postDoc.ref);
            });
            batch.delete(doc(db, "publications", groupId));
            await batch.commit();

            if (userGroupId === groupId) {
                await updateDoc(doc(db, "users", user.uid), { dailyRankingGroupId: null });
            }

            Swal.fire({
                icon: "success",
                title: "Grupo eliminado",
                timer: 1800,
                showConfirmButton: false,
                position: "top-end",
                toast: true,
            });
            navigate(-1);
        } catch (error) {
            console.error("Error deleting group:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo eliminar el grupo.",
                toast: true,
                position: "top-end",
                timer: 3000,
                showConfirmButton: false,
            });
        } finally {
            setDeletingGroup(false);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!user || !groupId || deletingPostId) return;

        const result = await Swal.fire({
            title: "¿Eliminar publicación?",
            text: "Esta publicación se eliminará para todos los miembros del grupo.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#f1f5f9",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            customClass: {
                popup: "rounded-3xl",
                confirmButton: "rounded-xl px-6 py-2",
                cancelButton: "rounded-xl px-6 py-2 !text-slate-600",
            },
        });

        if (!result.isConfirmed) return;

        setDeletingPostId(postId);
        try {
            await deleteDoc(doc(db, "publications", groupId, "posts", postId));
            Swal.fire({
                icon: "success",
                title: "Publicación eliminada",
                timer: 1500,
                showConfirmButton: false,
                position: "top-end",
                toast: true,
            });
        } catch (error) {
            console.error("Error deleting post:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo eliminar la publicación.",
                toast: true,
                position: "top-end",
                timer: 3000,
                showConfirmButton: false,
            });
        } finally {
            setDeletingPostId(null);
        }
    };

    const handleToggleCall = async (postId: string, currentCallUserId?: string) => {
        if (!user || !groupId) return;

        if (currentCallUserId && currentCallUserId !== user.uid) {
            Swal.fire({
                icon: 'warning',
                title: 'No disponible',
                text: 'Otro usuario ya está dandole seguimiento a esta orden.',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
            return;
        }

        try {
            const postRef = doc(db, "publications", groupId, "posts", postId);

            if (currentCallUserId === user.uid) {
                await updateDoc(postRef, {
                    callingByUserId: null,
                    callingByUserName: null
                });
            } else {
                await updateDoc(postRef, {
                    callingByUserId: user.uid,
                    callingByUserName: user.displayName || 'Anonymous'
                });
            }
        } catch (error) {
            console.error("Error toggling call status:", error);
        }
    };

    const handleUpdatePostStatus = async (postId: string, newStatus: string) => {
        if (!user || !groupId) return;
        setUpdatingStatusId(postId);
        try {
            const postRef = doc(db, "publications", groupId, "posts", postId);
            await updateDoc(postRef, { status: newStatus });
            setShowStatusMenu(null);
        } catch (error) {
            console.error("Error updating status:", error);
        } finally {
            setUpdatingStatusId(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors group"
                        >
                            <ArrowLeft size={20} className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-widest rounded-md border border-indigo-100/50">
                                    Community Group
                                </span>
                            </div>
                            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                                {groupName}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {userGroupId === groupId ? (
                            <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 font-bold text-sm">
                                <Check size={18} />
                                Miembro Activo
                            </div>
                        ) : (
                            <button
                                onClick={handleJoinGroup}
                                disabled={joining}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Plus size={18} />
                                Unirse al Grupo
                            </button>
                        )}
                        <button
                            onClick={handleUploadSale}
                            className="p-3 bg-white text-slate-600 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all font-bold shadow-sm active:scale-95"
                            title="Publicar Venta"
                        >
                            <MessageSquare size={20} />
                        </button>
                        {isGroupCreator && (
                            <button
                                onClick={handleDeleteGroup}
                                disabled={deletingGroup}
                                className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-all font-bold shadow-sm active:scale-95 disabled:opacity-50"
                                title="Eliminar grupo"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Feed */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-2 mb-2">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Actividad Reciente</h2>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                <Clock size={12} />
                                Real-time
                            </div>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-40 bg-white rounded-3xl animate-pulse border border-slate-100" />
                                ))}
                            </div>
                        ) : publications.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Globe size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Sin publicaciones</h3>
                                <p className="text-slate-500 max-w-xs mx-auto">Sé el primero en compartir algo con el grupo {groupName}.</p>
                                <button
                                    onClick={handleUploadSale}
                                    className="mt-6 px-6 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-100 transition-colors"
                                >
                                    Hacer primera publicación
                                </button>
                            </div>
                        ) : (
                            publications.map((item) => (
                                (() => {
                                    const rawStatus = (item.status || "pending").toLowerCase().trim();
                                    const normalizedStatus = rawStatus === "no schedule" ? "no-schedule" : rawStatus;
                                    const currentStatus = statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.pending;

                                    return (
                                        <div
                                            key={item.id}
                                            className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
                                        >
                                            <div className="flex items-center gap-4 mb-5">
                                                <img
                                                    src={item.userAvatar || `https://ui-avatars.com/api/?name=${item.userName}&background=random`}
                                                    alt={item.userName}
                                                    className="w-12 h-12 rounded-2xl border-2 border-white shadow-md"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 text-lg leading-tight">{item.userName}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium tracking-tight">
                                                            <Clock size={12} />
                                                            <span>Recientemente</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex items-center gap-2 shadow-sm">
                                                    <TrendingUp size={16} strokeWidth={3} />
                                                    <span className="font-black text-sm">${item.revenue.toFixed(2)}</span>
                                                </div>
                                                {item.userId === user?.uid && (
                                                    <button
                                                        onClick={() => handleDeletePost(item.id)}
                                                        disabled={deletingPostId === item.id}
                                                        className="p-2.5 bg-rose-50 text-rose-500 rounded-xl border border-rose-100 hover:bg-rose-100 transition-colors disabled:opacity-50"
                                                        title="Eliminar publicación"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100/50 group-hover:bg-indigo-50/30 group-hover:border-indigo-100/50 transition-colors">
                                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0">
                                                    <Package size={20} className="text-indigo-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs uppercase tracking-widest font-black text-slate-400 leading-none mb-2">Product</p>
                                                    <p className="text-lg font-bold text-slate-700 truncate leading-tight">{item.product}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setShowStatusMenu(showStatusMenu === item.id ? null : item.id)}
                                                        className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all flex items-center gap-1 ${currentStatus.color
                                                            } ${updatingStatusId === item.id ? 'opacity-50 animate-pulse' : 'hover:scale-105 active:scale-95'}`}
                                                    >
                                                        {currentStatus.icon}
                                                        {currentStatus.label}
                                                        <ChevronDown size={10} className={`transition-transform ${showStatusMenu === item.id ? 'rotate-180' : ''}`} />
                                                    </button>

                                                    {showStatusMenu === item.id && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={() => setShowStatusMenu(null)}
                                                            />
                                                            <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                                                                {Object.entries(statusConfig).map(([key, config]) => (
                                                                    <button
                                                                        key={key}
                                                                        onClick={() => handleUpdatePostStatus(item.id, key)}
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

                                                <button
                                                    onClick={() => handleToggleCall(item.id, item.callingByUserId)}
                                                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border flex items-center transition-all ${item.callingByUserId
                                                        ? item.callingByUserId === user?.uid
                                                            ? "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100"
                                                            : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
                                                        : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100"
                                                        }`}
                                                >
                                                    {item.callingByUserId ? (
                                                        item.callingByUserId === user?.uid ? (
                                                            <>
                                                                <PhoneOff size={11} className="mr-1.5" />
                                                                Llamada pendiente por mí
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Phone size={11} className="mr-1.5" />
                                                                Llamada por: {item.callingByUserName}
                                                            </>
                                                        )
                                                    ) : (
                                                        <>
                                                            <Phone size={11} className="mr-1.5" />
                                                            Escojer para llamar
                                                        </>
                                                    )}
                                                </button>

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
                                        </div>
                                    );
                                })()
                            ))
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 overflow-hidden relative group">
                            <Target className="absolute -bottom-6 -right-6 w-32 h-32 opacity-10 group-hover:rotate-12 transition-transform duration-700" />
                            <div className="relative z-10">
                                <h3 className="text-xl font-black mb-2">Sobre el grupo</h3>
                                <p className="text-indigo-100 text-sm font-medium leading-relaxed mb-6">
                                    Este es un espacio dedicado para los miembros de <span className="text-white font-bold">{groupName}</span>.

                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-3 border-b border-white/10">
                                        <span className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Publicaciones</span>
                                        <span className="font-black text-xl">{publications.length}</span>
                                    </div>

                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </div>
        </div>
    );
};
