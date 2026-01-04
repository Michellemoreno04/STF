import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, PlusCircle, Smartphone, CirclePlus, WifiPen, Tv, Phone, Shield, RadioTower, SquarePen } from "lucide-react";
import Swal from "sweetalert2";
import { addDoc, collection, doc, setDoc, increment, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { useAuth } from "../auth/authContext";


interface Option {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const options: Option[] = [
  { id: "devices", label: "Add Devices", icon: <Smartphone className="w-5 h-5 text-indigo-500" /> },
  { id: "lines", label: "Lines", icon: <RadioTower className="w-5 h-5 text-emerald-500" /> },
  { id: "internet", label: "Data add", icon: <WifiPen className="w-5 h-5 text-purple-500" /> },
  { id: "data", label: 'Asurion', icon: <Shield className="w-5 h-5 text-purple-500" /> },
  { id: "tv", label: 'Tv', icon: <Tv className="w-5 h-5 text-purple-500" /> },
  { id: "revenue", label: 'Upgrade or change of svc', icon: <SquarePen className="w-5 h-5 text-purple-500" /> },
  { id: "Phone", label: 'Phone', icon: <Phone className="w-5 h-5 text-purple-500" /> },
];

interface Sale {
  id: string;
  fecha: string;
  tipo: "Data" | "Devices" | "Line" | "Other";
  producto: string;
  cantidad: number;
  precioUnitario: number;
  revenue: number;
  hora: string;
}

export default function ModalAddProducts({
  onProductAdded,
  editingSale,
  onEditComplete
}: {
  onProductAdded?: () => void;
  editingSale?: Sale | null;
  onEditComplete?: () => void;
}) {
  const { user } = useAuth();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [globalRevenue, setGlobalRevenue] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleInput = (id: string) => {
    setSelectedOptions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleChange = (id: string, value: string) =>
    setValues((prev) => ({ ...prev, [id]: value }));

  const handleOpen = () => setIsModalOpen(true);
  const handleClose = () => {
    setIsModalOpen(false);
    if (onEditComplete) {
      onEditComplete();
    }
    // Reset form
    setSelectedOptions([]);
    setValues({});
    setGlobalRevenue("");
  };

  // Effect to open modal and populate form when editingSale changes
  React.useEffect(() => {
    if (editingSale) {
      setIsModalOpen(true);
      setGlobalRevenue(editingSale.revenue.toString());
      // We'll need to parse the product data to populate the form
      // For now, we'll just set the revenue
      // You may need to enhance this based on how product data is stored
    }
  }, [editingSale]);

  const saveData = async () => {
    if (!user) {
      Swal.fire({
        icon: 'error',
        title: 'Error...',
        text: 'You must be logged in to add products!',
      });
      return;
    }

    // If editing, use update logic instead
    if (editingSale) {
      await updateData();
      return;
    }

    if (selectedOptions.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No products selected',
        text: 'Please select at least one product.',
      });
      return;
    }

    try {
      const date = new Date();
      const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const userRef = doc(db, "users", user.uid, "monthly_stats", currentMonth);
      const updateData: any = {};

      const parseVal = (val: any) => { // para convertir el string a numero
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      };

      const totalRevenueVal = parseVal(globalRevenue);

      const productsList: any[] = [];
      let totalQuantity = 0;

      // Daily stats counters
      let countLines = 0;
      let countDevices = 0;
      let countInternet = 0;
      let countAsurion = 0;
      let countTv = 0;
      let countPhone = 0;

      let summaryParts: string[] = [];
      let typesSet = new Set<string>();

      // Iterate through all selected options to build the list
      for (const optionId of selectedOptions) {
        let product = "";
        let quantity = 1;
        let type = "Otro";

        switch (optionId) {
          case "devices":
            type = "Devices";
            quantity = parseInt(values.devices || "1");
            product = `${quantity} Device${quantity > 1 ? "s" : ""}`;
            updateData.totalDevices = increment(quantity);
            break;
          case "lines":
            type = "Line";
            quantity = parseInt(values.lines || "1");
            product = `${quantity} Line${quantity > 1 ? "s" : ""}`;
            updateData.totalLines = increment(quantity);
            break;
          case "internet":
            type = "Data";
            product = values.internet || "Internet Plan";
            updateData.totalInternet = increment(1);
            break;
          case "data": // Asurion
            type = "Other";
            product = values.data ? ` ${values.data}` : "Asurion Plan";
            updateData.totalAsurion = increment(1);
            break;
          case "tv":
            type = "Other";
            product = "TV Service";
            updateData.totalTv = increment(1);
            break;
          case "revenue":
            type = "Other";
            product = "Change of service";
            break;
          case "Phone":
            type = "Phone";
            // Let's build the individual item:
            product = "Phone Service";
            product = "Phone Service";
            updateData.totalPhone = increment(1);
            break;
        }

        // Track daily counts manually
        if (optionId === 'lines') countLines += quantity;
        if (optionId === 'devices') countDevices += quantity;
        if (optionId === 'internet') countInternet += 1; // data
        if (optionId === 'data') countAsurion += 1;
        if (optionId === 'tv') countTv += 1;
        if (optionId === 'Phone') countPhone += 1;

        // Normalize type for the set to determine if it's a mix
        typesSet.add(type);
        totalQuantity += quantity;
        summaryParts.push(product);

        productsList.push({
          category: optionId,
          type,
          product,
          quantity,
          details: values[optionId] || "",
        });
      }

      // Determine main type
      let mainType = "Other";
      if (typesSet.size === 1) {
        mainType = Array.from(typesSet)[0];
      } else if (typesSet.size > 1) {
        mainType = "Bundle";
      }

      // Construct summary string
      const productSummary = summaryParts.join(", ");

      // Format hour in 12-hour format with AM/PM
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12; // Convert to 12-hour format (0 becomes 12)
      const formattedHour = `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;

      const productData = {
        userId: user.uid,
        date: new Date().toISOString(),
        hour: formattedHour,
        type: mainType,
        product: productSummary,
        products: productsList, // Array of details
        quantity: totalQuantity,
        revenue: totalRevenueVal,
        status: "Completed",
      };

      await addDoc(collection(db, "users", user.uid, "products"), productData);

      // Add total revenue to stats if applicable
      if (totalRevenueVal > 0) {
        updateData.totalRevenue = increment(totalRevenueVal);
      }

      if (Object.keys(updateData).length > 0) {
        await setDoc(userRef, updateData, { merge: true });
      }

      //*** */ Update Daily Stats.
      const todayDate = date.toISOString().split('T')[0];
      const dailyRef = doc(db, "users", user.uid, "daily_stats", todayDate);
      await setDoc(dailyRef, {
        revenue: increment(totalRevenueVal),
        lines: increment(countLines),
        data: increment(countInternet),
        devices: increment(countDevices),
        tv: increment(countTv),
        asurion: increment(countAsurion),
        phone: increment(countPhone)
      }, { merge: true }); // esto es para que no se sobreescriba el documento si ya existe

      setIsModalOpen(false);


      Swal.fire({
        icon: 'success',
        title: 'Success...',
        text: 'Products added successfully!',
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,

      }).then(() => {
        if (onProductAdded) {
          onProductAdded();
        }
      });
      setValues({});
      setSelectedOptions([]);
      setGlobalRevenue("");
    } catch (error) {
      console.error("Error adding document: ", error);
      Swal.fire({
        icon: 'error',
        title: 'Error...',
        text: 'Products not added!',
      });
    }
  };

  const updateData = async () => {
    if (!user || !editingSale) return;

    try {
      const productRef = doc(db, "users", user.uid, "products", editingSale.id);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        throw new Error("Document does not exist");
      }

      const oldData = productSnap.data();
      const oldRevenue = oldData.revenue || 0;
      const newRevenue = parseFloat(globalRevenue) || 0;
      const revenueDiff = newRevenue - oldRevenue;

      // Update the product document
      await updateDoc(productRef, {
        revenue: newRevenue
      });

      // Update monthly stats
      const date = new Date(oldData.date);
      const currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const statsRef = doc(db, "users", user.uid, "monthly_stats", currentMonth);

      if (revenueDiff !== 0) {
        await setDoc(statsRef, {
          totalRevenue: increment(revenueDiff)
        }, { merge: true });
      }

      // Update daily stats
      const todayDate = date.toISOString().split('T')[0];
      const dailyRef = doc(db, "users", user.uid, "daily_stats", todayDate);
      if (revenueDiff !== 0) {
        await setDoc(dailyRef, {
          revenue: increment(revenueDiff)
        }, { merge: true });
      }

      setIsModalOpen(false);
      if (onEditComplete) {
        onEditComplete();
      }

      Swal.fire({
        icon: 'success',
        title: 'Actualizado!',
        text: 'El producto ha sido actualizado exitosamente!',
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
      }).then(() => {
        if (onProductAdded) {
          onProductAdded();
        }
      });

      setValues({});
      setSelectedOptions([]);
      setGlobalRevenue("");
    } catch (error) {
      console.error("Error updating document: ", error);
      Swal.fire({
        icon: 'error',
        title: 'Error...',
        text: 'No se pudo actualizar el producto!',
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

      {isModalOpen && createPortal(
        <div
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              saveData();
            }
          }}
          tabIndex={0} // para que pueda presionar enter y tener el foco
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl border border-white/50 animate-in fade-in zoom-in duration-200 my-8">
            <button
              onClick={handleClose}
              className="absolute cursor-pointer right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold text-slate-800">
              <div className="p-2 bg-indigo-100 rounded-xl">
                <PlusCircle className="h-6 w-6 text-indigo-600" />
              </div>
              {editingSale ? 'Editar Producto' : 'Add Products'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {options.map((opt) => {
                const isSelected = selectedOptions.includes(opt.id);
                return (
                  <div
                    key={opt.id}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${isSelected
                      ? "border-indigo-500 bg-indigo-50/50 shadow-md ring-1 ring-indigo-500"
                      : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-white"
                      }`}
                    onClick={() => toggleInput(opt.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${isSelected ? "bg-white" : "bg-white shadow-sm"}`}>
                        {opt.icon}
                      </div>
                      <span className={`font-medium ${isSelected ? "text-indigo-900" : "text-slate-700"}`}>
                        {opt.label}
                      </span>
                      {values[opt.id] && !isSelected && (
                        <span className="ml-auto rounded-lg bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-600">
                          {values[opt.id]}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <div className="mt-4 animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                        {/* Lines & Devices: Quantity 1-5 */}
                        {(opt.id === "lines" || opt.id === "devices") && (
                          <select
                            value={values[opt.id] || ""}
                            onChange={(e) => handleChange(opt.id, e.target.value)}
                            className="w-full rounded-xl border border-indigo-200 p-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-slate-800"
                          >
                            <option value="" >Select quantity</option>
                            {[1, 2, 3, 4, 5].map((num) => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        )}

                        {/* Data Add (Internet): Speed Options */}
                        {opt.id === "internet" && (
                          <select
                            value={values[opt.id] || ""}
                            onChange={(e) => handleChange(opt.id, e.target.value)}
                            className="w-full rounded-xl border border-indigo-200 p-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-slate-800"
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
                            onChange={(e) => handleChange(opt.id, e.target.value)}
                            className="w-full rounded-xl border border-indigo-200 p-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 bg-white text-slate-800"
                          >
                            <option value="" disabled>Select plan</option>
                            {["Total Care", "Max", 'Plus', "Heps", "Pp&s"].map((plan) => (
                              <option key={plan} value={plan}>{plan}</option>
                            ))}
                          </select>
                        )}

                        {/* No individual revenue inputs anymore */}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Global Revenue Input */}
            {selectedOptions.length > 0 && (
              <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in slide-in-from-bottom-2">
                <label className="block text-sm font-semibold text-indigo-900 mb-2">
                  Total Revenue for Selected Products
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
            )}

            <button
              onClick={saveData}
              disabled={editingSale ? false : selectedOptions.length === 0}
              className={`mt-8 w-full rounded-2xl py-3.5 font-semibold text-white shadow-lg transition-all duration-200 
                ${(editingSale || selectedOptions.length > 0)
                  ? "bg-indigo-600 shadow-indigo-500/30 hover:bg-indigo-700 hover:shadow-indigo-500/40 hover:-translate-y-0.5 cursor-pointer"
                  : "bg-slate-300 cursor-not-allowed"}`}
            >
              {editingSale ? 'Actualizar' : 'Save Changes'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
