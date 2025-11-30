import { Package, Users, TrendingUp } from "lucide-react";
import { useState } from "react";

type Sale = {
    id: string;
    fecha: string; // ISO
    tipo: "Datos" | "Teléfono" | "Línea" | "Otro";
    producto: string;
    cantidad: number;
    precioUnitario: number;
    revenue: number;
    cliente?: string;
    vendedor?: string;
};

const sampleSales: Sale[] = [
    {
        id: "1",
        fecha: new Date().toISOString(),
        tipo: "Teléfono",
        producto: "iPhone 14 Pro Max",
        cantidad: 2,
        precioUnitario: 1099,
        revenue: 2198,
        cliente: "Juan Pérez",
        vendedor: "María",
    },
    {
        id: "2",
        fecha: new Date().toISOString(),
        tipo: "Línea",
        producto: "Plan Ilimitado 5G",
        cantidad: 1,
        precioUnitario: 45,
        revenue: 45,
        cliente: "Tech Solutions Inc.",
        vendedor: "Carlos",
    },
    {
        id: "3",
        fecha: new Date(Date.now() - 86400000).toISOString(),
        tipo: "Datos",
        producto: "Paquete Roaming",
        cantidad: 5,
        precioUnitario: 15,
        revenue: 75,
        cliente: "Viajes Globales",
        vendedor: "Ana",
    },
];






export const StatCards = () => {
    const [sales, setSales] = useState<Sale[]>(sampleSales);




    const totalUnidades = sales.reduce((acc, s) => acc + s.cantidad, 0);


    return (
        <div className="grid grid-cols-2 gap-3">
            <StatCard
                title="Lines sold"
                value={sales.length.toString()}
                icon={<TrendingUp className="text-white" size={18} />}
                color="bg-gradient-to-br from-pink-500 to-rose-500"
            />
            <StatCard
                title="Devices"
                value={totalUnidades.toString()}
                icon={<Package className="text-white" size={18} />}
                color="bg-gradient-to-br from-indigo-500 to-blue-500"
            />
            <StatCard
                title="Data Add"
                value="124"
                icon={<Users className="text-white" size={18} />}
                color="bg-gradient-to-br from-emerald-400 to-teal-500"
            />
            <StatCard
                title="Asurion"
                value="124"
                icon={<Users className="text-white" size={18} />}
                color="bg-gradient-to-br from-emerald-400 to-teal-500"
            />
            <StatCard
                title="Tv"
                value="124"
                icon={<Users className="text-white" size={18} />}
                color="bg-gradient-to-br from-emerald-400 to-teal-500"
            />
            <StatCard
                title="Revenue"
                value="124"
                icon={<Users className="text-white" size={18} />}
                color="bg-gradient-to-br from-emerald-400 to-teal-500"
            />
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
