import React, { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage } from "@inertiajs/react";
import { router } from "@inertiajs/react";
import { Plus, Trash2, Receipt, AlertTriangle, CheckCircle, Calculator } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CustomSelect from "@/components/CustomSelect";

interface RecipeOption {
  id: number;
  name: string;
  division: string;
  stok_tersedia: number;
  harga_jual: number;
}

interface PageProps {
  recipes: RecipeOption[];
  tanggal: string;
  alreadyInputToday?: boolean;
  izinApproved?: any;
  flash: any;
  errors: any;
}

interface BillItem {
  recipe_id: string;
  quantity: string;
  [key: string]: any;
}

export default function SalesReport() {
  const { recipes, tanggal, alreadyInputToday, izinApproved, flash } = usePage<any>().props as PageProps;

  const [nomorNota, setNomorNota] = useState("");
  const [selectedDate, setSelectedDate] = useState(tanggal);
  const [partnerMitra, setPartnerMitra] = useState("Internal / Umum");
  const [diskonPersen, setDiskonPersen] = useState("");
  const [feeMitraPersen, setFeeMitraPersen] = useState("");
  
  const [items, setItems] = useState<BillItem[]>([
    { recipe_id: "", quantity: "1" }
  ]);

  const [processing, setProcessing] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const addItemRow = () => {
    setItems([...items, { recipe_id: "", quantity: "1" }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof BillItem, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  // Kalkulasi Subtotal berdasarkan menu yang dipilih & qty-nya
  const calculateSubtotal = () => {
    return items.reduce((acc, item) => {
      const recipe = recipes.find((r) => r.id.toString() === item.recipe_id);
      const qty = Number(item.quantity) || 0;
      const price = recipe ? Number(recipe.harga_jual) || 0 : 0;
      return acc + (price * qty);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const discPercent = Number(diskonPersen) || 0;
  const diskonNominal = (subtotal * discPercent) / 100;
  const partnerFeePercent = Number(feeMitraPersen) || 0;
  const partnerFee = (subtotal * partnerFeePercent) / 100;
  const totalBersih = Math.max(subtotal - diskonNominal - partnerFee, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWarningMessage(null);

    if (!nomorNota.trim()) {
      setWarningMessage("Nomor nota / bill wajib diisi sesuai doket fisik[cite: 1, 3]!");
      return;
    }

    const validItems = items.filter(item => item.recipe_id && Number(item.quantity) > 0);
    if (validItems.length === 0) {
      setWarningMessage("Mohon pilih setidaknya satu menu dan isi jumlah porsinya.");
      return;
    }

    setProcessing(true);

    router.post(route("sales-report.store"), {
      tanggal: selectedDate,
      nomor_nota: nomorNota,
      partner_mitra: partnerMitra, // 🔥 Diselaraskan dengan controller agar tercatat sumber notanya
      items: validItems as any,
      diskon_persen: diskonPersen || 0,
      fee_mitra_persen: feeMitraPersen || 0,
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setProcessing(false);
        setNomorNota("");
        setDiskonPersen("");
        setFeeMitraPersen("");
        setPartnerMitra("Internal / Umum");
        setItems([{ recipe_id: "", quantity: "1" }]);
      },
      onError: (errs) => {
        setProcessing(false);
        const firstError = Object.values(errs)[0];
        setWarningMessage(firstError as string || "Gagal menyimpan nota.");
      },
      onFinish: () => setProcessing(false)
    });
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
  };

  const partnerOptions = [
    { value: "Internal / Umum", label: "Internal / Umum (Kasir)" },
    { value: "GoFood", label: "GoFood" },
    { value: "GrabFood", label: "GrabFood" },
    { value: "ShopeeFood", label: "ShopeeFood" },
  ];

  const menuOptions = recipes.map((recipe) => ({
    value: recipe.id,
    label: `${recipe.name} — ${formatRupiah(recipe.harga_jual)} (Stok ${recipe.division}: ${recipe.stok_tersedia})`,
  }));

  return (
    <AppLayout header={<h2 className="text-2xl font-bold text-gray-800">Sales Report (Bill / Nota)</h2>}>
      <Head title="Sales Report" />

      {/* FLASH MESSAGES */}
      <div className="space-y-3 mb-6">
        {flash?.success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <span>{flash.success}</span>
          </div>
        )}
        {flash?.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span>{flash.error}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
          <div className="w-12 h-12 bg-[#FDF3E4] rounded-2xl flex items-center justify-center text-[#8B5E3C]">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Input Nota Penjualan / Doket Baru</h3>
            <p className="text-xs text-gray-500">Stok harian akan otomatis terpotong secara real-time berdasarkan rincian nota ini[cite: 1, 3].</p>
          </div>
        </div>

        {/* LOGIKA PENGUNCIAN FORM */}
        {alreadyInputToday && !izinApproved ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl text-center space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto text-amber-600" />
            <h4 className="font-bold text-base">Akses Sales Report Belum Dibuka / Terkunci</h4>
            <p className="text-xs text-amber-700">
              Silakan kembali ke <strong>Dashboard</strong> terlebih dahulu dan klik tombol <em>"Buat Bill Baru / Input Nota"</em> untuk mulai mencatat transaksi. Akses juga terkunci otomatis jika melewati pukul 21:00 WIB.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Nomor Nota / Bill *</label>
                <input
                  type="text"
                  placeholder="Contoh: INV-001"
                  value={nomorNota}
                  onChange={(e) => setNomorNota(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D9A978] focus:outline-none font-semibold text-gray-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Tanggal Transaksi *</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D9A978] focus:outline-none text-gray-700 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Partner / Sumber Nota</label>
                <CustomSelect
                  value={partnerMitra}
                  onChange={(value) => setPartnerMitra(String(value))}
                  options={partnerOptions}
                  placeholder="Pilih sumber nota"
                />
              </div>
            </div>

            {/* LIST ITEM PESANAN */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-gray-800">Daftar Menu Pesanan (Sesuai Doket[cite: 1, 3])</label>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-xs font-bold text-[#8B5E3C] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Tambah Baris Menu
                </button>
              </div>

              {items.map((item, index) => {
                const selectedRecipe = recipes.find(r => r.id.toString() === item.recipe_id);
                const itemTotal = selectedRecipe ? (selectedRecipe.harga_jual * (Number(item.quantity) || 0)) : 0;

                return (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 items-center bg-gray-50 p-4 rounded-2xl border border-gray-200/60">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Pilih Menu</label>
                      <CustomSelect
                        value={item.recipe_id}
                        onChange={(value) => handleItemChange(index, 'recipe_id', String(value))}
                        options={menuOptions}
                        placeholder="Cari atau pilih menu"
                        searchable
                        searchPlaceholder="Ketik nama menu..."
                        buttonClassName="py-2.5"
                      />
                    </div>

                    <div className="w-full sm:w-32">
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">Quantity (Porsi)</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#D9A978] focus:outline-none text-center font-bold text-gray-800"
                      />
                    </div>

                    <div className="w-full sm:w-36 text-right sm:pr-2">
                      <span className="block text-[10px] font-bold text-gray-400 mb-1">Estimasi Harga</span>
                      <span className="text-xs font-bold text-gray-700">{formatRupiah(itemTotal)}</span>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="p-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition self-end sm:self-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* RINGKASAN KALKULASI & DISKON/FEE MITRA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Diskon Nota (%) - Opsional</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={diskonPersen}
                    onChange={(e) => setDiskonPersen(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D9A978] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Fee Mitra / Ojol (%) - Opsional</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0"
                    value={feeMitraPersen}
                    onChange={(e) => setFeeMitraPersen(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D9A978] focus:outline-none"
                  />
                </div>
              </div>

              {/* KARTU PREVIEW DOKET / NOTA */}
              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-amber-100 flex flex-col justify-between space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2 font-bold text-gray-800 pb-2 border-b border-amber-200">
                  <Calculator className="w-4 h-4 text-[#8B5E3C]" />
                  <span>Ringkasan Nota (Preview Doket[cite: 1, 3])</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal Menu:</span>
                  <span className="font-semibold text-gray-800">{formatRupiah(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Diskon ({discPercent}%):</span>
                  <span className="font-semibold text-red-600">- {formatRupiah(diskonNominal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fee Mitra ({partnerFeePercent}%):</span>
                  <span className="font-semibold text-amber-700">- {formatRupiah(partnerFee)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-amber-200 text-sm font-extrabold text-gray-900">
                  <span>Total Bersih Nota:</span>
                  <span className="text-[#8B5E3C]">{formatRupiah(totalBersih)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={processing}
                className={`px-8 py-3 rounded-full text-white font-bold text-sm shadow-md transition ${
                  processing ? "bg-gray-400 cursor-not-allowed" : "bg-[#8B5E3C] hover:bg-[#6F4E37] active:scale-95"
                }`}
              >
                {processing ? "Menyimpan & Memotong Stok..." : "Simpan Nota & Kurangi Stok Otomatis"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* MODAL WARNING / ERROR VALIDASI */}
      <AnimatePresence>
        {warningMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-red-100"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-red-700 text-base">Peringatan Input Nota</h4>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{warningMessage}</p>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setWarningMessage(null)}
                  className="px-5 py-2 rounded-full bg-[#8B5E3C] text-white font-bold text-sm hover:bg-[#6F4E37] transition"
                >
                  Mengerti
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
