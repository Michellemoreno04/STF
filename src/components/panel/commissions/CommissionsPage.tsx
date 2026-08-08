import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BadgeDollarSign,
  Save,
  Pencil,
  Check,
  X,
  Info,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../auth/authContext";
import Swal from "sweetalert2";
import { loadUserTier, saveUserTier, defaultTableData } from "./commissionUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tier = "tier1" | "tier2";

interface DataAddRow {
  yieldMin: string;
  yieldMax: string;
  tier: number;
  fastpass: string;
  sub300: string;
  s300_500: string;
  s1gig: string;
  s2gigPlus: string;
}

interface MobileAddRow {
  yieldMin: string;
  yieldMax: string;
  tier: number;
  portedLines: string;
  deviceSales: string;
  unlimited: string;
  twoPlus: string;
}

interface VideoRow {
  label: string;
  payout: string;
}

interface RevCallRow {
  label: string;
  tier: string;
  goal: string;
  payout: string;
}

interface SSURow {
  label: string;
  tier: string;
  goal: string;
  payout: string;
}

interface AsurionRow {
  attachRate: string;
  payout: string;
  type: string;
}

interface ErrorRateRow {
  errorMin: string;
  errorMax: string;
  payout: string;
  type: string;
}

interface CommissionData {
  tier1NonSubData: DataAddRow[];
  tier3NonSubData: DataAddRow[];
  tier1MobileAdd: MobileAddRow[];
  tier3MobileAdd: MobileAddRow[];
  video: VideoRow[];
  revCall: RevCallRow[];
  ssu: SSURow[];
  asurionTotal: AsurionRow[];
  asurionMDP: AsurionRow[];
  errorRate: ErrorRateRow[];
  qualifiers: string[];
}

// ─── Use shared default data from commissionUtils ────────────────────────────
// (avoids duplicating the same data in two files)


// ─── EditableCell ─────────────────────────────────────────────────────────────

function EditableCell({
  value,
  onSave,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    onSave(draft);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <td className={`${className} p-1`}>
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            className="w-full min-w-[60px] rounded-lg border border-emerald-400 bg-white px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <button onClick={commit} className="text-emerald-500 hover:text-emerald-700"><Check size={14} /></button>
          <button onClick={cancel} className="text-rose-400 hover:text-rose-600"><X size={14} /></button>
        </div>
      </td>
    );
  }

  return (
    <td
      className={`${className} cursor-pointer select-none group`}
      onClick={() => { setDraft(value); setEditing(true); }}
    >
      <span className="inline-flex items-center gap-1">
        {value}
        <Pencil size={11} className="opacity-0 group-hover:opacity-40 transition-opacity" />
      </span>
    </td>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CommissionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tier, setTier] = useState<Tier>("tier1");
  const [data, setData] = useState<CommissionData>(defaultTableData as CommissionData);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load from Firestore
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        // Load commission table
        const ref = doc(db, "users", user.uid, "settings", "commissionsTable");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setData({ ...defaultTableData, ...snap.data() } as CommissionData);
        }
        // Load saved tier selection
        const savedTier = await loadUserTier(user.uid);
        setTier(savedTier);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid, "settings", "commissionsTable");
      await setDoc(ref, data, { merge: true });
      // Also persist the current tier
      await saveUserTier(user.uid, tier);
      Swal.fire({ icon: "success", title: "Saved!", showConfirmButton: false, timer: 1500, position: "top-end" });
    } catch {
      Swal.fire({ icon: "error", title: "Error", text: "Could not save." });
    } finally {
      setSaving(false);
    }
  };

  // ─── Helpers to update nested arrays ──────────────────────────────────────
  type ArrayKey = keyof Pick<CommissionData,
    "tier1NonSubData" | "tier3NonSubData" | "tier1MobileAdd" | "tier3MobileAdd" |
    "video" | "revCall" | "ssu" | "asurionTotal" | "asurionMDP" | "errorRate" | "qualifiers">;

  const updateDataRow = <T extends object>(
    key: ArrayKey,
    idx: number,
    field: keyof T,
    val: string
  ) => {
    setData((prev) => {
      const arr = [...(prev[key] as T[])];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...prev, [key]: arr };
    });
  };

  const updateQualifier = (idx: number, val: string) => {
    setData((prev) => {
      const q = [...prev.qualifiers];
      q[idx] = val;
      return { ...prev, qualifiers: q };
    });
  };

  // ─── Row data for selected tier ──────────────────────────────────────────
  const nonSubData = tier === "tier1" ? data.tier1NonSubData : data.tier3NonSubData;
  const mobileData = tier === "tier1" ? data.tier1MobileAdd : data.tier3MobileAdd;
  const nonSubKey: ArrayKey = tier === "tier1" ? "tier1NonSubData" : "tier3NonSubData";
  const mobileKey: ArrayKey = tier === "tier1" ? "tier1MobileAdd" : "tier3MobileAdd";

  const thClass = "px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400 whitespace-nowrap";
  const tdClass = "px-3 py-2.5 text-sm font-semibold text-slate-700 whitespace-nowrap";
  const tdHighlight = "px-3 py-2.5 text-sm font-bold text-emerald-700 whitespace-nowrap";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-r from-emerald-400/15 to-teal-400/15 blur-3xl animate-blob" />
        <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-r from-indigo-400/15 to-violet-400/15 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-gradient-to-r from-emerald-400/10 to-cyan-400/10 blur-3xl animate-blob animation-delay-4000" />
      </div>

      <div className="relative z-10 max-w-[95rem] mx-auto p-4 md:p-8">
        {/* ── Header ── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-2xl bg-white/70 border border-white/60 shadow-sm hover:bg-white hover:shadow-md transition-all text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <BadgeDollarSign size={22} className="text-emerald-600" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Commission Payout
                </h1>
              </div>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Click any cell to edit · Changes are saved to your account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tier Radio */}
            <div className="flex items-center gap-2 bg-white/80 border border-white/60 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">My Tier:</span>
              {(["tier1", "tier2"] as Tier[]).map((t) => (
                <label
                  key={t}
                  className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl font-bold text-sm transition-all ${tier === t
                    ? t === "tier1"
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                      : "bg-indigo-500 text-white shadow-lg shadow-indigo-200"
                    : "text-slate-500 hover:bg-slate-100"
                    }`}
                >
                  <input
                    type="radio"
                    name="tier"
                    value={t}
                    checked={tier === t}
                    onChange={() => setTier(t)}
                    className="sr-only"
                  />
                  {t === "tier1" ? "Tier 1" : "Tier 3"}
                </label>
              ))}
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-200 hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-60"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </header>

        {/* ── Main Qualifiers ── */}
        <div className="mb-6 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 shadow-xl shadow-emerald-200/40 text-white">
          <div className="flex items-start gap-3">
            <Info size={20} className="mt-0.5 shrink-0 opacity-80" />
            <div>
              <h2 className="font-bold text-lg mb-3">Main Qualifiers</h2>
              <ul className="space-y-1.5">
                {data.qualifiers.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-medium opacity-90">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 mt-1.5 shrink-0" />
                    <EditablePlainCell value={q} onSave={(v) => updateQualifier(i, v)} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Tier Badge ── */}
        <div className="mb-4 flex items-center gap-2">
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold text-white shadow-lg ${tier === "tier1" ? "bg-emerald-500 shadow-emerald-200" : "bg-indigo-500 shadow-indigo-200"}`}>
            Viewing: {tier === "tier1" ? "Tier 1" : "Tier 3"} Rates
          </span>
          <span className="text-xs text-slate-400 font-medium">Switch tier with the radio buttons above</span>
        </div>

        {/* ── Grid: Data Adds & Mobile Adds ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Data Adds */}
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 to-emerald-50/80">
              <h3 className="font-extrabold text-slate-700 text-base">
                Data Adds — {tier === "tier1" ? "Tier 1 Non Sub Data Yield" : "Tier 3 Non Sub Data Yield"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className={thClass}>Non-sub Add Yield</th>
                    <th className={thClass}>Tier</th>
                    <th className={thClass}>Fastpass</th>
                    <th className={thClass}>&lt;300</th>
                    <th className={thClass}>300&500</th>
                    <th className={thClass}>1gig</th>
                    <th className={thClass}>2gig+</th>
                  </tr>
                </thead>
                <tbody>
                  {nonSubData.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-emerald-50/30 transition-colors">
                      <td className={tdClass}>
                        <span className="text-slate-500">{row.yieldMin}</span>
                        {row.yieldMax !== "+" ? <span className="text-slate-400 mx-1">–</span> : null}
                        <span className={row.yieldMax === "+" ? "text-emerald-600 font-bold" : "text-slate-700"}>{row.yieldMax}</span>
                      </td>
                      <td className={tdClass}>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                          {row.tier}
                        </span>
                      </td>
                      <EditableCell value={row.fastpass} onSave={(v) => updateDataRow<DataAddRow>(nonSubKey, i, "fastpass", v)} className={tdHighlight} />
                      <EditableCell value={row.sub300} onSave={(v) => updateDataRow<DataAddRow>(nonSubKey, i, "sub300", v)} className={tdHighlight} />
                      <EditableCell value={row.s300_500} onSave={(v) => updateDataRow<DataAddRow>(nonSubKey, i, "s300_500", v)} className={tdHighlight} />
                      <EditableCell value={row.s1gig} onSave={(v) => updateDataRow<DataAddRow>(nonSubKey, i, "s1gig", v)} className={tdHighlight} />
                      <EditableCell value={row.s2gigPlus} onSave={(v) => updateDataRow<DataAddRow>(nonSubKey, i, "s2gigPlus", v)} className={tdHighlight} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Adds */}
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-indigo-50/80">
              <h3 className="font-extrabold text-slate-700 text-base">
                Mobile Adds — {tier === "tier1" ? "Tier 1 Mobile Add Yield" : "Tier 3 Mobile Add Yield"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className={thClass}>Non-sub Add Yield</th>
                    <th className={thClass}>Tier</th>
                    <th className={thClass}>Ported Lines</th>
                    <th className={thClass}>Device Sales</th>
                    <th className={thClass}>Unlmt+</th>
                    <th className={thClass}>2+ Lines</th>
                  </tr>
                </thead>
                <tbody>
                  {mobileData.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-violet-50/30 transition-colors">
                      <td className={tdClass}>
                        <span className="text-slate-500">{row.yieldMin}</span>
                        {row.yieldMax !== "+" ? <span className="text-slate-400 mx-1">–</span> : null}
                        <span className={row.yieldMax === "+" ? "text-indigo-600 font-bold" : "text-slate-700"}>{row.yieldMax}</span>
                      </td>
                      <td className={tdClass}>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                          {row.tier}
                        </span>
                      </td>
                      <EditableCell value={row.portedLines} onSave={(v) => updateDataRow<MobileAddRow>(mobileKey, i, "portedLines", v)} className={`${tdHighlight} text-indigo-700`} />
                      <EditableCell value={row.deviceSales} onSave={(v) => updateDataRow<MobileAddRow>(mobileKey, i, "deviceSales", v)} className={`${tdHighlight} text-indigo-700`} />
                      <EditableCell value={row.unlimited} onSave={(v) => updateDataRow<MobileAddRow>(mobileKey, i, "unlimited", v)} className={`${tdHighlight} text-indigo-700`} />
                      <EditableCell value={row.twoPlus} onSave={(v) => updateDataRow<MobileAddRow>(mobileKey, i, "twoPlus", v)} className={`${tdHighlight} text-indigo-700`} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Grid: Video Adds, Asurion, Error Rate ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
          {/* Video Adds */}
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-orange-50/80 to-amber-50/80">
              <h3 className="font-extrabold text-slate-700 text-base">Video Adds</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className={thClass}>Product</th>
                    <th className={thClass}>Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {data.video.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-orange-50/30 transition-colors">
                      <EditableCell value={row.label} onSave={(v) => updateDataRow<VideoRow>("video", i, "label", v)} className={tdClass} />
                      <EditableCell value={row.payout} onSave={(v) => updateDataRow<VideoRow>("video", i, "payout", v)} className={`${tdHighlight} text-orange-600`} />
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Rev/Call sub-table */}
              <div className="border-t border-slate-200 mt-2">
                <div className="px-4 py-2 bg-slate-50/60">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Rev/Call</span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className={thClass}>Label</th>
                      <th className={thClass}>Tier</th>
                      <th className={thClass}>Goal</th>
                      <th className={thClass}>Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.revCall.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-orange-50/30 transition-colors">
                        <EditableCell value={row.label} onSave={(v) => updateDataRow<RevCallRow>("revCall", i, "label", v)} className={tdClass} />
                        <EditableCell value={row.tier} onSave={(v) => updateDataRow<RevCallRow>("revCall", i, "tier", v)} className={`${tdClass} text-indigo-600`} />
                        <EditableCell value={row.goal} onSave={(v) => updateDataRow<RevCallRow>("revCall", i, "goal", v)} className={tdClass} />
                        <EditableCell value={row.payout} onSave={(v) => updateDataRow<RevCallRow>("revCall", i, "payout", v)} className={`${tdHighlight} text-orange-600`} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* SSU sub-table */}
              <div className="border-t border-slate-200 mt-2">
                <div className="px-4 py-2 bg-slate-50/60">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">SSU</span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className={thClass}>Label</th>
                      <th className={thClass}>Tier</th>
                      <th className={thClass}>Goal</th>
                      <th className={thClass}>Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ssu.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-orange-50/30 transition-colors">
                        <EditableCell value={row.label} onSave={(v) => updateDataRow<SSURow>("ssu", i, "label", v)} className={tdClass} />
                        <EditableCell value={row.tier} onSave={(v) => updateDataRow<SSURow>("ssu", i, "tier", v)} className={`${tdClass} text-indigo-600`} />
                        <EditableCell value={row.goal} onSave={(v) => updateDataRow<SSURow>("ssu", i, "goal", v)} className={tdClass} />
                        <EditableCell value={row.payout} onSave={(v) => updateDataRow<SSURow>("ssu", i, "payout", v)} className={`${tdHighlight} text-orange-600`} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Asurion */}
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50/80 to-violet-50/80">
              <h3 className="font-extrabold text-slate-700 text-base">Asurion</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Total Care / Plus / Max */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Care, Plus, Max / HEPs / PPS</p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 rounded-xl">
                      <th className={thClass}>Attach Rate</th>
                      <th className={thClass}>Payouts</th>
                      <th className={thClass}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.asurionTotal.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-purple-50/30 transition-colors">
                        <EditableCell value={row.attachRate} onSave={(v) => updateDataRow<AsurionRow>("asurionTotal", i, "attachRate", v)} className={tdClass} />
                        <EditableCell value={row.payout} onSave={(v) => updateDataRow<AsurionRow>("asurionTotal", i, "payout", v)} className={`${tdHighlight} text-purple-700`} />
                        <EditableCell value={row.type} onSave={(v) => updateDataRow<AsurionRow>("asurionTotal", i, "type", v)} className={`${tdClass} text-xs`} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* MDP */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">MDP</p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className={thClass}>Attach Rate</th>
                      <th className={thClass}>Payouts</th>
                      <th className={thClass}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.asurionMDP.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-purple-50/30 transition-colors">
                        <EditableCell value={row.attachRate} onSave={(v) => updateDataRow<AsurionRow>("asurionMDP", i, "attachRate", v)} className={tdClass} />
                        <EditableCell value={row.payout} onSave={(v) => updateDataRow<AsurionRow>("asurionMDP", i, "payout", v)} className={`${tdHighlight} text-purple-700`} />
                        <EditableCell value={row.type} onSave={(v) => updateDataRow<AsurionRow>("asurionMDP", i, "type", v)} className={`${tdClass} text-xs`} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Error Rate */}
          <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-rose-50/80 to-red-50/80">
              <h3 className="font-extrabold text-slate-700 text-base">Error Rate — Boss Error Rate</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className={thClass}>Error %</th>
                    <th className={thClass}>Payout</th>
                    <th className={thClass}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {data.errorRate.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-rose-50/30 transition-colors">
                      <td className={tdClass}>
                        <EditablePlainCell value={row.errorMin} onSave={(v) => updateDataRow<ErrorRateRow>("errorRate", i, "errorMin", v)} />
                        {row.errorMax !== "+" && <span className="text-slate-400 mx-1">–</span>}
                        <EditablePlainCell value={row.errorMax} onSave={(v) => updateDataRow<ErrorRateRow>("errorRate", i, "errorMax", v)} />
                      </td>
                      <EditableCell
                        value={row.payout}
                        onSave={(v) => updateDataRow<ErrorRateRow>("errorRate", i, "payout", v)}
                        className={`${tdHighlight} ${row.payout.startsWith("-") ? "text-rose-600" : "text-emerald-700"}`}
                      />
                      <EditableCell value={row.type} onSave={(v) => updateDataRow<ErrorRateRow>("errorRate", i, "type", v)} className={`${tdClass} text-xs max-w-[150px] whitespace-normal`} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center text-slate-400 text-xs font-medium pb-8 flex items-center justify-center gap-2">
          <Pencil size={12} />
          Click any value in the tables to edit it, then press Save Changes to persist.
        </div>
      </div>
    </div>
  );
}

// ─── Inline plain text editable (no table cell wrapper) ───────────────────────
function EditablePlainCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
          className="w-24 rounded border border-emerald-400 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-800 outline-none"
        />
        <button onClick={commit}><Check size={12} className="text-emerald-500" /></button>
        <button onClick={cancel}><X size={12} className="text-rose-400" /></button>
      </span>
    );
  }

  return (
    <span
      className="cursor-pointer hover:text-emerald-200 transition-colors group inline-flex items-center gap-0.5"
      onClick={() => { setDraft(value); setEditing(true); }}
    >
      {value}
      <Pencil size={10} className="opacity-0 group-hover:opacity-40 transition-opacity" />
    </span>
  );
}
