import React, { useState, useMemo, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Search, ChevronDown, Plus, Package, Trash2, X } from "lucide-react"; // Ditambahkan Trash2 dan X

type Division = "bar" | "dapur";

type ItemCategory = {
  id: number;
  name: string;
};

type Item = {
  id: number;
  division: Division;
  nama: string;
  satuan?: string | null;
  item_category_id?: number | null;
  item_category?: {
    id: number;
    name: string;
  } | null;
};

type PaginatedItems = {
  data: Item[];
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
  current_page: number;
  per_page: number;
};

type PageProps = {
  items?: PaginatedItems;
  division: Division;
  categories?: ItemCategory[];
  auth: {
    user: {
      role: string;
      division: Division;
    };
  };
} & Record<string, any>;

// --- INTERFACE UNTUK MULTI INPUT ---
interface FormItem {
  uid: number; // ID Unik untuk React Key
  nama: string;
  item_category_id: number | string;
}

const translateCategoryName = (name: string) => {
  const lower = name.toLowerCase();
  if (lower === "finish") return "Menu";
  if (lower === "raw") return "Mentah";
  return name;
};

const sortCategories = (categories: ItemCategory[]) => {
  const BASE_ORDER = ["finish", "raw"];
  const baseSlots: (ItemCategory | undefined)[] = [];
  const others: ItemCategory[] = [];

  categories.forEach((cat) => {
    const idx = BASE_ORDER.indexOf(cat.name.toLowerCase());
    if (idx !== -1) baseSlots[idx] = cat;
    else others.push(cat);
  });

  others.sort((a, b) =>
    translateCategoryName(a.name).localeCompare(
      translateCategoryName(b.name),
      "id"
    )
  );

  return [...baseSlots.filter(Boolean), ...others] as ItemCategory[];
};

export default function ItemPage() {
  const { items, division: initialDivision, categories, auth } =
    usePage<PageProps>().props;

  // --- LOGIKA ROLE & DIVISION (MERGED) ---
  const role = auth?.user?.role;
  const isStaff = role === "bar" || role === "dapur";
  const userDivision = isStaff ? (role as Division) : null;

  const safeItems: PaginatedItems = {
    data: items?.data ?? [],
    links: items?.links ?? [],
    current_page: items?.current_page ?? 1,
    per_page: items?.per_page ?? 10,
  };

  const safeCategories = categories ?? [];

  const [division, setDivision] = useState<Division>(
    isStaff && userDivision ? userDivision : initialDivision ?? "bar"
  );
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);

  const [search, setSearch] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // --- 🔥 STATE BARU UNTUK MULTI INPUT FORM 🔥 ---
  const [formItems, setFormItems] = useState<FormItem[]>([
    { uid: Date.now(), nama: "", item_category_id: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedCategories = useMemo(
    () => sortCategories(safeCategories),
    [safeCategories]
  );

  const filteredItems = useMemo(
    () =>
      safeItems.data.filter((item) =>
        (item.nama ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [safeItems.data, search]
  );

  const changeDivision = (value: Division) => {
    setDivision(value);
    setShowDivisionDropdown(false);

    router.get(
      route("item.index"),
      { division: value },
      { preserveScroll: true, preserveState: true, replace: true }
    );
  };

  // --- 🔥 FUNGSI MULTI INPUT ROW 🔥 ---
  const openModalAdd = () => {
    setEditId(null);
    setFormItems([{ uid: Date.now(), nama: "", item_category_id: "" }]);
    setOpenModal(true);
  };

  const handleEdit = (item: Item) => {
    setEditId(item.id);
    setDivision(item.division);
    // Saat edit, paksa array hanya berisi 1 item
    setFormItems([{
      uid: Date.now(),
      nama: item.nama,
      item_category_id: item.item_category_id ?? ""
    }]);
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditId(null);
    setFormItems([{ uid: Date.now(), nama: "", item_category_id: "" }]);
  };

  const handleAddRow = () => {
    setFormItems([...formItems, { uid: Date.now(), nama: "", item_category_id: "" }]);
  };

  const handleRemoveRow = (uid: number) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter(item => item.uid !== uid));
    }
  };

  const handleFormChange = (uid: number, field: keyof FormItem, value: any) => {
    setFormItems(formItems.map(item =>
      item.uid === uid ? { ...item, [field]: value } : item
    ));
  };

  // --- FUNGSI SUBMIT (SINGLE & MULTIPLE) ---
  const submitItem = async (e?: React.FormEvent<HTMLFormElement> | any) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    // Validasi kosong
    const invalid = formItems.some(i => !i.nama.trim() || !i.item_category_id);
    if (invalid) {
      alert("Pastikan semua baris telah diisi Nama Item dan Kategorinya!");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editId) {
        // MODE EDIT (Hanya 1 Baris)
        await new Promise<void>((resolve, reject) => {
          router.put(route("item.update", editId), {
            division,
            nama: formItems[0].nama,
            item_category_id: formItems[0].item_category_id,
            satuan: "porsi",
          }, {
            onSuccess: () => resolve(),
            onError: (err) => reject(err)
          });
        });
      } else {
        // MODE TAMBAH (Banyak Baris, Looping Request)
        for (const item of formItems) {
          await new Promise<void>((resolve, reject) => {
            router.post(route("item.store"), {
              division,
              nama: item.nama,
              item_category_id: item.item_category_id,
              satuan: "porsi",
            }, {
              preserveState: true,
              preserveScroll: true,
              onSuccess: () => resolve(),
              onError: (err) => reject(err)
            });
          });
        }
      }

      setIsSubmitting(false);
      closeModal();
      // Optional: Refresh untuk merefresh pagination
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      setIsSubmitting(false);
      alert("Terjadi kesalahan saat menyimpan data.");
    }
  };

  // --- DELETE MODAL ---
  const openDeleteConfirm = (id: number) => {
    setDeleteId(id);
    setOpenDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    router.delete(route("item.destroy", deleteId), {
      onSuccess: () => setOpenDeleteModal(false),
    });
  };

  // --- UPDATE LOGIKA ENTER (HAPUS/SIMPAN) & ESC (BATAL) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (openDeleteModal) {
        if (e.key === "Enter") {
          e.preventDefault();
          confirmDelete();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setOpenDeleteModal(false);
        }
      }
      else if (openModal) {
        if (e.key === "Enter") {
          e.preventDefault();
          submitItem(); // Panggil submit tanpa e untuk form multi
        } else if (e.key === "Escape") {
          e.preventDefault();
          closeModal();
        }
      }
    };

    if (openDeleteModal || openModal) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDeleteModal, deleteId, openModal, formItems, division, editId, isSubmitting]);

  return (
    <AppLayout header="Item">
      <Head title="Item" />

      <div className="py-6">
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-inner min-h-[600px] flex flex-col">

          {/* --- FILTER & HEADER --- */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            {/* Division Dropdown */}
            {!isStaff ? (
              <div className="relative inline-block w-full md:w-40">
                <button
                  type="button"
                  onClick={() => setShowDivisionDropdown((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-full bg-[#F6E1C6] px-4 py-2 text-sm font-medium text-[#7A4A2B]"
                >
                  <span className="capitalize">
                    {division === "bar" ? "Bar" : "Dapur"}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showDivisionDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showDivisionDropdown && (
                  <div className="absolute left-0 mt-1 w-full rounded-2xl bg-[#E7BE8B] py-1 text-sm z-20 shadow-lg">
                    <button
                      onClick={() => changeDivision("bar")}
                      className={`block w-full px-4 py-2 text-left ${
                        division === "bar" ? "bg-[#F6E1C6] font-semibold" : ""
                      }`}
                    >
                      Bar
                    </button>
                    <button
                      onClick={() => changeDivision("dapur")}
                      className={`block w-full px-4 py-2 text-left ${
                        division === "dapur" ? "bg-[#F6E1C6] font-semibold" : ""
                      }`}
                    >
                      Dapur
                    </button>
                  </div>
                )}
              </div>
            ) : (
                <div className="px-4 py-2 rounded-full bg-[#F6E1C6] text-sm font-medium text-[#7A4A2B] capitalize w-fit">
                  {division}
                </div>
            )}

            {/* Add & Search */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
              {!isStaff && (
                  <button
                    onClick={openModalAdd}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#C19A6B] px-6 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#a8855a] w-full md:w-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Item
                  </button>
              )}

              <div className="relative w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search...."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    router.get(
                      route("item.index"),
                      { division, search: e.target.value },
                      { preserveScroll: true, preserveState: true }
                    );
                  }}
                  className="w-full md:w-64 rounded-full border border-[#E5C39C] bg-[#FDF3E4] px-4 py-2 pr-10 text-sm focus:ring-[#D9A978]"
                />
                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#C38E5F]" />
              </div>
            </div>
          </div>

          {/* --- MOBILE VIEW (CARDS) --- */}
          <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
              {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                      <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-3">
                                  <div className="bg-orange-50 p-2 rounded-lg text-[#D9A978]">
                                      <Package className="w-5 h-5" />
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-gray-800 text-sm">{item.nama}</h4>
                                      <span className="text-xs text-gray-500">
                                          {item.item_category ? translateCategoryName(item.item_category.name) : "-"}
                                      </span>
                                  </div>
                              </div>
                              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                                  {item.satuan ?? "porsi"}
                              </span>
                          </div>

                          {!isStaff && (
                              <div className="flex gap-2 border-t pt-3 mt-3">
                                  <button
                                      onClick={() => handleEdit(item)}
                                      className="flex-1 bg-[#1D8CFF] text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#166ac4] transition text-center"
                                  >
                                      Edit
                                  </button>
                                  <button
                                      onClick={() => openDeleteConfirm(item.id)}
                                      className="flex-1 bg-[#FF4B4B] text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[#e03535] transition text-center"
                                  >
                                      Hapus
                                  </button>
                              </div>
                          )}
                      </div>
                  ))
              ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-gray-500 text-sm">Tidak ada item ditemukan</p>
                  </div>
              )}
          </div>

          {/* --- DESKTOP VIEW (TABLE) --- */}
          <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-gray-100 bg-white mb-6">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-[#F3F3F3] text-gray-700 font-semibold border-b">
                <tr>
                  <th className="p-3 border-r text-center w-16">No</th>
                  <th className="p-3 border-r">Nama Item</th>
                  <th className="p-3 border-r w-40">Kategori</th>
                  <th className="p-3 border-r w-32">Satuan</th>
                  <th className="p-3 text-center w-40">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-[#FFF7EC] transition">
                      <td className="p-3 border-r text-center text-gray-500">
                          {(safeItems.current_page - 1) * safeItems.per_page + index + 1}
                      </td>
                      <td className="p-3 border-r font-medium text-gray-800">{item.nama}</td>
                      <td className="p-3 border-r text-gray-600">
                        {item.item_category
                          ? translateCategoryName(item.item_category.name)
                          : "-"}
                      </td>
                      <td className="p-3 border-r text-gray-600">
                        {item.satuan ?? "porsi"}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          {!isStaff ? (
                              <>
                                <button
                                    onClick={() => handleEdit(item)}
                                    className="bg-[#1D8CFF] text-white px-4 py-1 rounded-full text-xs font-semibold hover:bg-[#166ac4] transition"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => openDeleteConfirm(item.id)}
                                    className="bg-[#FF4B4B] text-white px-4 py-1 rounded-full text-xs font-semibold hover:bg-[#e03535] transition"
                                >
                                    Hapus
                                </button>
                              </>
                          ) : (
                              <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      Tidak ada data ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* --- PAGINATION (RESPONSIVE) --- */}
          {safeItems.links.length > 3 && (
              <div className="mt-auto flex justify-center pb-4">
                <div className="flex flex-wrap justify-center gap-1 bg-gray-50 p-1 rounded-full border border-gray-200">
                  {safeItems.links.map((link, i) => {
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
      </div>

      {/* --- MODAL ADD/EDIT MULTI INPUT --- */}
      {openModal && !isStaff && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg md:max-w-2xl rounded-3xl shadow-xl p-6 md:p-8 transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-gray-800">
              {editId ? "Edit Item" : "Tambah Item"}
            </h2>

            <form onSubmit={submitItem} className="space-y-6">

              {/* Info Divisi */}
              <div>
                <label className="block mb-1 text-xs font-bold text-gray-500 uppercase ml-1">Penempatan Divisi</label>
                <input
                  type="text"
                  readOnly
                  value={division === "bar" ? "Bar" : "Dapur"}
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 border-none text-gray-500 cursor-not-allowed font-medium"
                />
              </div>

              {/* Looping Form Items */}
              {formItems.map((item, index) => (
                <div key={item.uid} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4 relative">

                  {/* Tombol Hapus Baris (Hanya muncul jika mode Tambah & baris > 1) */}
                  {!editId && formItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(item.uid)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-gray-700">
                      {editId ? "Data Item" : `Item #${index + 1}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1 text-xs font-bold text-gray-700 ml-1">
                        Nama Item
                      </label>
                      <input
                        type="text"
                        value={item.nama}
                        onChange={(e) => handleFormChange(item.uid, 'nama', e.target.value)}
                        className="w-full bg-white rounded-xl px-4 py-3 border border-gray-200 focus:ring-2 focus:ring-[#D9A978] outline-none"
                        placeholder="Contoh: Gula Pasir"
                        required
                        autoFocus={index === formItems.length - 1}
                      />
                    </div>

                    <div className="relative">
                      <label className="block mb-1 text-xs font-bold text-gray-700 ml-1">
                        Kategori Item
                      </label>
                      <select
                        value={item.item_category_id}
                        onChange={(e) => handleFormChange(item.uid, 'item_category_id', e.target.value)}
                        className="w-full appearance-none bg-white rounded-xl px-4 py-3 border border-gray-200 focus:ring-2 focus:ring-[#D9A978] outline-none text-gray-700"
                        required
                      >
                        <option value="">Pilih Kategori...</option>
                        {sortedCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {translateCategoryName(cat.name)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-4 top-10 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-bold text-gray-700 ml-1">
                      Satuan Dasar
                    </label>
                    <input
                      type="text"
                      value="porsi"
                      readOnly
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 border border-gray-200 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              ))}

              {/* Tombol Tambah Baris (Hanya muncul saat mode Tambah) */}
              {!editId && (
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="w-full py-3 border-2 border-dashed border-[#D9A978] rounded-xl text-[#D9A978] font-bold text-sm hover:bg-[#D9A978]/5 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Tambah Item Lainnya
                </button>
              )}

              <div className="flex justify-end pt-4 gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 bg-gray-200 rounded-full text-gray-700 font-semibold hover:bg-gray-300 transition text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-full font-bold text-white shadow-md text-sm transition ${
                    isSubmitting ? "bg-[#e0c09e] cursor-not-allowed" : "bg-[#D9A978] hover:bg-[#c4925e]"
                  }`}
                >
                  {isSubmitting ? "Menyimpan..." : (editId ? "Simpan Update" : "Simpan Semua")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DELETE --- */}
      {openDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Hapus Item?
            </h2>

            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Tindakan ini akan menghapus data item secara permanen.
            </p>

            <div className="flex justify-center gap-4">
              <button
                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-gray-700 font-semibold hover:bg-gray-200 transition"
                onClick={() => setOpenDeleteModal(false)}
              >
                Batal
              </button>

              <button
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-semibold shadow-md hover:bg-red-600 transition"
                onClick={confirmDelete}
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
