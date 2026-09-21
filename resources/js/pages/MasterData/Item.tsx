import React, { useMemo, useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router, Link } from "@inertiajs/react";
import { Search, ChevronDown, Plus, Package, Trash2, X, Edit } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";

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
  harga_dasar?: number | string | null;
  item_category_id?: number | null;
  item_category?: {
    id: number;
    name: string;
  } | null;
  kategori_item?: string | null;
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

interface FormItem {
  uid: number; 
  nama: string;
  item_category_id: number | string;
  harga_dasar?: number | string;
}

const translateCategoryName = (name: string) => {
  const lower = name.toLowerCase();
  if (lower === "finish") return "Menu";
  if (lower === "raw") return "Mentah";
  return name;
};

const isCategoryMentah = (categoryName?: string | null) => {
  if (!categoryName) return false;
  const lower = translateCategoryName(categoryName).trim().toLowerCase();
  return lower === "mentah" || lower === "raw";
};

const formatRupiah = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return `Rp ${new Intl.NumberFormat("id-ID").format(num)}`;
};

const cleanNumericInput = (val: string) => {
  return val.replace(/[^0-9]/g, "");
};

const formatNumberDisplay = (val: string | number | undefined | null) => {
  if (val === undefined || val === null || val === "") return "";
  const clean = String(val).replace(/[^0-9]/g, "");
  if (!clean) return "";
  return new Intl.NumberFormat("id-ID").format(Number(clean));
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

  const [formItems, setFormItems] = useState<FormItem[]>([
    { uid: Date.now(), nama: "", item_category_id: "", harga_dasar: "" }
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

  const openModalAdd = () => {
    setEditId(null);
    setFormItems([{ uid: Date.now(), nama: "", item_category_id: "", harga_dasar: "" }]);
    setOpenModal(true);
  };

  const handleEdit = (item: Item) => {
    setEditId(item.id);
    setDivision(item.division);

    const itemCat = safeCategories.find(c => c.id === item.item_category_id) || item.item_category;
    const isMentah = isCategoryMentah(itemCat?.name ?? item.kategori_item);

    setFormItems([{
      uid: Date.now(),
      nama: item.nama,
      item_category_id: item.item_category_id ?? "",
      harga_dasar: isMentah && item.harga_dasar != null ? String(item.harga_dasar).replace(/\.00$/, '') : "",
    }]);
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditId(null);
    setFormItems([{ uid: Date.now(), nama: "", item_category_id: "", harga_dasar: "" }]);
  };

  const handleAddRow = () => {
    setFormItems([...formItems, { uid: Date.now(), nama: "", item_category_id: "", harga_dasar: "" }]);
  };

  const handleRemoveRow = (uid: number) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter(item => item.uid !== uid));
    }
  };

  const handleFormChange = (uid: number, field: keyof FormItem, value: any) => {
    setFormItems(formItems.map(item => {
      if (item.uid !== uid) return item;

      if (field === 'item_category_id') {
        const selectedCat = safeCategories.find(c => String(c.id) === String(value));
        const isMentah = isCategoryMentah(selectedCat?.name);
        return {
          ...item,
          item_category_id: value,
          harga_dasar: isMentah ? item.harga_dasar : "",
        };
      }

      return { ...item, [field]: value };
    }));
  };

  const submitItem = async (e?: React.FormEvent<HTMLFormElement> | any) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const invalid = formItems.some(i => !i.nama.trim() || !i.item_category_id);
    if (invalid) {
      alert("Pastikan semua baris telah diisi Nama Item dan Kategorinya!");
      return;
    }

    for (const i of formItems) {
      const selectedCat = safeCategories.find(c => String(c.id) === String(i.item_category_id));
      const isMentah = isCategoryMentah(selectedCat?.name);
      if (isMentah) {
        const cleanPrice = String(i.harga_dasar ?? "").replace(/[^0-9]/g, "");
        if (!cleanPrice) {
          alert(`Item "${i.nama || 'Mentah'}" memiliki kategori Mentah, Harga Dasar wajib diisi!`);
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      if (editId) {
        const selectedCat = safeCategories.find(c => String(c.id) === String(formItems[0].item_category_id));
        const isMentah = isCategoryMentah(selectedCat?.name);
        const cleanPrice = isMentah ? String(formItems[0].harga_dasar ?? "").replace(/[^0-9]/g, "") : null;

        await new Promise<void>((resolve, reject) => {
          router.put(route("item.update", editId), {
            division,
            nama: formItems[0].nama,
            item_category_id: formItems[0].item_category_id,
            satuan: "porsi",
            harga_dasar: isMentah ? (cleanPrice !== null && cleanPrice !== "" ? Number(cleanPrice) : null) : null,
          }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => resolve(),
            onError: (err) => reject(err)
          });
        });
      } else {
        for (const item of formItems) {
          const selectedCat = safeCategories.find(c => String(c.id) === String(item.item_category_id));
          const isMentah = isCategoryMentah(selectedCat?.name);
          const cleanPrice = isMentah ? String(item.harga_dasar ?? "").replace(/[^0-9]/g, "") : null;

          await new Promise<void>((resolve, reject) => {
            router.post(route("item.store"), {
              division,
              nama: item.nama,
              item_category_id: item.item_category_id,
              satuan: "porsi",
              harga_dasar: isMentah ? (cleanPrice !== null && cleanPrice !== "" ? Number(cleanPrice) : null) : null,
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
      window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    } catch (error) {
      setIsSubmitting(false);
      alert("Terjadi kesalahan saat menyimpan data.");
    }
  };

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
          submitItem(); 
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
        <div className="bg-[#F2ECE4] p-4 md:p-8 rounded-3xl shadow-sm border border-amber-200/60 min-h-[600px] flex flex-col">

          {/* --- FILTER & HEADER --- */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            {/* Division Dropdown */}
            {!isStaff ? (
              <div className="relative inline-block w-full md:w-40">
                <button
                  type="button"
                  onClick={() => setShowDivisionDropdown((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-xl bg-[#FDF3E4] px-4 py-2.5 text-sm font-bold text-[#8B5E3C] border border-amber-100 shadow-2xs"
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
                  <div className="absolute left-0 mt-1 w-full rounded-2xl bg-white py-1.5 text-sm z-20 shadow-xl border border-gray-100">
                    <button
                      onClick={() => changeDivision("bar")}
                      className={`block w-full px-4 py-2 text-left font-semibold transition ${
                        division === "bar" ? "bg-[#FDF3E4] text-[#8B5E3C]" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Bar
                    </button>
                    <button
                      onClick={() => changeDivision("dapur")}
                      className={`block w-full px-4 py-2 text-left font-semibold transition ${
                        division === "dapur" ? "bg-[#FDF3E4] text-[#8B5E3C]" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      Dapur
                    </button>
                  </div>
                )}
              </div>
            ) : (
                <div className="px-4 py-2.5 rounded-xl bg-[#FDF3E4] text-sm font-bold text-[#8B5E3C] border border-amber-100 capitalize w-fit shadow-2xs">
                  {division}
                </div>
            )}

            {/* Add & Search */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
              {!isStaff && (
                  <button
                    onClick={openModalAdd}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#D9A978] px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-[#c4925e] transition w-full md:w-auto"
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
                  className="w-full md:w-64 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                />
                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {/* --- MOBILE VIEW (CARDS) --- */}
          <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
              {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                      const isMentah = isCategoryMentah(
                        item.item_category?.name ?? item.kategori_item
                      );

                      return (
                      <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
                          <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-3">
                                  <div className="bg-[#D9A978]/15 text-[#8B5E3C] p-2.5 rounded-xl shadow-inner">
                                      <Package className="w-5 h-5" />
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-gray-800 text-sm">{item.nama}</h4>
                                      <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-xs text-gray-500 font-medium">
                                              {item.item_category ? translateCategoryName(item.item_category.name) : "-"}
                                          </span>
                                          {isMentah && (
                                              <span className="text-xs font-bold text-[#8B5E3C] bg-[#FDF3E4] px-2 py-0.5 rounded-full border border-amber-100">
                                                  {formatRupiah(item.harga_dasar)}
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              </div>
                              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-xl">
                                  {item.satuan ?? "porsi"}
                              </span>
                          </div>

                          {!isStaff && (
                              <div className="flex gap-2 border-t border-gray-100 pt-3 mt-3">
                                  <button
                                      onClick={() => handleEdit(item)}
                                      className="flex-1 flex items-center justify-center gap-1 bg-blue-50 text-blue-600 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition shadow-xs"
                                  >
                                      <Edit className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <button
                                      onClick={() => openDeleteConfirm(item.id)}
                                      className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-600 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-red-100 transition shadow-xs"
                                  >
                                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                                  </button>
                              </div>
                          )}
                      </div>
                      );
                  })
              ) : (
                  <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm italic">Tidak ada item ditemukan</p>
                  </div>
              )}
          </div>

          {/* --- DESKTOP VIEW (TABLE) --- */}
          <div className="hidden md:block w-full rounded-2xl border border-gray-100 bg-white shadow-xs overflow-hidden flex-1 mb-6">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#FAF7F2]/80 text-gray-500 font-bold uppercase text-[11px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 w-16 text-center">No</th>
                    <th className="px-6 py-4">Nama Item</th>
                    <th className="px-6 py-4 w-40">Kategori</th>
                    <th className="px-6 py-4 w-32">Satuan</th>
                    <th className="px-6 py-4 w-40 text-right">Harga Dasar</th>
                    <th className="px-6 py-4 text-center w-48">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item, index) => {
                      const isMentah = isCategoryMentah(
                        item.item_category?.name ?? item.kategori_item
                      );

                      return (
                      <tr key={item.id} className="hover:bg-[#FDF3E4]/50 transition-colors duration-150">
                        <td className="px-6 py-4 text-center text-gray-400 font-medium">
                            {(safeItems.current_page - 1) * safeItems.per_page + index + 1}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-800">{item.nama}</td>
                        <td className="px-6 py-4 text-gray-600 font-medium">
                          {item.item_category
                            ? translateCategoryName(item.item_category.name)
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-medium">
                          {item.satuan ?? "porsi"}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-700">
                          {isMentah ? formatRupiah(item.harga_dasar) : "-"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            {!isStaff ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(item)}
                                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100 transition shadow-xs flex items-center gap-1"
                                >
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteConfirm(item.id)}
                                  className="px-3.5 py-1.5 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-100 transition shadow-xs flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                                </button>
                              </>
                            ) : (
                              <span className="text-gray-400 text-xs italic">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                        Tidak ada data ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- PAGINATION (RESPONSIVE) --- */}
          {safeItems.links.length > 3 && (
              <div className="mt-auto flex justify-center pb-4 pt-2">
                <div className="flex flex-wrap justify-center gap-1 bg-white p-1 rounded-full border border-gray-100 shadow-xs">
                  {safeItems.links.map((link, i) => {
                    let label = link.label;
                    if (label.includes('&laquo;')) label = 'Prev';
                    if (label.includes('&raquo;')) label = 'Next';

                    return (
                      <Link
                        key={i}
                        href={link.url || '#'}
                        preserveScroll
                        className={`px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition-all ${
                          link.active
                            ? "bg-[#D9A978] text-white shadow-xs"
                            : "text-gray-600 hover:bg-gray-50 hover:text-[#8B5E3C]"
                        } ${!link.url ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white w-full max-w-lg md:max-w-3xl rounded-3xl shadow-2xl p-6 md:p-8 transform transition-all max-h-[90vh] overflow-y-auto border border-gray-100">
            <h2 className="text-xl md:text-2xl font-extrabold text-center mb-6 text-gray-800">
              {editId ? "Edit Item" : "Tambah Item Baru"}
            </h2>

            <form onSubmit={submitItem} className="space-y-6">

              {/* Info Divisi */}
              <div>
                <label className="block mb-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Penempatan Divisi</label>
                <input
                  type="text"
                  readOnly
                  value={division === "bar" ? "Bar" : "Dapur"}
                  className="w-full bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200 text-gray-500 cursor-not-allowed font-medium text-sm"
                />
              </div>

              {/* Looping Form Items */}
              {formItems.map((item, index) => {
                const selectedCat = safeCategories.find(c => String(c.id) === String(item.item_category_id));
                const isMentah = isCategoryMentah(selectedCat?.name);

                return (
                <div key={item.uid} className="bg-white border border-gray-200/80 rounded-3xl p-5 space-y-4 relative shadow-xs">

                  {/* Tombol Hapus Baris */}
                  {!editId && formItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(item.uid)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-extrabold text-[#8B5E3C] uppercase tracking-wider">
                      {editId ? "Data Item" : `Item #${index + 1}`}
                    </span>
                  </div>

                  <div className={`grid grid-cols-1 ${isMentah ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">
                        Nama Item
                      </label>
                      <input
                        type="text"
                        value={item.nama}
                        onChange={(e) => handleFormChange(item.uid, 'nama', e.target.value)}
                        className="w-full bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200 focus:ring-2 focus:ring-[#8B5E3C] focus:border-transparent outline-none text-sm font-medium"
                        placeholder="Contoh: Sambal"
                        required
                        autoFocus={index === formItems.length - 1}
                      />
                    </div>

                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">
                        Kategori Item
                      </label>
                      <CustomSelect
                        value={item.item_category_id}
                        onChange={(val) => handleFormChange(item.uid, 'item_category_id', val)}
                        options={sortedCategories.map((cat) => ({
                          value: cat.id,
                          label: translateCategoryName(cat.name),
                        }))}
                        placeholder="Pilih Kategori..."
                        buttonClassName="bg-gray-50 py-3 rounded-2xl border-gray-200 text-sm"
                      />
                    </div>

                    {isMentah && (
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">
                          Harga Dasar <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                            Rp
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatNumberDisplay(item.harga_dasar)}
                            onChange={(e) => {
                              const rawVal = cleanNumericInput(e.target.value);
                              handleFormChange(item.uid, 'harga_dasar', rawVal);
                            }}
                            className="w-full bg-gray-50 rounded-2xl pl-12 pr-4 py-3 border border-gray-200 focus:ring-2 focus:ring-[#8B5E3C] focus:border-transparent outline-none font-bold text-gray-800 text-sm"
                            placeholder="0"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">
                      Satuan Dasar
                    </label>
                    <input
                      type="text"
                      value="porsi"
                      readOnly
                      className="w-full bg-gray-100 rounded-2xl px-4 py-3 border border-gray-200 text-gray-500 cursor-not-allowed text-sm font-medium"
                    />
                  </div>
                </div>
                );
              })}

              {/* Tombol Tambah Baris */}
              {!editId && (
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="w-full py-3.5 border-2 border-dashed border-[#D9A978] rounded-2xl text-[#8B5E3C] font-bold text-sm hover:bg-[#D9A978]/10 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Tambah Item Lainnya
                </button>
              )}

              <div className="flex justify-between pt-4 gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 bg-gray-100 rounded-2xl text-gray-700 font-bold hover:bg-gray-200 transition text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-3 rounded-2xl font-bold text-white shadow-md text-sm transition ${
                    isSubmitting ? "bg-[#e0c09e] cursor-not-allowed" : "bg-[#8B5E3C] hover:bg-[#6F4E37]"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center border border-gray-100">
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">
              Hapus Item? ⚠️
            </h2>

            <p className="text-gray-500 text-xs mb-6 leading-relaxed">
              Tindakan ini akan menghapus data item secara permanen dari sistem.
            </p>

            <div className="flex justify-between gap-3">
              <button
                className="flex-1 px-4 py-2.5 bg-gray-100 rounded-2xl text-gray-700 font-bold hover:bg-gray-200 transition text-sm"
                onClick={() => setOpenDeleteModal(false)}
              >
                Batal
              </button>

              <button
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-2xl font-bold shadow-md hover:bg-red-600 transition text-sm"
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