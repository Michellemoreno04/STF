import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import { MessageSquare } from "lucide-react";


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
    const [publications, setPublications] = useState<Publication[]>([]);
    const [loading, setLoading] = useState(true);

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
