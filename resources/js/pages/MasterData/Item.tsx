import React, { useState, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Search, ChevronDown } from "lucide-react";

type Division = "bar" | "kitchen";

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
};

type PageProps = {
  items?: PaginatedItems;   // ← dibuat optional supaya tidak undefined
  division: Division;
  categories?: ItemCategory[];
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
  const { items, division: initialDivision, categories } =
    usePage<PageProps>().props;

  // --- FIX: fallback aman untuk semua props ---
  const safeItems: PaginatedItems = {
    data: items?.data ?? [],
    links: items?.links ?? [],
  };

  const safeCategories = categories ?? [];

  const [division, setDivision] = useState<Division>(initialDivision ?? "bar");
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
        <div className="bg-white p-6 rounded-3xl shadow-inner">
          {/* FILTER */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            {/* Division */}
            <div className="relative inline-block w-40">
              <button
                type="button"
                onClick={() => {
                  setShowDivisionDropdown((prev) => !prev);
                  setShowKategoriDropdown(false);
                }}
                className="flex w-full items-center justify-between rounded-full bg-[#F6E1C6] px-4 py-2 text-sm font-medium text-[#7A4A2B]"
              >
                <span className="capitalize">
                  {division === "bar" ? "Bar" : "Kitchen"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showDivisionDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showDivisionDropdown && (
                <div className="absolute left-0 mt-1 w-full rounded-2xl bg-[#E7BE8B] py-1 text-sm z-20">
                  <button
                    onClick={() => changeDivision("bar")}
                    className={`block w-full px-4 py-2 text-left ${
                      division === "bar" ? "bg-[#F6E1C6] font-semibold" : ""
                    }`}
                  >
                    Bar
                  </button>
                  <button
                    onClick={() => changeDivision("kitchen")}
                    className={`block w-full px-4 py-2 text-left ${
                      division === "kitchen"
                        ? "bg-[#F6E1C6] font-semibold"
                        : ""
                    }`}
                  >
                    Kitchen
                  </button>
                </div>
              )}
            </div>

            {/* Add + Search */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <button
                onClick={() => {
                  setEditId(null);
                  setNama("");
                  setKategoriId(null);
                  setOpenModal(true);
                }}
                className="rounded-full bg-[#D9A978] px-6 py-2 text-sm text-white font-semibold"
              >
                Tambah Item
              </button>

              <div className="relative">
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

                  className="w-64 rounded-full border border-[#E5C39C] bg-[#FDF3E4] px-4 py-2 pr-10 text-sm"

                />

                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#C38E5F]" />
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="max-h-[450px] overflow-y-auto rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#F3F3F3] sticky top-0 font-semibold text-gray-700">
                <tr>
                  <th className="p-3 border text-center w-16">No</th>
                  <th className="p-3 border">Nama Item</th>
                  <th className="p-3 border w-40">Kategori</th>
                  <th className="p-3 border w-32">Satuan</th>
                  <th className="p-3 border text-center w-40">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-[#FFF7EC]">
                      <td className="p-3 border text-center">{index + 1}</td>
                      <td className="p-3 border">{item.nama}</td>
                      <td className="p-3 border">
                        {item.item_category
                          ? translateCategoryName(item.item_category.name)
                          : "-"}
                      </td>
                      <td className="p-3 border">
                        {item.satuan ?? "porsi"}
                      </td>
                      <td className="p-3 border text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="bg-[#1D8CFF] text-white px-4 py-1 rounded-full text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(item.id)}
                            className="bg-[#FF4B4B] text-white px-4 py-1 rounded-full text-xs font-semibold"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* PAGINATION */}
            <div className="flex justify-center mt-4 mb-2">
              <div className="flex gap-1">
                {safeItems.links.map((link, i) => (
                  <button
                    key={i}
                    disabled={!link.url}
                    onClick={() =>
                      link.url &&
                      router.get(link.url, {}, { preserveScroll: true })
                    }
                    className={`px-3 py-1 border rounded text-sm ${
                      link.active
                        ? "bg-[#D9A978] text-white font-semibold"
                        : "bg-white hover:bg-gray-100"
                    } ${!link.url ? "opacity-50 cursor-not-allowed" : ""}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL ADD/EDIT */}
      {openModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[460px] rounded-3xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-center mb-6">
              {editId ? "Edit Item" : "Tambah Item"}
            </h2>

            <form onSubmit={submitItem} className="space-y-5">
              <div>
                <label className="block mb-1 text-sm font-medium">
                  Nama Item
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full bg-[#EDEDED] rounded-xl p-3 border"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Divisi</label>
                <input
                  type="text"
                  readOnly
                  value={division === "bar" ? "Bar" : "Kitchen"}
                  className="w-full bg-[#EDEDED] rounded-xl p-3 border text-gray-600"
                />
              </div>

              <div className="relative">
                <label className="block mb-1 text-sm font-medium">
                  Kategori Item
                </label>

                <button
                  type="button"
                  onClick={() => setShowKategoriDropdown((prev) => !prev)}
                  className="w-full bg-[#EDEDED] rounded-xl p-3 flex justify-between items-center"
                >
                  {selectedCategory
                    ? translateCategoryName(selectedCategory.name)
                    : "Pilih"}

                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showKategoriDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showKategoriDropdown && (
                  <div className="absolute w-full bg-white rounded-xl shadow border mt-1 z-50 max-h-60 overflow-y-auto">
                    {sortedCategories.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">
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
                          className="w-full text-left px-4 py-3 hover:bg-gray-100"
                        >
                          {translateCategoryName(cat.name)}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">
                  Satuan
                </label>
                <input
                  type="text"
                  value="porsi"
                  readOnly
                  className="w-full bg-[#EDEDED] rounded-xl p-3 border opacity-70"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 bg-gray-200 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-500 text-white rounded-xl font-semibold"
                >
                  {editId ? "Update" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DELETE */}
      {openDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[460px] rounded-3xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-center mb-4">
              Hapus item..? ⚠️
            </h2>

            <p className="text-center text-gray-700 mb-2">
              Menghapus item ini dapat berdampak pada data terkait.
            </p>

            <p className="text-center text-gray-900 font-medium mb-6">
              Yakin ingin menghapus item ini?
            </p>

            <div className="flex justify-between mt-6">
              <button
                className="px-6 py-2 bg-gray-300 rounded-xl"
                onClick={() => setOpenDeleteModal(false)}
              >
                Batal
              </button>

              <button
                className="px-6 py-2 bg-red-500 text-white rounded-xl font-semibold"
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
