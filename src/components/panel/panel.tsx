import {
  CirclePlus,
  Search,
  Filter
} from "lucide-react";
import { useState } from "react";
import ModalAddProducts from "./sweetAlert/addProductModal";
import { StatCards } from "./statCard/statCard";
import { Table } from "./table/table";


export default function PanelVentas() {
  const [sales, setSales] = useState([]);
  const [query, setQuery] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("Todos");



  const totalRevenue = sales.reduce((acc, s) => acc + 8, 0);





  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-900">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-b-[3rem] shadow-2xl z-0"></div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 text-white">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">STF Panel</h1>
            <p className="text-indigo-100 text-lg font-light">Panel de Control de Ventas</p>
          </div>

          <div className="flex items-center gap-4 mt-6 md:mt-0">
            <div className="glass px-6 py-3 rounded-2xl flex flex-col items-end border-0 bg-white/10 backdrop-blur-md">
              <span className="text-indigo-600  text-xs font-medium uppercase tracking-wider">Revenue Total</span>
              <span className="text-2xl font-bold text-white">${totalRevenue.toLocaleString()}</span>
            </div>
            <ModalAddProducts onClose={() => console.log('cerro')} />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left column: Stats & Info */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Stats Grid */}
            <StatCards />

            {/* Quick Actions / Help */}
            <div className="glass p-6 rounded-3xl border border-white/60 shadow-lg bg-white/80">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <CirclePlus size={18} className="text-indigo-600" />
                Acciones Rápidas
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2 p-2 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  Exportar reporte mensual
                </li>
                <li className="flex items-center gap-2 p-2 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer">
                  <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                  Gestionar inventario
                </li>
                <li className="flex items-center gap-2 p-2 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Ver rendimiento de vendedores
                </li>
              </ul>
            </div>
          </aside>

          {/* Right column: Table & Filters */}
          <main className="lg:col-span-3 space-y-6">
            {/* Filters Bar */}
            <div className="glass p-4 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg bg-white/90">
              <div className="relative w-full md:w-96">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-slate-400" />
                </div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por producto, cliente..."
                  className="pl-10 pr-4 py-3 w-full bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter size={16} className="text-slate-400" />
                  </div>
                  <select
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                    className="pl-10 pr-8 py-3 w-full bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer text-slate-600 font-medium"
                  >
                    <option>Todos</option>
                    <option>Teléfono</option>
                    <option>Línea</option>
                    <option>Datos</option>
                    <option>Otro</option>
                  </select>
                </div>

                <button
                  onClick={() => { setQuery(""); setFilterTipo("Todos"); }}
                  className="px-4 py-3 text-sm font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </div>


            <Table />

          </main>
        </div>
      </div>
    </div>

  );
}

