import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/authContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase";
import { TrendingUp, Smartphone, Database, Shield, Tv, CircleDollarSign, Calendar, Phone, ArrowLeft } from "lucide-react";

interface MonthlyStats {
    id: string;
    totalLines: number;
    totalDevices: number;
    totalInternet: number;
    totalAsurion: number;
    totalTv: number;
    totalRevenue: number;
    totalPhone: number;
}

export const PassMonth = () => {
    const { user } = useAuth();
    const [months, setMonths] = useState<MonthlyStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMonths = async () => {
            if (!user) return;
            try {
                const querySnapshot = await getDocs(collection(db, "users", user.uid, "monthly_stats"));
                const fetchedMonths: MonthlyStats[] = [];
                const date = new Date();
                const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                querySnapshot.forEach((doc) => {
                    if (doc.id !== currentMonth) {
                        fetchedMonths.push({ id: doc.id, ...doc.data() } as MonthlyStats);
                    }
                });

                // Sort descending by date (id is YYYY-MM)
                fetchedMonths.sort((a, b) => b.id.localeCompare(a.id));

                setMonths(fetchedMonths);
            } catch (error) {
                console.error("Error fetching months:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMonths();
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 px-6">
            <button
                onClick={() => history.back()}
                className="text-slate-600 cursor-pointer mt-6 hover:text-blue-600 flex flex-row items-center gap-2 hover:text-slate-800 transition-colors duration-300"
            >
                <ArrowLeft className="w-6 h-6 text-slate-600 cursor-pointer" />
                Back
            </button>
            <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-600">
                    Previous Months History
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {months.map((month) => (
                    <MonthCard key={month.id} data={month} />
                ))}
                {months.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-10 bg-white/5 rounded-3xl border border-white/10 text-slate-400">
                        <Calendar className="w-12 h-12 mb-3 opacity-50" />
                        <p>No previous months data found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const MonthCard = ({ data }: { data: MonthlyStats }) => {
    const formatDate = (dateStr: string) => {
        const [year, month] = dateStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="p-3 bg-indigo-50 rounded-2xl">
                    <Calendar className="text-indigo-600" size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">{formatDate(data.id)}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <StatItem
                    icon={<TrendingUp size={16} className="text-white" />}
                    color="bg-gradient-to-br from-pink-500 to-rose-500"
                    label="Lines"
                    value={data.totalLines || 0}
                />
                <StatItem
                    icon={<Smartphone size={16} className="text-white" />}
                    color="bg-gradient-to-br from-indigo-500 to-blue-500"
                    label="Devices"
                    value={data.totalDevices || 0}
                />
                <StatItem
                    icon={<Database size={16} className="text-white" />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-500"
                    label="Internet"
                    value={data.totalInternet || 0}
                />
                <StatItem
                    icon={<Shield size={16} className="text-white" />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-500"
                    label="Asurion"
                    value={data.totalAsurion || 0}
                />
                <StatItem
                    icon={<Tv size={16} className="text-white" />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-500"
                    label="TV"
                    value={data.totalTv || 0}
                />
                <StatItem
                    icon={<Phone size={16} className="text-white" />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-500"
                    label="Phone"
                    value={data.totalPhone || 0}
                />
                <div className="col-span-2 mt-2">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl shadow-sm">
                            <CircleDollarSign size={16} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                            <p className="font-bold text-slate-800">${(data.totalRevenue || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatItem = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string | number, color: string }) => (
    <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl shadow-sm ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="font-bold text-slate-800">{value}</p>
        </div>
    </div>
);