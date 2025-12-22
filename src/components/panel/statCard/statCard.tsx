import { TrendingUp, Tv, CircleDollarSign, Shield, Database, Smartphone, AlertCircle } from "lucide-react";




export interface Stats {
    lines: number;
    devices: number;
    internet: number;
    asurion: number;
    tv: number;
    revenue: number;
    phone: number;

}

export const StatCards = ({ stats }: { stats: Stats }) => {

    return (
        <div >
            <div className="flex items-center gap-2 mb-4">
                <h2 className="text-2xl font-bold text-white">
                    Current Month of {new Date().toLocaleString('en-US', { month: 'long' })}
                </h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <StatCard
                    title="Lines sold"
                    value={stats.lines.toString()}
                    icon={<TrendingUp className="text-white" size={18} />}
                    color="bg-gradient-to-br from-pink-500 to-rose-500"
                    goal="Mobile yield 3% a 4%"
                />
                <StatCard
                    title="Devices"
                    value={stats.devices.toString()}
                    icon={<Smartphone className="text-white" size={18} />}
                    color="bg-gradient-to-br from-indigo-500 to-blue-500"
                    goal="Mobile yield 3% a 4%"
                />
                <StatCard
                    title="Data add"
                    value={stats.internet.toString()}
                    icon={<Database className="text-white" size={18} />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-500"
                    goal="pending..."
                />
                <StatCard
                    title="Asurion"
                    value={stats.asurion.toString()}
                    icon={<Shield className="text-white" size={18} />}
                    color="bg-gradient-to-br from-emerald-400 to-teal-500"
                    goal="55%"
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
                    goal='$10 Per call'
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

function StatCard({ title, value, icon, color, goal }: { title: string, value: string, icon: React.ReactNode, color: string, goal?: any }) {
    return (
        <div className="glass p-4 rounded-3xl flex flex-col items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white text-center relative overflow-visible">
            <div className={`p-3 rounded-2xl shadow-lg ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                <p className="text-xl font-bold text-slate-800 mt-0.5">{value.toLocaleString()}</p>
            </div>
            {goal && (
                <div className="absolute top-3 right-3 z-200">
                    <div className="group/tooltip relative">
                        <AlertCircle className="text-indigo-400 hover:text-indigo-600 transition-colors cursor-help" size={18} />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none shadow-xl">
                            Goal: <span className="font-bold">{goal}</span>
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-800"></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
