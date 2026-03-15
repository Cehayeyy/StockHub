import React, { useState, useEffect, useRef } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
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
  is_submitted?: number;
}

interface DropdownItem {
  id: number;
  item_id?: number;
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
  isPastCutoff: boolean;
  search?: string;
}

// --- 🔥 KOMPONEN DROPDOWN PENCARIAN (BARU) 🔥 ---
const SearchableSelect = ({ options, value, onChange, placeholder = "Pilih Item..." }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt: any) =>
    opt.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((opt: any) => opt.id.toString() === value?.toString());

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div
        onClick={() => { setIsOpen(!isOpen); setSearchTerm(""); }}
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D9A978] text-gray-700 cursor-pointer flex justify-between items-center"
      >
        <span className={selectedOption ? "text-gray-800" : "text-gray-400"}>
          {selectedOption ? selectedOption.nama : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[60] w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Cari nama item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
              />
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt: any) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-[#FDF3E4] hover:text-[#8B5E3C] rounded-lg transition font-medium"
                >
                  {opt.nama}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                Item tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
// --- 🔥 SELESAI KOMPONEN DROPDOWN 🔥 ---

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // =======================================================
  // 🔥 KODE TAMBAHAN: POP-UP PERINGATAN (SATPAM) 🔥
  // =======================================================
  useEffect(() => {
    // Jika ada pesan error (dari Controller/Satpam) dan modal sedang terbuka
    if (errorMessage && show) {
      // Tampilkan sebagai Pop-Up Alert di tengah layar
      alert("⚠️ PERINGATAN SISTEM DAPUR:\n\n" + errorMessage);
    }
  }, [errorMessage, show]);
  // =======================================================

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
      setErrorMessage(null);
    }
  }, [show, tanggal]);

  // 🔥 UPDATE FUNGSI HANDLE CHANGE UNTUK DROPDOWN BARU 🔥
  const handleItemChange = (index: number, val: string | number) => {
    const id = val ? val.toString() : "";
    const newItems = [...items];
    newItems[index].target_id = id;

    if (id) {
      // Perbaikan: Mencari di 'id' atau 'recipe_id' agar sinkron dengan Controller Dapur
      const selected = inputableMenus.find((m: any) =>
        Number(m.id) === Number(id) || Number(m.recipe_id) === Number(id)
      );

      if (selected) {
        newItems[index].selectedItemInfo = selected;
        // Memastikan stok_awal terbaca sebagai string, jika tidak ada set ke "0"
        newItems[index].stok_awal = selected.stok_awal !== undefined ? selected.stok_awal.toString() : "0";
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
    setErrorMessage(null);

    const itemsToSubmit = items
      .filter(item => {
        if (!item.target_id) return false;
        if (tab === "menu") {
          return item.pemakaian !== "" && Number(item.pemakaian) > 0;
        } else {
          return item.stok_awal !== "" && Number(item.stok_awal) >= 0;
        }
      })
      .map(item => {
        // 🔥 MAPPING AMAN KHUSUS DAPUR 🔥
        if (tab === "menu") {
          return {
            // PENTING: Gunakan 'item_id' sebagai key pengiriman karena Controller storeMenu
            // mencari $row['item_id'], meskipun di database disave sebagai recipe_id.
            item_id: item.target_id.toString(),
            pemakaian: item.pemakaian.toString(),
          };
        } else {
          return {
            item_id: item.target_id.toString(),
            stok_awal: item.stok_awal.toString(),
            // Pastikan stok_masuk bernilai string angka yang valid, default "0"
            stok_masuk: (item as any).stok_masuk ? (item as any).stok_masuk.toString() : "0",
          };
        }
      });

    if (itemsToSubmit.length === 0) {
      setErrorMessage(tab === "menu" ? "Isi pemakaian menu!" : "Isi stok awal bahan!");
      return;
    }

    setProcessing(true);
    // PASTIKAN INI DAPUR
    const routeName = tab === "menu" ? "stok-harian-dapur-menu.store" : "stok-harian-dapur-mentah.store";

    router.post(route(routeName), {
      tanggal: tanggal,
      items: itemsToSubmit
    }, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        setProcessing(false);
        onClose();
        if (onSuccess) onSuccess();
      },
      onError: (errors) => {
        setProcessing(false);
        const firstError = Object.values(errors)[0];
        setErrorMessage(firstError as string || "Gagal menyimpan.");
      },
      onFinish: () => setProcessing(false)
    });
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

        {/* Error Popup */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-300 rounded-2xl p-4 flex items-start gap-3 mb-4"
            >
              <div className="flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-700">Peringatan</p>
                <p className="text-sm text-red-600 mt-1">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="flex-shrink-0 text-red-400 hover:text-red-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Tanggal</label>
            <div className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm font-medium border-none text-gray-600">
              {new Date(tanggal).toLocaleDateString("id-ID")}
            </div>
          </div>

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
                {/* 🔥 PENERAPAN SEARCHABLE SELECT 🔥 */}
                <SearchableSelect
                  options={inputableMenus}
                  value={item.target_id}
                  onChange={(val: any) => handleItemChange(index, val)}
                  placeholder="Ketik atau pilih item..."
                />
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
  const { items, inputableMenus, tab, tanggal, lowStockItems, auth, canInput, isPastCutoff, search: initialSearch } = usePage<any>().props as PageProps;
  const role = auth?.user?.role;

  const [search, setSearch] = useState(initialSearch || "");
  const [date, setDate] = useState(tanggal);
  const [showInputModal, setShowInputModal] = useState(false);
  const isFirstRender = useRef(true);

  // Edit States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTimeNotif, setShowTimeNotif] = useState(false);
  const [formRecordId, setFormRecordId] = useState<number | null>(null);
  const [formItemId, setFormItemId] = useState<number | "">("");
  const [formItemName, setFormItemName] = useState("");
  const [formStokAwal, setFormStokAwal] = useState<number | "">("");
  const [formStokTersisa, setFormStokTersisa] = useState<number | "">("");
  const [formStokMasuk, setFormStokMasuk] = useState<number | "">("");
  const [formPemakaian, setFormPemakaian] = useState<number | "">("");
  const [formSatuan, setFormSatuan] = useState("porsi");

  // 🔥 LOGIKA PENGUNCIAN BERTINGKAT 🔥
  const isAlreadySubmitted = items.data.some((item: ItemData) => item.is_submitted === 1);
  const isStaff = role !== 'owner' && role !== 'supervisor';

  // 1. Kunci MENU: Terkunci jika (Staff DAN Dashboard Centang Hijau) ATAU (Staff DAN Jam > 21:00)
  // bypass jika canInput = true (Izin Revisi disetujui).
  const isMenuLocked = isStaff && !canInput && (isAlreadySubmitted || isPastCutoff);

  // 2. Kunci MENTAH: HANYA terkunci jika (Staff DAN Jam > 21:00)
  // Mentah TETAP TERBUKA meskipun sudah centang hijau sampai jam 9 malam.
  const isMentahLocked = isStaff && !canInput && isPastCutoff;

  // Variabel penentu akhir sesuai tab yang aktif di layar
  const isLocked = tab === "menu" ? isMenuLocked : isMentahLocked;

  useEffect(() => {
    setDate(tanggal);
  }, [tanggal]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("autoInput") === "1" && !isLocked) setShowInputModal(true);
  }, [isLocked, tab]);

  useEffect(() => {
    setSearch(initialSearch || "");
  }, [initialSearch]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      if (search !== initialSearch) {
        router.get(
          route("stok-harian.dapur"),
          { tab, tanggal: date, search },
          { preserveScroll: true, preserveState: true, replace: true }
        );
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search, tab, date]);

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
    setFormStokTersisa("");
    setFormStokMasuk("");
    setFormPemakaian("");
    setFormSatuan("porsi");
  };

  const handleEditClick = (item: ItemData) => {
    if (isLocked) return;
    setFormRecordId(item.id);
    setFormItemId(item.recipe_id ?? item.item_id ?? "");
    setFormItemName(item.nama);
    setFormStokAwal(item.stok_awal);
    setFormStokTersisa(item.tersisa);
    setFormStokMasuk(item.stok_masuk ?? "");
    setFormPemakaian(item.pemakaian);
    setFormSatuan(item.satuan || "porsi");
    setShowEditModal(true);
  };

  const submitUpdate = () => {
    if (!formRecordId) return;

    if (isLocked) {
      setShowTimeNotif(true);
      setTimeout(() => setShowTimeNotif(false), 4000);
      return;
    }

    const routeName = tab === "menu" ? "stok-harian-dapur-menu.update" : "stok-harian-dapur-mentah.update";
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
    if (isLocked) return;
    setFormRecordId(id);
    setShowDeleteModal(true);
  };

  const submitDelete = () => {
    if (!formRecordId) return;
    const routeName = tab === "menu" ? "stok-harian-dapur-menu.destroy" : "stok-harian-dapur-mentah.destroy";
    router.delete(route(routeName, formRecordId), {
      onSuccess: () => {
        setShowDeleteModal(false);
        resetEditForm();
      },
    });
  };

  // --- 🔥 TAMBAHAN LOGIKA ENTER (HAPUS) & ESC (BATAL) 🔥 ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Jika Modal Hapus terbuka
      if (showDeleteModal) {
        if (e.key === "Enter") {
          e.preventDefault();
          submitDelete(); // Eksekusi Hapus
        } else if (e.key === "Escape") {
          e.preventDefault();
          setShowDeleteModal(false); // Batal
        }
      }
      // 2. Jika Modal Edit terbuka
      else if (showEditModal && e.key === "Escape") {
        e.preventDefault();
        setShowEditModal(false);
      }
      // 3. Jika Modal Input Data terbuka
      else if (showInputModal && e.key === "Escape") {
        e.preventDefault();
        setShowInputModal(false);
      }
    };

    // Pasang pendengar hanya saat salah satu modal aktif
    if (showDeleteModal || showEditModal || showInputModal) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showDeleteModal, showEditModal, showInputModal, formRecordId]);
  // --- 🔥 SELESAI TAMBAHAN 🔥 ---

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
            <h3 className="text-red-800 font-bold text-sm">Aksi Terkunci</h3>
            <p className="text-red-700 text-xs mt-1">
              Waktu input sudah lewat jam 21:00 atau data menu sudah disimpan.
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
          {isLocked && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-yellow-800 font-bold text-sm">Aksi Terkunci</h3>
                <p className="text-yellow-700 text-xs mt-1">
                  {tab === "menu" && isAlreadySubmitted && !isPastCutoff
                    ? "Tab Menu terkunci karena data sudah berhasil disimpan (Dashboard Centang Hijau). Anda masih bisa input di tab Mentah sampai jam 21:00."
                    : "Waktu input harian (Menu & Mentah) telah ditutup setelah jam 21:00. Silakan ajukan izin revisi untuk melakukan perubahan."
                  }
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex gap-3 w-full md:w-auto">
              {showInputButton && (
                <button
                  onClick={() => setShowInputModal(true)}
                  disabled={isLocked}
                  className={`flex-1 md:flex-none justify-center px-6 py-2 rounded-full text-sm font-bold flex gap-2 items-center transition ${
                    isLocked
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                      : 'bg-[#C19A6B] text-white hover:bg-[#a8855a]'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  {isAlreadySubmitted && isStaff && tab === "menu" && !canInput ? "Sudah Tersimpan" : "Input Data"}
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
                  autoFocus
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
                        {(items.current_page ? (items.current_page - 1) * 10 : 0) + i + 1}
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
                            disabled={isLocked}
                            className={`px-4 py-1 rounded-full text-xs font-semibold transition ${
                              isLocked
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-[#1D8CFF] text-white hover:bg-[#166ac4]"
                            }`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item.id)}
                            disabled={isLocked}
                            className={`px-4 py-1 rounded-full text-xs font-semibold transition ${
                              isLocked
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                : "bg-[#FF4B4B] text-white hover:bg-[#e03535]"
                            }`}
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
                      disabled={isLocked}
                      className={`flex-1 py-1 rounded text-xs ${
                        isLocked ? "bg-gray-200 text-gray-400" : "bg-blue-500 text-white"
                      }`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(item.id)}
                      disabled={isLocked}
                      className={`flex-1 py-1 rounded text-xs ${
                        isLocked ? "bg-gray-200 text-gray-400" : "bg-red-500 text-white"
                      }`}
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
                  disabled={tab === "menu"} // Kunci hanya jika di tab menu
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                    tab === "menu" ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white focus:ring-2 focus:ring-[#D9A978]"
                  }`}
                />
              </div>

              {tab === "mentah" && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sisa Stok Saat Ini</label>
                    <input
                      type="text"
                      value={formStokTersisa}
                      disabled
                      className="w-full bg-gray-200 border border-gray-300 text-gray-600 rounded-xl px-4 py-2.5 text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Stok Masuk</label>
                    <input
                      type="number"
                      value={formStokMasuk}
                      onChange={(e) => setFormStokMasuk(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                    />
                  </div>
                </>
              )}

              {tab === "menu" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Pemakaian</label>
                  <input
                    type="number"
                    value={formPemakaian}
                    onChange={(e) => setFormPemakaian(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            <p className="text-gray-500 text-sm mb-4">Aksi ini tidak dapat dibatalkan.</p>
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={submitDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
