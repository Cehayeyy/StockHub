import React, { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Search, ChevronDown, Trash2 } from "lucide-react";

// --- Types ---
interface ItemData {
  id: number;
  item_id: number;
  nama: string;
  satuan?: string;
  stok_awal: number;
  stok_total: number;
  pemakaian: number; // stok_keluar
  tersisa: number;
}

interface DropdownItem {
    id: number;
    nama: string;
    satuan?: string;
    stok_awal?: number;
    pemakaian?: number;
}

interface PageProps {
  items: { data: ItemData[]; links: any[] };
  availableMenus: DropdownItem[];
  inputableMenus: DropdownItem[];
  tab: "menu" | "mentah";
  tanggal: string;
}

export default function Bar() {
  const { items, availableMenus, inputableMenus, tab, tanggal } = usePage<any>().props as PageProps;

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
  const [formPemakaian, setFormPemakaian] = useState<number | "">("");
  const [formSatuan, setFormSatuan] = useState("porsi");

  useEffect(() => { setDate(tanggal); }, [tanggal]);

  // --- Handlers ---
  const handleSearch = (e: any) => {
    setSearch(e.target.value);
    router.get(route("stok-harian.bar"), { tab, tanggal: date, search: e.target.value }, { preserveScroll: true });
  };

  const handleDateChange = (e: any) => {
    setDate(e.target.value);
    router.get(route("stok-harian.bar"), { tab, search, tanggal: e.target.value }, { preserveScroll: true });
  };

  const handleTabSwitch = (t: any) => {
    router.get(route("stok-harian.bar"), { tab: t, tanggal: date, search }, { preserveScroll: true });
  };

  const resetForm = () => {
      setFormRecordId(null);
      setFormItemId("");
      setFormItemName("");
      setFormStokAwal("");
      setFormPemakaian("");
      setFormSatuan("porsi");
  }

  // --- Actions ---

  // 1. Simpan Baru (Input Data Mentah)
  const submitCreate = () => {
    const routeName = "stok-harian-mentah.store";

    router.post(route(routeName), {
        item_id: formItemId,
        tanggal: date,
        stok_awal: formStokAwal === "" ? 0 : formStokAwal,
        stok_keluar: formPemakaian === "" ? 0 : formPemakaian,
    }, {
        onSuccess: () => {
            setShowInputModal(false); resetForm();
        }
    });
  };

  // 2. Klik Edit
  const handleEditClick = (item: ItemData) => {
      setFormRecordId(item.id);
      setFormItemId(item.item_id);
      setFormItemName(item.nama);
      setFormStokAwal(item.stok_awal);
      setFormPemakaian(item.pemakaian);
      setFormSatuan(item.satuan || "porsi");
      setShowEditModal(true);
  }

  // 3. Submit Update
  const submitUpdate = () => {
      if(!formRecordId) return;

      const routeName = tab === 'menu'
        ? "stok-harian-menu.update"
        : "stok-harian-mentah.update";

      const payload: any = {
          item_id: formItemId,
          stok_awal: formStokAwal,
      };

      if (tab === 'mentah') {
          payload.stok_keluar = formPemakaian === "" ? 0 : formPemakaian;
      }

      router.put(route(routeName, formRecordId), payload, {
          onSuccess: () => { setShowEditModal(false); resetForm(); }
      });
  }

  // 4. Klik Delete
  const handleDeleteClick = (id: number) => {
      setFormRecordId(id);
      setShowDeleteModal(true);
  }

  // 5. Submit Delete
  const submitDelete = () => {
      if(!formRecordId) return;

      const routeName = tab === 'menu'
        ? "stok-harian-menu.destroy"
        : "stok-harian-mentah.destroy";

      router.delete(route(routeName, formRecordId), {
          onSuccess: () => { setShowDeleteModal(false); resetForm(); }
      });
  }

  return (
    <AppLayout header={`Stok Harian ${tab === 'menu' ? 'Menu' : 'Bahan Mentah'}`}>
      <Head title="Stok Harian Bar" />

      <div className="py-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[600px]">

          {/* HEADER */}
          <div className="flex flex-col items-end gap-4 mb-6">
            <div className="flex gap-3">
              {tab === 'mentah' && (
                  <button onClick={() => setShowInputModal(true)} className="bg-[#C19A6B] hover:bg-[#a8855a] text-white px-6 py-2 rounded-full text-sm font-semibold shadow-sm">
                      Input Data
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

          {/* TABLE */}
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                <tr>
                  <th className="p-4 text-center w-16">No</th>
                  <th className="p-4">Nama</th>
                  <th className="p-4 text-center">Satuan</th>
                  <th className="p-4 text-center">Stok Awal</th>
                  {/* STOK MASUK DIHAPUS DARI HEADER */}
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
                      {/* STOK MASUK DIHAPUS DARI BODY */}
                      <td className="p-4 text-center">{item.stok_total}</td>
                      <td className="p-4 text-center">{item.pemakaian}</td>
                      <td className="p-4 text-center font-bold">{item.tersisa}</td>

                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                            <button
                                onClick={() => handleEditClick(item)}
                                className="bg-[#1D8CFF] text-white px-4 py-1 rounded-full text-xs font-semibold hover:bg-[#166ac4] transition"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDeleteClick(item.id)}
                                className="bg-[#FF4B4B] text-white px-4 py-1 rounded-full text-xs font-semibold hover:bg-[#e03535] transition"
                            >
                                Hapus
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-400">Belum ada data stok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: INPUT DATA */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[400px] rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-center mb-6">Input Stok & Pemakaian</h2>
            <form onSubmit={(e) => { e.preventDefault(); submitCreate(); }} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Tanggal</label>
                    <div className="bg-gray-100 px-4 py-2.5 rounded-xl text-sm border">{new Date(date).toLocaleDateString("id-ID")}</div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Nama Item</label>
                    <div className="relative">
                        <select
                            value={formItemId}
                            onChange={(e) => {
                                const id = Number(e.target.value);
                                setFormItemId(id);
                                const source: any[] = inputableMenus;
                                const selected = source.find(m => m.id === id);
                                if(selected) {
                                    setFormSatuan(selected.satuan || "porsi");
                                    if(selected.stok_awal !== undefined) setFormStokAwal(selected.stok_awal);
                                    if(selected.pemakaian !== undefined) setFormPemakaian(selected.pemakaian);
                                }
                            }}
                            className="w-full appearance-none bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                        >
                            <option value="">Pilih Item...</option>
                            {(inputableMenus as any[]).map((m) => (
                                <option key={m.id} value={m.id}>{m.nama}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-gray-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Satuan</label>
                    <input type="text" value={formSatuan} readOnly className="w-full bg-gray-100 border rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Stok Awal</label>
                    <input type="number" min="0" value={formStokAwal} onChange={(e) => setFormStokAwal(Number(e.target.value))} className="w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Pemakaian</label>
                    <input type="number" min="0" value={formPemakaian} onChange={(e) => setFormPemakaian(Number(e.target.value))} className="w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]" />
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => setShowInputModal(false)} className="px-6 py-2 rounded-full border">Batal</button>
                    <button type="submit" disabled={!formItemId} className="px-6 py-2 rounded-full bg-[#D9A978] text-white font-bold">Simpan</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT DATA */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[400px] rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-center mb-6">Edit Stok {tab === 'menu' ? 'Menu' : 'Bahan'}</h2>
            <form onSubmit={(e) => { e.preventDefault(); submitUpdate(); }} className="space-y-4">

                <div>
                    <label className="block text-sm font-medium mb-1">Tanggal</label>
                    <div className="bg-gray-100 px-4 py-2.5 rounded-xl text-sm border">{new Date(date).toLocaleDateString("id-ID")}</div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Nama Item</label>
                    <input type="text" value={formItemName} readOnly className="w-full bg-gray-100 border rounded-xl px-4 py-2.5 text-sm focus:outline-none text-gray-600" />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Satuan</label>
                    <input type="text" value={formSatuan} readOnly className="w-full bg-gray-100 border rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Stok Awal</label>
                    <input type="number" min="0" value={formStokAwal} onChange={(e) => setFormStokAwal(Number(e.target.value))} className="w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]" />
                </div>

                {tab === 'mentah' && (
                    <div>
                        <label className="block text-sm font-medium mb-1">Pemakaian</label>
                        <input type="number" min="0" value={formPemakaian} onChange={(e) => setFormPemakaian(Number(e.target.value))} className="w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]" />
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-4">
                    <button type="button" onClick={() => { setShowEditModal(false); resetForm(); }} className="px-6 py-2 rounded-full border">Batal</button>
                    <button type="submit" className="px-6 py-2 rounded-full bg-[#1D8CFF] text-white font-bold">Update</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: HAPUS DATA */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[350px] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-500 w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Hapus Data?</h2>
            <p className="text-sm text-gray-500 mb-6">Data yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="px-5 py-2 rounded-full border text-sm font-semibold">Batal</button>
              <button onClick={submitDelete} className="px-5 py-2 rounded-full bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Hapus</button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
