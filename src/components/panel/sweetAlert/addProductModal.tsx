import React, { useState } from "react";
import { X, PlusCircle, Smartphone, Globe, Wifi, CirclePlus } from "lucide-react";
import Swal from "sweetalert2";
import { addDoc, collection, doc, setDoc, increment } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../auth/authContext";


interface Option {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const options: Option[] = [
  { id: "devices", label: "Add Devices", icon: <Smartphone className="w-5 h-5 text-indigo-500" /> },
  { id: "lines", label: "Lines", icon: <Globe className="w-5 h-5 text-emerald-500" /> },
  { id: "internet", label: "Data add", icon: <Wifi className="w-5 h-5 text-purple-500" /> },
  { id: "data", label: 'Asurion', icon: <Wifi className="w-5 h-5 text-purple-500" /> },
  { id: "tv", label: 'Tv', icon: <Wifi className="w-5 h-5 text-purple-500" /> },
  { id: "revenue", label: 'Upgrade or change of service', icon: <Wifi className="w-5 h-5 text-purple-500" /> },
];

export default function ModalAddProducts({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleInput = (id: string) => {
    setSelectedOption((prev) => (prev === id ? null : id));
  };

  const handleChange = (id: string, value: string) =>
    setValues((prev) => ({ ...prev, [id]: value }));

  const handleOpen = () => setIsModalOpen(true);
  const handleClose = () => setIsModalOpen(false);

  const saveData = async () => {
    if (!user) {
      Swal.fire({
        icon: 'error',
        title: 'Error...',
        text: 'You must be logged in to add products!',
      });
      return;
    }

    try {
      // Determine product details based on selection
      let product = "";
      let quantity = 1;
      let revenue = 0;
      let type = "Otro";

      switch (selectedOption) {
        case "devices":
          type = "Teléfono";
          quantity = parseInt(values.devices || "1");
          product = `${quantity} Device${quantity > 1 ? "s" : ""}`;
          break;
        case "lines":
          type = "Línea";
          quantity = parseInt(values.lines || "1");
          product = `${quantity} Line${quantity > 1 ? "s" : ""}`;
          break;
        case "internet":
          type = "Datos";
          product = values.internet || "Internet Plan";
          break;
        case "data": // Asurion
          type = "Otro";
          product = values.data ? `Asurion ${values.data}` : "Asurion Plan";
          break;
        case "tv":
          type = "Otro";
          product = "TV Service";
          revenue = parseFloat(values.tv || "0");
          break;
        case "revenue":
          type = "Otro";
          product = "Service Upgrade";
          revenue = parseFloat(values.revenue || "0");
          break;
      }

      const productData = {
        userId: user.uid,
        date: new Date().toISOString(),
        category: selectedOption, // Keep original category for reference
        type, // Mapped type for table
        product,
        quantity,
        revenue,
        status: "Completed",
        ...values
      };

      await addDoc(collection(db, "users", user.uid, "products"), productData);

      // Update user stats atomically for the current month
      const date = new Date();
      const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const userRef = doc(db, "users", user.uid, "monthly_stats", currentMonth);

      const updateData: any = {};

      const parseVal = (val: any) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      };

      if (selectedOption === 'lines') {
        updateData.totalLines = increment(parseVal(values.lines));
      } else if (selectedOption === 'devices') {
        updateData.totalDevices = increment(parseVal(values.devices));
      } else if (selectedOption === 'internet') {
        updateData.totalInternet = increment(1);
      } else if (selectedOption === 'data') { // Asurion
        updateData.totalAsurion = increment(1);
      } else if (selectedOption === 'tv') {
        updateData.totalTv = increment(1);
        updateData.totalRevenue = increment(parseVal(values.tv));
      } else if (selectedOption === 'revenue') {
        updateData.totalRevenue = increment(parseVal(values.revenue));
      }

      if (Object.keys(updateData).length > 0) {
        // Use setDoc with merge: true to create the document if it doesn't exist
        await setDoc(userRef, updateData, { merge: true });
      }

      setIsModalOpen(false);
      onClose();

      Swal.fire({
        icon: 'success',
        title: 'Success...',
        text: 'Product added successfully!',
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
      });
      setValues({});
      setSelectedOption(null);
    } catch (error) {
      console.error("Error adding document: ", error);
      Swal.fire({
        icon: 'error',
        title: 'Error...',
        text: 'Product not added!',
      });
    }
  };

  return (
    <>
      <button
        className="flex items-center gap-2 px-5 py-3 bg-white text-indigo-600 rounded-2xl shadow-lg hover:bg-indigo-50 hover:shadow-indigo-500/20 transition-all duration-300 font-semibold cursor-pointer"
        onClick={handleOpen}
      >
        <span>Add</span>
        <CirclePlus size={20} />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border border-white/50 animate-in fade-in zoom-in duration-200">
            <button
              onClick={handleClose}
              className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-slate-800">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <PlusCircle className="h-6 w-6 text-indigo-600" />
              </div>
              Add Product
            </h2>

            <div className="space-y-4">
              {options.map((opt) => (
                <div
                  key={opt.id}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${selectedOption === opt.id
                    ? "border-indigo-500 bg-indigo-50/50 shadow-md"
                    : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-white"
                    }`}
                  onClick={() => toggleInput(opt.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${selectedOption === opt.id ? "bg-white" : "bg-white shadow-sm"}`}>
                      {opt.icon}
                    </div>
                    <span className={`font-medium ${selectedOption === opt.id ? "text-indigo-900" : "text-slate-700"}`}>
                      {opt.label}
                    </span>
                    {values[opt.id] && selectedOption !== opt.id && (
                      <span className="ml-auto rounded-lg bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-600">
                        {values[opt.id]}
                      </span>
                    )}
                  </div>

                  {selectedOption === opt.id && (
                    <div className="mt-4 animate-in slide-in-from-top-2 duration-200">
                      {/* Lines & Devices: Quantity 1-5 */}
                      {(opt.id === "lines" || opt.id === "devices") && (
                        <select
                          value={values[opt.id] || ""}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleChange(opt.id, e.target.value)}
                          className="w-full rounded-xl border border-indigo-200 p-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-slate-800"
                          autoFocus
                        >
                          <option value="" disabled>Select quantity</option>
                          {[1, 2, 3, 4, 5].map((num) => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      )}

                      {/* Data Add (Internet): Speed Options */}
                      {opt.id === "internet" && (
                        <select
                          value={values[opt.id] || ""}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleChange(opt.id, e.target.value)}
                          className="w-full rounded-xl border border-indigo-200 p-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-slate-800"
                          autoFocus
                        >
                          <option value="" disabled>Select speed</option>
                          {["100mbps", "200mbps", "300mbps", "500mbps", "1gb", "2gb", "5g", "8gb"].map((speed) => (
                            <option key={speed} value={speed}>{speed}</option>
                          ))}
                        </select>
                      )}

                      {/* Asurion (Data): Insurance Types */}
                      {opt.id === "data" && (
                        <select
                          value={values[opt.id] || ""}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleChange(opt.id, e.target.value)}
                          className="w-full rounded-xl border border-indigo-200 p-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-slate-800"
                          autoFocus
                        >
                          <option value="" disabled>Select plan</option>
                          {["Total Care", "Plus", "Max"].map((plan) => (
                            <option key={plan} value={plan}>{plan}</option>
                          ))}
                        </select>
                      )}

                      {/* TV & Revenue: Revenue Input */}
                      {(opt.id === "tv" || opt.id === "revenue") && (
                        <input
                          type="number"
                          placeholder="Enter revenue amount..."
                          value={values[opt.id] || ""}
                          onClick={(e) => e.stopPropagation()}
                          onFocus={(e) => e.stopPropagation()}
                          onChange={(e) => handleChange(opt.id, e.target.value)}
                          className="w-full rounded-xl border border-indigo-200 p-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-slate-800 placeholder:text-slate-400"
                          autoFocus
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={saveData}
              className="mt-8 w-full rounded-2xl bg-indigo-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </>
  );
}
