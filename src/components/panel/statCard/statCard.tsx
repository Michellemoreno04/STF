import { TrendingUp, Tv, CircleDollarSign, Shield, Database, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../auth/authContext";







export const StatCards = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        lines: 0,
        devices: 0,
        internet: 0,
        asurion: 0,
        tv: 0,
        revenue: 0,
        phone: 0
    });

    useEffect(() => {
        if (!user) return;

        const date = new Date();
        const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const userRef = doc(db, "users", user.uid, "monthly_stats", currentMonth);

        const unsubscribe = onSnapshot(userRef, (docSnap) => {
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
                });
            } else {
                // If document doesn't exist (new month), reset stats to 0
                setStats({
                    lines: 0,
                    devices: 0,
                    internet: 0,
                    asurion: 0,
                    tv: 0,
                    revenue: 0,
                    phone: 0
                });
            }
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <div >
            <h2 className="text-2xl font-bold text-white">
                Current Month
            </h2>
            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    title="Lines sold"
                    value={stats.lines.toString()}
                    icon={<TrendingUp className="text-white" size={18} />}
                    color="bg-gradient-to-br from-pink-500 to-rose-500"
                />
                <StatCard
                    title="Devices"
                    value={stats.devices.toString()}
                    icon={<Smartphone className="text-white" size={18} />}
                    color="bg-gradient-to-br from-indigo-500 to-blue-500"
                />
                <StatCard
                    title="Data add"
                    value={stats.internet.toString()}
                    icon={<Database className="text-white" size={18} />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-500"
                />
                <StatCard
                    title="Asurion"
                    value={stats.asurion.toString()}
                    icon={<Shield className="text-white" size={18} />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-500"
                />
                <StatCard
                    title="Tv"
                    value={stats.tv.toString()}
                    icon={<Tv className="text-white" size={18} />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-500"
                />
                <StatCard
                    title="Revenue"
                    value={`$${stats.revenue.toFixed(2)}`}
                    icon={<CircleDollarSign className="text-white" size={18} />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-500"
                />
                <StatCard
                    title="Phone"
                    value={stats.phone.toString()}
                    icon={<CircleDollarSign className="text-white" size={18} />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-500"
                />
            </div>
        </div>
    )
}

function StatCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) {
    return (
        <div className="glass p-4 rounded-3xl flex flex-col items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white text-center">
            <div className={`p-3 rounded-2xl shadow-lg ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
            </div>
        </div>
    );
}
