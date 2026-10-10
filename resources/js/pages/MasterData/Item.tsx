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
  total?: number;
  from?: number | null;
  to?: number | null;
};

type PageProps = {
  items?: PaginatedItems;
  division: Division;
  category?: "semua" | "menu" | "mentah";
  categories?: ItemCategory[];
  search?: string;
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
  const { items, division: initialDivision, category: initialCategory = "semua", categories, search: initialSearch = "", auth } =
    usePage<PageProps>().props;

  const role = auth?.user?.role;
  const isStaff = role === "bar" || role === "dapur";
  const userDivision = isStaff ? (role as Division) : null;

  const safeItems: PaginatedItems = {
    data: items?.data ?? [],
    links: items?.links ?? [],
    current_page: items?.current_page ?? 1,
    per_page: items?.per_page ?? 10,
    total: items?.total ?? (items?.data?.length ?? 0),
    from: items?.from ?? (items?.data?.length ? (items?.current_page ? (items.current_page - 1) * 10 + 1 : 1) : 0),
    to: items?.to ?? (items?.data?.length ?? 0),
  };

  const safeCategories = categories ?? [];

  const [division, setDivision] = useState<Division>(
    isStaff && userDivision ? userDivision : initialDivision ?? "bar"
  );
  const [currentCategory, setCurrentCategory] = useState<"semua" | "menu" | "mentah">(initialCategory || "semua");
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);

  const [search, setSearch] = useState(initialSearch || "");

  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [formItems, setFormItems] = useState<FormItem[]>([
    { uid: Date.now(), nama: "", item_category_id: "", harga_dasar: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialCategory) setCurrentCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (initialDivision) setDivision(initialDivision);
  }, [initialDivision]);

  const sortedCategories = useMemo(
    () => sortCategories(safeCategories),
    [safeCategories]
  );

  const changeDivision = (value: Division) => {
    setDivision(value);
    setShowDivisionDropdown(false);

    router.get(
      route("item.index"),
      { division: value, category: currentCategory, search: search || undefined },
      { preserveScroll: true, preserveState: true, replace: true }
    );
  };

  const changeCategory = (cat: "semua" | "menu" | "mentah") => {
    setCurrentCategory(cat);
    router.get(
      route("item.index"),
      { division, category: cat, search: search || undefined },
      { preserveScroll: true, preserveState: true, replace: true }
    );
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    router.get(
      route("item.index"),
      { division, category: currentCategory, search: val || undefined },
      { preserveScroll: true, preserveState: true, replace: true }
    );
  };

  const openModalAdd = () => {
    setEditId(null);
    let defaultCatId: string | number = "";
    if (currentCategory === "mentah") {
      const mentahCat = safeCategories.find(c => isCategoryMentah(c.name));
      if (mentahCat) defaultCatId = mentahCat.id;
    } else if (currentCategory === "menu") {
      const menuCat = safeCategories.find(c => !isCategoryMentah(c.name));
      if (menuCat) defaultCatId = menuCat.id;
    }
    setFormItems([{ uid: Date.now(), nama: "", item_category_id: defaultCatId, harga_dasar: "" }]);
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
        <div className="bg-white dark:bg-[#2A221C] p-5 md:p-8 rounded-3xl shadow-xs border border-gray-100 dark:border-[#45372C] min-h-[600px] flex flex-col">

          {/* --- TOP TOOLBAR --- */}
          <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            {/* Left: Division Dropdown & Category Tabs (Semua, Menu, Mentah) */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Division Dropdown */}
              {!isStaff ? (
                <div className="relative inline-block w-36">
                  <button
                    type="button"
                    onClick={() => setShowDivisionDropdown((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-xl bg-[#FDF3E4] dark:bg-[#231C17] hover:bg-[#F6EFEB] dark:hover:bg-[#2F241C] px-4 py-2.5 text-sm font-bold text-[#8B5E3C] dark:text-amber-400 border border-amber-100 dark:border-[#45372C] shadow-2xs transition"
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
                    <div className="absolute left-0 mt-1 w-full rounded-2xl bg-white dark:bg-[#2A221C] py-1.5 text-sm z-30 shadow-xl border border-gray-100 dark:border-[#45372C]">
                      <button
                        onClick={() => changeDivision("bar")}
                        className={`block w-full px-4 py-2 text-left font-semibold transition ${
                          division === "bar"
                            ? "bg-[#FDF3E4] dark:bg-[#3E3024] text-[#8B5E3C] dark:text-amber-300"
                            : "text-gray-600 dark:text-[#C8BCAE] hover:bg-gray-50 dark:hover:bg-[#35291F]"
                        }`}
                      >
                        Bar
                      </button>
                      <button
                        onClick={() => changeDivision("dapur")}
                        className={`block w-full px-4 py-2 text-left font-semibold transition ${
                          division === "dapur"
                            ? "bg-[#FDF3E4] dark:bg-[#3E3024] text-[#8B5E3C] dark:text-amber-300"
                            : "text-gray-600 dark:text-[#C8BCAE] hover:bg-gray-50 dark:hover:bg-[#35291F]"
                        }`}
                      >
                        Dapur
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-4 py-2.5 rounded-xl bg-[#FDF3E4] dark:bg-[#231C17] text-sm font-bold text-[#8B5E3C] dark:text-amber-400 border border-amber-100 dark:border-[#45372C] capitalize w-fit shadow-2xs">
                  {division}
                </div>
              )}

              {/* Category Filter Tabs: Semua, Menu, Mentah */}
              <div className="flex items-center gap-1.5 bg-[#FAF7F2] dark:bg-[#231C17] p-1 rounded-2xl border border-amber-100 dark:border-[#45372C]">
                {(["semua", "menu", "mentah"] as const).map((tab) => {
                  const isActive = currentCategory === tab;
                  const labels: Record<string, string> = {
                    semua: "Semua",
                    menu: "Menu",
                    mentah: "Mentah",
                  };
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => changeCategory(tab)}
                      className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                        isActive
                          ? "bg-[#8B5E3C] text-white shadow-xs"
                          : "text-gray-600 dark:text-[#C8BCAE] hover:text-[#8B5E3C] dark:hover:text-amber-300 hover:bg-white/60 dark:hover:bg-[#2A221C]"
                      }`}
                    >
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Tambah Item Button & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
              {!isStaff && (
                <button
                  onClick={openModalAdd}
                  className="flex items-center justify-center gap-2 rounded-full bg-[#D9A978] dark:bg-[#8B5E3C] hover:bg-[#c4925e] dark:hover:bg-[#6F4E37] px-5 py-2 text-sm font-bold text-white shadow-md transition active:scale-95 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Item
                </button>
              )}

              <div className="relative w-full sm:w-56">
                <input
                  type="text"
                  placeholder="Search...."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full rounded-full border border-gray-200 dark:border-[#45372C] bg-gray-50 dark:bg-[#231C17] text-gray-800 dark:text-[#FAF5ED] px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#8E8072]">
                  <Search className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          {/* --- MOBILE VIEW (CARDS) --- */}
          <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
            {safeItems.data.length > 0 ? (
              safeItems.data.map((item) => {
                const isMentah = isCategoryMentah(
                  item.item_category?.name ?? item.kategori_item
                );

                return (
                  <div key={item.id} className="bg-white dark:bg-[#231C17] border border-gray-100 dark:border-[#3D3127] rounded-2xl p-4 shadow-xs">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#D9A978]/15 dark:bg-amber-400/10 text-[#8B5E3C] dark:text-amber-400 p-2.5 rounded-xl shadow-inner">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 dark:text-[#FAF5ED] text-sm">{item.nama}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              isMentah
                                ? "bg-[#F7EFE6] dark:bg-[#3E3024] text-[#8B5E3C] dark:text-amber-300"
                                : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-transparent dark:border-blue-800/40"
                            }`}>
                              {item.item_category ? translateCategoryName(item.item_category.name) : (item.kategori_item || "-")}
                            </span>
                            {isMentah && (
                              <span className="text-xs font-bold text-gray-700 dark:text-[#FAF5ED]">
                                {formatRupiah(item.harga_dasar)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold bg-gray-100 dark:bg-[#2A221C] text-gray-600 dark:text-[#C8BCAE] px-2.5 py-1 rounded-xl capitalize">
                        {item.satuan ?? "porsi"}
                      </span>
                    </div>

                    {!isStaff && (
                      <div className="flex gap-2 border-t border-gray-100 dark:border-[#3D3127] pt-3 mt-3">
                        <button
                          onClick={() => handleEdit(item)}
                          className="flex-1 flex items-center justify-center gap-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-transparent dark:border-blue-800/40 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-xs"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(item.id)}
                          className="flex-1 flex items-center justify-center gap-1 bg-red-50 dark:bg-rose-950/60 text-red-600 dark:text-rose-400 border border-transparent dark:border-rose-800/40 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-rose-900/60 transition shadow-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-white dark:bg-[#231C17] rounded-2xl border border-dashed border-gray-200 dark:border-[#3D3127]">
                <p className="text-gray-400 dark:text-[#8E8072] text-sm italic">Tidak ada item ditemukan</p>
              </div>
            )}
          </div>

          {/* --- DESKTOP VIEW (TABLE) --- */}
          <div className="hidden md:block w-full rounded-2xl border border-gray-100 dark:border-[#3D3127] bg-white dark:bg-[#231C17] shadow-2xs overflow-hidden mb-6 flex-1">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#FAF7F2]/60 dark:bg-[#1E1915] text-gray-700 dark:text-[#A89B8C] font-bold text-xs uppercase tracking-wider border-b border-gray-100 dark:border-[#3D3127]">
                  <tr>
                    <th className="px-6 py-4 w-16 text-center">No</th>
                    <th className="px-6 py-4">Nama Item</th>
                    <th className="px-6 py-4 w-40">Kategori</th>
                    <th className="px-6 py-4 w-32">Satuan</th>
                    <th className="px-6 py-4 w-44">Harga Dasar</th>
                    <th className="px-6 py-4 text-center w-48">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-[#3D3127]">
                  {safeItems.data.length > 0 ? (
                    safeItems.data.map((item, index) => {
                      const isMentah = isCategoryMentah(
                        item.item_category?.name ?? item.kategori_item
                      );

                      return (
                        <tr key={item.id} className="hover:bg-[#FAF7F2]/40 dark:hover:bg-[#2A221C]/60 transition-colors">
                          <td className="px-6 py-4 text-center text-gray-400 dark:text-[#8E8072] font-medium">
                            {(safeItems.current_page - 1) * safeItems.per_page + index + 1}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-800 dark:text-[#FAF5ED]">{item.nama}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                              isMentah
                                ? "bg-[#F7EFE6] dark:bg-[#3E3024] text-[#8B5E3C] dark:text-amber-300"
                                : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-transparent dark:border-blue-800/40"
                            }`}>
                              {item.item_category
                                ? translateCategoryName(item.item_category.name)
                                : (item.kategori_item || "-")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-[#C8BCAE] font-medium capitalize">
                            {item.satuan ?? "porsi"}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-800 dark:text-[#FAF5ED]">
                            {isMentah ? formatRupiah(item.harga_dasar) : "-"}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center items-center gap-2">
                              {!isStaff ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(item)}
                                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-transparent dark:border-blue-800/40 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-2xs active:scale-95"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openDeleteConfirm(item.id)}
                                    className="px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-rose-950/60 text-red-600 dark:text-rose-400 border border-transparent dark:border-rose-800/40 font-bold text-xs hover:bg-red-100 dark:hover:bg-rose-900/60 transition shadow-2xs active:scale-95"
                                  >
                                    Hapus
                                  </button>
                                </>
                              ) : (
                                <span className="text-gray-400 dark:text-[#8E8072] text-xs italic">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-[#8E8072] italic">
                        Tidak ada data item ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* --- FOOTER: TOTAL INFO & PAGINATION --- */}
          <div className="mt-auto pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-gray-100 dark:border-[#3D3127] text-xs sm:text-sm text-gray-500 dark:text-[#A89B8C]">
            <div>
              {safeItems.total && safeItems.total > 0 ? (
                <span>
                  Menampilkan {safeItems.from ?? 1}–{safeItems.to ?? safeItems.data.length} dari {safeItems.total}{" "}
                  {currentCategory === "mentah"
                    ? "item mentah"
                    : currentCategory === "menu"
                    ? "item menu"
                    : "item"}
                </span>
              ) : (
                <span>Tidak ada item</span>
              )}
            </div>

            {/* Pagination Links */}
            {safeItems.links && safeItems.links.length > 3 && (
              <div className="flex items-center gap-1.5 self-center sm:self-auto">
                {safeItems.links.map((link, i) => {
                  const isPrev = link.label.includes("&laquo;") || link.label.toLowerCase().includes("previous") || link.label.toLowerCase().includes("prev");
                  const isNext = link.label.includes("&raquo;") || link.label.toLowerCase().includes("next");

                  if (isPrev) {
                    return (
                      <Link
                        key={i}
                        href={link.url || "#"}
                        preserveScroll
                        className={`px-2 py-1 text-xs font-semibold transition ${
                          !link.url
                            ? "text-gray-300 dark:text-[#5A4B3D] pointer-events-none"
                            : "text-gray-600 dark:text-[#C8BCAE] hover:text-[#8B5E3C] dark:hover:text-amber-300"
                        }`}
                      >
                        Prev
                      </Link>
                    );
                  }

                  if (isNext) {
                    return (
                      <Link
                        key={i}
                        href={link.url || "#"}
                        preserveScroll
                        className={`px-2 py-1 text-xs font-semibold transition ${
                          !link.url
                            ? "text-gray-300 dark:text-[#5A4B3D] pointer-events-none"
                            : "text-gray-600 dark:text-[#C8BCAE] hover:text-[#8B5E3C] dark:hover:text-amber-300"
                        }`}
                      >
                        Next
                      </Link>
                    );
                  }

                  if (link.active) {
                    return (
                      <span
                        key={i}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#8B5E3C] text-white flex items-center justify-center font-bold text-xs shadow-xs"
                      >
                        {link.label}
                      </span>
                    );
                  }

                  return (
                    <Link
                      key={i}
                      href={link.url || "#"}
                      preserveScroll
                      className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-600 dark:text-[#C8BCAE] hover:text-[#8B5E3C] dark:hover:text-amber-300 font-semibold text-xs transition"
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* --- MODAL ADD/EDIT MULTI INPUT --- */}
      {openModal && !isStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white dark:bg-[#2A221C] w-full max-w-lg md:max-w-3xl rounded-3xl shadow-2xl p-6 md:p-8 transform transition-all max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-[#45372C]">
            <h2 className="text-xl md:text-2xl font-extrabold text-center mb-6 text-gray-800 dark:text-[#FAF5ED]">
              {editId ? "Edit Item" : "Tambah Item Baru"}
            </h2>

            <form onSubmit={submitItem} className="space-y-6">

              {/* Info Divisi */}
              <div>
                <label className="block mb-1.5 text-xs font-bold text-gray-600 dark:text-[#C8BCAE] uppercase tracking-wider ml-1">Penempatan Divisi</label>
                <input
                  type="text"
                  readOnly
                  value={division === "bar" ? "Bar" : "Dapur"}
                  className="w-full bg-gray-50 dark:bg-[#231C17] rounded-2xl px-4 py-3 border border-gray-200 dark:border-[#45372C] text-gray-500 dark:text-[#A89B8C] cursor-not-allowed font-medium text-sm"
                />
              </div>

              {/* Looping Form Items */}
              {formItems.map((item, index) => {
                const selectedCat = safeCategories.find(c => String(c.id) === String(item.item_category_id));
                const isMentah = isCategoryMentah(selectedCat?.name);

                return (
                <div key={item.uid} className="bg-white dark:bg-[#231C17] border border-gray-200/80 dark:border-[#3D3127] rounded-3xl p-5 space-y-4 relative shadow-xs">

                  {/* Tombol Hapus Baris */}
                  {!editId && formItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(item.uid)}
                      className="absolute -top-2 -right-2 bg-red-500 dark:bg-rose-600 text-white rounded-full p-1.5 hover:bg-red-600 dark:hover:bg-rose-700 transition shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-extrabold text-[#8B5E3C] dark:text-amber-400 uppercase tracking-wider">
                      {editId ? "Data Item" : `Item #${index + 1}`}
                    </span>
                  </div>

                  <div className={`grid grid-cols-1 ${isMentah ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-600 dark:text-[#C8BCAE] uppercase tracking-wider ml-1">
                        Nama Item
                      </label>
                      <input
                        type="text"
                        value={item.nama}
                        onChange={(e) => handleFormChange(item.uid, 'nama', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#1E1915] rounded-2xl px-4 py-3 border border-gray-200 dark:border-[#45372C] text-gray-800 dark:text-[#FAF5ED] focus:ring-2 focus:ring-[#8B5E3C] focus:border-transparent outline-none text-sm font-medium"
                        placeholder="Contoh: Sambal"
                        required
                        autoFocus={index === formItems.length - 1}
                      />
                    </div>

                    <div>
                      <label className="block mb-1.5 text-xs font-bold text-gray-600 dark:text-[#C8BCAE] uppercase tracking-wider ml-1">
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
                        buttonClassName="bg-gray-50 dark:bg-[#1E1915] py-3 rounded-2xl border-gray-200 dark:border-[#45372C] text-sm"
                      />
                    </div>

                    {isMentah && (
                      <div>
                        <label className="block mb-1.5 text-xs font-bold text-gray-600 dark:text-[#C8BCAE] uppercase tracking-wider ml-1">
                          Harga Dasar <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 dark:text-[#8E8072]">
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
                            className="w-full bg-gray-50 dark:bg-[#1E1915] rounded-2xl pl-12 pr-4 py-3 border border-gray-200 dark:border-[#45372C] focus:ring-2 focus:ring-[#8B5E3C] focus:border-transparent outline-none font-bold text-gray-800 dark:text-[#FAF5ED] text-sm"
                            placeholder="0"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block mb-1.5 text-xs font-bold text-gray-600 dark:text-[#C8BCAE] uppercase tracking-wider ml-1">
                      Satuan Dasar
                    </label>
                    <input
                      type="text"
                      value="porsi"
                      readOnly
                      className="w-full bg-gray-100 dark:bg-[#1E1915]/60 rounded-2xl px-4 py-3 border border-gray-200 dark:border-[#45372C] text-gray-500 dark:text-[#A89B8C] cursor-not-allowed text-sm font-medium"
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
                  className="w-full py-3.5 border-2 border-dashed border-[#D9A978] dark:border-[#8B5E3C] rounded-2xl text-[#8B5E3C] dark:text-amber-400 font-bold text-sm hover:bg-[#D9A978]/10 dark:hover:bg-amber-400/10 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Tambah Item Lainnya
                </button>
              )}

              <div className="flex justify-between pt-4 gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 bg-gray-100 dark:bg-[#35291F] rounded-2xl text-gray-700 dark:text-[#C8BCAE] font-bold hover:bg-gray-200 dark:hover:bg-[#45372C] transition text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-3 rounded-2xl font-bold text-white shadow-md text-sm transition ${
                    isSubmitting ? "bg-[#e0c09e] dark:bg-[#5A4535] cursor-not-allowed" : "bg-[#8B5E3C] hover:bg-[#6F4E37]"
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
          <div className="bg-white dark:bg-[#2A221C] w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center border border-gray-100 dark:border-[#45372C]">
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-[#FAF5ED] mb-2">
              Hapus Item? ⚠️
            </h2>

            <p className="text-gray-500 dark:text-[#A89B8C] text-xs mb-6 leading-relaxed">
              Tindakan ini akan menghapus data item secara permanen dari sistem.
            </p>

            <div className="flex justify-between gap-3">
              <button
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#35291F] rounded-2xl text-gray-700 dark:text-[#C8BCAE] font-bold hover:bg-gray-200 dark:hover:bg-[#45372C] transition text-sm"
                onClick={() => setOpenDeleteModal(false)}
              >
                Batal
              </button>

              <button
                className="flex-1 px-4 py-2.5 bg-red-500 dark:bg-rose-600 text-white rounded-2xl font-bold shadow-md hover:bg-red-600 dark:hover:bg-rose-700 transition text-sm"
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
