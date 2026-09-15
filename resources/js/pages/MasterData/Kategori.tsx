import React, { useMemo, useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Search, ChevronDown, X, Plus, Box, Layers } from "lucide-react";

type Division = "bar" | "dapur";

interface CategoryItem {
  id: number;
  nama: string;
}

interface Category {
  id: number;
  name: string;
  division: Division;
  total_items: number;
  items: CategoryItem[];
  no?: number; // Tambahkan properti opsional 'no'
}

type PageProps = {
  division?: Division;
  categories?: Category[];
};

// Terjemahan label kategori untuk tampilan
const translateCategoryName = (name: string) => {
  const lower = name.toLowerCase();
  if (lower === "finish") return "Menu";
  if (lower === "raw") return "Mentah";
  return name;
};

// Susun kategori: Menu(Finish), Mentah(Raw), baru lainnya
const sortCategories = (categories: Category[]) => {
  const BASE_ORDER = ["finish", "raw"];
  const baseSlots: (Category | undefined)[] = [];
  const others: Category[] = [];

  categories.forEach((cat) => {
    const idx = BASE_ORDER.indexOf(cat.name.toLowerCase());
    if (idx !== -1) {
      baseSlots[idx] = cat;
    } else {
      others.push(cat);
    }
  });

  others.sort((a, b) =>
    translateCategoryName(a.name).localeCompare(
      translateCategoryName(b.name),
      "id"
    )
  );

  return [...baseSlots.filter(Boolean), ...others] as Category[];
};

export default function KategoriPage() {
  const {
    division: serverDivision = "bar",
    categories: serverCategories = [],
    auth,
  } = usePage<PageProps & { auth: any }>().props;

  const role = auth.user.role;
  const isStaff = role === "bar" || role === "dapur";
  const staffDivision = isStaff ? role : serverDivision;

  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
  const [search, setSearch] = useState("");

  const [localCategories, setLocalCategories] =
    useState<Category[]>(serverCategories);

  useEffect(() => {
    setLocalCategories(serverCategories);
  }, [serverCategories]);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  const [newCategoryName, setNewCategoryName] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");

  // ===== FILTER & SORT =====
  const filteredCategories = useMemo(() => {
    const filtered = localCategories.filter((c) =>
      translateCategoryName(c.name)
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );
    const sorted = sortCategories(filtered);
    return sorted.map((c, index) => ({
      ...c,
      no: index + 1,
    }));
  }, [localCategories, search]);

  // ===== Ganti divisi =====
  const changeDivision = (division: Division) => {
    setShowDivisionDropdown(false);
    router.get(
      route("kategori"),
      { division },
      {
        preserveScroll: true,
        preserveState: false,
        replace: true,
      }
    );
  };

  // =========================
  // TAMBAH KATEGORI (panggil backend)
  // =========================
  const openAddModal = () => {
    setNewCategoryName("");
    setAddModalOpen(true);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    router.post(
      route("kategori.store"),
      { name, division: staffDivision },
      {
        onSuccess: () => {
          setAddModalOpen(false);
        },
      }
    );
  };

  // =========================
  // EDIT (panggil backend)
  // =========================
  const openEditModal = (cat: Category) => {
    setSelectedCategory(cat);
    setEditCategoryName(cat.name);
    setEditModalOpen(true);
  };

  const handleUpdateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    const name = editCategoryName.trim();
    if (!name) return;

    router.put(
      route("kategori.update", selectedCategory.id),
      { name },
      {
        onSuccess: () => setEditModalOpen(false),
      }
    );
  };

  // =========================
  // VIEW DETAIL – tampilkan list item
  // =========================
  const openViewModal = (cat: Category) => {
    setSelectedCategory(cat);
    setViewModalOpen(true);
  };

  // =========================
  // HAPUS (kategori + item di kategori itu – backend)
  // =========================
  const openDeleteModal = (cat: Category) => {
    setSelectedCategory(cat);
    setDeleteModalOpen(true);
  };

  const handleDeleteCategory = () => {
    if (!selectedCategory) return;

    router.delete(route("kategori.destroy", selectedCategory.id), {
      onSuccess: () => setDeleteModalOpen(false),
    });
  };

  // --- 🔥 TAMBAHAN LOGIKA ENTER (HAPUS) & ESC (BATAL) 🔥 ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Jika Modal Hapus terbuka
      if (deleteModalOpen) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleDeleteCategory(); // Eksekusi Hapus
        } else if (e.key === "Escape") {
          e.preventDefault();
          setDeleteModalOpen(false); // Batal
        }
      }
      // 2. Jika Modal Tambah terbuka
      else if (addModalOpen && e.key === "Escape") {
        e.preventDefault();
        setAddModalOpen(false);
      }
      // 3. Jika Modal Edit terbuka
      else if (editModalOpen && e.key === "Escape") {
        e.preventDefault();
        setEditModalOpen(false);
      }
      // 4. Jika Modal View terbuka
      else if (viewModalOpen && e.key === "Escape") {
        e.preventDefault();
        setViewModalOpen(false);
      }
    };

    // Pasang pendengar hanya saat salah satu modal aktif
    if (deleteModalOpen || addModalOpen || editModalOpen || viewModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteModalOpen, addModalOpen, editModalOpen, viewModalOpen, selectedCategory]);
  // --- 🔥 SELESAI TAMBAHAN 🔥 ---

  const titleDivisionLabel = staffDivision === "bar" ? "Bar" : "Dapur";

  return (
    <AppLayout header={`Kategori ${titleDivisionLabel}`}>
      <Head title={`Kategori ${titleDivisionLabel}`} />

      <div className="space-y-6">
        <div className="rounded-3xl bg-[#F2ECE4] p-4 md:p-8 shadow-sm border border-amber-200/60">
          <div className="rounded-3xl bg-[#FFFFFF] p-4 md:p-6 shadow-xs border border-gray-100 min-h-[500px] flex flex-col">
            {/* HEADER */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <h2 className="text-lg font-bold text-gray-800">
                  {`Kategori ${titleDivisionLabel}`}
                </h2>

                {/* Dropdown Divisi */}
                {!isStaff && (
                  <div className="relative inline-block w-full md:w-40">
                    <button
                      type="button"
                      onClick={() =>
                        setShowDivisionDropdown((prev) => !prev)
                      }
                      className="flex w-full items-center justify-between rounded-xl bg-[#FDF3E4] px-4 py-2.5 text-sm font-bold text-[#8B5E3C] border border-amber-100 shadow-2xs"
                    >
                      <span className="capitalize">{titleDivisionLabel}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          showDivisionDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showDivisionDropdown && (
                      <div className="absolute left-0 z-20 mt-1 w-full rounded-2xl bg-white py-1.5 text-sm shadow-xl border border-gray-100">
                        <button
                          type="button"
                          onClick={() => changeDivision("bar")}
                          className={`block w-full px-4 py-2 text-left font-semibold transition ${
                            serverDivision === "bar"
                              ? "bg-[#FDF3E4] text-[#8B5E3C]"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          Bar
                        </button>
                        <button
                          type="button"
                          onClick={() => changeDivision("dapur")}
                          className={`block w-full px-4 py-2 text-left font-semibold transition ${
                            serverDivision === "dapur"
                              ? "bg-[#FDF3E4] text-[#8B5E3C]"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          Dapur
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right controls: Tambah + Search */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center w-full md:w-auto">
                {!isStaff && (
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#D9A978] px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-[#c4925e] transition w-full md:w-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Kategori
                  </button>
                )}
                <div className="relative w-full md:w-auto">
                  <input
                    type="text"
                    placeholder="Search...."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-56 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>

            {/* --- MOBILE VIEW (CARDS) --- */}
            {/* Tampil di layar kecil (< md) */}
            <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
                {filteredCategories.length === 0 ? (
                     <div className="text-center text-gray-400 py-8 border rounded-xl bg-gray-50">
                        Belum ada kategori untuk divisi ini.
                    </div>
                ) : (
                    filteredCategories.map((cat) => (
                        <div key={cat.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                           <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="bg-orange-50 p-2 rounded-lg text-[#DABA93]">
                                        <Layers className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800">{translateCategoryName(cat.name)}</div>
                                        <div className="text-xs text-gray-500">Total Item: {cat.total_items}</div>
                                    </div>
                                </div>
                           </div>

                           <div className="flex gap-2 border-t pt-3 mt-2">
                                <button
                                     onClick={() => openViewModal(cat)}
                                     className="flex-1 flex items-center justify-center gap-1 bg-[#1D8CFF] text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#166ac4] transition"
                                >
                                     View
                                </button>

                                {!isStaff && (
                                     <>
                                         <button
                                             onClick={() => openEditModal(cat)}
                                             className="flex-1 flex items-center justify-center gap-1 bg-[#1D8CFF] text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#166ac4] transition"
                                         >
                                             Edit
                                         </button>
                                         <button
                                             onClick={() => openDeleteModal(cat)}
                                             className="flex-1 flex items-center justify-center gap-1 bg-[#FF4B4B] text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#e03535] transition"
                                         >
                                             Hapus
                                         </button>
                                     </>
                                )}
                           </div>
                        </div>
                    ))
                )}
            </div>

            {/* --- DESKTOP VIEW (TABLE) --- */}
            {/* Tampil di layar sedang ke atas (md:block) */}
            <div className="hidden md:block w-full rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex-1 mb-6">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#FAF7F2]/80 text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 w-16 text-center">No</th>
                      <th className="px-6 py-4">Nama Kategori</th>
                      <th className="px-6 py-4">Jumlah Item</th>
                      <th className="px-6 py-4 text-center w-48">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredCategories.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center text-gray-400 italic"
                        >
                          Belum ada kategori untuk divisi ini.
                        </td>
                      </tr>
                    ) : (
                      filteredCategories.map((cat) => (
                        <tr
                          key={cat.id}
                          className="hover:bg-[#FDF3E4]/50 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 text-center text-gray-400 font-medium">{cat.no}</td>
                          <td className="px-6 py-4 font-bold text-gray-800">
                            {translateCategoryName(cat.name)}
                          </td>
                          <td className="px-6 py-4 text-gray-600 font-medium">
                            {cat.total_items} Bahan
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* VIEW – BOLEH UNTUK SEMUA */}
                              <button
                                type="button"
                                onClick={() => openViewModal(cat)}
                                className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100 transition shadow-xs flex items-center gap-1"
                              >
                                View
                              </button>

                              {/* EDIT & HAPUS – KHUSUS NON STAFF */}
                              {!isStaff && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(cat)}
                                    className="px-3.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs hover:bg-amber-100 transition shadow-xs flex items-center gap-1"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openDeleteModal(cat)}
                                    className="px-3.5 py-1.5 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition shadow-xs flex items-center gap-1"
                                  >
                                    Hapus
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: TAMBAH */}
      {addModalOpen && (
        <Modal onClose={() => setAddModalOpen(false)}>
          <form
            onSubmit={handleAddCategory}
            className="w-full max-w-sm md:max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-gray-100"
          >
            <h3 className="mb-6 text-center text-xl font-extrabold text-gray-800">
              Tambah Kategori Baru
            </h3>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-bold text-gray-600 uppercase tracking-wider">
                Nama Kategori
              </label>
              <input
                type="text"
                placeholder="Contoh: Menu/Mentah"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
              />
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="flex-1 rounded-2xl bg-gray-100 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-200 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-[#8B5E3C] py-2.5 text-sm font-bold text-white hover:bg-[#6F4E37] transition shadow-md"
              >
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: EDIT */}
      {editModalOpen && selectedCategory && (
        <Modal onClose={() => setEditModalOpen(false)}>
          <form
            onSubmit={handleUpdateCategory}
            className="w-full max-w-sm md:max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-gray-100"
          >
            <h3 className="mb-6 text-center text-xl font-extrabold text-gray-800">
              Edit Kategori
            </h3>

            <div className="mb-6">
              <label className="mb-2 block text-xs font-bold text-gray-600 uppercase tracking-wider">
                Nama Kategori
              </label>
              <input
                type="text"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]"
              />
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="flex-1 rounded-2xl bg-gray-100 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-200 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition shadow-md"
              >
                Update
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: VIEW */}
      {viewModalOpen && selectedCategory && (
        <Modal onClose={() => setViewModalOpen(false)}>
          <div className="w-full max-w-sm md:max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-gray-100 max-h-[80vh] overflow-y-auto flex flex-col">
            <div className="mb-5 flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-800">
                Detail Kategori:{" "}
                <span className="text-[#8B5E3C]">{translateCategoryName(selectedCategory.name)}</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="rounded-xl p-2 hover:bg-gray-100 text-gray-500 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-2xs flex-1">
              <table className="min-w-full table-auto text-sm">
                <thead className="bg-[#FAF7F2] text-xs font-bold uppercase text-gray-600">
                  <tr>
                    <th className="w-16 px-4 py-3 text-center">No</th>
                    <th className="px-4 py-3">Nama Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selectedCategory.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-8 text-center text-gray-400 italic"
                      >
                        Belum ada item di kategori ini.
                      </td>
                    </tr>
                  ) : (
                    selectedCategory.items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-center text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{item.nama}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: HAPUS */}
      {deleteModalOpen && selectedCategory && (
        <Modal onClose={() => setDeleteModalOpen(false)}>
          <div className="w-full max-w-sm md:max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-2xl border border-gray-100 text-center">
            <h3 className="mb-2 text-xl font-extrabold text-gray-900">
              Hapus Kategori? ⚠️
            </h3>

            <p className="mb-4 text-xs text-gray-500 leading-relaxed">
              Menghapus kategori ini juga dapat berdampak pada item yang terhubung di dalamnya.
            </p>
            <p className="mb-6 text-sm font-semibold text-gray-800">
              Yakin ingin menghapus kategori{" "}
              <span className="text-[#8B5E3C]">
                "{translateCategoryName(selectedCategory.name)}"
              </span>
              ?
            </p>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 rounded-2xl bg-gray-100 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                className="flex-1 rounded-2xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition shadow-md"
              >
                Hapus
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}

/** Komponen overlay modal sederhana */
function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-50 w-full flex justify-center pointer-events-auto">
        {children}
      </div>
    </div>
  );
}