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
}

export default function Bar() {
    const page = usePage<any>();
    const { items, inputableMenus, tab, tanggal, lowStockItems,} = page.props;
    const url = page.url;


  const { auth } = usePage<any>().props;
  const role = auth?.user?.role;


  const [search, setSearch] = useState("");
  const [date, setDate] = useState(tanggal);

  // Modal States
  const [showInputModal, setShowInputModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
const [menuId, setMenuId] = useState<number | null>(null);
const [pemakaian, setPemakaian] = useState("");


  // Form State (Type: number or empty string)
  const [formRecordId, setFormRecordId] = useState<number | null>(null);
  const [formItemId, setFormItemId] = useState<number | "">("");
  const [formItemName, setFormItemName] = useState("");
  const [formStokAwal, setFormStokAwal] = useState<number | "">("");
  const [formStokMasuk, setFormStokMasuk] = useState<number | "">("");
  const [formPemakaian, setFormPemakaian] = useState<number | "">("");
  const [formSatuan, setFormSatuan] = useState("porsi");

  useEffect(() => {
    setDate(tanggal);
  }, [tanggal]);

  useEffect(() => {
    const params = new URLSearchParams(url.split("?")[1]);

    if (params.get("autoInput") === "1") {
      setShowInputModal(true);
    }
  }, []);


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
    setFormStokMasuk("");
    setFormPemakaian("");
    setFormSatuan("porsi");
  };

  // --- Actions ---

  const submitCreate = async () => {
    try {
      if (formItemId === "") return;

      // helper to resolve route URL (Ziggy) or fallback
      const getUrl = (name: string, fallback: string) => {
        if (typeof route === 'function') {
          try {
            return route(name);
          } catch (e) {
            console.warn('[StokHarian] route() failed, using fallback', e);
          }
        }
        return fallback;
      };

      // helper to POST using Inertia if available, else fetch fallback
      const doPost = async (url: string, payload: any) => {
        console.log('[StokHarian] Request ->', url, payload);

        if (typeof router !== 'undefined' && typeof router.post === 'function') {
          router.post(url, payload, {
            onSuccess: () => {
              setShowInputModal(false);
              resetForm();
              // Refresh stok-harian view so "tersisa" values reflect the new data
              router.visit(route('stok-harian.bar'), { data: { tab, tanggal: date } });
            },
            onError: (err: any) => {
              console.error('[StokHarian] POST error (router):', err);
              alert('Gagal menyimpan: cek console untuk detail.');
            },
          });
          return;
        }

        // Fetch fallback
        console.warn('[StokHarian] router.post not available, using fetch fallback');
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': token,
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          credentials: 'same-origin',
        });

        if (res.ok) {
          setShowInputModal(false);
          resetForm();
          // fetch fallback: refresh stok-harian page explicitly
          router.visit(route('stok-harian.bar'), { data: { tab, tanggal: date } });
        } else {
          const text = await res.text();
          console.error('[StokHarian] POST error (fetch):', res.status, text);
          alert('Gagal menyimpan: server error');
        }
      };

      if (tab === 'menu') {
        const payload = {
          item_id: Number(formItemId),
          tanggal: date,
          pemakaian: Number(formPemakaian),
        };

        const url = getUrl('stok-harian-menu.store', '/stok-harian/menu');
        await doPost(url, payload);
        return;
      }

      const payloadMentah = {
        item_id: Number(formItemId),
        tanggal: date,
        stok_awal: Number(formStokAwal),
        stok_masuk: Number(formStokMasuk),
        };

        const urlMentah = getUrl('stok-harian-mentah.store', '/stok-harian/mentah');
        await doPost(urlMentah, payloadMentah);
      } catch (err) {
        console.error('[StokHarian] submitCreate crashed:', err);
        alert('Terjadi error pada client, lihat console.');
      }
  };


  const handleEditClick = (item: ItemData) => {
    setFormRecordId(item.id);
    setFormItemId(item.item_id);
    setFormItemName(item.nama);
    // Fix: Assign number langsung ke state
    setFormStokAwal(item.stok_awal);
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

    // Fix: Syntax router.put yang benar
    router.put(route(routeName, formRecordId), payload, {
      onSuccess: () => {
        setShowEditModal(false);
        resetForm();
        // Reload stok-harian page so the pooled "tersisa" values are recalculated on the server
        router.visit(route('stok-harian.bar'), { data: { tab, tanggal: date } });
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
        // After delete, reload the stok-harian page to reflect recalculated tersisa
        router.visit(route('stok-harian.bar'), { data: { tab, tanggal: date } });
      },
    });
  };

  // --- Render ---
  return (
    <AppLayout
      header={`Stok Harian ${tab === "menu" ? "Menu" : "Bahan Mentah"}`}
    >
      <Head title="Stok Harian Bar" />

      <div className="py-6 space-y-6">

        {/* SECTION 1: ALERT STOK MENIPIS */}
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

        {/* SECTION 2: TABEL UTAMA */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[500px]">

          <div className="flex flex-col items-end gap-4 mb-6">
          <div className="flex gap-3">
  {/* INPUT MENTAH → SEMUA ROLE */}
  {tab === "mentah" && (
    <button
      onClick={() => setShowInputModal(true)}
      className="bg-[#C19A6B] hover:bg-[#a8855a] text-white px-6 py-2 rounded-full text-sm font-bold shadow-sm flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      Input Data
    </button>
  )}

  {/* INPUT MENU → KHUSUS STAFF (BAR / DAPUR) */}
  {tab === "menu" && (role === "bar" || role === "dapur") && (
    <button
      onClick={() => setShowInputModal(true)}
      className="bg-[#C19A6B] hover:bg-[#a8855a] text-white px-6 py-2 rounded-full text-sm font-bold shadow-sm flex items-center gap-2"
    >
      <Plus className="w-4 h-4" />
      Input Data
    </button>
  )}
</div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={date}
                onChange={handleDateChange}
                className="bg-[#FDF3E4] border-none rounded-full px-4 py-2 text-sm w-40"
              />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={handleSearch}
                  className="bg-[#FDF3E4] border-none rounded-full pl-4 pr-10 py-2 text-sm w-64"
                />
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
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-400 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${Math.min((item.tersisa / 7) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              Semua stok aman! Tidak ada item yang hampir habis.
            </div>
          )}
        </div>
      </div>

      {showInputModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white w-[400px] rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">

      {/* JUDUL */}
      <h2 className="text-lg font-bold text-center mb-6">
        Input Data {tab === "menu" ? "Pemakaian Menu" : "Stok Bahan Mentah"}
      </h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitCreate();
        }}
        className="space-y-4"
      >
        {/* TANGGAL */}
        <div>
          <label className="block text-sm font-medium mb-1">Tanggal</label>
          <div className="bg-gray-100 px-4 py-2.5 rounded-xl text-sm border">
            {new Date(date).toLocaleDateString("id-ID")}
          </div>
        </div>

        {/* NAMA ITEM */}
        <div>
          <label className="block text-sm font-medium mb-1">Nama Item</label>
          <div className="relative">
            <select
              value={formItemId}
              onChange={(e) => {
                const id = e.target.value;
                setFormItemId(id === "" ? "" : Number(id));

                const selected = inputableMenus.find(
                  (m) => m.id === Number(id)
                );

                if (selected) {
                  setFormSatuan(selected.satuan || "porsi");
                  setFormStokAwal(selected.stok_awal ?? 0);
                  setFormStokMasuk("");
                  setFormPemakaian("");
                }
              }}
              className="w-full appearance-none bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
            >
              <option value="">Pilih Item...</option>
              {inputableMenus.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* SATUAN */}
        <div>
          <label className="block text-sm font-medium mb-1">Satuan</label>
          <input
            type="text"
            value={formSatuan}
            readOnly
            className="w-full bg-gray-100 border rounded-xl px-4 py-2.5 text-sm"
          />
        </div>

        {/* ===== MENTAH ===== */}
        {tab === "mentah" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">
                Stok Awal
              </label>
              <input
                type="number"
                min="0"
                value={formStokAwal}
                onChange={(e) =>
                  setFormStokAwal(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="w-full border rounded-xl px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Stok Masuk
              </label>
              <input
                type="number"
                min="0"
                value={formStokMasuk}
                onChange={(e) =>
                  setFormStokMasuk(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="w-full border rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
          </>
        )}

        {/* ===== MENU ===== */}
        {tab === "menu" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Pemakaian
            </label>
            <input
              type="number"
              min="0"
              value={formPemakaian}
              onChange={(e) =>
                setFormPemakaian(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
              required
            />
          </div>
        )}

        {/* ACTION */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              setShowInputModal(false);
              resetForm();
            }}
            className="px-6 py-2 rounded-full border"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => submitCreate()}
            disabled={formItemId === ""}
            className="px-6 py-2 rounded-full bg-[#D9A978] text-white font-bold disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  </div>
)}


      {/* MODAL 3: EDIT DATA */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-[400px] rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-center mb-6">
              Edit Stok {tab === "menu" ? "Menu" : "Bahan"}
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); submitUpdate(); }} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Tanggal</label><div className="bg-gray-100 px-4 py-2.5 rounded-xl text-sm border">{new Date(date).toLocaleDateString("id-ID")}</div></div>
              <div><label className="block text-sm font-medium mb-1">Nama Item</label><input type="text" value={formItemName} readOnly className="w-full bg-gray-100 border rounded-xl px-4 py-2.5 text-sm focus:outline-none text-gray-600" /></div>
              <div><label className="block text-sm font-medium mb-1">Satuan</label><input type="text" value={formSatuan} readOnly className="w-full bg-gray-100 border rounded-xl px-4 py-2.5 text-sm focus:outline-none" /></div>

              <div>
                <label className="block text-sm font-medium mb-1">Stok Awal</label>
                <input
                  type="number"
                  min="0"
                  value={formStokAwal}
                  onChange={(e) => setFormStokAwal(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                />
              </div>

              {/* Stok Masuk hanya untuk Mentah */}


              {/* Pemakaian hanya untuk Menu */}
              {tab === "menu" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Pemakaian (Terjual)</label>
                  <input
                    type="number"
                    min="0"
                    value={formPemakaian}
                    onChange={(e) => setFormPemakaian(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-white border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                  />
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
