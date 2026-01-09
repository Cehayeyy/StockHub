import React, { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Search, ChevronDown, Trash2, Plus, AlertTriangle } from "lucide-react";

// --- Types ---
interface ItemData {
  id: number;
  item_id: number;
  nama: string;
  satuan?: string;
  stok_awal: number;
  stok_masuk?: number;
  stok_total: number;
  pemakaian: number;
  tersisa: number;
}

interface DropdownItem {
  id: number;
  nama: string;
  satuan?: string;
  stok_awal?: number;
  pemakaian?: number;
  stok_masuk?: number;
  tersisa?: number; // Field baru dari backend
}

interface LowStockItem {
  nama: string;
  tersisa: number;
  kategori: string;
}

interface PageProps {
  items: { data: ItemData[]; links: any[] };
  availableMenus: DropdownItem[];
  inputableMenus: DropdownItem[];
  tab: "menu" | "mentah";
  tanggal: string;
  lowStockItems: LowStockItem[];
  auth: any;
}

export default function Bar() {
  const { items, availableMenus, inputableMenus, tab, tanggal, lowStockItems, auth } = usePage<any>().props as PageProps;
  const role = auth?.user?.role;

  const [search, setSearch] = useState("");
  const [date, setDate] = useState(tanggal);

  // Modal States
  const [showInputModal, setShowInputModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form State
  const [formRecordId, setFormRecordId] = useState<number | null>(null);
  const [formItemId, setFormItemId] = useState<number | "">("");
  const [formItemName, setFormItemName] = useState("");
  const [formStokAwal, setFormStokAwal] = useState<number | "">("");
  const [formStokTersisa, setFormStokTersisa] = useState<number | "">(""); // State untuk Sisa Stok
  const [formStokMasuk, setFormStokMasuk] = useState<number | "">("");
  const [formPemakaian, setFormPemakaian] = useState<number | "">("");
  const [formSatuan, setFormSatuan] = useState("porsi");

  useEffect(() => {
    setDate(tanggal);
  }, [tanggal]);

  // --- Handlers ---
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    router.get(
      route("stok-harian.bar"),
      { tab, tanggal: date, search: e.target.value },
      { preserveScroll: true }
    );
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
    router.get(
      route("stok-harian.bar"),
      { tab, search, tanggal: e.target.value },
      { preserveScroll: true }
    );
  };

  const handleTabSwitch = (t: "menu" | "mentah") => {
    router.get(
      route("stok-harian.bar"),
      { tab: t, tanggal: date, search },
      { preserveScroll: true }
    );
  };

  const resetForm = () => {
    setFormRecordId(null);
    setFormItemId("");
    setFormItemName("");
    setFormStokAwal("");
    setFormStokTersisa(""); // Reset sisa stok
    setFormStokMasuk("");
    setFormPemakaian("");
    setFormSatuan("porsi");
  };

  // --- Actions ---
  const submitCreate = () => {
    if (formItemId === "") return;

    if (tab === "menu") {
      router.post(
        route("stok-harian-menu.store"),
        {
          item_id: Number(formItemId),
          tanggal: date,
          stok_keluar: Number(formPemakaian),
        },
        {
          onSuccess: () => {
            setShowInputModal(false);
            resetForm();
          },
        }
      );
      return;
    }

    router.post(
      route("stok-harian-mentah.store"),
      {
        item_id: Number(formItemId),
        tanggal: date,
        stok_awal: Number(formStokAwal),
        stok_masuk: Number(formStokMasuk),
      },
      {
        onSuccess: () => {
          setShowInputModal(false);
          resetForm();
        },
      }
    );
  };

  const handleEditClick = (item: ItemData) => {
    setFormRecordId(item.id);
    setFormItemId(item.item_id);
    setFormItemName(item.nama);
    setFormStokAwal(item.stok_awal);
    setFormStokTersisa(item.tersisa); // Set tersisa saat edit
    setFormStokMasuk(item.stok_masuk ?? "");
    setFormPemakaian(item.pemakaian);
    setFormSatuan(item.satuan || "porsi");
    setShowEditModal(true);
  };

  const submitUpdate = () => {
    if (!formRecordId) return;

    const routeName =
      tab === "menu"
        ? "stok-harian-menu.update"
        : "stok-harian-mentah.update";

    const payload: any = {
      item_id: Number(formItemId),
      stok_awal: Number(formStokAwal),
    };

    const valAwal = Number(formStokAwal);
    let valMasuk = 0;

    if (tab === "mentah") {
      valMasuk = Number(formStokMasuk);
      payload.stok_masuk = valMasuk;
    }

    if (tab === "menu") {
      const valKeluar = Number(formPemakaian);
      payload.stok_masuk = Number(formStokMasuk);

      const valTotal = valAwal + (Number(formStokMasuk) || 0);

      if (valKeluar > valTotal) {
        alert(`Error: Pemakaian (${valKeluar}) tidak boleh melebihi Stok Total (${valTotal})!`);
        return;
      }
      if (valKeluar < 0) {
        alert("Error: Pemakaian tidak boleh kurang dari 0");
        return;
      }

      payload.stok_keluar = valKeluar;
    }

    router.put(route(routeName, formRecordId), payload, {
      onSuccess: () => {
        setShowEditModal(false);
        resetForm();
      },
      onError: (err: any) => {
        console.error("Error updating:", err);
      }
    });
  };

  const handleDeleteClick = (id: number) => {
    setFormRecordId(id);
    setShowDeleteModal(true);
  };

  const submitDelete = () => {
    if (!formRecordId) return;

    const routeName =
      tab === "menu"
        ? "stok-harian-menu.destroy"
        : "stok-harian-mentah.destroy";

    router.delete(route(routeName, formRecordId), {
      onSuccess: () => {
        setShowDeleteModal(false);
        resetForm();
      },
    });
  };

  return (
    <AppLayout header={`Stok Harian ${tab === "menu" ? "Menu" : "Bahan Mentah"}`}>
      <Head title="Stok Harian Bar" />

      <div className="py-6 space-y-6">
        {/* SECTION 1: ALERT */}
        {lowStockItems && lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="p-2 bg-red-100 rounded-full text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-red-800 font-bold">Peringatan: Stok Menipis!</h3>
              <p className="text-red-600 text-sm mt-1">
                Terdapat {lowStockItems.length} item dengan stok di bawah 7. Harap segera lakukan restock.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 2: TABLE */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[500px]">
          <div className="flex flex-col items-end gap-4 mb-6">
            <div className="flex gap-3">
              {(tab === "mentah" || (tab === "menu" && (role === "bar" || role === "dapur"))) && (
                <button onClick={() => setShowInputModal(true)} className="bg-[#C19A6B] hover:bg-[#a8855a] text-white px-6 py-2 rounded-full text-sm font-bold shadow-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Input Data
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input type="date" value={date} onChange={handleDateChange} className="bg-[#FDF3E4] border-none rounded-full px-4 py-2 text-sm w-40" />
              <div className="relative">
                <input type="text" placeholder="Search..." value={search} onChange={handleSearch} className="bg-[#FDF3E4] border-none rounded-full pl-4 pr-10 py-2 text-sm w-64" />
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
              </div>
            </div>

            <div className="flex bg-[#FDF3E4] rounded-full p-1 mt-2">
              <button onClick={() => handleTabSwitch("menu")} className={`px-6 py-1 rounded-full text-sm font-medium transition ${tab === "menu" ? "bg-[#D9A978] text-white" : "text-gray-500"}`}>Menu</button>
              <button onClick={() => handleTabSwitch("mentah")} className={`px-6 py-1 rounded-full text-sm font-medium transition ${tab === "mentah" ? "bg-[#D9A978] text-white" : "text-gray-500"}`}>Mentah</button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                <tr>
                  <th className="p-4 text-center w-16">No</th>
                  <th className="p-4">Nama</th>
                  <th className="p-4 text-center">Satuan</th>
                  <th className="p-4 text-center">Stok Awal</th>
                  {tab === "mentah" && <th className="p-4 text-center">Stok Masuk</th>}
                  <th className="p-4 text-center">Stok Total</th>
                  <th className="p-4 text-center">Pemakaian</th>
                  <th className="p-4 text-center">Tersisa</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.data.length > 0 ? (
                  items.data.map((item, i) => (
                    <tr key={item.id} className="hover:bg-[#FFF9F0] transition">
                      <td className="p-4 text-center">{i + 1}</td>
                      <td className="p-4 font-medium">{item.nama}</td>
                      <td className="p-4 text-center text-gray-500">{item.satuan}</td>
                      <td className="p-4 text-center">{item.stok_awal}</td>
                      {tab === "mentah" && <td className="p-4 text-center">{item.stok_masuk ?? 0}</td>}
                      <td className="p-4 text-center">{item.stok_total}</td>
                      <td className="p-4 text-center">{item.pemakaian}</td>
                      <td className={`p-4 text-center font-bold ${item.tersisa < 7 ? 'text-red-600' : 'text-gray-900'}`}>{item.tersisa}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEditClick(item)} className="bg-[#1D8CFF] text-white px-4 py-1 rounded-full text-xs font-semibold hover:bg-[#166ac4] transition">Edit</button>
                          <button onClick={() => handleDeleteClick(item.id)} className="bg-[#FF4B4B] text-white px-4 py-1 rounded-full text-xs font-semibold hover:bg-[#e03535] transition">Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={tab === "mentah" ? 9 : 8} className="p-8 text-center text-gray-400">Belum ada data stok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: CHART */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-red-500 rounded-full inline-block"></span>
            Grafik Stok Hampir Habis ({"<"} 7)
          </h3>
          {lowStockItems.length > 0 ? (
            <div className="space-y-4">
              {lowStockItems.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>{item.nama} <span className="text-gray-400 font-normal">({item.kategori})</span></span>
                    <span className="text-red-500">{item.tersisa} Tersisa</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-500 to-red-400 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${Math.min((item.tersisa / 7) * 100, 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">Semua stok aman! Tidak ada item yang hampir habis.</div>
          )}
        </div>
      </div>

      {/* MODAL 1: INPUT DATA */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[400px] rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-center mb-6">Input Data {tab === "menu" ? "Pemakaian Menu" : "Stok Bahan Mentah"}</h2>
            <form onSubmit={(e) => { e.preventDefault(); submitCreate(); }} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Tanggal</label><div className="bg-gray-100 px-4 py-2.5 rounded-xl text-sm border">{new Date(date).toLocaleDateString("id-ID")}</div></div>

              <div>
                <label className="block text-sm font-medium mb-1">Nama Item</label>
                <div className="relative">
                  <select
                    value={formItemId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setFormItemId(id === "" ? "" : Number(id));
                      const source = tab === "menu" ? availableMenus : inputableMenus;
                      const selected = source.find((m) => m.id === Number(id));
                      if (selected) {
                        setFormSatuan(selected.satuan || "porsi");
                        setFormStokAwal(selected.stok_awal ?? 0);
                        setFormStokTersisa(selected.tersisa ?? 0);
                        setFormStokMasuk(selected.stok_masuk ?? "");
                        setFormPemakaian(selected.pemakaian ?? 0);
                      }
                    }}
                    className="w-full appearance-none bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                  >
                    <option value="">Pilih Item...</option>
                    {(tab === "menu" ? availableMenus : inputableMenus).map((m) => (
                      <option key={m.id} value={m.id}>{m.nama}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div><label className="block text-sm font-medium mb-1">Satuan</label><input type="text" value={formSatuan} readOnly className="w-full bg-gray-100 border rounded-xl px-4 py-2.5 text-sm" /></div>

              <div><label className="block text-sm font-medium mb-1">Stok Awal (Pagi)</label><input type="number" min="0" value={formStokAwal} onChange={(e) => setFormStokAwal(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]" /></div>

              {/* FIELD STOK TERSISA (READ ONLY) */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600">Sisa Stok Saat Ini</label>
                <input
                  type="text"
                  value={formStokTersisa}
                  readOnly
                  className="w-full bg-gray-200 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-700 font-semibold cursor-not-allowed focus:outline-none"
                />
              </div>

              {tab === "mentah" && (
                <div><label className="block text-sm font-medium mb-1">Stok Masuk</label><input type="number" min="0" value={formStokMasuk} onChange={(e) => setFormStokMasuk(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]" /></div>
              )}

              {tab === "menu" && (
                <div><label className="block text-sm font-medium mb-1">Pemakaian</label><input type="number" min="0" value={formPemakaian} onChange={(e) => setFormPemakaian(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]" required /></div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowInputModal(false); resetForm(); }} className="px-6 py-2 rounded-full border">Batal</button>
                <button type="submit" disabled={formItemId === ""} className="px-6 py-2 rounded-full bg-[#D9A978] text-white font-bold disabled:opacity-50">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT DATA */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[400px] rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-center mb-6">Edit Stok {tab === "menu" ? "Menu" : "Bahan"}</h2>
            <form onSubmit={(e) => { e.preventDefault(); submitUpdate(); }} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Tanggal</label><div className="bg-gray-100 px-4 py-2.5 rounded-xl text-sm border">{new Date(date).toLocaleDateString("id-ID")}</div></div>
              <div><label className="block text-sm font-medium mb-1">Nama Item</label><input type="text" value={formItemName} readOnly className="w-full bg-gray-100 border rounded-xl px-4 py-2.5 text-sm focus:outline-none text-gray-600" /></div>
              <div><label className="block text-sm font-medium mb-1">Satuan</label><input type="text" value={formSatuan} readOnly className="w-full bg-gray-100 border rounded-xl px-4 py-2.5 text-sm focus:outline-none" /></div>
              <div><label className="block text-sm font-medium mb-1">Stok Awal</label><input type="number" min="0" value={formStokAwal} onChange={(e) => setFormStokAwal(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]" /></div>

              {/* FIELD STOK TERSISA DI EDIT (READ ONLY) */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600">Sisa Stok Saat Ini</label>
                <input
                  type="text"
                  value={formStokTersisa}
                  readOnly
                  className="w-full bg-gray-200 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-700 font-semibold cursor-not-allowed focus:outline-none"
                />
              </div>

              {tab === "mentah" && (<div><label className="block text-sm font-medium mb-1">Stok Masuk</label><input type="number" min="0" value={formStokMasuk} onChange={(e) => setFormStokMasuk(Number(e.target.value))} className="w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]" /></div>)}
              {tab === "menu" && (<div><label className="block text-sm font-medium mb-1">Pemakaian (Terjual)</label><input type="number" min="0" value={formPemakaian} onChange={(e) => setFormPemakaian(Number(e.target.value))} className="w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]" /></div>)}

              <div className="flex justify-end gap-3 mt-4"><button type="button" onClick={() => { setShowEditModal(false); resetForm(); }} className="px-6 py-2 rounded-full border">Batal</button><button type="submit" className="px-6 py-2 rounded-full bg-[#1D8CFF] text-white font-bold">Update</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: HAPUS DATA */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[350px] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="text-red-500 w-6 h-6" /></div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Hapus Data?</h2>
            <p className="text-sm text-gray-500 mb-6">Data yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex justify-center gap-3"><button onClick={() => setShowDeleteModal(false)} className="px-5 py-2 rounded-full border text-sm font-semibold">Batal</button><button onClick={submitDelete} className="px-5 py-2 rounded-full bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Hapus</button></div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
