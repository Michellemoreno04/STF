import { Calendar, Package, Search, Filter, X } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Smartphone } from "lucide-react";
import { Wifi } from "lucide-react";
import { TrendingUp } from "lucide-react";
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


export const Table = () => {
    const [sales] = useState<Sale[]>(sampleSales);
    const [query, setQuery] = useState("");
    const [filterTipo, setFilterTipo] = useState("Todos");
    const [filterDate, setFilterDate] = useState("");

    const ventasFiltradas = sales.filter((s) => {
        const matchesQuery = [s.producto, s.cliente, s.vendedor]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesTipo = filterTipo === "Todos" || s.tipo === filterTipo;

        const matchesDate = filterDate
            ? new Date(s.fecha).toLocaleDateString() === new Date(filterDate).toLocaleDateString()
            : true;

        return matchesQuery && matchesTipo && matchesDate;
    });

    const getStatusIcon = (tipo: string) => {
        switch (tipo) {
            case "Teléfono": return <Smartphone size={14} className="mr-1" />;
            case "Línea": return <Wifi size={14} className="mr-1" />;
            case "Datos": return <TrendingUp size={14} className="mr-1" />;
            default: return <Package size={14} className="mr-1" />;
        }
    };

    const getStatusColor = (tipo: string) => {
        switch (tipo) {
            case "Teléfono": return "bg-blue-100 text-blue-700 border-blue-200";
            case "Línea": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "Datos": return "bg-purple-100 text-purple-700 border-purple-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    return (
        <div className="glass rounded-3xl shadow-xl overflow-hidden border border-white/50 bg-white/80">
            {/* Filters Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por producto, cliente..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-600 placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-600 cursor-pointer hover:border-indigo-300"
                        >
                            <option value="Todos">Todos los tipos</option>
                            <option value="Teléfono">Teléfonos</option>
                            <option value="Línea">Líneas</option>
                            <option value="Datos">Datos</option>
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>

                    <div className="relative">
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="pl-4 pr-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-600 cursor-pointer hover:border-indigo-300"
                        />
                    </div>

                    {(query || filterTipo !== "Todos" || filterDate) && (
                        <button
                            onClick={() => {
                                setQuery("");
                                setFilterTipo("Todos");
                                setFilterDate("");
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Limpiar filtros"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                            <th className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                            <th className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto</th>
                            <th className="p-5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cant.</th>
                            <th className="p-5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
                            <th className="p-5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                            <th className="p-5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {ventasFiltradas.length > 0 ? (
                            ventasFiltradas.map((s) => (
                                <tr key={s.id} className="group hover:bg-indigo-50/30 transition-colors duration-200">
                                    <td className="p-5">
                                        <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                                            <Calendar size={14} className="text-slate-400" />
                                            {new Date(s.fecha).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(s.tipo)}`}>
                                            {getStatusIcon(s.tipo)}
                                            {s.tipo}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        <div className="font-semibold text-slate-800">{s.producto}</div>
                                        {s.cliente && <div className="text-xs text-slate-400 mt-0.5">{s.cliente}</div>}
                                    </td>
                                    <td className="p-5 text-right font-medium text-slate-600">{s.cantidad}</td>
                                    <td className="p-5 text-right text-slate-600">${s.precioUnitario.toFixed(2)}</td>
                                    <td className="p-5 text-right font-bold text-slate-800">${s.revenue.toFixed(2)}</td>
                                    <td className="p-5 text-center">
                                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="p-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Package size={32} className="text-slate-300" />
                                        <p>No se encontraron ventas que coincidan con los filtros.</p>
                                        <button
                                            onClick={() => {
                                                setQuery("");
                                                setFilterTipo("Todos");
                                                setFilterDate("");
                                            }}
                                            className="text-indigo-500 hover:text-indigo-600 text-sm font-medium"
                                        >
                                            Limpiar filtros
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {/* Table Footer */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
                    <span>Mostrando {ventasFiltradas.length} resultados</span>
                    <div className="flex items-center gap-2">
                        <span>Total en vista:</span>
                        <span className="font-bold text-slate-800 text-lg">
                            ${ventasFiltradas.reduce((acc, r) => acc + r.revenue, 0).toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>

    );
};