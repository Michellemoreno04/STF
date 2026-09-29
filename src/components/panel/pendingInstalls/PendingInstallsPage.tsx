import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  query,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../auth/authContext";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  RefreshCw,
  XCircle,
  ChevronLeft,
  Trash2,
  WifiPen,
  Calendar,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

type InstallStatus = "pending_install" | "reschedule" | "cancelled" | "complete";

interface PendingInstall {
  id: string;
  accountNumber: string;
  status: InstallStatus;
  speed: string;
  date: string;
  installDateTime?: string | null;
  userId: string;
}

const STATUS_CONFIG: Record<
  InstallStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  pending_install: {
    label: "Pending Install",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <Clock size={14} className="text-amber-500" />,
  },
  reschedule: {
    label: "Reschedule",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <RefreshCw size={14} className="text-blue-500" />,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: <XCircle size={14} className="text-rose-500" />,
  },
  complete: {
    label: "Complete",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: <CheckCircle2 size={14} className="text-emerald-500" />,
  },
};

/** Resolves a Firestore Timestamp object OR an ISO string to a JS Date. */
function resolveDate(value: unknown): Date | null {
  if (!value) return null;
  // Firestore Timestamp has a .toDate() method
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Returns true if a value (Timestamp or ISO string) belongs to the given year/month (0-indexed). */
function isSameMonth(value: unknown, year: number, month: number): boolean {
  const d = resolveDate(value);
  if (!d) return false;
  return d.getFullYear() === year && d.getMonth() === month;
}

/** Converts a Date or ISO string into YYYY-MM-DDTHH:mm format for datetime-local input. */
function toDatetimeLocalString(value: unknown): string {
  const d = resolveDate(value);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function PendingInstallsPage() {
  const { user } = useAuth();
  const [installs, setInstalls] = useState<PendingInstall[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Reschedule modal state ───────────────────────────────────────────────────
  const [rescheduleItem, setRescheduleItem] = useState<PendingInstall | null>(null);
  const [newInstallDateTime, setNewInstallDateTime] = useState<string>("");
  const [savingReschedule, setSavingReschedule] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "pending_installs"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setInstalls(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PendingInstall, "id">) }))
      );
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // ── Monthly filtering ────────────────────────────────────────────────────────
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Previous month (handles January → December of previous year)
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const PENDING_STATUSES: InstallStatus[] = ["pending_install", "reschedule"];

  /** Visible records:
   *  - All records created in the current month
   *  - Records from last month that are still pending (pending_install | reschedule)
   */
  const visibleInstalls = installs.filter((i) => {
    // createdAt is a Firestore Timestamp; fall back to i.date (ISO string) when absent
    const raw = (i as unknown as Record<string, unknown>).createdAt ?? i.date;
    if (isSameMonth(raw, currentYear, currentMonth)) return true;
    if (isSameMonth(raw, prevYear, prevMonth) && PENDING_STATUSES.includes(i.status))
      return true;
    return false;
  });
  // ─────────────────────────────────────────────────────────────────────────────

  const handleStatusChange = async (id: string, newStatus: InstallStatus) => {
    if (!user) return;
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, "users", user.uid, "pending_installs", id), {
        status: newStatus,
      });
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const openRescheduleModal = (install: PendingInstall) => {
    setRescheduleItem(install);
    setNewInstallDateTime(toDatetimeLocalString(install.installDateTime));
  };

  const onSelectStatus = (install: PendingInstall, newStatus: InstallStatus) => {
    if (newStatus === "reschedule") {
      openRescheduleModal(install);
    } else {
      handleStatusChange(install.id, newStatus);
    }
  };

  const handleSaveReschedule = async () => {
    if (!user || !rescheduleItem) return;
    setSavingReschedule(true);
    try {
      const formattedIso = newInstallDateTime
        ? new Date(newInstallDateTime).toISOString()
        : null;
      await updateDoc(doc(db, "users", user.uid, "pending_installs", rescheduleItem.id), {
        status: "reschedule",
        installDateTime: formattedIso,
      });
      setRescheduleItem(null);
      setNewInstallDateTime("");
    } catch (err) {
      console.error("Error updating reschedule date:", err);
    } finally {
      setSavingReschedule(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "pending_installs", id));
    } catch (err) {
      console.error("Error deleting install:", err);
    }
  };

  const completedCount = visibleInstalls.filter((i) => i.status === "complete").length;
  const pendingCount = visibleInstalls.filter((i) => i.status === "pending_install").length;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans text-slate-900">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-r from-purple-400/20 to-indigo-400/20 blur-3xl opacity-60" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-r from-blue-400/20 to-cyan-400/20 blur-3xl opacity-60" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all duration-200 text-sm font-semibold shadow-sm"
            >
              <ChevronLeft size={16} />
              Dashboard
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                <ClipboardList className="text-purple-500" size={28} />
                Pending Installs
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-0.5">
                Track and manage customer account installations
              </p>
            </div>
          </div>
        </header>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Total */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <WifiPen size={22} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Accounts</p>
              <p className="text-3xl font-extrabold text-slate-800">{visibleInstalls.length}</p>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Clock size={22} className="text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending</p>
              <p className="text-3xl font-extrabold text-amber-600">{pendingCount}</p>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 size={22} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Installed</p>
              <p className="text-3xl font-extrabold text-emerald-600">{completedCount}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-lg">Account List</h2>
            {visibleInstalls.length > 0 && (
              <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                {visibleInstalls.length} account{visibleInstalls.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : visibleInstalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
              <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                <ClipboardList size={32} className="text-slate-300" />
              </div>
              <div>
                <p className="font-bold text-slate-600 text-lg">No installs yet</p>
                <p className="text-slate-400 text-sm mt-1">
                  Add a Data Add sale with an account number to track it here.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Account #
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Speed
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Install Date
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleInstalls.map((install) => {
                    const statusCfg = STATUS_CONFIG[install.status] ?? STATUS_CONFIG["pending_install"];
                    return (
                      <tr
                        key={install.id}
                        className="hover:bg-slate-50/60 transition-colors duration-150 group"
                      >
                        {/* Account Number */}
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800 text-sm font-mono bg-slate-100 px-2.5 py-1 rounded-lg">
                            {install.accountNumber}
                          </span>
                        </td>

                        {/* Speed */}
                        <td className="px-6 py-4">
                          {install.speed ? (
                            <span className="text-sm text-slate-600 font-semibold flex items-center gap-1.5">
                              <WifiPen size={14} className="text-purple-400" />
                              {install.speed}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-sm">—</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500 font-medium">
                            {formatDate(install.date)}
                          </span>
                        </td>

                        {/* Status — editable dropdown */}
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${statusCfg.bg} ${statusCfg.border} relative`}>
                            {updatingId === install.id ? (
                              <RefreshCw size={13} className="animate-spin text-slate-400" />
                            ) : (
                              statusCfg.icon
                            )}
                            <select
                              value={install.status}
                              onChange={(e) =>
                                onSelectStatus(install, e.target.value as InstallStatus)
                              }
                              disabled={updatingId === install.id}
                              className={`text-xs font-bold border-none outline-none bg-transparent cursor-pointer ${statusCfg.color} pr-1`}
                            >
                              <option value="pending_install">Pending Install</option>
                              <option value="reschedule">Reschedule</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="complete">Complete</option>
                            </select>
                          </div>
                        </td>

                        {/* Install Date & Time */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between gap-2">
                            {install.installDateTime ? (
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-700">
                                  {new Date(install.installDateTime).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                                <span className="text-xs text-purple-500 font-bold mt-0.5">
                                  {new Date(install.installDateTime).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-sm">—</span>
                            )}
                            {install.status === "reschedule" && (
                              <button
                                onClick={() => openRescheduleModal(install)}
                                className="p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-all"
                                title="Edit installation date"
                              >
                                <Calendar size={15} />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(install.id)}
                            className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200 opacity-0 group-hover:opacity-100"
                            title="Delete record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      {rescheduleItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 sm:p-7 max-w-md w-full relative">
            {/* Close button */}
            <button
              onClick={() => setRescheduleItem(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <RefreshCw size={22} />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-800">
                  Reschedule Installation
                </h3>
                <p className="text-slate-400 text-xs font-semibold mt-0.5">
                  Account #{rescheduleItem.accountNumber}
                </p>
              </div>
            </div>

            {/* Speed details if present */}
            {rescheduleItem.speed && (
              <div className="mb-5 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Plan Speed</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <WifiPen size={14} className="text-purple-500" />
                  {rescheduleItem.speed}
                </span>
              </div>
            )}

            {/* Date Time picker */}
            <div className="space-y-2 mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                New Installation Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={newInstallDateTime}
                onChange={(e) => setNewInstallDateTime(e.target.value)}
                className="w-full rounded-2xl border border-blue-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-slate-50 focus:bg-white transition-all"
              />
              <p className="text-[11px] text-slate-400">
                Select the new date and time agreed upon for the installation.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRescheduleItem(null)}
                disabled={savingReschedule}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReschedule}
                disabled={savingReschedule}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md hover:shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {savingReschedule ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Calendar size={15} />
                    Save Reschedule
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
