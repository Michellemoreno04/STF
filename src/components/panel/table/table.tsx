import { Calendar, Package, Search, Filter, X, ChevronDown, Clock, DollarSign } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Smartphone } from "lucide-react";
import { Wifi } from "lucide-react";
import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit, where, doc, getDoc, increment, writeBatch } from "firebase/firestore";
import Swal from "sweetalert2";
import { db } from "../../../firebase";
import { useAuth } from "../auth/authContext";

import ModalAddProducts from "./addProductModal";
import { Trash2 } from "lucide-react";
import { Edit } from "lucide-react";

type Sale = {
    id: string;
    fecha: string; // ISO
    tipo: "Data" | "Devices" | "Line" | "Other";
    producto: string;
    cantidad: number;
    precioUnitario: number;
    revenue: number;
    hora: string;

};

export const Table = ({ onProductDeleted, onProductAdded }: { onProductDeleted?: () => void, onProductAdded?: () => void }) => {
    const { user } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [queryText, setQueryText] = useState("");
    const [filterTipo, setFilterTipo] = useState("Todos");
    const [filterDate, setFilterDate] = useState("");
    const [limitCount, setLimitCount] = useState(10);
    const [loadingMore, setLoadingMore] = useState(false);
    const [editingSale, setEditingSale] = useState<Sale | null>(null);

    useEffect(() => {
        if (!user) return;

        let q;
        const productsRef = collection(db, "users", user.uid, "products");

        if (filterDate) {
            const selectedDate = new Date(filterDate);
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
                    hora: data.hour,

                };
            });
            setSales(salesData);
            setLoadingMore(false);
        });

        return () => unsubscribe();
    }, [user, limitCount, filterDate]);

    // Client-side filtering for other fields
    const ventasFiltradas = sales.filter((s) => {
        const matchesQuery = [s.producto]
            .join(" ")
            .toLowerCase()
            .includes(queryText.toLowerCase());
        const matchesTipo = filterTipo === "Todos" || s.tipo === filterTipo;

        return matchesQuery && matchesTipo;
    });

    const handleLoadMore = () => {
        setLoadingMore(true);
        setLimitCount((prev) => prev + 15);
    };

    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeMenuId && !(event.target as Element).closest('.action-menu-container')) {
                setActiveMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenuId]);

    const handleEdit = (sale: Sale) => {
        setActiveMenuId(null); // Close menu
        setEditingSale(sale);
    };

    const handleDelete = async (sale: Sale) => {
        setActiveMenuId(null); // Close menu

        const result = await Swal.fire({
            title: 'Delete Record?',
            text: "This action cannot be undone and will affect your stats.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5', // Indigo 600
            cancelButtonColor: '#f1f5f9', // Slate 100
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'swal-popup',
                title: 'swal-title',
                confirmButton: 'swal-confirm-btn',
                cancelButton: 'swal-cancel-btn !text-slate-600',
            }
        });

        if (result.isConfirmed) {
            try {
                if (!user) return;

                const productRef = doc(db, "users", user.uid, "products", sale.id);
                const productSnap = await getDoc(productRef);

                if (!productSnap.exists()) {
                    throw new Error("Document does not exist");
                }

                const productData = productSnap.data();
                const productsList = productData.products || [];
                const revenue = productData.revenue || 0;
                const date = new Date(productData.date);
                const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const statsRef = doc(db, "users", user.uid, "monthly_stats", currentMonth);

                const batch = writeBatch(db);

                // Calculate decrements
                let decLines = 0;
                let decDevices = 0;
                let decInternet = 0;
                let decAsurion = 0;
                let decTv = 0;
                let decPhone = 0;

                productsList.forEach((p: any) => {
                    switch (p.category) {
                        case 'lines':
                            decLines += p.quantity || 0;
                            break;
                        case 'devices':
                            decDevices += p.quantity || 0;
                            break;
                        case 'internet':
                            decInternet += 1;
                            break;
                        case 'data': // Asurion
                            decAsurion += 1;
                            break;
                        case 'tv':
                            decTv += 1;
                            break;
                        case 'Phone':
                            decPhone += 1;
                            break;
                    }
                });

                // Update stats
                batch.set(statsRef, {
                    totalLines: increment(-decLines),
                    totalDevices: increment(-decDevices),
                    totalInternet: increment(-decInternet),
                    totalAsurion: increment(-decAsurion),
                    totalTv: increment(-decTv),
                    totalPhone: increment(-decPhone),
                    totalRevenue: increment(-revenue)
                }, { merge: true });

                // Update Daily Stats (Decrement)
                const todayDate = date.toISOString().split('T')[0];
                const dailyRef = doc(db, "users", user.uid, "daily_stats", todayDate);

                batch.set(dailyRef, {
                    lines: increment(-decLines),
                    devices: increment(-decDevices),
                    data: increment(-decInternet),
                    asurion: increment(-decAsurion),
                    tv: increment(-decTv),
                    phone: increment(-decPhone),
                    revenue: increment(-revenue)
                }, { merge: true });

                // Delete product
                batch.delete(productRef);

                await batch.commit();

                Swal.fire({
                    title: 'Deleted!',
                    text: 'The record has been deleted.',
                    icon: 'success',
                    confirmButtonColor: '#4f46e5',
                    customClass: {
                        popup: 'swal-popup',
                        title: 'swal-title',
                        confirmButton: 'swal-confirm-btn',
                    }
                }).then(() => {
                    if (onProductDeleted) {
                        onProductDeleted();
                    }
                });
            } catch (error) {
                console.error("Error deleting document: ", error);
                Swal.fire({
                    title: 'Error',
                    text: 'There was a problem deleting the record.',
                    icon: 'error',
                    confirmButtonColor: '#4f46e5',
                    customClass: {
                        popup: 'swal-popup',
                        title: 'swal-title',
                        confirmButton: 'swal-confirm-btn',
                    }
                });
            }
        }
    };

    const getStatusIcon = (tipo: string) => {
        switch (tipo) {
            case "Teléfono": return <Smartphone size={14} className="mr-1.5" />;
            case "Línea": return <Wifi size={14} className="mr-1.5" />;
            case "Datos": return <TrendingUp size={14} className="mr-1.5" />;
            case "Bundle": return <Package size={14} className="mr-1.5" />;
            default: return <Package size={14} className="mr-1.5" />;
        }
    };

    const getStatusColor = (tipo: string) => {
        switch (tipo) {
            case "Teléfono": return "bg-blue-100/50 text-blue-700 border-blue-200";
            case "Línea": return "bg-emerald-100/50 text-emerald-700 border-emerald-200";
            case "Datos": return "bg-purple-100/50 text-purple-700 border-purple-200";
            case "Bundle": return "bg-indigo-100/50 text-indigo-700 border-indigo-200";
            default: return "bg-slate-100/50 text-slate-700 border-slate-200";
        }
    };

    return (
        <div className="glass-card flex flex-col h-full overflow-hidden">
            {/* Filters Header */}
            <div className="p-5 border-b border-slate-100 bg-white/40 flex flex-wrap gap-4 items-center justify-between ">
                <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={queryText}
                            onChange={(e) => setQueryText(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-700 placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 pointer-events-none transition-colors" size={16} />
                        <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            className="appearance-none pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-700 cursor-pointer hover:border-indigo-300 shadow-sm"
                        >
                            <option value="Todos">All Types</option>
                            <option value="Teléfono">Phones</option>
                            <option value="Línea">Lines</option>
                            <option value="Datos">Data</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>

                    <div className="relative group">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 pointer-events-none transition-colors" size={16} />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => {
                                setFilterDate(e.target.value);
                                setLimitCount(10); // Reset limit when filter changes
                            }}
                            className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-700 cursor-pointer hover:border-indigo-300 shadow-sm"
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
                            className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                            title="Clear Filters"
                        >
                            <X size={18} />
                        </button>
                    )}
                    <div className="ml-2 pl-2 border-l border-slate-200">
                        <ModalAddProducts
                            onProductAdded={onProductAdded}
                            editingSale={editingSale}
                            onEditComplete={() => setEditingSale(null)}
                        />
                    </div>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 z-10">
                        <tr className="border-b border-slate-100 bg-white/95 backdrop-blur-sm shadow-sm">
                            <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                            <th className="p-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Product</th>
                            <th className="p-5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Qty</th>
                            <th className="p-5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Revenue</th>
                            <th className="p-5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/40">
                        {ventasFiltradas.length > 0 ? (
                            ventasFiltradas.map((s) => (
                                <tr key={s.id} className="group hover:bg-indigo-50/40 transition-colors duration-200">
                                    <td className="p-5">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
                                                {new Date(s.fecha).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                                                <Clock size={10} />
                                                <span>{s.hora}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${getStatusColor(s.tipo)} shadow-sm`}>
                                            {getStatusIcon(s.tipo)}
                                            {s.tipo}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        <div className="font-bold text-slate-800 text-sm">{s.producto}</div>
                                    </td>
                                    <td className="p-5 text-right font-medium text-slate-600">
                                        <span className="bg-slate-100 px-2 py-1 rounded-md text-xs font-bold text-slate-500">x{s.cantidad}</span>
                                    </td>
                                    <td className="p-5 text-right">
                                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shadow-sm inline-flex items-center gap-0.5">
                                            <DollarSign size={12} />
                                            {s.revenue.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="p-5 text-center relative action-menu-container">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(activeMenuId === s.id ? null : s.id);
                                            }}
                                            className={`p-2 rounded-xl transition-all ${activeMenuId === s.id ? 'text-indigo-600 bg-indigo-100 shadow-inner' : 'text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-md'}`}
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>

                                        {activeMenuId === s.id && (
                                            <div className="absolute right-12 top-1/2 -translate-y-1/2 w-40 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-indigo-100 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(s);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-2 border-b border-slate-50"
                                                >
                                                    <Edit size={14} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(s);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="p-16 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                            <Package size={24} className="text-slate-300" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-600">No sales found</p>
                                            <p className="text-sm mt-1">Try adjusting your filters</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setQueryText("");
                                                setFilterTipo("Todos");
                                                setFilterDate("");
                                                setLimitCount(10);
                                            }}
                                            className="text-indigo-500 hover:text-indigo-600 text-sm font-bold bg-indigo-50 px-4 py-2 rounded-xl mt-2 transition-colors hover:bg-indigo-100"
                                        >
                                            Clear Filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Load More Button */}
                {sales.length >= limitCount && (
                    <div className="p-4 flex justify-center border-t border-slate-100 bg-slate-50/30">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-lg transition-all disabled:opacity-50 active:scale-95"
                        >
                            {loadingMore ? (
                                <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <ChevronDown size={16} />
                            )}
                            {loadingMore ? "Loading..." : "Load More"}
                        </button>
                    </div>
                )}
            </div>

            {/* Table Footer */}
            <div className="p-4 border-t border-slate-100 bg-white/50 flex items-center justify-between text-xs font-medium text-slate-400 shrink-0">
                <span>Showing {ventasFiltradas.length} records</span>
                <span>Real-time updates active</span>
            </div>
        </div>
    );
};