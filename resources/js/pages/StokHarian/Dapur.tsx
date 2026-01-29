import React, { useState, useEffect, useRef } from "react"; // 🔥 Tambah useRef
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router, useForm } from "@inertiajs/react";
import { Search, ChevronDown, Trash2, Plus, AlertTriangle, Edit, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- TYPES ---
interface ItemData {
  id: number;
  item_id?: number;
  recipe_id?: number;
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
  tersisa?: number;
}

interface LowStockItem {
  nama: string;
  tersisa: number;
  kategori: string;
}

// 🔥 PERBAIKAN 1: Tambahkan search ke PageProps
interface PageProps {
  items: {
    data: ItemData[];
    links: any[];
    current_page: number;
    per_page: number;
  };
  inputableMenus: DropdownItem[];
  tab: "menu" | "mentah";
  tanggal: string;
  lowStockItems: LowStockItem[];
  auth: any;
  flash: any;
  availableMenus: any[];
  canInput: boolean;
  search?: string; // 🔥 Added search prop
}

// --- MODAL INPUT (CREATE) ---
interface FormItem {
  id: number;
  target_id: string;
  satuan: string;
  stok_awal: string;
  stok_masuk: string;
  pemakaian: string;
  selectedItemInfo: any;
}

const ModalInputData = ({ show, onClose, inputableMenus, tab, tanggal, onSuccess }: any) => {
  const [items, setItems] = useState<FormItem[]>([
    {
      id: Date.now(),
      target_id: "",
      satuan: "porsi",
      stok_awal: "",
      stok_masuk: "",
      pemakaian: "",
      selectedItemInfo: null,
    }
  ]);

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (show) {
      setItems([
        {
          id: Date.now(),
          target_id: "",
          satuan: "porsi",
          stok_awal: "",
          stok_masuk: "",
          pemakaian: "",
          selectedItemInfo: null,
        }
      ]);
    }
  }, [show, tanggal]);

  const handleItemChange = (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const newItems = [...items];
    newItems[index].target_id = id;

    if (id) {
      const selected = inputableMenus.find((m: DropdownItem) => m.id === Number(id));
      if (selected) {
        newItems[index].selectedItemInfo = selected;
        newItems[index].stok_awal = selected.stok_awal ?? "";
        newItems[index].satuan = selected.satuan || "porsi";
      }
    } else {
      newItems[index].selectedItemInfo = null;
    }
    setItems(newItems);
  };

  const handleFieldChange = (index: number, field: keyof FormItem, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const addNewItem = () => {
    setItems([...items, {
      id: Date.now(),
      target_id: "",
      satuan: "porsi",
      stok_awal: "",
      stok_masuk: "",
      pemakaian: "",
      selectedItemInfo: null,
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    const routeName = tab === "menu" ? "stok-harian-dapur-menu.store" : "stok-harian-dapur-mentah.store";

    try {
      // Submit each item one by one
      for (const item of items) {
        if (!item.target_id) continue;

        const payload = tab === "menu"
          ? {
              recipe_id: item.target_id,
              tanggal: tanggal,
              pemakaian: item.pemakaian,
            }
          : {
              item_id: item.target_id,
              tanggal: tanggal,
              stok_awal: item.stok_awal,
              stok_masuk: item.stok_masuk,
            };

        await new Promise<void>((resolve, reject) => {
          router.post(route(routeName), payload, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => resolve(),
            onError: (errors) => {
              console.error("Error submitting item:", errors);
              reject(errors);
            },
          });
        });
      }

      setProcessing(false);
      onClose();
      if (onSuccess) onSuccess();
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      setProcessing(false);
      console.error("Error during submission:", error);
    }
  };

  const isMenuTab = tab === "menu";
  const isMentahTab = tab === "mentah";
  const isButtonDisabled = processing || items.some(item =>
    !item.target_id ||
    (isMenuTab && (item.pemakaian === "" || item.pemakaian === null)) ||
    (isMentahTab && (item.stok_awal === "" || item.stok_awal === null))
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-[30px] shadow-2xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="font-bold text-lg text-center mb-6">
          Input Data Dapur ({tab === "menu" ? "Menu" : "Bahan Mentah"})
        </h3>
        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Tanggal</label>
            <div className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm font-medium border-none text-gray-600">
              {new Date(tanggal).toLocaleDateString("id-ID")}
            </div>
          </div>

          {/* Multiple Items */}
          {items.map((item, index) => (
            <div key={item.id} className="border-2 border-gray-200 rounded-2xl p-4 space-y-4 relative">
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-gray-700">Item #{index + 1}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Nama Item</label>
                <div className="relative">
                  <select
                    value={item.target_id}
                    onChange={(e) => handleItemChange(index, e)}
                    className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5E3C] text-gray-700"
                    style={{ WebkitAppearance: "none", MozAppearance: "none", appearance: "none" }}
                  >
                    <option value="">Pilih Item...</option>
                    {inputableMenus.map((m: DropdownItem) => (
                      <option key={m.id} value={m.id}>
                        {m.nama}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-4 top-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Satuan</label>
                <input
                  type="text"
                  value={item.selectedItemInfo?.satuan || "porsi"}
                  disabled
                  className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 text-sm text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Stok Awal</label>
                {tab === "menu" ? (
                  <input
                    type="text"
                    value={item.selectedItemInfo?.stok_awal ?? "0"}
                    disabled
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700"
                  />
                ) : (
                  <input
                    type="number"
                    value={item.stok_awal}
                    onChange={(e) => handleFieldChange(index, 'stok_awal', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                  />
                )}
              </div>

              {tab === "mentah" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Stok Masuk</label>
                  <input
                    type="number"
                    value={item.stok_masuk}
                    onChange={(e) => handleFieldChange(index, 'stok_masuk', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                  />
                </div>
              )}

              {tab === "menu" && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Pemakaian</label>
                  <input
                    type="number"
                    value={item.pemakaian}
                    onChange={(e) => handleFieldChange(index, 'pemakaian', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                  />
                </div>
              )}
            </div>
          ))}

          {/* Tombol Tambah Item */}
          <button
            type="button"
            onClick={addNewItem}
            className="w-full py-3 border-2 border-dashed border-[#D9A978] rounded-xl text-[#D9A978] font-bold text-sm hover:bg-[#D9A978]/5 transition flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Tambah Item
          </button>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-full font-bold text-sm text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isButtonDisabled}
              className={`px-6 py-2 rounded-full text-white font-bold text-sm ${
                isButtonDisabled ? "bg-[#E0C09E] cursor-not-allowed" : "bg-[#D9A978] hover:bg-[#C19A6B]"
              }`}
            >
              {processing ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// === MAIN COMPONENT ===
export default function Dapur() {
  // 🔥 PERBAIKAN 2: Tangkap 'search' dari props
  const { items, inputableMenus, tab, tanggal, lowStockItems, auth, canInput, search: initialSearch } = usePage<any>().props as PageProps;
  const role = auth?.user?.role;

  // 🔥 PERBAIKAN 3: Gunakan initialSearch sebagai nilai awal state
  const [search, setSearch] = useState(initialSearch || "");
  const [date, setDate] = useState(tanggal);
  const [showInputModal, setShowInputModal] = useState(false);

  // 🔥 PERBAIKAN: Ref untuk mencegah fetch saat render pertama
  const isFirstRender = useRef(true);

  // Edit States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTimeNotif, setShowTimeNotif] = useState(false);
  const [formRecordId, setFormRecordId] = useState<number | null>(null);
  const [formItemId, setFormItemId] = useState<number | "">("");
  const [formItemName, setFormItemName] = useState("");
  const [formStokAwal, setFormStokAwal] = useState<number | "">("");

  // 🔥 TAMBAHAN: State untuk Sisa Stok di Edit Modal
  const [formStokTersisa, setFormStokTersisa] = useState<number | "">("");

  const [formStokMasuk, setFormStokMasuk] = useState<number | "">("");
  const [formPemakaian, setFormPemakaian] = useState<number | "">("");
  const [formSatuan, setFormSatuan] = useState("porsi");

  useEffect(() => {
    setDate(tanggal);
  }, [tanggal]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("autoInput") === "1") setShowInputModal(true);
  }, []);

  // Sync state search jika ada update dari server (misal pagination)
  useEffect(() => {
    setSearch(initialSearch || "");
  }, [initialSearch]);

  // 🔥 PERBAIKAN UTAMA: DEBOUNCE SEARCH (500ms)
  useEffect(() => {
    // Skip fetch saat pertama kali render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      // Hanya request jika nilai search beda dari yang ada di props (menghindari loop)
      if (search !== initialSearch) {
        router.get(
          route("stok-harian.dapur"),
          { tab, tanggal: date, search },
          {
            preserveScroll: true,
            preserveState: true, // Jaga state agar fokus tidak hilang
            replace: true        // Ganti history, jangan tumpuk
          }
        );
      }
    }, 500); // Tunggu 500ms setelah user berhenti mengetik

    return () => clearTimeout(timeoutId); // Cleanup timeout lama jika user ngetik lagi
  }, [search, tab, date]);


  // 🔥 PERBAIKAN: Handler Search (Hanya update state lokal)
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleDateChange = (e: any) => {
    setDate(e.target.value);
    router.get(
      route("stok-harian.dapur"),
      { tab, search, tanggal: e.target.value },
      { preserveScroll: true }
    );
  };

  const handleTabSwitch = (t: string) => {
    router.get(
      route("stok-harian.dapur"),
      { tab: t, tanggal, search },
      { preserveScroll: true }
    );
  };

  const resetEditForm = () => {
    setFormRecordId(null);
    setFormItemId("");
    setFormItemName("");
    setFormStokAwal("");
    setFormStokTersisa(""); // 🔥 Reset Tersisa
    setFormStokMasuk("");
    setFormPemakaian("");
    setFormSatuan("porsi");
  };

  const handleEditClick = (item: ItemData) => {
    setFormRecordId(item.id);
    setFormItemId(item.recipe_id ?? item.item_id ?? "");
    setFormItemName(item.nama);
    setFormStokAwal(item.stok_awal);
    setFormStokTersisa(item.tersisa); // 🔥 Set Tersisa dari Item
    setFormStokMasuk(item.stok_masuk ?? "");
    setFormPemakaian(item.pemakaian);
    setFormSatuan(item.satuan || "porsi");
    setShowEditModal(true);
  };

  const submitUpdate = () => {
    if (!formRecordId) return;

    // 🔥 Validasi: Cek apakah jam sudah lewat 21:00 (hanya untuk staff, bukan owner/supervisor)
    if (role !== "owner" && role !== "supervisor") {
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      const currentTime = currentHour * 60 + currentMinute; // convert to minutes
      const cutoffTime = 21 * 60; // 21:00 = 1260 menit

      if (currentTime >= cutoffTime) {
        // Tampilkan notif
        setShowTimeNotif(true);
        // Auto hide notif setelah 4 detik
        setTimeout(() => setShowTimeNotif(false), 4000);
        // Jangan lanjutkan submit
        return;
      }
    }

    const routeName =
      tab === "menu" ? "stok-harian-dapur-menu.update" : "stok-harian-dapur-mentah.update";
    const payload: any = { stok_awal: Number(formStokAwal) };

    if (tab === "mentah") payload.stok_masuk = Number(formStokMasuk);
    if (tab === "menu") payload.stok_keluar = Number(formPemakaian);

    router.put(route(routeName, formRecordId), payload, {
      onSuccess: () => {
        setShowEditModal(false);
        resetEditForm();
      },
      onError: (err: any) => console.error("Error updating:", err),
    });
  };

  const handleDeleteClick = (id: number) => {
    setFormRecordId(id);
    setShowDeleteModal(true);
  };

  const submitDelete = () => {
    if (!formRecordId) return;
    const routeName =
      tab === "menu" ? "stok-harian-dapur-menu.destroy" : "stok-harian-dapur-mentah.destroy";
    router.delete(route(routeName, formRecordId), {
      onSuccess: () => {
        setShowDeleteModal(false);
        resetEditForm();
      },
    });
  };

  // 🔥 LOGIKA TOMBOL INPUT: Supervisor HANYA bisa input di Mentah
  const showInputButton = tab === "mentah" || (tab === "menu" && role !== "supervisor");

  return (
    <AppLayout header={`Stok Harian Dapur`}>
      <Head title="Stok Harian Dapur" />
      <AnimatePresence>
        {showInputModal && (
          <ModalInputData
            show={showInputModal}
            onClose={() => setShowInputModal(false)}
            inputableMenus={inputableMenus}
            tab={tab}
            tanggal={tanggal}
            onSuccess={() =>
              router.visit(route("stok-harian.dapur"), {
                data: { tab, tanggal },
                preserveScroll: true,
              })
            }
          />
        )}
      </AnimatePresence>

      {/* 🔥 NOTIFIKASI: SIMPAN LEWAT JAM 21:00 */}
      {showTimeNotif && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[999] bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-lg max-w-md w-full md:w-auto md:max-w-sm"
        >
          <div className="p-2 bg-red-100 rounded-full text-red-600 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-red-800 font-bold text-sm">Waktu Simpan Sudah Tutup</h3>
            <p className="text-red-700 text-xs mt-1">
              Jam input sudah lewat jam 21:00. Simpanan tidak akan tersimpan.
            </p>
          </div>
        </motion.div>
      )}

      <div className="py-6 space-y-6">
        {lowStockItems && lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm animate-in fade-in">
            <div className="p-2 bg-red-100 rounded-full text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-red-800 font-bold">Peringatan: Stok Menipis!</h3>
              <p className="text-red-600 text-sm mt-1">
                Terdapat {lowStockItems.length} item dengan stok di bawah 7.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[500px]">
          {/* Notifikasi Waktu Input Tertutup */}
          {!canInput && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-yellow-800 font-bold text-sm">Waktu Input Ditutup</h3>
                <p className="text-yellow-700 text-xs mt-1">
                  Waktu input harian telah ditutup (setelah jam 21:00). Silakan ajukan izin revisi untuk melakukan input.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex gap-3 w-full md:w-auto">
              {/* 🔥 TOMBOL INPUT SESUAI ROLE */}
              {showInputButton && (
                <button
                  onClick={() => setShowInputModal(true)}
                  disabled={!canInput}
                  className={`flex-1 md:flex-none justify-center px-6 py-2 rounded-full text-sm font-bold flex gap-2 items-center transition ${
                    canInput
                      ? 'bg-[#C19A6B] text-white hover:bg-[#a8855a]'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4" /> Input Data
                </button>
              )}
            </div>
            <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
              <input
                type="date"
                value={date}
                onChange={handleDateChange}
                className="w-full md:w-auto bg-[#FDF3E4] border-none rounded-full px-4 py-2 text-sm text-[#8B5E3C] font-medium"
              />
              <div className="relative w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={handleSearch}
                  autoFocus // 🔥 Keep Focus
                  className="w-full md:w-64 bg-[#FDF3E4] border-none rounded-full pl-4 pr-10 py-2 text-sm"
                />
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400" />
              </div>
            </div>
            <div className="flex w-full md:w-auto bg-[#FDF3E4] rounded-full p-1">
              <button
                onClick={() => handleTabSwitch("menu")}
                className={`flex-1 md:flex-none px-6 py-1 rounded-full text-sm font-medium transition ${
                  tab === "menu" ? "bg-[#D9A978] text-white" : "text-gray-500"
                }`}
              >
                Menu
              </button>
              <button
                onClick={() => handleTabSwitch("mentah")}
                className={`flex-1 md:flex-none px-6 py-1 rounded-full text-sm font-medium transition ${
                  tab === "mentah" ? "bg-[#D9A978] text-white" : "text-gray-500"
                }`}
              >
                Mentah
              </button>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                <tr>
                  <th className="p-4 text-center">No</th>
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
                  items.data.map((item: ItemData, i: number) => (
                    <tr key={item.id} className="hover:bg-[#FFF9F0]">
                      <td className="p-4 text-center text-gray-500">
                        {/* Logic penomoran agar berlanjut di halaman berikutnya */}
                        {(items.current_page ? (items.current_page - 1) * items.per_page : 0) + i + 1}
                      </td>
                      <td className="p-4 font-bold text-gray-800">{item.nama}</td>
                      <td className="p-4 text-center text-gray-500">{item.satuan}</td>
                      <td className="p-4 text-center">{item.stok_awal}</td>
                      {tab === "mentah" && (
                        <td className="p-4 text-center">{item.stok_masuk ?? 0}</td>
                      )}
                      <td className="p-4 text-center">{item.stok_total}</td>
                      <td className="p-4 text-center">{item.pemakaian}</td>
                      <td
                        className={`p-4 text-center font-bold ${
                          item.tersisa < 7 ? "text-red-600" : "text-gray-900"
                        }`}
                      >
                        {item.tersisa}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="bg-[#1D8CFF] text-white px-4 py-1 rounded-full text-xs font-semibold hover:bg-[#166ac4]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item.id)}
                            className="bg-[#FF4B4B] text-white px-4 py-1 rounded-full text-xs font-semibold hover:bg-[#e03535]"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-400">
                      Belum ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden">
            {items.data.length > 0 ? (
              items.data.map((item: ItemData) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">{item.nama}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        item.tersisa < 7
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      Sisa: {item.tersisa}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2">
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500">Awal:</span>
                      <span className="font-semibold ml-1">{item.stok_awal}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500">Total:</span>
                      <span className="font-semibold ml-1 text-blue-600">{item.stok_total}</span>
                    </div>
                    {tab === "mentah" && (
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="text-gray-500">Masuk:</span>
                        <span className="font-semibold ml-1">{item.stok_masuk ?? 0}</span>
                      </div>
                    )}
                    <div className="bg-gray-50 p-2 rounded">
                      <span className="text-gray-500">Pakai:</span>
                      <span className="font-semibold ml-1">{item.pemakaian}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="flex-1 bg-blue-500 text-white py-1 rounded text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(item.id)}
                      className="flex-1 bg-red-500 text-white py-1 rounded text-xs"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 text-sm">Belum ada data.</p>
            )}
          </div>

          {/* --- PAGINATION (ADDED HERE) --- */}
          {items.links && items.links.length > 3 && (
            <div className="mt-6 flex justify-center pb-4">
              <div className="flex flex-wrap justify-center gap-1 bg-gray-50 p-1 rounded-full border border-gray-200">
                {items.links.map((link: any, i: number) => {
                  let label = link.label;
                  if (label.includes('&laquo;')) label = 'Prev';
                  if (label.includes('&raquo;')) label = 'Next';

                  return (
                    <button
                      key={i}
                      disabled={!link.url}
                      onClick={() =>
                        link.url &&
                        router.get(link.url, {}, { preserveScroll: true })
                      }
                      className={`px-3 sm:px-4 py-2 rounded-full text-xs font-medium transition-all ${
                        link.active
                          ? "bg-[#D9A978] text-white shadow-md"
                          : "text-gray-600 hover:bg-white hover:text-[#D9A978]"
                      } ${!link.url ? "opacity-50 cursor-not-allowed" : ""}`}
                      dangerouslySetInnerHTML={{ __html: label }}
                    />
                  );
                })}
              </div>
            </div>
          )}

        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-6 bg-red-500 rounded-full inline-block"></span>Grafik Stok Hampir
            Habis ({"<"} 7)
          </h3>
          {lowStockItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockItems.map((item: LowStockItem, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-col gap-1 p-3 border border-gray-100 rounded-xl hover:shadow-sm"
                >
                  <div className="flex justify-between text-xs font-semibold text-gray-600 mb-2">
                    <span>
                      {item.nama}{" "}
                      <span className="text-gray-400 font-normal">({item.kategori})</span>
                    </span>
                    <span className="text-red-500">{item.tersisa} Tersisa</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-400 h-full rounded-full"
                      style={{
                        width: `${Math.min((item.tersisa / 7) * 100, 100)}%`,
                      }}
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

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm md:max-w-md rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold text-center mb-6">
              Edit Stok {tab === "menu" ? "Menu" : "Bahan"}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitUpdate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Nama Item</label>
                <input
                  type="text"
                  value={formItemName}
                  readOnly
                  className="w-full bg-gray-100 border rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stok Awal</label>
                <input
                  type="number"
                  value={formStokAwal}
                  onChange={(e) => setFormStokAwal(Number(e.target.value))}
                  disabled={tab === "menu"}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none ${
                    tab === "menu" ? "bg-gray-100 text-gray-500" : "bg-white"
                  }`}
                />
              </div>

              {/* 🔥 NEW FIELD: Sisa Stok Saat Ini (Hanya Tampil di Tab Mentah) */}
              {tab === "mentah" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Sisa Stok Saat Ini</label>
                  <input
                    type="text"
                    value={formStokTersisa}
                    disabled
                    className="w-full bg-gray-200 border border-gray-300 text-gray-600 rounded-xl px-4 py-2.5 text-sm font-bold"
                  />
                </div>
              )}

              {tab === "mentah" ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Stok Masuk</label>
                  <input
                    type="number"
                    value={formStokMasuk}
                    // 🔥 PERBAIKAN 2: Mengubah string kosong menjadi "" atau parse ke number
                    onChange={(e) => setFormStokMasuk(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Pemakaian</label>
                  <input
                    type="number"
                    value={formPemakaian}
                    onChange={(e) => setFormPemakaian(Number(e.target.value))}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl text-center max-w-sm w-full">
            <h2 className="text-lg font-bold mb-2">Hapus Data?</h2>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={submitDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
