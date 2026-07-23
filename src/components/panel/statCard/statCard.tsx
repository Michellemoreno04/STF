import { TrendingUp, Tv, CircleDollarSign, Shield, Database, Smartphone, AlertCircle, BadgeDollarSign, Wrench, X, Check } from "lucide-react";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/authContext";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import Swal from "sweetalert2";

export interface Stats {
    lines: number;
    devices: number;
    internet: number;
    asurion: number;
    tv: number;
    revenue: number;
    phone: number;
    selfInstall: number;
    dailyRevenue: number;
    dailyLines: number;
    dailyData: number;
    dailyDevices: number;
    dailyAsurion: number;
    dailyTv: number;
    dailyPhone: number;
    commission: number;
    dailyCommission: number;
}

export const StatCards = ({ stats, onStatsUpdated }: { stats: Stats, onStatsUpdated?: () => void | Promise<void> }) => {
    const { user } = useAuth();
    const [goals, setGoals] = useState<Record<string, string>>({});
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editValue, setEditValue] = useState("");
    const [editGoal, setEditGoal] = useState("");

    useEffect(() => {
        if (!user) return;
        const fetchGoals = async () => {
            const snap = await getDoc(doc(db, "users", user.uid, "settings", "goals"));
            if (snap.exists()) {
                setGoals(snap.data() as Record<string, string>);
            }
        };
        fetchGoals();
    }, [user]);

    const openEdit = (key: string, title: string, value: number, defaultGoal: string) => {
        setEditingKey(key);
        setEditTitle(title);
        setEditValue(value.toString());
        setEditGoal(goals[key] ?? defaultGoal);
    };

    const handleSave = async () => {
        if (!user || !editingKey) return;
        try {
            await setDoc(doc(db, "users", user.uid, "settings", "goals"), {
                [editingKey]: editGoal
            }, { merge: true });
            
            const date = new Date();
            const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            const fieldMap: Record<string, string> = {
                lines: "totalLines",
                devices: "totalDevices",
                internet: "totalInternet",
                asurion: "totalAsurion",
                tv: "totalTv",
                phone: "totalPhone",
                selfInstall: "totalSelfInstall",
                revenue: "totalRevenue",
                commission: "totalCommission"
            };
            
            const field = fieldMap[editingKey];
            if (field) {
                await updateDoc(doc(db, "users", user.uid, "monthly_stats", currentMonth), {
                    [field]: parseFloat(editValue) || 0
                });
            }
            
            setGoals(prev => ({ ...prev, [editingKey]: editGoal }));
            setEditingKey(null);
            if (onStatsUpdated) onStatsUpdated();
            
            Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: 'Stat updated successfully.',
                timer: 1500,
                showConfirmButton: false,
                position: 'top-end'
            });
        } catch (error) {
            console.error("Error saving stat:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not update stat.' });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">
                    Monthly Stats
                </h2>
                <div className="text-sm font-medium text-slate-500 bg-white/50 px-3 py-1 rounded-full border border-white/60">
                    {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
                <StatCard
                    title="Lines Sold"
                    value={stats.lines.toString()}
                    icon={<TrendingUp size={18} />}
                    color="text-rose-600 bg-rose-50 border-rose-100"
                    iconColor="bg-rose-500 text-white"
                    goal={goals.lines ?? "Mobile yield 6%"}
                    onClick={() => openEdit('lines', 'Lines Sold', stats.lines, "Mobile yield 6%")}
                />
                <StatCard
                    title="Devices"
                    value={stats.devices.toString()}
                    icon={<Smartphone size={18} />}
                    color="text-indigo-600 bg-indigo-50 border-indigo-100"
                    iconColor="bg-indigo-500 text-white"
                    goal={goals.devices ?? "Mobile yield 5%"}
                    onClick={() => openEdit('devices', 'Devices', stats.devices, "Mobile yield 5%")}
                />
                <StatCard
                    title="Internet"
                    value={stats.internet.toString()}
                    icon={<Database size={18} />}
                    color="text-cyan-600 bg-cyan-50 border-cyan-100"
                    iconColor="bg-cyan-500 text-white"
                    goal={goals.internet ?? "Data yield 8%"}
                    onClick={() => openEdit('internet', 'Internet', stats.internet, "Data yield 8%")}
                />
                <StatCard
                    title="Asurion"
                    value={stats.asurion.toString()}
                    icon={<Shield size={18} />}
                    color="text-emerald-600 bg-emerald-50 border-emerald-100"
                    iconColor="bg-emerald-500 text-white"
                    goal={goals.asurion ?? "55%"}
                    onClick={() => openEdit('asurion', 'Asurion', stats.asurion, "55%")}
                />
                <StatCard
                    title="TV"
                    value={stats.tv.toString()}
                    icon={<Tv size={18} />}
                    color="text-violet-600 bg-violet-50 border-violet-100"
                    iconColor="bg-violet-500 text-white"
                    goal={goals.tv ?? ""}
                    onClick={() => openEdit('tv', 'TV', stats.tv, "")}
                />
                <StatCard
                    title="Phone"
                    value={stats.phone.toString()}
                    icon={<Smartphone size={18} />}
                    color="text-blue-600 bg-blue-50 border-blue-100"
                    iconColor="bg-blue-500 text-white"
                    goal={goals.phone ?? ""}
                    onClick={() => openEdit('phone', 'Phone', stats.phone, "")}
                />
                <StatCard
                    title="Self Install"
                    value={stats.selfInstall.toString()}
                    icon={<Wrench size={18} />}
                    color="text-teal-600 bg-teal-50 border-teal-100"
                    iconColor="bg-teal-500 text-white"
                    goal={goals.selfInstall ?? ""}
                    onClick={() => openEdit('selfInstall', 'Self Install', stats.selfInstall, "")}
                />
                <div className="col-span-2">
                    <StatCard
                        title="Total Revenue"
                        value={`$${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        icon={<CircleDollarSign size={18} />}
                        color="text-amber-600 bg-amber-50 border-amber-100"
                        iconColor="bg-amber-500 text-white"
                        goal={goals.revenue ?? "$15 Per call"}
                        isWide
                        onClick={() => openEdit('revenue', 'Total Revenue', stats.revenue, "$15 Per call")}
                    />
                </div>
                <div className="col-span-2">
                    <StatCard
                        title="Total Commission"
                        value={`$${stats.commission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        icon={<BadgeDollarSign size={18} />}
                        color="text-emerald-600 bg-emerald-50 border-emerald-100"
                        iconColor="bg-emerald-500 text-white"
                        goal={goals.commission ?? `Today: $${stats.dailyCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        isWide
                        onClick={() => openEdit('commission', 'Total Commission', stats.commission, `Today: $${stats.dailyCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
                    />
                </div>
            </div>

            {editingKey && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-white/50 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Edit {editTitle}</h3>
                            <button onClick={() => setEditingKey(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Value</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-slate-50 font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Goal Text</label>
                                <input 
                                    type="text"
                                    value={editGoal}
                                    onChange={e => setEditGoal(e.target.value)}
                                    placeholder="e.g., Mobile yield 6%"
                                    className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-slate-50 font-medium"
                                />
                            </div>
                            <button onClick={handleSave} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30">
                                <Check size={18} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

function StatCard({ title, value, icon, iconColor, goal, isWide, onClick }: { title: string, value: string, icon: React.ReactNode, color?: string, iconColor: string, goal?: string, isWide?: boolean, onClick?: () => void }) {
    return (
        <div className="relative">
            <div 
                onClick={onClick}
                className={`
                relative overflow-hidden group p-3.5 rounded-3xl transition-all duration-200 cursor-pointer
                bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-slate-200/50
                hover:shadow-xl hover:shadow-indigo-100/40 hover:-translate-y-1 hover:border-indigo-200
                ${isWide ? 'flex items-center justify-between px-5 py-4' : 'flex flex-col items-start gap-2.5'}
            `}>
                {/* Background Decoration */}
                <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-10 transition-transform group-hover:scale-110 ${iconColor.replace('text-white', '')}`}></div>

                <div className={`
                    p-2 rounded-xl shadow-sm transition-transform duration-200 group-hover:rotate-[10deg]
                    ${iconColor}
                `}>
                    {icon}
                </div>

                <div className={`${isWide ? 'text-right' : ''}`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
                    <p className={`font-bold text-slate-800 ${isWide ? 'text-xl' : 'text-lg'} leading-tight`}>{value}</p>
                </div>
            </div>

            {/* Tooltip outside overflow-hidden */}
            {goal && (
                <div className="absolute top-2.5 right-2.5 z-[100]">
                    <div className="group/tooltip relative">
                        <AlertCircle className="text-slate-300 hover:text-indigo-500 transition-colors cursor-help" size={14} />
                        <div className="absolute bottom-full right-0 mb-2 w-max px-3 py-1.5 bg-slate-800 text-white text-[11px] font-medium rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[200] shadow-xl translate-y-2 group-hover/tooltip:translate-y-0 pointer-events-none">
                            Goal: <span className="font-bold text-emerald-400">{goal}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
