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
  const statusColor = isSesuai ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-rose-700 bg-rose-50 border border-rose-200";

  useEffect(() => {
    setFisik(initialFisik ?? "");
    setCatatan(initialCatatan || "");
  }, [item]);

  const handleSave = () => {
    onSave(item.id, fisik === "" ? 0 : Number(fisik), catatan);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 border border-gray-100">
        <div className="bg-[#8B5E3C] p-6 flex justify-between items-center">
          <h3 className="text-white font-extrabold text-lg">Verifikasi Item</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition p-1 rounded-xl hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">No</label>
              <div className="font-bold text-gray-800 text-base">{no}</div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nama Item</label>
              <div className="font-bold text-gray-800 text-base">{item.nama}</div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-center">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Stok Sistem</label>
              <span className="text-xl font-black text-gray-800">{stokSistem}</span>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5 ml-1">Stok Fisik (Input)</label>
              <input
                type="number"
                value={fisik}
                onChange={(e) => setFisik(e.target.value)}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-[#8B5E3C] focus:border-transparent outline-none"
                placeholder="0"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5 ml-1">Selisih</label>
              <div className={`px-4 py-3 rounded-2xl font-black text-sm border ${selisih === 0 ? 'bg-gray-50 text-gray-700 border-gray-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                {selisih > 0 ? `+${selisih}` : selisih}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5 ml-1">Status</label>
              <div className={`px-4 py-3 rounded-2xl font-bold text-sm text-center ${statusColor}`}>
                {statusText}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5 ml-1">Catatan Supervisor</label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50 rounded-2xl px-4 py-3 text-sm font-medium focus:border-[#8B5E3C] focus:ring-2 focus:ring-[#8B5E3C] outline-none transition"
              rows={3}
              placeholder="Mencatat bahan mentah yang tidak layak pakai..."
            ></textarea>
          </div>
        </div>

        <div className="bg-gray-50 p-6 flex justify-end gap-3 border-t border-gray-100">
          <button onClick={onClose} className="px-6 py-2.5 rounded-2xl font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 transition text-sm">
            Batal
          </button>
          <button onClick={handleSave} className="px-6 py-2.5 rounded-2xl font-bold text-white bg-[#8B5E3C] hover:bg-[#6F4E37] transition text-sm flex items-center gap-2 shadow-md">
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
    const finalFisikData: Record<number, number> = {};
    const finalSistemData: Record<number, number> = {};

    items.forEach(item => {
      finalFisikData[item.id] = physicalStocks[item.id] ?? item.stok_sistem;
      finalSistemData[item.id] = item.stok_sistem;
    });

    setIsProcessing(true);

    router.post(route('verifikasi-stok.store'), {
        tab,
        tanggal: tanggal_data,
        fisik: finalFisikData,
        catatan: notes
    }, {
        preserveScroll: true,
        onSuccess: () => {
            const params = new URLSearchParams({
                tab,
                tanggal: tanggal_data,
                fisik: JSON.stringify(finalFisikData),
                sistem: JSON.stringify(finalSistemData),
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
        {/* Banner Info */}
        <div className="bg-[#F2ECE4] p-5 md:p-6 rounded-3xl shadow-xs border border-amber-200/60 flex items-start gap-4">
          <div className="p-3 bg-[#8B5E3C] rounded-2xl text-white shrink-0 shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[#8B5E3C] font-extrabold text-base">Verifikasi Mingguan</h3>
            <p className="text-gray-600 text-xs sm:text-sm mt-1 leading-relaxed">
              Anda memilih tanggal <strong>{new Date(tanggal_picker).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
              <br className="hidden md:block"/>
              <span className="md:ml-0.5">Sistem menampilkan data stok acuan dari hari <strong>Senin, {new Date(tanggal_data).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</span>
            </p>
          </div>
        </div>

        {/* Kontainer Utama */}
        <div className="bg-[#F2ECE4] p-4 md:p-8 rounded-3xl shadow-sm border border-amber-200/60 min-h-[500px] flex flex-col">

          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="w-full md:w-auto flex bg-gray-100 rounded-full p-1 border border-gray-200/60">
              <button 
                onClick={() => handleTabSwitch("bar")} 
                className={`flex-1 md:flex-none px-6 py-1.5 rounded-full text-xs font-bold transition-all ${
                  tab === "bar" ? "bg-[#8B5E3C] text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Bar
              </button>
              <button 
                onClick={() => handleTabSwitch("dapur")} 
                className={`flex-1 md:flex-none px-6 py-1.5 rounded-full text-xs font-bold transition-all ${
                  tab === "dapur" ? "bg-[#8B5E3C] text-white shadow-xs" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Dapur
              </button>
            </div>

            <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
              <div className="relative w-full md:w-auto">
                <input
                  type="date"
                  value={tanggal_picker}
                  onChange={handleDateChange}
                  className="w-full md:w-auto bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm text-[#8B5E3C] font-bold shadow-2xs outline-none"
                />
              </div>
              <div className="relative w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Cari item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 bg-gray-50 border border-gray-200 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Mobile View (Cards) */}
          <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
            {filteredItems.map((item, i) => {
              const fisik = physicalStocks[item.id] ?? item.stok_sistem;
              return (
                <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#D9A978]/15 text-[#8B5E3C] p-2.5 rounded-xl shadow-inner">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{item.nama}</h4>
                        <span className="text-xs text-gray-400 font-medium">Satuan: {item.satuan}</span>
                      </div>
                    </div>
                    <button onClick={() => handleEditClick(item, i+1)} className="px-3 py-1.5 bg-amber-50 text-amber-700 font-bold text-xs rounded-xl hover:bg-amber-100 transition shadow-xs">
                      Verifikasi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View (Table) */}
          <div className="hidden md:block w-full rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden flex-1 mb-6">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#FAF7F2]/80 text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-center w-16">No</th>
                    <th className="px-6 py-4">Nama Item</th>
                    <th className="px-6 py-4 text-center w-40">Stok Sistem (Senin)</th>
                    <th className="px-6 py-4 text-center w-40">Stok Fisik</th>
                    <th className="px-6 py-4 text-center w-32">Selisih</th>
                    <th className="px-6 py-4 text-center w-36">Status</th>
                    <th className="px-6 py-4 text-center w-32">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item, i) => {
                      const fisik = physicalStocks[item.id] ?? item.stok_sistem;
                      const selisih = fisik - item.stok_sistem;
                      const isMatch = selisih === 0;

                      return (
                        <tr key={item.id} className="hover:bg-[#FDF3E4]/50 transition-colors duration-150">
                          <td className="px-6 py-4 text-center text-gray-400 font-medium">{i + 1}</td>
                          <td className="px-6 py-4 font-bold text-gray-800">
                            {item.nama} <span className="text-xs text-gray-400 font-normal">({item.satuan})</span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-blue-600 bg-blue-50/20">{item.stok_sistem}</td>
                          <td className="px-6 py-4 text-center bg-amber-50/20">
                            <input
                              type="number"
                              value={physicalStocks[item.id] ?? ''}
                              placeholder={String(item.stok_sistem)}
                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                              className="w-24 text-center border border-gray-200 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-[#8B5E3C] focus:border-transparent outline-none bg-white font-bold text-gray-800 text-sm shadow-2xs"
                              onChange={(e) => handlePhysicalChange(item.id, e.target.value)}
                            />
                          </td>
                          <td className={`px-6 py-4 text-center font-black ${selisih < 0 ? 'text-rose-600' : selisih > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {selisih > 0 ? `+${selisih}` : selisih}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isMatch ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-2xs"><CheckCircle className="w-3.5 h-3.5" /> Cocok</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100 shadow-2xs"><AlertCircle className="w-3.5 h-3.5" /> Selisih</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleEditClick(item, i + 1)}
                              className="px-3.5 py-1.5 bg-amber-50 text-amber-700 font-bold text-xs rounded-xl hover:bg-amber-100 transition shadow-xs inline-flex items-center gap-1"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Catatan
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">
                        Tidak ada data ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-auto flex justify-end pt-2">
            <button
              className={`w-full md:w-auto justify-center px-6 py-3 rounded-2xl font-bold shadow-md flex items-center gap-2 transition-all text-sm ${
                isProcessing ? "bg-gray-300 text-gray-500 cursor-wait shadow-none" : "bg-[#8B5E3C] hover:bg-[#6F4E37] text-white active:scale-95"
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