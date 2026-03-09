import React, { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, router, usePage } from "@inertiajs/react";
import { Search, Calendar, CheckCircle, AlertCircle, Save, Package, Pencil, X } from "lucide-react";

interface VerificationItem {
  id: number;
  nama: string;
  satuan: string;
  stok_sistem: number;
}

interface PageProps {
  items: VerificationItem[];
  tab: "bar" | "dapur";
  tanggal_picker: string;
  tanggal_data: string;
}

// --- KOMPONEN MODAL (CARD) ---
const VerificationModal = ({ show, onClose, item, no, initialFisik, initialCatatan, onSave }: any) => {
  if (!show || !item) return null;

  const [fisik, setFisik] = useState<string | number>(initialFisik ?? "");
  const [catatan, setCatatan] = useState(initialCatatan || "");

  const stokSistem = item.stok_sistem;
  const stokFisikNum = fisik === "" ? 0 : Number(fisik);
  const selisih = stokFisikNum - stokSistem;

  const isSesuai = selisih === 0;
  const statusText = isSesuai ? "Sesuai" : (selisih < 0 ? "Kurang" : "Lebih");
  const statusColor = isSesuai ? "text-green-600 bg-green-100" : "text-red-600 bg-red-100";

  useEffect(() => {
    setFisik(initialFisik ?? "");
    setCatatan(initialCatatan || "");
  }, [item]);

  const handleSave = () => {
    onSave(item.id, fisik === "" ? 0 : Number(fisik), catatan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
        <div className="bg-[#8B5E3C] p-6 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Verifikasi Item</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">No</label>
              <div className="font-semibold text-gray-800">{no}</div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Nama Item</label>
              <div className="font-semibold text-gray-800">{item.nama}</div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
              <label className="text-xs font-bold text-gray-500 block mb-1">Stok Sistem</label>
              <span className="text-lg font-bold text-gray-700">{stokSistem}</span>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-700 block mb-1">Stok Fisik (Input)</label>
              <input
                type="number"
                value={fisik}
                onChange={(e) => setFisik(e.target.value)}
                onWheel={(e) => (e.target as HTMLInputElement).blur()} // 🔥 SOLUSI POIN 3: Kunci Scroll
                className="w-full border-2 border-[#D9A978] rounded-xl px-4 py-2 focus:ring-4 focus:ring-[#D9A978]/20 focus:outline-none font-bold text-gray-800"
                placeholder="0"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Selisih</label>
              <div className={`px-4 py-2 rounded-xl font-bold border ${selisih === 0 ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                {selisih > 0 ? `+${selisih}` : selisih}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Status</label>
              <div className={`px-4 py-2 rounded-xl font-bold border ${statusColor === "text-green-600 bg-green-100" ? 'border-green-200' : 'border-red-200'} ${statusColor}`}>
                {statusText}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Catatan Supervisor</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] outline-none transition"
              rows={3}
              placeholder="Mencatat bahan mentah yang tidak layak pakai..."
            ></textarea>
          </div>
        </div>

        <div className="bg-gray-50 p-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-full font-bold text-gray-500 hover:bg-gray-200 transition text-sm">
            Batal
          </button>
          <button onClick={handleSave} className="px-6 py-2.5 rounded-full font-bold text-white bg-[#8B5E3C] hover:bg-[#724C31] transition text-sm flex items-center gap-2 shadow-lg">
            <Save className="w-4 h-4" />
            Simpan Verifikasi
          </button>
        </div>
      </div>
    </div>
  );
};

export default function VerifikasiStok() {
  const { items, tab, tanggal_picker, tanggal_data } = usePage<any>().props as PageProps;

  const [physicalStocks, setPhysicalStocks] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null);
  const [selectedNo, setSelectedNo] = useState<number>(0);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    router.get(
      route("verifikasi-stok.index"),
      { tab, tanggal: e.target.value },
      { preserveScroll: true }
    );
  };

  const handleExportAndSave = () => {
    // 1. Siapkan data final: Jika Owner tidak mengisi, anggap stok fisik = stok sistem
    const finalFisikData: Record<number, number> = {};

    items.forEach(item => {
      // Jika ada input manual pakai itu, jika kosong pakai angka sistem (biar tidak jadi 0)
      finalFisikData[item.id] = physicalStocks[item.id] ?? item.stok_sistem;
    });

    setIsProcessing(true);

    // 2. Kirim ke Backend
    router.post(route('verifikasi-stok.store'), {
        tab,
        tanggal: tanggal_data,
        fisik: finalFisikData, // Mengirim data lengkap (manual + default sistem)
        catatan: notes
    }, {
        preserveScroll: true,
        onSuccess: () => {
            // 3. Setelah sukses simpan, otomatis jalankan Export Excel
            // Kita buat link download manual agar prosesnya mulus
            const params = new URLSearchParams({
                tab,
                tanggal: tanggal_data,
                fisik: JSON.stringify(finalFisikData),
                catatan: JSON.stringify(notes)
            });
            window.location.href = route('verifikasi-stok.export') + '?' + params.toString();

            alert("Stok Berhasil Disinkronkan & Laporan Diunduh!");
            setIsProcessing(false);
        },
        onError: () => {
            alert("Gagal sinkronisasi data.");
            setIsProcessing(false);
        }
    });
};

  const handleTabSwitch = (t: "bar" | "dapur") => {
    router.get(
      route("verifikasi-stok.index"),
      { tab: t, tanggal: tanggal_picker },
      { preserveScroll: true }
    );
  };

  const handlePhysicalChange = (id: number, val: string) => {
    setPhysicalStocks((prev) => ({
      ...prev,
      [id]: val === "" ? 0 : parseFloat(val),
    }));
  };

  const handleEditClick = (item: VerificationItem, no: number) => {
    setSelectedItem(item);
    setSelectedNo(no);
    setIsModalOpen(true);
  };

  const handleModalSave = (id: number, val: number, note: string) => {
    setPhysicalStocks(prev => ({ ...prev, [id]: val }));
    setNotes(prev => ({ ...prev, [id]: note }));
    setIsModalOpen(false);
  };

  const filteredItems = items.filter((item) =>
    item.nama.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout header="Verifikasi Stok Mingguan">
      <Head title="Verifikasi Stok" />

      <div className="py-6 space-y-6">
        <div className="bg-[#FFF9F0] border border-[#FDF3E4] p-4 rounded-2xl flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-[#D9A978] rounded-full text-white shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[#8B5E3C] font-bold">Verifikasi Mingguan</h3>
            <p className="text-[#A68B6C] text-sm mt-1">
              Anda memilih tanggal <strong>{new Date(tanggal_picker).toLocaleDateString('id-ID')}</strong>.
              <br className="hidden md:block"/>
              <span className="md:ml-1">Sistem menampilkan data stok acuan dari hari <strong>Senin, {new Date(tanggal_data).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[500px]">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="w-full md:w-auto flex bg-[#FDF3E4] rounded-full p-1">
              <button onClick={() => handleTabSwitch("bar")} className={`flex-1 md:flex-none px-6 py-2 rounded-full text-sm font-bold transition-all ${tab === "bar" ? "bg-[#D9A978] text-white shadow-sm" : "text-gray-500 hover:text-[#D9A978]"}`}>Bar</button>
              <button onClick={() => handleTabSwitch("dapur")} className={`flex-1 md:flex-none px-6 py-2 rounded-full text-sm font-bold transition-all ${tab === "dapur" ? "bg-[#D9A978] text-white shadow-sm" : "text-gray-500 hover:text-[#D9A978]"}`}>Dapur</button>
            </div>

            <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
              <div className="relative w-full md:w-auto">
                <input
                  type="date"
                  value={tanggal_picker}
                  onChange={handleDateChange}
                  className="w-full md:w-auto bg-[#FDF3E4] border-none rounded-full px-4 py-2 text-sm text-[#8B5E3C] font-medium focus:ring-2 focus:ring-[#D9A978]"
                />
              </div>
              <div className="relative w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Cari item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 bg-[#FDF3E4] border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#D9A978]"
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredItems.map((item, i) => {
              const fisik = physicalStocks[item.id] ?? item.stok_sistem;
              return (
                <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-[#D9A978]" />
                      <h4 className="font-bold text-gray-800">{item.nama}</h4>
                    </div>
                    <button onClick={() => handleEditClick(item, i+1)} className="text-[#D9A978]">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                <tr>
                  <th className="p-4 text-center w-16">No</th>
                  <th className="p-4">Nama Item</th>
                  <th className="p-4 text-center bg-blue-50/50">Stok Sistem (Senin)</th>
                  <th className="p-4 text-center bg-yellow-50/50 w-40">Stok Fisik</th>
                  <th className="p-4 text-center">Selisih</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, i) => {
                    const fisik = physicalStocks[item.id] ?? item.stok_sistem;
                    const selisih = fisik - item.stok_sistem;
                    const isMatch = selisih === 0;

                    return (
                      <tr key={item.id} className="hover:bg-[#FFF9F0] transition">
                        <td className="p-4 text-center text-gray-500">{i + 1}</td>
                        <td className="p-4 font-medium text-gray-800">
                          {item.nama} <span className="text-xs text-gray-400 font-normal">({item.satuan})</span>
                        </td>
                        <td className="p-4 text-center font-bold text-blue-600 bg-blue-50/30">{item.stok_sistem}</td>
                        <td className="p-4 text-center bg-yellow-50/30">
                          <input
                            type="number"
                            value={physicalStocks[item.id] ?? ''}
                            placeholder={String(item.stok_sistem)}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()} // 🔥 SOLUSI POIN 3: Kunci Scroll
                            className="w-24 text-center border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-[#D9A978] bg-white"
                            onChange={(e) => handlePhysicalChange(item.id, e.target.value)}
                          />
                        </td>
                        <td className={`p-4 text-center font-bold ${selisih < 0 ? 'text-red-500' : selisih > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                          {selisih > 0 ? `+${selisih}` : selisih}
                        </td>
                        <td className="p-4 text-center">
                          {isMatch ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Cocok</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700"><AlertCircle className="w-3 h-3" /> Selisih</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleEditClick(item, i + 1)}
                            className="p-2 bg-white border border-[#D9A978] text-[#D9A978] rounded-lg hover:bg-[#D9A978] hover:text-white transition shadow-sm"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400 italic">
                      Tidak ada data ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              className={`w-full md:w-auto justify-center px-6 py-2.5 rounded-full font-bold shadow-md flex items-center gap-2 transition-all ${
                isProcessing ? "bg-gray-400 text-white cursor-wait" : "bg-[#C19A6B] hover:bg-[#a8855a] text-white active:scale-95"
              }`}
              onClick={handleExportAndSave}
              disabled={isProcessing}
            >
              <Save className="w-4 h-4" /> {isProcessing ? "Memproses..." : "Simpan & Cetak Laporan"}
            </button>
          </div>
        </div>
      </div>

      <VerificationModal
        show={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={selectedItem}
        no={selectedNo}
        initialFisik={selectedItem ? physicalStocks[selectedItem.id] : undefined}
        initialCatatan={selectedItem ? notes[selectedItem.id] : ""}
        onSave={handleModalSave}
      />
    </AppLayout>
  );
}
