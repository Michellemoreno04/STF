import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  BadgeDollarSign,
  Smartphone,
  RadioTower,
  WifiPen,
  Shield,
  Tv,
  SquarePen,
  Phone,
  Save,
  ChevronDown,
  Wrench,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../auth/authContext";
import Swal from "sweetalert2";

const internetSpeeds = ["100mbps", "200mbps", "300mbps", "500mbps", "1gb", "2gb", "5g", "8gb"];

export interface CommissionRates {
  lines: number;
  devices: number;
  internet: Record<string, number>; // keyed by speed e.g. "100mbps"
  asurion: number;
  tv: number;
  revenue: number;
  Phone: number;
  selfInstall: number;
}

const defaultRates: CommissionRates = {
  lines: 0,
  devices: 0,
  internet: {},
  asurion: 0,
  tv: 0,
  revenue: 0,
  Phone: 0,
  selfInstall: 0,
};

interface CommissionSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommissionSettings({ isOpen, onClose }: CommissionSettingsProps) {
  const { user } = useAuth();
  const [rates, setRates] = useState<CommissionRates>(defaultRates);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedInternet, setExpandedInternet] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      loadRates();
    }
  }, [isOpen, user]);

  const loadRates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ref = doc(db, "users", user.uid, "settings", "commissions");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setRates({ ...defaultRates, ...snap.data() } as CommissionRates);
      } else {
        setRates(defaultRates);
      }
    } catch (err) {
      console.error("Error loading commission rates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimpleRate = (key: keyof Omit<CommissionRates, "internet">, value: string) => {
    const num = parseFloat(value);
    setRates((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  };

  const handleInternetRate = (speed: string, value: string) => {
    const num = parseFloat(value);
    setRates((prev) => ({
      ...prev,
      internet: { ...prev.internet, [speed]: isNaN(num) ? 0 : num },
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid, "settings", "commissions");
      await setDoc(ref, rates, { merge: true });
      Swal.fire({
        icon: "success",
        title: "Saved!",
        text: "Commission rates updated successfully.",
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
      });
      onClose();
    } catch (err) {
      console.error("Error saving commission rates:", err);
      Swal.fire({ icon: "error", title: "Error", text: "Could not save commission rates." });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const fieldClass =
    "w-full rounded-xl border border-slate-200 pl-8 p-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 bg-white text-slate-800 text-sm font-medium transition-all";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5";
  const dollarClass =
    "absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-sm font-bold select-none";

  const categories = [
    { key: "lines" as const, label: "Lines", icon: <RadioTower className="w-4 h-4 text-emerald-500" /> },
    { key: "devices" as const, label: "Devices", icon: <Smartphone className="w-4 h-4 text-indigo-500" /> },
    { key: "asurion" as const, label: "Asurion", icon: <Shield className="w-4 h-4 text-purple-500" /> },
    { key: "tv" as const, label: "TV", icon: <Tv className="w-4 h-4 text-violet-500" /> },
    { key: "revenue" as const, label: "Upgrade / Change of svc", icon: <SquarePen className="w-4 h-4 text-orange-500" /> },
    { key: "Phone" as const, label: "Phone", icon: <Phone className="w-4 h-4 text-blue-500" /> },
    { key: "selfInstall" as const, label: "Self Install", icon: <Wrench className="w-4 h-4 text-teal-500" /> },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl border border-white/50 animate-in fade-in zoom-in duration-200 my-8">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-emerald-100 rounded-2xl">
            <BadgeDollarSign className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Commission Rates</h2>
            <p className="text-sm text-slate-500">Set your commission per product. Updates apply to all new sales.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Simple category rates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map(({ key, label, icon }) => (
                <div key={key}>
                  <label className={labelClass}>
                    <span className="inline-flex items-center gap-1.5">
                      {icon} {label}
                    </span>
                  </label>
                  <div className="relative">
                    <span className={dollarClass}>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={rates[key] || ""}
                      onChange={(e) => handleSimpleRate(key, e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Internet speeds */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => setExpandedInternet((p) => !p)}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <WifiPen className="w-4 h-4 text-purple-500" />
                  Data Add — Commission per Speed
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expandedInternet ? "rotate-180" : ""
                    }`}
                />
              </button>

              {expandedInternet && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 animate-in slide-in-from-top-2 duration-200">
                  {internetSpeeds.map((speed) => (
                    <div key={speed}>
                      <label className={labelClass}>{speed}</label>
                      <div className="relative">
                        <span className={dollarClass}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={rates.internet?.[speed] ?? ""}
                          onChange={(e) => handleInternetRate(speed, e.target.value)}
                          className={fieldClass}

                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Rates"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
