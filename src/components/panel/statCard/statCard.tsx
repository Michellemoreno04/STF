import { TrendingUp, Tv, CircleDollarSign, Shield, Database, Smartphone, AlertCircle } from "lucide-react";

export interface Stats {
    lines: number;
    devices: number;
    internet: number;
    asurion: number;
    tv: number;
    revenue: number;
    phone: number;
    dailyRevenue: number;
}

export const StatCards = ({ stats }: { stats: Stats }) => {
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

            <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
                <StatCard
                    title="Lines Sold"
                    value={stats.lines.toString()}
                    icon={<TrendingUp size={20} />}
                    color="text-rose-600 bg-rose-50 border-rose-100"
                    iconColor="bg-rose-500 text-white"
                    goal="Mobile yield 5%"
                />
                <StatCard
                    title="Devices"
                    value={stats.devices.toString()}
                    icon={<Smartphone size={20} />}
                    color="text-indigo-600 bg-indigo-50 border-indigo-100"
                    iconColor="bg-indigo-500 text-white"
                    goal="Mobile yield 5%"
                />
                <StatCard
                    title="Internet"
                    value={stats.internet.toString()}
                    icon={<Database size={20} />}
                    color="text-cyan-600 bg-cyan-50 border-cyan-100"
                    iconColor="bg-cyan-500 text-white"
                    goal="Data yield 7%"
                />
                <StatCard
                    title="Asurion"
                    value={stats.asurion.toString()}
                    icon={<Shield size={20} />}
                    color="text-emerald-600 bg-emerald-50 border-emerald-100"
                    iconColor="bg-emerald-500 text-white"
                    goal="55%"
                />
                <StatCard
                    title="TV"
                    value={stats.tv.toString()}
                    icon={<Tv size={20} />}
                    color="text-violet-600 bg-violet-50 border-violet-100"
                    iconColor="bg-violet-500 text-white"
                />
                <StatCard
                    title="Phone"
                    value={stats.phone.toString()}
                    icon={<Smartphone size={20} />}
                    color="text-blue-600 bg-blue-50 border-blue-100"
                    iconColor="bg-blue-500 text-white"
                />
                <div className="col-span-2">
                    <StatCard
                        title="Total Revenue"
                        value={`$${stats.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        icon={<CircleDollarSign size={20} />}
                        color="text-amber-600 bg-amber-50 border-amber-100"
                        iconColor="bg-amber-500 text-white"
                        goal='$15 Per call'
                        isWide
                    />
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon, iconColor, goal, isWide }: { title: string, value: string, icon: React.ReactNode, color?: string, iconColor: string, goal?: any, isWide?: boolean }) {
    return (
        <div className="relative">
            <div className={`
                relative overflow-hidden group p-5 rounded-3xl transition-all duration-300
                bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg shadow-slate-200/50
                hover:shadow-xl hover:shadow-indigo-100/40 hover:-translate-y-1 hover:border-indigo-200
                ${isWide ? 'flex items-center justify-between px-6' : 'flex flex-col items-start gap-3'}
            `}>
                {/* Background Decoration */}
                <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-110 ${iconColor.replace('text-white', '')}`}></div>

                <div className={`
                    p-3 rounded-2xl shadow-sm transition-transform duration-300 group-hover:rotate-[10deg]
                    ${iconColor}
                `}>
                    {icon}
                </div>

                <div className={`${isWide ? 'text-right' : ''}`}>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{title}</p>
                    <p className={`font-bold text-slate-800 ${isWide ? 'text-2xl' : 'text-xl'}`}>{value}</p>
                </div>
            </div>

            {/* Tooltip fuera del contenedor con overflow-hidden */}
            {goal && (
                <div className="absolute top-3 right-3 z-[100]">
                    <div className="group/tooltip relative">
                        <AlertCircle className="text-slate-300 hover:text-indigo-500 transition-colors cursor-help" size={16} />
                        <div className="absolute bottom-full right-0 mb-2 w-max px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-[200] shadow-xl translate-y-2 group-hover/tooltip:translate-y-0 pointer-events-none">
                            Goal: <span className="font-bold text-emerald-400">{goal}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
