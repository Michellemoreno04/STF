import React, { useState } from "react";
import { X, PlusCircle, Smartphone, Globe, Wifi, CirclePlus } from "lucide-react";
import Swal from "sweetalert2";

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

  const saveData = () => {
    setIsModalOpen(false);
    setValues({});
    setSelectedOption(null);
    onClose();

    Swal.fire({
      icon: 'success',
      title: 'Success...',
      text: 'Product added successfully!',
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
    });
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
              className="mt-8 w-full rounded-2xl bg-indigo-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </>
  );
}
