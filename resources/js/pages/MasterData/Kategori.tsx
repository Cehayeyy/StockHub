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

  const titleDivisionLabel = staffDivision === "bar" ? "Bar" : "Dapur";

  return (
    <AppLayout header={`Kategori ${titleDivisionLabel}`}>
      <Head title={`Kategori ${titleDivisionLabel}`} />

      <div className="space-y-6">
        <div className="rounded-3xl bg-[#FFFFFF] p-4 md:p-8 shadow-inner">
          <div className="rounded-3xl bg-[#FFFFFF] p-4 md:p-6 shadow border border-gray-100 min-h-[500px] flex flex-col">
            {/* HEADER */}
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <h2 className="text-2xl font-semibold text-[#8B5E3C]">
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
                      className="flex w-full items-center justify-between rounded-full bg-[#F6E1C6] px-4 py-2 text-sm font-medium text-[#7A4A2B] shadow-sm"
                    >
                      <span className="capitalize">{titleDivisionLabel}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          showDivisionDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showDivisionDropdown && (
                      <div className="absolute left-0 z-20 mt-1 w-full rounded-2xl bg-[#E7BE8B] py-1 text-sm shadow-lg">
                        <button
                          type="button"
                          onClick={() => changeDivision("bar")}
                          className={`block w-full rounded-t-2xl px-4 py-2 text-left ${
                            serverDivision === "bar"
                              ? "bg-[#F6E1C6] font-semibold"
                              : ""
                          }`}
                        >
                          Bar
                        </button>
                        <button
                          type="button"
                          onClick={() => changeDivision("dapur")}
                          className={`block w-full rounded-b-2xl px-4 py-2 text-left ${
                            serverDivision === "dapur"
                              ? "bg-[#F6E1C6] font-semibold"
                              : ""
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
                    className="flex items-center justify-center gap-2 rounded-full bg-[#C19A6B] px-6 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#a8855a] w-full md:w-auto"
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
                    className="w-full md:w-56 rounded-full border border-[#E5C39C] bg-[#FDF3E4] px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#E5C39C]"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#C38E5F]">
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
            <div className="hidden md:block rounded-lg border border-gray-200 bg-white overflow-hidden">
              <table className="min-w-full table-auto text-left text-sm">
                <thead className="border-b bg-gray-100 text-xs font-semibold uppercase text-gray-700">
                  <tr>
                    <th className="w-16 px-4 py-3">No</th>
                    <th className="px-4 py-3">Nama Kategori</th>
                    <th className="w-40 px-4 py-3">Jumlah item</th>
                    <th className="w-48 px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-gray-500"
                      >
                        Belum ada kategori untuk divisi ini.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((cat) => (
                      <tr
                        key={cat.id}
                        className="border-b last:border-0 hover:bg-[#FFF7EC]"
                      >
                        <td className="px-4 py-3">{cat.no}</td>
                        <td className="px-4 py-3">
                          {translateCategoryName(cat.name)}
                        </td>
                        <td className="px-4 py-3">
                          {cat.total_items} Bahan
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {/* VIEW – BOLEH UNTUK SEMUA */}
                            <button
                              type="button"
                              onClick={() => openViewModal(cat)}
                              className="rounded-full bg-[#1D8CFF] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0f6fd1]"
                            >
                              view
                            </button>

                            {/* EDIT & HAPUS – KHUSUS NON STAFF */}
                            {!isStaff && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(cat)}
                                  className="rounded-full bg-[#1D8CFF] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0f6fd1]"
                                >
                                  edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteModal(cat)}
                                  className="rounded-full bg-[#FF4B4B] px-3 py-1 text-xs font-semibold text-white hover:bg-[#e03535]"
                                >
                                  hapus
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

      {/* MODAL: TAMBAH */}
      {addModalOpen && (
        <Modal onClose={() => setAddModalOpen(false)}>
          <form
            onSubmit={handleAddCategory}
            className="w-full max-w-sm md:max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-xl"
          >
            <h3 className="mb-6 text-center text-xl md:text-2xl font-semibold text-gray-800">
              Tambah Kategori
            </h3>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nama kategori
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-[#F1F1F1] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#DABA93]"
              />
            </div>

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="flex-1 rounded-xl bg-[#E5E5E5] py-2 text-sm font-semibold text-gray-700 hover:bg-[#d5d5d5]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-[#16C172] py-2 text-sm font-semibold text-white hover:bg-[#12a55f]"
              >
                Tambah
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
            className="w-full max-w-sm md:max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-xl"
          >
            <h3 className="mb-6 text-center text-xl md:text-2xl font-semibold text-gray-800">
              Edit Kategori
            </h3>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nama kategori
              </label>
              <input
                type="text"
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-[#F1F1F1] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#DABA93]"
              />
            </div>

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="flex-1 rounded-xl bg-[#E5E5E5] py-2 text-sm font-semibold text-gray-700 hover:bg-[#d5d5d5]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-[#1D8CFF] py-2 text-sm font-semibold text-white hover:bg-[#0f6fd1]"
              >
                Simpan
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: VIEW */}
      {viewModalOpen && selectedCategory && (
        <Modal onClose={() => setViewModalOpen(false)}>
          <div className="w-full max-w-sm md:max-w-lg rounded-3xl bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-semibold text-gray-800">
                Detail Kategori{" "}
                {translateCategoryName(selectedCategory.name)}
              </h3>
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <table className="min-w-full table-auto text-sm">
                <thead className="bg-gray-100 text-xs font-semibold uppercase text-gray-700">
                  <tr>
                    <th className="w-16 px-4 py-3">No</th>
                    <th className="px-4 py-3">Nama item</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCategory.items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-4 py-4 text-center text-gray-500"
                      >
                        Belum ada item di kategori ini.
                      </td>
                    </tr>
                  ) : (
                    selectedCategory.items.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={
                          idx % 2 === 0 ? "bg-[#FFF3E0]" : "bg-white"
                        }
                      >
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2">{item.nama}</td>
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
          <div className="w-full max-w-sm md:max-w-lg rounded-3xl bg-white p-6 md:p-8 shadow-xl">
            <h3 className="mb-4 text-center text-xl font-semibold text-gray-800">
              Hapus Kategori..? <span className="ml-1">⚠️</span>
            </h3>

            <p className="mb-4 text-center text-sm text-gray-700">
              Menghapus kategori dapat menghapus juga item yang memakai
              kategori ini (sesuai logika di backend).
            </p>
            <p className="mb-8 text-center text-sm text-gray-700">
              Apakah Anda yakin ingin menghapus kategori{" "}
              <span className="font-semibold">
                "{translateCategoryName(selectedCategory.name)}"
              </span>
              ?
            </p>

            <div className="flex justify-between gap-4">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 rounded-xl bg-[#E5E5E5] py-2 text-sm font-semibold text-gray-700 hover:bg-[#d5d5d5]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                className="flex-1 rounded-xl bg-[#FF4B4B] py-2 text-sm font-semibold text-white hover:bg-[#e03535]"
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
