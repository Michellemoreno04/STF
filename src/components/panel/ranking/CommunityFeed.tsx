import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import { MessageSquare } from "lucide-react";
import { useAuth } from "../auth/authContext";
import { doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

interface Publication {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    product: string;
    revenue: number;
    type: string;
    groupId?: string;
    groupName?: string;
    timestamp: any;
}

export const CommunityFeed = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [publications, setPublications] = useState<Publication[]>([]);
    const [loading, setLoading] = useState(true);
    const [userGroupId, setUserGroupId] = useState<string | null>(null);
    const [groups, setGroups] = useState<{ id: string, name: string }[]>([]);
    const [joiningId, setJoiningId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(
            collection(db, "publications"),
            orderBy("timestamp", "desc"),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Publication[];
            setPublications(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching publications:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Fetch user group status
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

    // Fetch all groups
    useEffect(() => {
        const q = query(collection(db, "rankingGroups"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const groupsData = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name
            }));
            setGroups(groupsData);
        });
        return () => unsubscribe();
    }, []);

    const handleJoinGroup = async (groupId: string) => {
        if (!user) return;
        setJoiningId(groupId);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                dailyRankingGroupId: groupId
            });
            Swal.fire({
                icon: 'success',
                title: '¡Te has unido!',
                text: 'Ahora eres parte de este grupo.',
                timer: 2000,
                showConfirmButton: false,
                position: 'top-end',
                toast: true
            });
        } catch (error) {
            console.error("Error joining group:", error);
        } finally {
            setJoiningId(null);
        }
    };

    const handleUploadLote = async () => {
        if (!user) return;

        const { value: formValues } = await Swal.fire({
            title: 'Subir Lote de Venta',
            html:
                '<input id="swal-product" class="swal2-input" placeholder="Producto">' +
                '<input id="swal-revenue" type="number" class="swal2-input" placeholder="Revenue ($)">' +
                '<select id="swal-type" class="swal2-input">' +
                '<option value="Devices">Devices</option>' +
                '<option value="Data">Data</option>' +
                '<option value="Line">Line</option>' +
                '<option value="Other">Other</option>' +
                '</select>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Publicar',
            confirmButtonColor: '#4f46e5',
            preConfirm: () => {
                return {
                    product: (document.getElementById('swal-product') as HTMLInputElement).value,
                    revenue: (document.getElementById('swal-revenue') as HTMLInputElement).value,
                    type: (document.getElementById('swal-type') as HTMLSelectElement).value
                }
            }
        });

        if (formValues && formValues.product && formValues.revenue) {
            try {
                const groupName = groups.find(g => g.id === userGroupId)?.name || 'Global';
                await addDoc(collection(db, "publications"), {
                    userId: user.uid,
                    userName: user.displayName || 'Anonymous',
                    userAvatar: user.photoURL || '',
                    product: formValues.product,
                    revenue: parseFloat(formValues.revenue),
                    type: formValues.type,
                    groupId: userGroupId || 'global',
                    groupName: groupName,
                    timestamp: serverTimestamp()
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Lote publicado',
                    timer: 1500,
                    showConfirmButton: false,
                    position: 'top-end',
                    toast: true
                });
            } catch (error) {
                console.error("Error publishing lote:", error);
            }
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return "Just now";
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
                Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60)),
                'minute'
            );
        } catch {
            return "Recently";
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-4 p-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />
                ))}
            </div>
        );
    }

    if (publications.length === 0) {
        return (
            <div className="text-center text-slate-400 py-12 flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                    <MessageSquare size={28} className="text-slate-300" />
                </div>
                <div>
                    <p className="font-medium text-slate-600">No publications yet</p>
                    <p className="text-xs mt-1">Be the first to share a sale!</p>
                </div>
            </div>
        );
    }


};

export default CommunityFeed;
