import React, { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage } from "@inertiajs/react";
import { router } from "@inertiajs/react";
import { Plus, Trash2, Receipt, AlertTriangle, CheckCircle, Calculator, FileText } from "lucide-react";
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
}

interface NotaSection {
  id: number;
  nomorNota: string;
  partnerMitra: string;
  diskonPersen: string;
  feeMitraPersen: string;
  items: BillItem[];
}

export default function SalesReport() {
  const { recipes, tanggal, alreadyInputToday, izinApproved, flash } = usePage<any>().props as PageProps;

  const [selectedDate, setSelectedDate] = useState(tanggal);
  
  // State utama menggunakan array objek nota (mendukung banyak nota / multi-card)
  const [notas, setNotas] = useState<NotaSection[]>([
    {
      id: Date.now(),
      nomorNota: "",
      partnerMitra: "",
      diskonPersen: "",
      feeMitraPersen: "",
      items: [{ recipe_id: "", quantity: "1" }],
    }
  ]);

  const [processing, setProcessing] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const addNotaCard = () => {
    setNotas([
      ...notas,
      {
        id: Date.now(),
        nomorNota: "",
        partnerMitra: "", // 🔥 Diatur kosong agar opsional diisi bebas
        diskonPersen: "",
        feeMitraPersen: "",
        items: [{ recipe_id: "", quantity: "1" }],
      }
    ]);
  };

  // Hapus Card Nota tertentu
  const removeNotaCard = (notaIndex: number) => {
    if (notas.length > 1) {
      setNotas(notas.filter((_, i) => i !== notaIndex));
    }
  };

  // Tambah Baris Menu di Nota tertentu
  const addItemRow = (notaIndex: number) => {
    const updatedNotas = [...notas];
    updatedNotas[notaIndex].items.push({ recipe_id: "", quantity: "1" });
    setNotas(updatedNotas);
  };

  // Hapus Baris Menu di Nota tertentu
  const removeItemRow = (notaIndex: number, itemIndex: number) => {
    const updatedNotas = [...notas];
    if (updatedNotas[notaIndex].items.length > 1) {
      updatedNotas[notaIndex].items = updatedNotas[notaIndex].items.filter((_, i) => i !== itemIndex);
      setNotas(updatedNotas);
    }
  };

  // Handle Perubahan Field Nota
  const handleNotaChange = (notaIndex: number, field: keyof NotaSection, value: any) => {
    const updatedNotas = [...notas];
    updatedNotas[notaIndex] = { ...updatedNotas[notaIndex], [field]: value };
    setNotas(updatedNotas);
  };

  // Handle Perubahan Item Menu di Nota tertentu
  const handleItemChange = (notaIndex: number, itemIndex: number, field: keyof BillItem, value: string) => {
    const updatedNotas = [...notas];
    updatedNotas[notaIndex].items[itemIndex][field] = value;
    setNotas(updatedNotas);
  };

  // Kalkulasi Subtotal per Nota
  const calculateSubtotal = (items: BillItem[]) => {
    return items.reduce((acc, item) => {
      const recipe = recipes.find((r) => r.id.toString() === item.recipe_id);
      const qty = Number(item.quantity) || 0;
      const price = recipe ? Number(recipe.harga_jual) || 0 : 0;
      return acc + (price * qty);
    }, 0);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWarningMessage(null);

    // Validasi tiap nota
    for (let i = 0; i < notas.length; i++) {
      if (!notas[i].nomorNota.trim()) {
        setWarningMessage(`Nomor nota / bill pada Nota #${i + 1} wajib diisi sesuai doket fisik!`);
        return;
      }
      const validItems = notas[i].items.filter(item => item.recipe_id && Number(item.quantity) > 0);
      if (validItems.length === 0) {
        setWarningMessage(`Nota #${i + 1}: Mohon pilih setidaknya satu menu dan isi jumlah porsinya.`);
        return;
      }
    }

    setProcessing(true);

    router.post(route("sales-report.store"), {
      tanggal: selectedDate,
      notas: notas.map(n => ({
        nomor_nota: n.nomorNota,
        partner_mitra: n.partnerMitra,
        items: n.items.filter(item => item.recipe_id && Number(item.quantity) > 0),
        diskon_persen: n.diskonPersen || 0,
        fee_mitra_persen: n.feeMitraPersen || 0,
      })) as any, // 🔥 Tambahkan casting "as any" di sini agar lolos dari pemeriksaan tipe TypeScript
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setProcessing(false);
        setNotas([
          {
            id: Date.now(),
            nomorNota: "",
            partnerMitra: "Internal / Umum",
            diskonPersen: "",
            feeMitraPersen: "",
            items: [{ recipe_id: "", quantity: "1" }],
          }
        ]);
      },
      onError: (errs) => {
        setProcessing(false);
        const firstError = Object.values(errs)[0];
        setWarningMessage(firstError as string || "Gagal menyimpan nota.");
      },
      onFinish: () => setProcessing(false)
    });
  };

  return (
    <AppLayout header={<h2 className="text-2xl font-bold text-gray-800">Sales Report</h2>}>
      <Head title="Sales Report" />

      {/* FLASH MESSAGES */}
      <div className="space-y-3 mb-6 max-w-4xl mx-auto">
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

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
            <div className="w-12 h-12 bg-[#FDF3E4] rounded-2xl flex items-center justify-center text-[#8B5E3C]">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Input Nota Penjualan</h3>
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
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* GLOBAL TANGGAL TRANSAKSI */}
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-amber-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-gray-750 uppercase tracking-wider block">Tanggal Transaksi Seluruh Nota</span>
                  <span className="text-xs text-gray-500">Nota yang diinput di bawah akan tercatat pada tanggal ini.</span>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#D9A978] focus:outline-none text-gray-700 font-bold"
                />
              </div>

              {/* LIST NOTA BERDASARKAN CARD / SECTION BERPENOMORAN OTOMATIS */}
              <div className="space-y-6">
                {notas.map((nota, notaIndex) => {
                  const subtotal = calculateSubtotal(nota.items);
                  const discPercent = Number(nota.diskonPersen) || 0;
                  const diskonNominal = (subtotal * discPercent) / 100;
                  const partnerFeePercent = Number(nota.feeMitraPersen) || 0;
                  const partnerFee = (subtotal * partnerFeePercent) / 100;
                  const totalBersih = Math.max(subtotal - diskonNominal - partnerFee, 0);

                  return (
                    <motion.div 
                      key={nota.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50/70 border-2 border-dashed border-amber-200/80 rounded-3xl p-5 md:p-6 space-y-5 relative shadow-xs"
                    >
                      {/* HEADER SECTION / CARD NOTA */}
                      <div className="flex justify-between items-center pb-3 border-b border-gray-200/60">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#8B5E3C] text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-2xs">
                            Nota #{notaIndex + 1}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">Lacak urutan doket fisik</span>
                        </div>
                        {notas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeNotaCard(notaIndex)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-xl transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus Nota Ini
                          </button>
                        )}
                      </div>

                      {/* INPUT UTAMA NOTA */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Nomor Nota</label>
                          <input
                            type="text"
                            placeholder="Contoh: INV-001"
                            value={nota.nomorNota}
                            onChange={(e) => handleNotaChange(notaIndex, 'nomorNota', e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D9A978] focus:outline-none font-semibold text-gray-800 shadow-2xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Mitra</label>
                          {/* 🔥 Diubah dari CustomSelect menjadi Textfield biasa */}
                          <input
                            type="text"
                            placeholder="Contoh: Umum / Kasir"
                            value={nota.partnerMitra}
                            onChange={(e) => handleNotaChange(notaIndex, 'partnerMitra', e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D9A978] focus:outline-none font-semibold text-gray-800 shadow-2xs"
                          />
                        </div>
                      </div>

                      {/* DAFTAR MENU PESANAN DALAM NOTA INI */}
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Daftar Menu Pesanan</label>
                          <button
                            type="button"
                            onClick={() => addItemRow(notaIndex)}
                            className="text-xs font-bold text-[#8B5E3C] hover:underline flex items-center gap-1 bg-white px-3 py-1 rounded-xl border border-amber-200 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah Baris Menu
                          </button>
                        </div>

                        {nota.items.map((item, itemIndex) => {
                          const selectedRecipe = recipes.find(r => r.id.toString() === item.recipe_id);
                          const itemTotal = selectedRecipe ? (selectedRecipe.harga_jual * (Number(item.quantity) || 0)) : 0;

                          return (
                            <div key={itemIndex} className="flex flex-col sm:flex-row gap-3 items-center bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs">
                              <div className="flex-1 w-full">
                                <CustomSelect
                                  value={item.recipe_id}
                                  onChange={(value) => handleItemChange(notaIndex, itemIndex, 'recipe_id', String(value))}
                                  options={menuOptions}
                                  placeholder="Cari atau pilih menu"
                                  searchable
                                  searchPlaceholder="Ketik nama menu..."
                                  buttonClassName="py-2.5"
                                />
                              </div>

                              <div className="w-full sm:w-28">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(notaIndex, itemIndex, 'quantity', e.target.value)}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9A978] focus:outline-none text-center font-bold text-gray-800"
                                  placeholder="Porsi"
                                />
                              </div>

                              <div className="w-full sm:w-32 text-right sm:pr-2">
                                <span className="text-xs font-bold text-gray-700">{formatRupiah(itemTotal)}</span>
                              </div>

                              {nota.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeItemRow(notaIndex, itemIndex)}
                                  className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition self-end sm:self-center"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* DISKON, FEE MITRA & RINGKASAN PER NOTA */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-200/60">
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1 ml-1">Diskon Nota %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0"
                              value={nota.diskonPersen}
                              onChange={(e) => handleNotaChange(notaIndex, 'diskonPersen', e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#D9A978] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-600 mb-1 ml-1">Fee Mitra %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0"
                              value={nota.feeMitraPersen}
                              onChange={(e) => handleNotaChange(notaIndex, 'feeMitraPersen', e.target.value)}
                              className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#D9A978] focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* PREVIEW KECIL RINGKASAN NOTA INI */}
                        <div className="bg-white p-4 rounded-2xl border border-amber-100 flex flex-col justify-between space-y-1.5 text-xs text-gray-600 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold text-gray-800 pb-1.5 border-b border-gray-100">
                            <Calculator className="w-3.5 h-3.5 text-[#8B5E3C]" />
                            <span>Ringkasan Nota #{notaIndex + 1}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
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
                          <div className="flex justify-between pt-1.5 border-t border-gray-100 text-xs font-extrabold text-gray-900">
                            <span>Total Bersih:</span>
                            <span className="text-[#8B5E3C]">{formatRupiah(totalBersih)}</span>
                          </div>
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </div>

              {/* TOMBOL TAMBAH NOTA LAINNYA DI BAWAH (AGAR TIDAK NAIK TURUN) */}
              <button
                type="button"
                onClick={addNotaCard}
                className="w-full py-4 border-2 border-dashed border-[#8B5E3C]/50 rounded-2xl text-[#8B5E3C] font-extrabold text-sm hover:bg-[#8B5E3C]/5 transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Plus className="w-5 h-5" />  Tambah Nota Lainnya
              </button>

              {/* TOMBOL SUBMIT UTAMA DI BAWAH */}
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={processing}
                  className={`px-8 py-3.5 rounded-full text-white font-extrabold text-sm shadow-md transition ${
                    processing ? "bg-gray-400 cursor-not-allowed" : "bg-[#8B5E3C] hover:bg-[#6F4E37] active:scale-95"
                  }`}
                >
                  {processing ? "Menyimpan Semua Nota & Memotong Stok..." : "Simpan Semua Nota & Kurangi Stok Otomatis"}
                </button>
              </div>

            </form>
          )}
        </div>
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