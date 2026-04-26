import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";


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
    console.log(publications);


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




};

export default CommunityFeed;
