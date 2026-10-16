import React, { useState, useEffect, useRef } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router, Link } from "@inertiajs/react";
import { Search, ChevronDown, Trash2, Plus, AlertTriangle, Edit, X, Package, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- TYPES ---
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
  is_submitted?: number;
  connected_menus?: string[];
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
  stok_keluar?: number;
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
    total: number;
    from: number | null;
    to: number | null;
  };
  inputableMenus: DropdownItem[];
  tab: "menu" | "mentah";
  tanggal: string;
  lowStockItems: LowStockItem[];
  auth: any;
  flash: any;
  availableMenus: any[];
  canInput: boolean;
  canInputMentah: boolean;
  search?: string;
}

// --- KOMPONEN DROPDOWN PENCARIAN ---
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
        className="w-full bg-gray-50 dark:bg-[#1E1915] border border-gray-200 dark:border-[#45372C] rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#8B5E3C] text-gray-700 dark:text-[#FAF5ED] cursor-pointer flex justify-between items-center"
      >
        <span className={selectedOption ? "text-gray-800 dark:text-[#FAF5ED] font-bold" : "text-gray-400 dark:text-[#8E8072]"}>
          {selectedOption ? selectedOption.nama : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[60] w-full mt-2 bg-white dark:bg-[#2A221C] border border-gray-100 dark:border-[#45372C] rounded-2xl shadow-2xl max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-[#3D3127] bg-gray-50 dark:bg-[#1E1915]">
            <div className="relative">
              <input
                type="text"
                autoFocus
                placeholder="Cari nama item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-[#231C17] border border-gray-200 dark:border-[#45372C] rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5E3C] text-gray-800 dark:text-[#FAF5ED]"
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400 dark:text-[#8E8072]" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1.5 space-y-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt: any) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-sm text-gray-700 dark:text-[#C8BCAE] hover:bg-[#FDF3E4] dark:hover:bg-[#3E3024] hover:text-[#8B5E3C] dark:hover:text-amber-300 rounded-xl transition font-medium"
                >
                  {opt.nama}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-gray-400 dark:text-[#8E8072] text-center italic">
                Item tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MODAL INPUT STOK MASUK (BORONGAN) ---
interface StokMasukItem {
  id: number;
  item_id: number;
  nama: string;
  stok_masuk: string | number;
}

const ModalInputStokMasukBorongan = ({ show, onClose, inputableMenus, tanggal, onSuccess }: any) => {
  const [items, setItems] = useState<StokMasukItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
      if (show && inputableMenus) {
        setItems(
          inputableMenus.map((m: any) => ({
            id: m.id || m.item_id || m.recipe_id,
            item_id: m.item_id || m.id || m.recipe_id,
            nama: m.nama,
            stok_masuk: 0,
          }))
        );
        setWarningMessage(null);
      }
    }, [show, inputableMenus]);

  const handleStokMasukChange = (index: number, value: string) => {
    const updated = [...items];
    updated[index].stok_masuk = value;
    setItems(updated);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWarningMessage(null);

    const itemsToSubmit = items.map(item => ({
      item_id: item.item_id.toString(),
      stok_masuk: item.stok_masuk === "" ? "0" : item.stok_masuk.toString(),
    }));

    setProcessing(true);

    router.post(route("stok-harian-mentah.store-borongan"), {
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
        setWarningMessage(firstError as string || "Terjadi kesalahan saat menyimpan stok masuk.");
      },
      onFinish: () => setProcessing(false)
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-all">
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-white dark:bg-[#2A221C] rounded-3xl shadow-2xl w-full max-w-3xl p-6 md:p-8 max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-[#45372C] flex flex-col"
      >
        <div className="flex flex-col items-center text-center mb-6 relative">
            <button type="button" onClick={onClose} className="absolute right-0 top-0 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-[#35291F] text-gray-500 transition" aria-label="Tutup">
                <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-[#D9A978]/15 dark:bg-amber-400/10 text-[#8B5E3C] dark:text-amber-400 flex items-center justify-center mb-3 shadow-inner">
                <Package className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-800 dark:text-[#FAF5ED]">
                Input Stok Masuk Bahan Mentah
            </h2>
            <p className="text-xs text-gray-400 dark:text-[#A89B8C] mt-1">
                Masukkan penambahan stok masuk untuk seluruh bahan pada {new Date(tanggal).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}.
            </p>
        </div>

        <form onSubmit={submit} className="space-y-4 flex-1 flex flex-col">
          <div className="border border-gray-100 dark:border-[#3D3127] rounded-2xl overflow-hidden max-h-[50vh] overflow-y-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#FAF7F2] dark:bg-[#1E1915] text-gray-500 dark:text-[#A89B8C] font-bold uppercase text-[11px] tracking-wider sticky top-0 z-10 border-b border-gray-100 dark:border-[#3D3127]">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3">Nama Bahan Mentah</th>
                  <th className="px-4 py-3 text-right w-48">Stok Masuk / Penambahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-[#3D3127]">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <tr key={item.item_id} className="hover:bg-gray-50/50 dark:hover:bg-[#231C17] transition">
                      <td className="px-4 py-3 text-center text-gray-400 dark:text-[#8E8072] font-medium">{index + 1}</td>
                      <td className="px-4 py-3 font-bold text-gray-800 dark:text-[#FAF5ED]">{item.nama}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          value={item.stok_masuk}
                          onChange={(e) => handleStokMasukChange(index, e.target.value)}
                          className="w-full bg-gray-50 dark:bg-[#1E1915] border border-gray-200 dark:border-[#45372C] rounded-xl px-3 py-2 text-sm font-bold text-gray-800 dark:text-[#FAF5ED] text-right focus:outline-none focus:ring-2 focus:ring-[#8B5E3C] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 dark:text-[#8E8072] italic">
                      Belum ada item bahan mentah terdaftar. Silakan input data nama item terlebih dahulu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-100 dark:bg-[#35291F] rounded-2xl font-bold text-sm text-gray-700 dark:text-[#C8BCAE] hover:bg-gray-200 dark:hover:bg-[#45372C] transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={processing || items.length === 0}
              className={`flex-1 px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-md transition ${
                processing || items.length === 0 ? "bg-gray-300 dark:bg-[#5A4535] cursor-not-allowed" : "bg-[#8B5E3C] hover:bg-[#6F4E37]"
              }`}
            >
              {processing ? "Menyimpan..." : "Simpan Semua Stok Masuk"}
            </button>
          </div>
        </form>
      </motion.div>

      <AnimatePresence>
        {warningMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-white dark:bg-[#2A221C] shadow-2xl border border-red-100 dark:border-rose-900/40 p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-rose-950/60 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-red-700 dark:text-rose-400">Peringatan Sistem</p>
                    <p className="text-xs text-red-500 dark:text-rose-500">Validasi stok harian</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWarningMessage(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-[#FAF5ED] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-4 text-sm text-gray-700 dark:text-[#C8BCAE] leading-relaxed font-medium">{warningMessage}</p>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setWarningMessage(null)}
                  className="px-6 py-2.5 rounded-2xl bg-[#8B5E3C] text-white font-bold text-sm hover:bg-[#6F4E37] transition shadow-md"
                >
                  Mengerti
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// === MAIN COMPONENT ===
export default function Bar() {
  const { items, inputableMenus, tab, tanggal, auth, lowStockItems, canInput, canInputMentah, search: initialSearch } = usePage<any>().props as PageProps;
  const role = auth?.user?.role;

  const [search, setSearch] = useState(initialSearch || "");
  const [date, setDate] = useState(tanggal);
  const [showBoronganModal, setShowBoronganModal] = useState(false);
  const isFirstRender = useRef(true);

  // Edit States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formRecordId, setFormRecordId] = useState<number | null>(null);
  const [formItemId, setFormItemId] = useState<number | "">("");
  const [formItemName, setFormItemName] = useState("");
  const [formStokMasuk, setFormStokMasuk] = useState<number | "">("");
  const [formPemakaian, setFormPemakaian] = useState<number | "">("");

  const isAlreadySubmitted = items.data.some((item: ItemData) => Number(item.is_submitted) === 1);
  const isStaff = role !== 'owner' && role !== 'supervisor';

  const isMenuLocked = isStaff && !canInput;
  const isMentahLocked = isStaff && !canInputMentah;
  const isLocked = tab === "menu" ? isMenuLocked : isMentahLocked;

  useEffect(() => {
    setDate(tanggal);
  }, [tanggal]);

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
          route("stok-harian.bar"),
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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
    router.get(
      route("stok-harian.bar"),
      { tab, search, tanggal: e.target.value },
      { preserveScroll: true }
    );
  };

  const handleTabSwitch = (t: string) => {
    router.get(
      route("stok-harian.bar"),
      { tab: t, tanggal, search },
      { preserveScroll: true }
    );
  };

  const resetEditForm = () => {
    setFormRecordId(null);
    setFormItemId("");
    setFormItemName("");
    setFormStokMasuk("");
    setFormPemakaian("");
  };

  const handleEditClick = (item: ItemData) => {
    if (isLocked) return;
    setFormRecordId(item.id);
    setFormItemId(item.item_id);
    setFormItemName(item.nama);
    setFormStokMasuk(item.stok_masuk ?? "");
    setFormPemakaian(item.pemakaian);
    setShowEditModal(true);
  };

  const submitUpdate = () => {
    if (!formRecordId) return;

    const routeName = tab === "menu" ? "stok-harian-menu.update" : "stok-harian-mentah.update";
    const payload: any = { item_id: Number(formItemId) };

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
    const routeName = tab === "menu" ? "stok-harian-menu.destroy" : "stok-harian-mentah.destroy";
    router.delete(route(routeName, formRecordId), {
      onSuccess: () => {
        setShowDeleteModal(false);
        resetEditForm();
      },
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showDeleteModal) {
        if (e.key === "Enter") {
          e.preventDefault();
          submitDelete();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setShowDeleteModal(false);
        }
      } else if (showEditModal && e.key === "Escape") {
        e.preventDefault();
        setShowEditModal(false);
      } else if (showBoronganModal && e.key === "Escape") {
        e.preventDefault();
        setShowBoronganModal(false);
      }
    };

    if (showDeleteModal || showEditModal || showBoronganModal) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showDeleteModal, showEditModal, showBoronganModal, formRecordId]);

  const showInputButton = tab === "mentah";

  return (
    <AppLayout header={`Stok Harian Bar`}>
      <Head title="Stok Harian Bar" />
      <AnimatePresence>
        {showBoronganModal && (
          <ModalInputStokMasukBorongan
            show={showBoronganModal}
            onClose={() => setShowBoronganModal(false)}
            inputableMenus={inputableMenus}
            tanggal={tanggal}
            onSuccess={() =>
              router.visit(route("stok-harian.bar"), {
                data: { tab, tanggal },
                preserveScroll: true,
              })
            }
          />
        )}
      </AnimatePresence>

      <div className="py-6 space-y-6">
        
        {/* Warning Peringatan (Diletakkan di luar card utama agar jelas terlihat) */}
        {lowStockItems && lowStockItems.length > 0 && (
          <div className="bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 rounded-3xl p-4 flex items-start gap-4 shadow-xs">
            <div className="p-2.5 bg-red-100 dark:bg-rose-900/50 rounded-2xl text-red-600 dark:text-rose-400 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-red-800 dark:text-rose-300 font-bold text-sm">Peringatan: Stok Menipis!</h3>
              <p className="text-red-600 dark:text-rose-400/80 text-xs mt-0.5">
                Terdapat {lowStockItems.length} item dengan stok di bawah 7.
              </p>
            </div>
          </div>
        )}

        {/* 🔥 CONTAINER UTAMA: KREM LUAR, PUTIH DALAM (STANDAR ENTERPRISE) 🔥 */}
        <div className="rounded-3xl bg-[#F2ECE4] dark:bg-[#2A221C] p-4 md:p-8 shadow-sm border border-amber-200/60 dark:border-[#45372C]">
          <div className="rounded-3xl bg-white dark:bg-[#231C17] p-4 md:p-6 shadow-xs border border-gray-100 dark:border-[#3D3127] min-h-[600px] flex flex-col">
            
            {isLocked && (
              <div className="mb-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 rounded-2xl text-amber-700 dark:text-amber-400 flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-amber-900 dark:text-amber-300 font-bold text-sm">Aksi Terkunci</h3>
                  <p className="text-amber-700 dark:text-amber-400/80 text-xs mt-0.5 leading-relaxed">
                    {tab === "menu" && isAlreadySubmitted
                      ? "Data stok menu hari ini sudah berhasil disimpan. Tidak dapat melakukan input atau perubahan lagi."
                      : "Waktu input harian telah ditutup (setelah jam 21:00). Silakan ajukan izin revisi untuk melakukan perubahan."
                    }
                  </p>
                </div>
              </div>
            )}

            {/* --- HEADER CONTROL & TOOLBAR --- */}
            <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-gray-100 dark:border-[#3D3127] pb-5 xl:border-b-0 xl:pb-0">
                
                {/* Kiri: Judul dan Tab Navigasi */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full xl:w-auto">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-[#FAF5ED] whitespace-nowrap">
                        Daftar Stok {tab === "menu" ? "Menu" : "Mentah"}
                    </h3>
                    
                    <div className="flex w-full md:w-auto bg-[#FAF7F2] dark:bg-[#231C17] rounded-full p-1 border border-amber-100 dark:border-[#45372C]">
                      <button
                        onClick={() => handleTabSwitch("menu")}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-full text-xs font-bold transition-all ${
                          tab === "menu" ? "bg-[#8B5E3C] text-white shadow-xs" : "text-gray-600 dark:text-[#C8BCAE] hover:text-[#8B5E3C] dark:hover:text-amber-300 hover:bg-white/60 dark:hover:bg-[#2A221C]"
                        }`}
                      >
                        Menu
                      </button>
                      <button
                        onClick={() => handleTabSwitch("mentah")}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-full text-xs font-bold transition-all ${
                          tab === "mentah" ? "bg-[#8B5E3C] text-white shadow-xs" : "text-gray-600 dark:text-[#C8BCAE] hover:text-[#8B5E3C] dark:hover:text-amber-300 hover:bg-white/60 dark:hover:bg-[#2A221C]"
                        }`}
                      >
                        Mentah
                      </button>
                    </div>
                </div>

                {/* Kanan: Tombol Input, Filter Tanggal, Search */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
                    {showInputButton && (
                      <button
                        onClick={() => setShowBoronganModal(true)}
                        disabled={isLocked}
                        className={`flex items-center justify-center gap-2 rounded-full px-5 py-2.5 sm:py-2 text-sm font-bold shadow-md transition w-full sm:w-auto ${
                          isLocked ? 'bg-gray-300 dark:bg-[#3E3024] text-gray-500 dark:text-[#8E8072] cursor-not-allowed opacity-50 shadow-none' : 'bg-[#8B5E3C] hover:bg-[#6F4E37] text-white active:scale-95'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                        Input Stok Masuk
                      </button>
                    )}
                    
                    <input
                      type="date"
                      value={date}
                      onChange={handleDateChange}
                      className="w-full sm:w-auto bg-gray-50 dark:bg-[#231C17] border border-gray-200 dark:border-[#45372C] rounded-full px-4 py-2.5 sm:py-2 text-sm text-[#8B5E3C] dark:text-amber-400 font-bold shadow-2xs outline-none focus:ring-2 focus:ring-[#D9A978]"
                    />
                    
                    <div className="relative w-full sm:w-56">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={handleSearch}
                        className="w-full rounded-full border border-gray-200 dark:border-[#45372C] bg-gray-50 dark:bg-[#231C17] text-gray-800 dark:text-[#FAF5ED] px-4 py-2.5 sm:py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-[#8E8072]" />
                    </div>
                </div>
            </div>

            {/* --- DESKTOP VIEW (TABLE) --- */}
            <div className="hidden md:block w-full rounded-2xl border border-gray-100 dark:border-[#3D3127] bg-white dark:bg-[#231C17] shadow-sm overflow-hidden flex-1 mb-6">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#FAF7F2]/80 dark:bg-[#1E1915] text-gray-500 dark:text-[#A89B8C] font-bold uppercase text-[11px] tracking-wider border-b border-gray-100 dark:border-[#3D3127]">
                    <tr>
                      <th className="px-6 py-4 text-center w-16">No</th>
                      <th className="px-6 py-4">Nama</th>
                      <th className="px-6 py-4 text-center w-32">Satuan</th>
                      <th className="px-6 py-4 text-center w-32">Stok Awal</th>
                      {tab === "mentah" && <th className="px-6 py-4 text-center w-32">Stok Masuk</th>}
                      <th className="px-6 py-4 text-center w-32">Stok Total</th>
                      <th className="px-6 py-4 text-center w-32">Pemakaian</th>
                      <th className="px-6 py-4 text-center w-32">Tersisa</th>
                      <th className="px-6 py-4 text-center w-48">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-[#3D3127]">
                    {items.data.length > 0 ? (
                      items.data.map((item: ItemData, i: number) => (
                        <tr key={item.id} className="hover:bg-[#FDF3E4]/50 dark:hover:bg-[#2A221C] transition-colors duration-150">
                          <td className="px-6 py-4 text-center text-gray-400 dark:text-[#8E8072] font-medium">
                            {(items.current_page ? (items.current_page - 1) * items.per_page : 0) + i + 1}
                          </td>
                          <td className="px-6 py-4 text-gray-800">
                            <div className="font-bold text-gray-800 dark:text-[#FAF5ED]">{item.nama}</div>
                            {tab === "mentah" && item.connected_menus && item.connected_menus.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                                <span className="text-[10px] text-gray-400 dark:text-[#8E8072] font-bold uppercase tracking-wider">Digunakan di menu:</span>
                                {item.connected_menus.map((menuName: string, idx: number) => (
                                  <span 
                                    key={idx} 
                                    className="bg-[#FDF3E4] dark:bg-[#3E3024] text-[#8B5E3C] dark:text-amber-300 px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-amber-100 dark:border-amber-800/40 shadow-xs"
                                  >
                                    {menuName}
                                  </span>
                                ))}
                              </div>
                            ) : tab === "mentah" ? (
                              <div className="text-[10px] text-gray-400 dark:text-[#8E8072] italic mt-0.5">Belum terhubung ke resep menu</div>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-500 dark:text-[#A89B8C] font-medium capitalize">{item.satuan}</td>
                          <td className="px-6 py-4 text-center font-bold text-gray-700 dark:text-[#FAF5ED]">{item.stok_awal}</td>
                          {tab === "mentah" && (
                            <td className="px-6 py-4 text-center font-bold text-gray-700 dark:text-[#FAF5ED]">{item.stok_masuk ?? 0}</td>
                          )}
                          <td className="px-6 py-4 text-center font-bold text-blue-600 dark:text-blue-400">{item.stok_total}</td>
                          <td className="px-6 py-4 text-center font-bold text-gray-700 dark:text-[#FAF5ED]">{item.pemakaian}</td>
                          <td
                            className={`px-6 py-4 text-center font-black ${
                              item.tersisa < 7 ? "text-red-600 dark:text-rose-400 animate-pulse" : "text-gray-900 dark:text-[#FAF5ED]"
                            }`}
                          >
                            {item.tersisa}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {!(isStaff && tab === "menu") ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleEditClick(item)}
                                  disabled={isLocked}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1 ${
                                    isLocked ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 shadow-none cursor-not-allowed" : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-transparent dark:border-blue-800/40"
                                  }`}
                                >
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(item.id)}
                                  disabled={isLocked}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1 ${
                                    isLocked ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 shadow-none cursor-not-allowed" : "bg-red-50 dark:bg-rose-950/60 text-red-600 dark:text-rose-400 hover:bg-red-100 dark:hover:bg-rose-900/60 border border-transparent dark:border-rose-800/40"
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-[#8E8072] italic font-medium">Read-only</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-gray-400 dark:text-[#8E8072] italic">
                          Belum ada data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- MOBILE VIEW (CARDS) --- */}
            <div className="grid grid-cols-1 gap-4 md:hidden mb-6 flex-1">
              {items.data.length > 0 ? (
                items.data.map((item: ItemData) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-[#231C17] border border-gray-100 dark:border-[#3D3127] rounded-2xl p-4 shadow-xs"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-gray-800 dark:text-[#FAF5ED]">{item.nama}</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                          item.tersisa < 7
                            ? "bg-red-100 dark:bg-rose-900/40 text-red-600 dark:text-rose-400"
                            : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        Sisa: {item.tersisa}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-[#C8BCAE] mt-2">
                      <div className="bg-gray-50 dark:bg-[#1E1915] p-2.5 rounded-xl font-medium border border-gray-100 dark:border-[#3D3127]">
                        <span className="text-gray-400 dark:text-[#8E8072] font-bold uppercase text-[10px] block">Awal</span>
                        <span className="font-bold text-gray-800 dark:text-[#FAF5ED]">{item.stok_awal}</span>
                      </div>
                      <div className="bg-gray-50 dark:bg-[#1E1915] p-2.5 rounded-xl font-medium border border-gray-100 dark:border-[#3D3127]">
                        <span className="text-gray-400 dark:text-[#8E8072] font-bold uppercase text-[10px] block">Total</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{item.stok_total}</span>
                      </div>
                      {tab === "mentah" && (
                        <div className="bg-gray-50 dark:bg-[#1E1915] p-2.5 rounded-xl font-medium border border-gray-100 dark:border-[#3D3127]">
                          <span className="text-gray-400 dark:text-[#8E8072] font-bold uppercase text-[10px] block">Masuk</span>
                          <span className="font-bold text-gray-800 dark:text-[#FAF5ED]">{item.stok_masuk ?? 0}</span>
                        </div>
                      )}
                      <div className="bg-gray-50 dark:bg-[#1E1915] p-2.5 rounded-xl font-medium border border-gray-100 dark:border-[#3D3127]">
                        <span className="text-gray-400 dark:text-[#8E8072] font-bold uppercase text-[10px] block">Pakai</span>
                        <span className="font-bold text-gray-800 dark:text-[#FAF5ED]">{item.pemakaian}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-[#3D3127]">
                    {!(isStaff && tab === "menu") ? (
                      <>
                        <button
                          onClick={() => handleEditClick(item)}
                          disabled={isLocked}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1 ${
                            isLocked ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 shadow-none cursor-not-allowed" : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-transparent dark:border-blue-800/40"
                          }`}
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item.id)}
                          disabled={isLocked}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1 ${
                            isLocked ? "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 shadow-none cursor-not-allowed" : "bg-red-50 dark:bg-rose-950/60 text-red-600 dark:text-rose-400 hover:bg-red-100 dark:hover:bg-rose-900/60 border border-transparent dark:border-rose-800/40"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </>
                    ) : (
                      <div className="w-full text-center text-xs text-gray-400 dark:text-[#8E8072] italic">Read-only</div>
                    )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 dark:text-[#8E8072] text-sm italic py-8 border border-gray-100 dark:border-[#3D3127] rounded-2xl bg-gray-50 dark:bg-[#231C17]">Belum ada data.</p>
              )}
            </div>

            {/* --- PAGINATION (GAYA MODERN PILL) --- */}
            <div className="mt-auto pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs sm:text-sm text-gray-500 dark:text-[#A89B8C] border-t border-gray-100 dark:border-[#3D3127]">
              <div>
                {items.total && items.total > 0 ? (
                  <span>
                    Menampilkan {items.from ?? 1}–{items.to ?? items.data.length} dari {items.total} item
                  </span>
                ) : (
                  <span>Tidak ada item</span>
                )}
              </div>

              {items.links && items.links.length > 3 && (
                <div className="flex items-center gap-1.5 self-center sm:self-auto bg-gray-50 dark:bg-[#231C17] p-1 rounded-full border border-gray-200 dark:border-[#3D3127]">
                  {items.links.map((link: any, i: number) => {
                    let label = link.label;
                    if (label.includes('&laquo;')) label = 'Prev';
                    if (label.includes('&raquo;')) label = 'Next';

                    return (
                        <Link
                            key={i}
                            href={link.url || "#"}
                            preserveScroll
                            className={`
                                relative inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-all rounded-full
                                ${
                                    link.active
                                        ? 'bg-[#D9A978] dark:bg-[#8B5E3C] text-white shadow-md'
                                        : 'text-gray-600 dark:text-[#C8BCAE] hover:bg-white dark:hover:bg-[#2A221C] hover:text-[#D9A978] dark:hover:text-amber-300'
                                }
                                ${!link.url ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                            `}
                            dangerouslySetInnerHTML={{ __html: label }}
                        />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GRAFIK STOK HAMPIR HABIS */}
        <div className="bg-[#F2ECE4] dark:bg-[#2A221C] p-6 md:p-8 rounded-3xl shadow-sm border border-amber-200/60 dark:border-[#45372C]">
          <h3 className="text-base font-bold text-gray-800 dark:text-[#FAF5ED] mb-4 flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-red-500 dark:bg-rose-500 rounded-full inline-block"></span> Grafik Stok Hampir Habis ({"<"} 7)
          </h3>
          {lowStockItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockItems.map((item: LowStockItem, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 p-4 bg-white dark:bg-[#231C17] border border-gray-100 dark:border-[#3D3127] rounded-2xl shadow-xs"
                >
                  <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-[#FAF5ED]">
                    <span>
                      {item.nama}{" "}
                      <span className="text-gray-400 dark:text-[#8E8072] font-normal">({item.kategori})</span>
                    </span>
                    <span className="text-red-500 dark:text-rose-400 font-extrabold">{item.tersisa} Tersisa</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-[#1E1915] rounded-full h-2.5 overflow-hidden">
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
            <div className="text-center py-8 text-gray-400 dark:text-[#8E8072] text-sm italic bg-white dark:bg-[#231C17] rounded-2xl border border-gray-100 dark:border-[#3D3127]">
              Semua stok aman! Tidak ada item yang hampir habis.
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL EDIT STOK --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-all">
          <div className="bg-white dark:bg-[#2A221C] w-full max-w-sm md:max-w-md rounded-3xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-100 dark:border-[#45372C]">
            <div className="flex flex-col items-center text-center mb-6 relative">
                <button type="button" onClick={() => setShowEditModal(false)} className="absolute right-0 top-0 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-[#35291F] text-gray-500 transition" aria-label="Tutup">
                    <X className="w-5 h-5" />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-[#D9A978]/15 dark:bg-amber-400/10 text-[#8B5E3C] dark:text-amber-400 flex items-center justify-center mb-3 shadow-inner">
                    <Edit className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-extrabold text-gray-800 dark:text-[#FAF5ED]">
                    Edit Stok {tab === "menu" ? "Menu" : "Bahan Mentah"}
                </h2>
                <p className="text-xs text-gray-400 dark:text-[#A89B8C] mt-1">
                    Perbarui jumlah pemakaian atau penambahan stok item ini
                </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitUpdate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-[#C8BCAE] uppercase tracking-wider mb-1.5 ml-1">Nama Item</label>
                <input
                  type="text"
                  value={formItemName}
                  readOnly
                  className="w-full bg-gray-100 dark:bg-[#1E1915]/60 border border-gray-200 dark:border-[#45372C] rounded-2xl px-4 py-3 text-sm font-medium text-gray-500 dark:text-[#A89B8C] cursor-not-allowed"
                />
              </div>

              {tab === "mentah" ? (
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-[#C8BCAE] uppercase tracking-wider mb-1.5 ml-1">Stok Masuk</label>
                  <input
                    type="number"
                    value={formStokMasuk}
                    onChange={(e) => setFormStokMasuk(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-[#231C17] border border-gray-200 dark:border-[#45372C] rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 dark:text-[#FAF5ED] focus:ring-2 focus:ring-[#8B5E3C] outline-none"
                    placeholder="0"
                    autoFocus
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-[#C8BCAE] uppercase tracking-wider mb-1.5 ml-1">Pemakaian</label>
                  <input
                    type="number"
                    value={formPemakaian}
                    onChange={(e) => setFormPemakaian(Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-[#231C17] border border-gray-200 dark:border-[#45372C] rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 dark:text-[#FAF5ED] focus:ring-2 focus:ring-[#8B5E3C] outline-none"
                    placeholder="0"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex justify-between gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-[#45372C] rounded-2xl font-bold text-sm text-gray-700 dark:text-[#C8BCAE] hover:bg-gray-50 dark:hover:bg-[#35291F] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-[#1D8CFF] dark:bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-[#166ac4] dark:hover:bg-blue-700 transition shadow-md"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-all">
          <div className="bg-white dark:bg-[#2A221C] p-6 md:p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full border border-gray-100 dark:border-[#45372C]">
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-[#FAF5ED] mb-2">Hapus Data? ⚠️</h2>
            <p className="text-gray-500 dark:text-[#A89B8C] text-xs mb-6 leading-relaxed">Aksi ini tidak dapat dibatalkan.</p>
            <div className="flex justify-between gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#35291F] rounded-2xl text-gray-700 dark:text-[#C8BCAE] font-bold hover:bg-gray-200 dark:hover:bg-[#45372C] transition text-sm"
              >
                Batal
              </button>
              <button
                onClick={submitDelete}
                className="flex-1 px-4 py-2.5 bg-red-500 dark:bg-rose-600 text-white rounded-2xl font-bold shadow-md hover:bg-red-600 dark:hover:bg-rose-700 transition text-sm"
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