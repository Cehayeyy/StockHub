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

type PageProps = {
  items: Item[];
  division: Division;
  categories: ItemCategory[];
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

  const [division, setDivision] = useState<Division>(initialDivision ?? "bar");
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);

  const [search, setSearch] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [nama, setNama] = useState("");
  const [kategoriId, setKategoriId] = useState<number | null>(null);
  const [showKategoriDropdown, setShowKategoriDropdown] = useState(false);

  // === MODAL HAPUS ===
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
    () => sortCategories(categories ?? []),
    [categories]
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) =>
        (item.nama ?? "").toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
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
          {/* FILTER AREA */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Divisi Dropdown */}
            <div className="relative inline-block w-40">
              <button
                type="button"
                onClick={() => {
                  setShowDivisionDropdown((prev) => !prev);
                  setShowKategoriDropdown(false);
                }}
                className="flex w-full items-center justify-between rounded-full bg-[#F6E1C6] px-4 py-2 text-sm font-medium text-[#7A4A2B] shadow-sm"
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
                <div className="absolute left-0 mt-1 w-full rounded-2xl bg-[#E7BE8B] py-1 text-sm shadow-lg z-20">
                  <button
                    type="button"
                    onClick={() => changeDivision("bar")}
                    className={`block w-full px-4 py-2 text-left ${
                      division === "bar" ? "bg-[#F6E1C6] font-semibold" : ""
                    }`}
                  >
                    Bar
                  </button>
                  <button
                    type="button"
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

            {/* Tambah & Search */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setNama("");
                  setKategoriId(null);
                  setOpenModal(true);
                }}
                className="rounded-full bg-[#D9A978] px-6 py-2 text-sm text-white font-semibold shadow-sm hover:bg-[#c48a5c]"
              >
                Tambah Item
              </button>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search...."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 rounded-full border border-[#E5C39C] bg-[#FDF3E4] px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#E5C39C]"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#C38E5F]">
                  <Search className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-[#F3F3F3] text-gray-700 font-semibold">
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
                      <td className="p-3 border">{item.satuan ?? "porsi"}</td>

                      {/* BUTTON ACTION */}
                      <td className="p-3 border text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="bg-[#1D8CFF] text-white px-4 py-1 rounded-full text-xs font-semibold hover:bg-[#0f6fd1]"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => openDeleteConfirm(item.id)}
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
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============================
          MODAL TAMBAH / EDIT ITEM
      ============================ */}
      {openModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[460px] rounded-3xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-center mb-6">
              {editId ? "Edit Item" : "Tambah Item"}
            </h2>

            <form onSubmit={submitItem} className="space-y-5">
              {/* Nama Item */}
              <div>
                <label className="block mb-1 text-sm font-medium">
                  Nama Item
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full bg-[#EDEDED] rounded-xl p-3 border focus:outline-none focus:ring-2 focus:ring-[#DABA93]"
                  required
                />
              </div>

              {/* Divisi */}
              <div>
                <label className="block mb-1 text-sm font-medium">Divisi</label>
                <input
                  type="text"
                  readOnly
                  value={division === "bar" ? "Bar" : "Kitchen"}
                  className="w-full bg-[#EDEDED] rounded-xl p-3 border text-gray-600"
                />
              </div>

              {/* Kategori */}
              <div className="relative">
                <label className="block mb-1 text-sm font-medium">
                  Kategori Item
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setShowKategoriDropdown((prev) => !prev)
                  }
                  className="w-full bg-[#EDEDED] border rounded-xl p-3 flex justify-between items-center"
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
                        Belum ada kategori untuk divisi ini.
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

              {/* Satuan */}
              <div>
                <label className="block mb-1 text-sm font-medium">Satuan</label>
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

      {/* ============================
          MODAL HAPUS ITEM
      ============================ */}
      {openDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-[460px] rounded-3xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-center mb-4">
              Hapus item..? ⚠️
            </h2>

            <p className="text-center text-gray-700 mb-2">
              Menghapus item ini dapat menghapus juga pada data item pada resep
              dan kategori.
            </p>

            <p className="text-center text-gray-900 font-medium mb-6">
              Apakah Anda yakin ingin menghapus item ini?
            </p>

            <div className="flex justify-between mt-6">
              <button
                className="px-6 py-2 bg-gray-300 rounded-xl font-medium"
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
