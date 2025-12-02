import { Calendar, Package, Search, Filter, X, ChevronDown } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Smartphone } from "lucide-react";
import { Wifi } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../auth/authContext";

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

export const Table = () => {
    const { user } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [queryText, setQueryText] = useState("");
    const [filterTipo, setFilterTipo] = useState("Todos");
    const [filterDate, setFilterDate] = useState("");
    const [limitCount, setLimitCount] = useState(10);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        if (!user) return;

        let q;
        const productsRef = collection(db, "users", user.uid, "products");

        if (filterDate) {
            // Create start and end of the selected date in UTC/ISO format to match stored data
            // Assuming stored dates are ISO strings. We need to be careful with timezones.
            // If the user selects "2023-12-01", we want everything from that day.
            // A simple string comparison works if we construct the range correctly.

            const selectedDate = new Date(filterDate);
            // Set to beginning of day (local time, or we might need to adjust based on how data is saved)
            // For now, let's assume we want to filter by the string prefix if it was just YYYY-MM-DD, 
            // but since it's ISO with time, we need a range.

            // Let's try to cover the whole day in local time
            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            q = query(
                productsRef,
                where("date", ">=", startOfDay.toISOString()),
                where("date", "<=", endOfDay.toISOString()),
                orderBy("date", "desc"),
                limit(limitCount)
            );
        } else {
            q = query(
                productsRef,
                orderBy("date", "desc"),
                limit(limitCount)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const salesData = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    fecha: data.date,
                    tipo: data.type as any,
                    producto: data.product,
                    cantidad: data.quantity || 1,
                    precioUnitario: data.quantity ? (Number(data.revenue) || 0) / data.quantity : 0,
                    revenue: Number(data.revenue) || 0,
                    cliente: data.clientName || "N/A",
                    vendedor: "You",
                };
            });
            setSales(salesData);
            setLoadingMore(false);
        });

        return () => unsubscribe();
    }, [user, limitCount, filterDate]);

    // Client-side filtering for other fields
    const ventasFiltradas = sales.filter((s) => {
        const matchesQuery = [s.producto, s.cliente, s.vendedor]
            .join(" ")
            .toLowerCase()
            .includes(queryText.toLowerCase());
        const matchesTipo = filterTipo === "Todos" || s.tipo === filterTipo;

        // Date is already filtered by Firestore if filterDate is set, 
        // but we keep this if we want to be double sure or if the query changes.
        // Actually, if filterDate is set, Firestore returns only matches.
        // If filterDate is NOT set, we don't filter by date here.

        return matchesQuery && matchesTipo;
    });

    const handleLoadMore = () => {
        setLoadingMore(true);
        setLimitCount((prev) => prev + 10);
    };

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
        <div className="glass rounded-3xl shadow-xl overflow-hidden border border-white/50 bg-white/80 flex flex-col max-h-[800px]">
            {/* Filters Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between shrink-0">
                <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por producto, cliente..."
                            value={queryText}
                            onChange={(e) => setQueryText(e.target.value)}
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
                            onChange={(e) => {
                                setFilterDate(e.target.value);
                                setLimitCount(10); // Reset limit when filter changes
                            }}
                            className="pl-4 pr-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-600 cursor-pointer hover:border-indigo-300"
                        />
                    </div>

                    {(queryText || filterTipo !== "Todos" || filterDate) && (
                        <button
                            onClick={() => {
                                setQueryText("");
                                setFilterTipo("Todos");
                                setFilterDate("");
                                setLimitCount(10);
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Limpiar filtros"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 z-10">
                        <tr className="border-b border-slate-100 bg-slate-50/95 backdrop-blur-sm shadow-sm">
                            <th className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                            <th className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                            <th className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto</th>
                            <th className="p-5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Cant.</th>
                            <th className="p-5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
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
                                <td colSpan={6} className="p-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <Package size={32} className="text-slate-300" />
                                        <p>No se encontraron ventas que coincidan con los filtros.</p>
                                        <button
                                            onClick={() => {
                                                setQueryText("");
                                                setFilterTipo("Todos");
                                                setFilterDate("");
                                                setLimitCount(10);
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

                {/* Load More Button */}
                {sales.length >= limitCount && (
                    <div className="p-4 flex justify-center border-t border-slate-100">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="flex items-center gap-2 px-6 py-2 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <ChevronDown size={16} />
                            )}
                            {loadingMore ? "Cargando..." : "Cargar más"}
                        </button>
                    </div>
                )}
            </div>

            {/* Table Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500 shrink-0">
                <span>Mostrando {ventasFiltradas.length} resultados</span>
                <div className="flex items-center gap-2">
                    <span>Total en vista:</span>
                    <span className="font-bold text-slate-800 text-lg">
                        ${ventasFiltradas.reduce((acc, r) => acc + r.revenue, 0).toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
};