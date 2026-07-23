import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, PlusCircle, Smartphone, CirclePlus, WifiPen, Tv, Phone,
  Shield, RadioTower, SquarePen, BadgeDollarSign, Wrench
} from "lucide-react";
import Swal from "sweetalert2";
import { addDoc, collection, doc, setDoc, increment, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../auth/authContext";
import type { CommissionRates } from "../commissions/CommissionSettings";

interface Option {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const options: Option[] = [
  { id: "devices", label: "Add Devices", icon: <Smartphone className="w-5 h-5 text-indigo-500" /> },
  { id: "lines", label: "Lines", icon: <RadioTower className="w-5 h-5 text-emerald-500" /> },
  { id: "internet", label: "Data add", icon: <WifiPen className="w-5 h-5 text-purple-500" /> },
  { id: "data", label: "Asurion", icon: <Shield className="w-5 h-5 text-purple-500" /> },
  { id: "tv", label: "Tv", icon: <Tv className="w-5 h-5 text-purple-500" /> },
  { id: "revenue", label: "Upgrade or change of svc", icon: <SquarePen className="w-5 h-5 text-purple-500" /> },
  { id: "Phone", label: "Phone", icon: <Phone className="w-5 h-5 text-purple-500" /> },
  { id: "selfInstall", label: "Self Install", icon: <Wrench className="w-5 h-5 text-teal-500" /> },
];

const internetSpeeds = ["100mbps", "200mbps", "300mbps", "500mbps", "1gb", "2gb", "5g", "8gb"];

interface Sale {
  id: string;
  fecha: string;
  tipo: "Data" | "Devices" | "Line" | "Other";
  producto: string;
  cantidad: number;
  precioUnitario: number;
  revenue: number;
  commission: number;
  hora: string;
}

// ----- helpers -----

async function loadRatesFromFirestore(uid: string): Promise<CommissionRates | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "settings", "commissions"));
    if (snap.exists()) return snap.data() as CommissionRates;
  } catch (e) {
    console.error("loadRates:", e);
  }
  return null;
}

// ----- component -----

export default function ModalAddProducts({
  onProductAdded,
  editingSale,
  onEditComplete,
}: {
  onProductAdded?: () => void;
  editingSale?: Sale | null;
  onEditComplete?: () => void;
}) {
  const { user } = useAuth();

  // form state
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [globalRevenue, setGlobalRevenue] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // commission rates — loaded from Firestore
  // Keys: "lines" | "devices" | "asurion" | "tv" | "revenue" | "Phone" | "internet_100mbps" etc.
  const [rateFields, setRateFields] = useState<Record<string, string>>({});

  // ----- open / close -----

  const handleOpen = () => setIsModalOpen(true);

  const handleClose = () => {
    setIsModalOpen(false);
    if (onEditComplete) onEditComplete();
    resetForm();
  };

  const resetForm = () => {
    setSelectedOptions([]);
    setValues({});
    setGlobalRevenue("");
    setRateFields({});
  };

  // Load rates whenever modal opens
  useEffect(() => {
    if (isModalOpen && user) {
      loadRatesFromFirestore(user.uid).then((saved) => {
        if (!saved) return;
        const flat: Record<string, string> = {};
        // simple fields
        (["lines", "devices", "asurion", "tv", "revenue", "Phone", "selfInstall"] as const).forEach((k) => {
          if (saved[k] != null && saved[k] > 0) flat[k] = saved[k].toString();
        });
        // internet speeds
        if (saved.internet) {
          Object.entries(saved.internet).forEach(([speed, val]) => {
            if (val > 0) flat[`internet_${speed}`] = val.toString();
          });
        }
        setRateFields(flat);
      });
    }
  }, [isModalOpen, user]);

  // Edit sale → open with revenue
  useEffect(() => {
    if (editingSale) {
      setIsModalOpen(true);
      setGlobalRevenue(editingSale.revenue.toString());
    }
  }, [editingSale]);

  // ----- helpers -----

  const toggleInput = (id: string) =>
    setSelectedOptions((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const handleChange = (id: string, value: string) =>
    setValues((prev) => ({ ...prev, [id]: value }));

  const getRate = (key: string): number => {
    const n = parseFloat(rateFields[key] ?? "");
    return isNaN(n) ? 0 : n;
  };

  /** Commission for one optionId given current rates & selected speed */
  const commissionFor = (optionId: string, quantity = 1): number => {
    if (optionId === "internet") {
      const speed = values["internet"] || "";
      return speed ? getRate(`internet_${speed}`) : 0;
    }
    const keyMap: Record<string, string> = {
      lines: "lines",
      devices: "devices",
      data: "asurion",
      tv: "tv",
      revenue: "revenue",
      Phone: "Phone",
      selfInstall: "selfInstall",
    };
    return getRate(keyMap[optionId] ?? optionId) * quantity;
  };

  const totalCommission = () =>
    selectedOptions.reduce((acc, id) => {
      const qty =
        id === "lines" ? parseInt(values.lines || "1")
          : id === "devices" ? parseInt(values.devices || "1")
            : 1;
      return acc + commissionFor(id, qty);
    }, 0);

  // ----- save -----

  const saveData = async () => {
    if (!user) {
      Swal.fire({ icon: "error", title: "Error", text: "You must be logged in!" });
      return;
    }
    if (editingSale) { await updateData(); return; }
    if (selectedOptions.length === 0) {
      Swal.fire({ icon: "warning", title: "No products selected", text: "Select at least one product." });
      return;
    }

    try {
      const date = new Date();
      const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const userRef = doc(db, "users", user.uid, "monthly_stats", currentMonth);
      const updateObj: any = {};

      const pv = (val: any) => { const n = parseFloat(val); return isNaN(n) ? 0 : n; };

      const totalRevenueVal = pv(globalRevenue);
      const totalCommissionVal = totalCommission();

      const productsList: any[] = [];
      let totalQuantity = 0;
      let countLines = 0, countDevices = 0, countInternet = 0, countAsurion = 0, countTv = 0, countPhone = 0, countSelfInstall = 0;
      const summaryParts: string[] = [];
      const typesSet = new Set<string>();

      for (const optionId of selectedOptions) {
        let product = "", quantity = 1, type = "Otro";

        switch (optionId) {
          case "devices":
            type = "Devices";
            quantity = parseInt(values.devices || "1");
            product = `${quantity} Device${quantity > 1 ? "s" : ""}`;
            updateObj.totalDevices = increment(quantity);
            break;
          case "lines":
            type = "Line";
            quantity = parseInt(values.lines || "1");
            product = `${quantity} Line${quantity > 1 ? "s" : ""}`;
            updateObj.totalLines = increment(quantity);
            break;
          case "internet":
            type = "Data";
            product = values.internet || "Internet Plan";
            updateObj.totalInternet = increment(1);
            break;
          case "data":
            type = "Other";
            product = values.data ? ` ${values.data}` : "Asurion Plan";
            updateObj.totalAsurion = increment(1);
            break;
          case "tv":
            type = "Other";
            product = "TV Service";
            updateObj.totalTv = increment(1);
            break;
          case "revenue":
            type = "Other";
            product = "Change of service";
            break;
          case "Phone":
            type = "Phone";
            product = "Phone Service";
            updateObj.totalPhone = increment(1);
            break;
          case "selfInstall":
            type = "Other";
            product = "Self Install";
            updateObj.totalSelfInstall = increment(1);
            break;
        }

        if (optionId === "lines") countLines += quantity;
        if (optionId === "devices") countDevices += quantity;
        if (optionId === "internet") countInternet += 1;
        if (optionId === "data") countAsurion += 1;
        if (optionId === "tv") countTv += 1;
        if (optionId === "Phone") countPhone += 1;
        if (optionId === "selfInstall") countSelfInstall += 1;

        typesSet.add(type);
        totalQuantity += quantity;
        summaryParts.push(product);

        productsList.push({
          category: optionId,
          type,
          product,
          quantity,
          details: values[optionId] || "",
          commission: commissionFor(optionId, quantity),
        });
      }

      let mainType = "Other";
      if (typesSet.size === 1) mainType = Array.from(typesSet)[0];
      else if (typesSet.size > 1) mainType = "Bundle";

      const now = new Date();
      const hrs = now.getHours();
      const mins = now.getMinutes();
      const ampm = hrs >= 12 ? "PM" : "AM";
      const hrs12 = hrs % 12 || 12;
      const formattedHour = `${hrs12}:${mins.toString().padStart(2, "0")} ${ampm}`;

      const productData = {
        userId: user.uid,
        date: new Date().toISOString(),
        hour: formattedHour,
        type: mainType,
        product: summaryParts.join(", "),
        products: productsList,
        quantity: totalQuantity,
        revenue: totalRevenueVal,
        commission: totalCommissionVal,
        status: "pending",
      };

      await addDoc(collection(db, "users", user.uid, "products"), productData);
      if (selectedOptions.includes("internet")) {
        await addDoc(collection(db, "users", user.uid, "dataHistory"), productData);
      }

      if (totalRevenueVal > 0) updateObj.totalRevenue = increment(totalRevenueVal);
      if (totalCommissionVal > 0) updateObj.totalCommission = increment(totalCommissionVal);
      if (Object.keys(updateObj).length > 0) await setDoc(userRef, updateObj, { merge: true });

      const year = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, "0");
      const dy = String(date.getDate()).padStart(2, "0");
      const todayDate = `${year}-${mo}-${dy}`;
      await setDoc(
        doc(db, "users", user.uid, "daily_stats", todayDate),
        {
          revenue: increment(totalRevenueVal),
          commission: increment(totalCommissionVal),
          lines: increment(countLines),
          data: increment(countInternet),
          devices: increment(countDevices),
          tv: increment(countTv),
          asurion: increment(countAsurion),
          phone: increment(countPhone),
          selfInstall: increment(countSelfInstall),
        },
        { merge: true }
      );

      setIsModalOpen(false);
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: totalCommissionVal > 0
          ? `Products added. Commission: $${totalCommissionVal.toFixed(2)}`
          : "Products added successfully!",
        position: "top-end",
        showConfirmButton: false,
        timer: 2500,
      }).then(() => { if (onProductAdded) onProductAdded(); });

      resetForm();
    } catch (error) {
      console.error("Error adding document:", error);
      Swal.fire({ icon: "error", title: "Error", text: "Products not added!" });
    }
  };

  const updateData = async () => {
    if (!user || !editingSale) return;
    try {
      const productRef = doc(db, "users", user.uid, "products", editingSale.id);
      const snap = await getDoc(productRef);
      if (!snap.exists()) throw new Error("Document does not exist");

      const oldData = snap.data();
      const oldRevenue = oldData.revenue || 0;
      const newRevenue = parseFloat(globalRevenue) || 0;
      const diff = newRevenue - oldRevenue;

      await updateDoc(productRef, { revenue: newRevenue });

      const date = new Date(oldData.date);
      const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (diff !== 0) {
        await setDoc(
          doc(db, "users", user.uid, "monthly_stats", currentMonth),
          { totalRevenue: increment(diff) },
          { merge: true }
        );
        const year = date.getFullYear();
        const mo = String(date.getMonth() + 1).padStart(2, "0");
        const dy = String(date.getDate()).padStart(2, "0");
        await setDoc(
          doc(db, "users", user.uid, "daily_stats", `${year}-${mo}-${dy}`),
          { revenue: increment(diff) },
          { merge: true }
        );
      }

      setIsModalOpen(false);
      if (onEditComplete) onEditComplete();
      Swal.fire({
        icon: "success", title: "Actualizado!",
        text: "El producto ha sido actualizado!", position: "top-end",
        showConfirmButton: false, timer: 2000,
      }).then(() => { if (onProductAdded) onProductAdded(); });

      resetForm();
    } catch (error) {
      console.error("Error updating:", error);
      Swal.fire({ icon: "error", title: "Error", text: "No se pudo actualizar!" });
    }
  };

  // ----- render -----

  const tc = totalCommission();

  return (
    <>
      <button
        className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-600 rounded-2xl shadow-lg hover:bg-indigo-50 hover:shadow-indigo-500/20 transition-all duration-300 font-semibold cursor-pointer"
        onClick={handleOpen}
      >
        <span>Add</span>
        <CirclePlus size={20} />
      </button>

      {isModalOpen &&
        createPortal(
          <div
            onKeyDown={(e) => { if (e.key === "Enter") saveData(); }}
            tabIndex={0}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6"
          >
            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-white/50 animate-in fade-in zoom-in duration-200 overflow-hidden">
              <div className="p-6 md:p-8 shrink-0 border-b border-slate-100 relative">
                <button
                  onClick={handleClose}
                  className="absolute cursor-pointer right-6 top-6 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>

                <h2 className="mb-1 flex items-center gap-3 text-2xl font-bold text-slate-800">
                  <div className="p-2 bg-indigo-100 rounded-xl">
                    <PlusCircle className="h-6 w-6 text-indigo-600" />
                  </div>
                  {editingSale ? "Editar Producto" : "Add Products"}
                </h2>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto flex-1">
                {/* 1. Selection Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {options.map((opt) => {
                  const isSelected = selectedOptions.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      className={`cursor-pointer rounded-2xl border p-3 flex flex-col items-center justify-center gap-2 text-center transition-all duration-200 ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 shadow-md ring-1 ring-indigo-500"
                          : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-white"
                      }`}
                      onClick={() => toggleInput(opt.id)}
                    >
                      <div className={`p-2 rounded-xl ${isSelected ? "bg-white text-indigo-600" : "bg-white shadow-sm text-slate-500"}`}>
                        {opt.icon}
                      </div>
                      <span className={`text-xs font-bold ${isSelected ? "text-indigo-900" : "text-slate-600"}`}>
                        {opt.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 2. Configuration for Selected Options */}
              {selectedOptions.length > 0 && (
                <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">
                    Configurar Productos Seleccionados
                  </h3>
                  
                  {selectedOptions.map((optId) => {
                    const opt = options.find((o) => o.id === optId);
                    if (!opt) return null;
                    
                    return (
                      <div key={opt.id} className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-3 mb-4 border-b border-indigo-100/50 pb-3">
                          <div className="p-2 bg-white rounded-xl shadow-sm">
                            {opt.icon}
                          </div>
                          <span className="font-bold text-indigo-900 text-lg">{opt.label}</span>
                        </div>
                        
                        <div>
                          {/* Lines & Devices: quantity */}
                          {(opt.id === "lines" || opt.id === "devices") && (
                            <>
                              <div onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={values[opt.id] || ""}
                                  onChange={(e) => handleChange(opt.id, e.target.value)}
                                  className="w-full rounded-xl border border-indigo-200 p-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-slate-800"
                                >
                                  <option value="">Select quantity</option>
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </div>
                            </>
                          )}

                          {/* Data Add: speed selector */}
                          {opt.id === "internet" && (
                            <div className="flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                              <div className="grid grid-cols-2 gap-2">
                                {internetSpeeds.map((s) => {
                                  const isSelectedSpeed = values[opt.id] === s;
                                  const commissionRate = rateFields[`internet_${s}`] || "0";
                                  return (
                                    <button
                                      key={s}
                                      onClick={() => handleChange(opt.id, s)}
                                      className={`flex flex-col items-start p-3 rounded-xl border transition-all duration-200 text-left ${
                                        isSelectedSpeed
                                          ? "border-indigo-500 bg-indigo-50 shadow-sm ring-1 ring-indigo-500"
                                          : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
                                      }`}
                                    >
                                      <span className={`font-semibold text-sm ${isSelectedSpeed ? "text-indigo-900" : "text-slate-700"}`}>
                                        {s}
                                      </span>
                                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 mt-1">
                                        <BadgeDollarSign size={12} />
                                        Comisión: ${commissionRate ? parseFloat(commissionRate).toFixed(2) : "0.00"}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Asurion */}
                          {opt.id === "data" && (
                            <>
                              <div onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={values[opt.id] || ""}
                                  onChange={(e) => handleChange(opt.id, e.target.value)}
                                  className="w-full rounded-xl border border-indigo-200 p-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-slate-800"
                                >
                                  <option value="" disabled>Select plan</option>
                                  {["Total Care", "Max", "Plus", "Heps", "Pp&s"].map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Revenue + commission summary */}
              {selectedOptions.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in slide-in-from-bottom-2">
                    <label className="block text-sm font-semibold text-indigo-900 mb-2">
                      Total Revenue
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={globalRevenue}
                        onChange={(e) => setGlobalRevenue(e.target.value)}
                        className="w-full rounded-xl border border-indigo-200 pl-8 p-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-slate-800 font-medium"
                      />
                    </div>
                  </div>

                  {tc > 0 && (
                    <div className="flex items-center justify-between px-5 py-3 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in fade-in duration-200">
                      <span className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                        <BadgeDollarSign size={16} className="text-emerald-500" />
                        Commission for this sale
                      </span>
                      <span className="text-lg font-bold text-emerald-600">${tc.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Edit mode */}
              {editingSale && (
                <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <label className="block text-sm font-semibold text-indigo-900 mb-2">Revenue</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">$</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={globalRevenue}
                      onChange={(e) => setGlobalRevenue(e.target.value)}
                      className="w-full rounded-xl border border-indigo-200 pl-8 p-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-slate-800 font-medium"
                    />
                  </div>
                </div>
              )}

              </div>

              <div className="p-6 md:p-8 shrink-0 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={saveData}
                  disabled={!editingSale && selectedOptions.length === 0}
                  className={`w-full rounded-2xl py-3.5 font-semibold text-white shadow-lg transition-all duration-200
                    ${editingSale || selectedOptions.length > 0
                      ? "bg-indigo-600 shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 cursor-pointer"
                      : "bg-slate-300 cursor-not-allowed"
                    }`}
                >
                  {editingSale ? "Actualizar" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
