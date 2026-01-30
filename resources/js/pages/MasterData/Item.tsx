import React, { useState, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Search, ChevronDown, Plus, Package } from "lucide-react";

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

  // State Division: Jika staff, paksa ke divisinya. Jika admin, pakai dari props/default 'bar'
  const [division, setDivision] = useState<Division>(
    isStaff && userDivision ? userDivision : initialDivision ?? "bar"
  );
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);

  const [search, setSearch] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [nama, setNama] = useState("");
  const [kategoriId, setKategoriId] = useState<number | null>(null);
  const [showKategoriDropdown, setShowKategoriDropdown] = useState(false);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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

  const handleEdit = (item: Item) => {
    setEditId(item.id);
    setNama(item.nama);
    setDivision(item.division);
    setKategoriId(item.item_category_id ?? null);
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditId(null);
    setNama("");
    setKategoriId(null);
  };

  const submitItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!kategoriId) return;

    const payload = {
      division,
      nama,
      item_category_id: kategoriId,
      satuan: "porsi",
    };

    if (editId) {
      router.put(route("item.update", editId), payload, {
        onSuccess: () => closeModal(),
      });
    } else {
      router.post(route("item.store"), payload, {
        onSuccess: () => closeModal(),
      });
    }
  };

  const selectedCategory = kategoriId
    ? sortedCategories.find((c) => c.id === kategoriId)
    : undefined;

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
                  onClick={() => {
                    setShowDivisionDropdown((prev) => !prev);
                    setShowKategoriDropdown(false);
                  }}
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
                    onClick={() => {
                      setEditId(null);
                      setNama("");
                      setKategoriId(null);
                      setOpenModal(true);
                    }}
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
          {/* Tampil di layar kecil (< md) */}
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
          {/* Tampil di layar sedang ke atas (md:block) */}
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

      {/* --- MODAL ADD/EDIT --- */}
      {openModal && !isStaff && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl p-6 md:p-8 transform transition-all scale-100">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-gray-800">
              {editId ? "Edit Item" : "Tambah Item"}
            </h2>

            <form onSubmit={submitItem} className="space-y-5">
              <div>
                <label className="block mb-1 text-sm font-bold text-gray-700">
                  Nama Item
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 focus:ring-2 focus:ring-[#D9A978] focus:border-transparent outline-none"
                  placeholder="Masukkan nama item..."
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-bold text-gray-700">Divisi</label>
                <input
                  type="text"
                  readOnly
                  value={division === "bar" ? "Bar" : "Dapur"}
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 border border-gray-200 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div className="relative">
                <label className="block mb-1 text-sm font-bold text-gray-700">
                  Kategori Item
                </label>

                <button
                  type="button"
                  onClick={() => setShowKategoriDropdown((prev) => !prev)}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 flex justify-between items-center focus:ring-2 focus:ring-[#D9A978]"
                >
                  <span className={selectedCategory ? "text-gray-800" : "text-gray-400"}>
                    {selectedCategory
                      ? translateCategoryName(selectedCategory.name)
                      : "Pilih Kategori"}
                  </span>

                  <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform ${
                      showKategoriDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showKategoriDropdown && (
                  <div className="absolute w-full bg-white rounded-xl shadow-lg border border-gray-100 mt-2 z-50 max-h-60 overflow-y-auto">
                    {sortedCategories.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        Belum ada kategori.
                      </div>
                    ) : (
                      sortedCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setKategoriId(cat.id);
                            setShowKategoriDropdown(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-[#FFF9F0] text-sm text-gray-700 transition-colors border-b last:border-0"
                        >
                          {translateCategoryName(cat.name)}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-bold text-gray-700">
                  Satuan
                </label>
                <input
                  type="text"
                  value="porsi"
                  readOnly
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 border border-gray-200 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div className="flex justify-between pt-6 gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 bg-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-300 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-[#D9A978] text-white rounded-xl font-bold shadow-md hover:bg-[#c4925e] transition"
                >
                  {editId ? "Simpan" : "Tambah"}
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
