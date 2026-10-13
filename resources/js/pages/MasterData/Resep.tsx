import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router, Link } from "@inertiajs/react";
import { Search, Trash, ChevronDown, Plus, BookOpen, Calculator, X, Edit, Trash2, Eye, Download } from "lucide-react";
import CustomSelect from "@/components/CustomSelect";

// --- INTERFACES ---
interface Category {
  id: number;
  name: string;
}

interface Recipe {
  id: number;
  name: string;
  category_id?: number;
  category_name?: string;
  total_ingredients: number;
  total_hpp?: number | null;
  target_margin?: number | null;
  harga_jual_hitungan?: number | null;
  harga_jual_real?: number | null;
  profit_real?: number | null;
  created_at: string | null;
  ingredients?: {
    item_id: number;
    item_name: string;
    amount: number;
    unit: string;
    harga_dasar?: number | null;
    subtotal?: number | null;
  }[];
}

interface Item {
  id: number;
  name: string;
  unit?: string;
  harga_dasar?: number | null;
}

interface Ingredient {
  id: number;
  item_id: number | null;
  item_name: string;
  amount: number;
  unit: string;
}

interface PageProps {
  recipes: {
    data: Recipe[];
    links: any[];
    current_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  categories: Category[];
  bahan_menu: Item[];
  bahan_mentah: Item[];
  division: "bar" | "dapur";
  search?: string;
  auth: {
    user: {
      role: string;
    };
  };
}

interface CostSummaryProps {
  totalHpp: number;
  targetMargin: string;
  onTargetMarginChange: (value: string) => void;
  hargaJualReal: string;
  onHargaJualRealChange: (value: string) => void;
  hargaJualHitungan: number;
  profitReal: number;
  formatRupiah: (value: number | null | undefined) => string;
  formatInputRupiah: (value: string | number) => string;
}

const CostSummary: React.FC<CostSummaryProps> = ({
  totalHpp,
  targetMargin,
  onTargetMarginChange,
  hargaJualReal,
  onHargaJualRealChange,
  hargaJualHitungan,
  profitReal,
  formatRupiah,
  formatInputRupiah,
}) => (
  <div className="space-y-4 border-t border-gray-100 dark:border-[#3D3127] pt-5">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-[#A89B8C]">
      <Calculator className="h-4 w-4 text-[#8B5E3C] dark:text-amber-400" /> Kalkulasi Harga & Profit
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className="text-xs font-bold text-gray-600 dark:text-[#C8BCAE] uppercase tracking-wider">Target margin (%)
        <input 
          type="number" 
          min="0" 
          step="0.01" 
          value={targetMargin} 
          onChange={(e) => onTargetMarginChange(e.target.value)} 
          className="mt-1.5 w-full rounded-2xl border border-gray-200 dark:border-[#45372C] bg-gray-50 dark:bg-[#1E1915] text-gray-800 dark:text-[#FAF5ED] px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-[#8B5E3C] outline-none" 
          placeholder="Contoh: 30" 
        />
      </label>
      <label className="text-xs font-bold text-gray-600 dark:text-[#C8BCAE] uppercase tracking-wider">Harga jual real
        <div className="relative mt-1.5">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 dark:text-[#8E8072]">Rp</span>
          <input 
            type="text" 
            inputMode="numeric" 
            value={formatInputRupiah(hargaJualReal)} 
            onChange={(e) => onHargaJualRealChange(e.target.value.replace(/[^0-9]/g, ""))} 
            className="w-full rounded-2xl border border-gray-200 dark:border-[#45372C] bg-gray-50 dark:bg-[#1E1915] py-2.5 pl-12 pr-4 text-sm font-bold text-gray-800 dark:text-[#FAF5ED] focus:ring-2 focus:ring-[#8B5E3C] outline-none" 
            placeholder="0" 
          />
        </div>
      </label>
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-4 bg-gray-50 dark:bg-[#231C17] p-4 rounded-2xl border border-gray-100 dark:border-[#3D3127]">
      <div><span className="block text-gray-400 dark:text-[#8E8072] font-bold uppercase text-[10px]">Total HPP</span><strong className="text-sm font-black text-gray-800 dark:text-[#FAF5ED]">{formatRupiah(totalHpp)}</strong></div>
      <div><span className="block text-gray-400 dark:text-[#8E8072] font-bold uppercase text-[10px]">Harga hitungan</span><strong className="text-sm font-black text-blue-600 dark:text-blue-400">{formatRupiah(hargaJualHitungan)}</strong></div>
      <div><span className="block text-gray-400 dark:text-[#8E8072] font-bold uppercase text-[10px]">Profit real</span><strong className={`text-sm font-black ${profitReal < 0 ? "text-red-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{formatRupiah(profitReal)}</strong></div>
      <div><span className="block text-gray-400 dark:text-[#8E8072] font-bold uppercase text-[10px]">Margin aktual</span><strong className="text-sm font-black text-gray-800 dark:text-[#FAF5ED]">{totalHpp > 0 && hargaJualReal ? `${((profitReal / totalHpp) * 100).toFixed(1)}%` : "-"}</strong></div>
    </div>
  </div>
);

const Resep: React.FC = () => {
  const {
    recipes,
    categories = [],
    bahan_menu = [],
    bahan_mentah = [],
    division,
    search: initialSearch,
    auth,
  } = usePage<any>().props as PageProps;

  const role = auth.user.role;
  const isStaff = role === "bar" || role === "dapur";

  const [selectedDivision, setSelectedDivision] = useState<"bar" | "dapur">(division);
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
  const [search, setSearch] = useState(initialSearch || "");

  const [showModal, setShowModal] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 1, item_id: null, item_name: "", amount: 1, unit: "porsi" },
  ]);
  const [targetMargin, setTargetMargin] = useState<string>("");
  const [hargaJualReal, setHargaJualReal] = useState<string>("");

  const [openViewModal, setOpenViewModal] = useState(false);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [openEditModal, setOpenEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([]);
  const [editTargetMargin, setEditTargetMargin] = useState<string>("");
  const [editHargaJualReal, setEditHargaJualReal] = useState<string>("");

  const findRawItemById = (id: number | null) => bahan_mentah.find((it) => it.id === id);
  const findRawItemByName = (name: string) =>
    bahan_mentah.find((it) => it.name.trim().toLowerCase() === name.trim().toLowerCase());
  const findMenuByName = (name: string) =>
    bahan_menu.find((it) => it.name.trim().toLowerCase() === name.trim().toLowerCase());

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

  const formatRupiah = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "-";
    return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
  };
  const parseRupiahInput = (val: string): number => parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
  const formatInputRupiah = (val: string | number): string => {
    const clean = String(val).replace(/[^0-9]/g, "");
    if (!clean) return "";
    return new Intl.NumberFormat("id-ID").format(Number(clean));
  };
  const profitColor = (profit: number | null | undefined) => {
    if (profit == null) return "text-gray-400";
    if (profit > 0) return "text-emerald-600 font-bold";
    if (profit < 0) return "text-red-500 font-bold";
    return "text-gray-500";
  };

  const computeTotalHpp = (ings: Ingredient[]): number =>
    ings.reduce((sum, ing) => {
      const item = findRawItemById(ing.item_id);
      return sum + (ing.amount > 0 ? ing.amount * (item?.harga_dasar ?? 0) : 0);
    }, 0);

  const totalHppPreview = useMemo(() => computeTotalHpp(ingredients), [ingredients, bahan_mentah]);
  const hargaJualHitunganPreview = useMemo(() => {
    const m = parseFloat(targetMargin) || 0;
    return totalHppPreview > 0 ? totalHppPreview * (1 + m / 100) : 0;
  }, [totalHppPreview, targetMargin]);
  const profitRealPreview = useMemo(() => {
    const real = parseRupiahInput(hargaJualReal);
    return totalHppPreview > 0 && real > 0 ? real - totalHppPreview : 0;
  }, [totalHppPreview, hargaJualReal]);

  const editTotalHppPreview = useMemo(() => computeTotalHpp(editIngredients), [editIngredients, bahan_mentah]);
  const editHargaJualHitunganPreview = useMemo(() => {
    const m = parseFloat(editTargetMargin) || 0;
    return editTotalHppPreview > 0 ? editTotalHppPreview * (1 + m / 100) : 0;
  }, [editTotalHppPreview, editTargetMargin]);
  const editProfitRealPreview = useMemo(() => {
    const real = parseRupiahInput(editHargaJualReal);
    return editTotalHppPreview > 0 && real > 0 ? real - editTotalHppPreview : 0;
  }, [editTotalHppPreview, editHargaJualReal]);

  const changeDivision = (div: "bar" | "dapur") => {
    setSelectedDivision(div);
    setShowDivisionDropdown(false);
    router.get(
      route("resep"),
      { division: div, search },
      { preserveScroll: true, replace: true }
    );
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    router.get(
      route("resep"),
      { division: selectedDivision, search: e.target.value },
      { preserveScroll: true, preserveState: true }
    );
  };

  const openDeleteConfirm = (id: number) => {
    setDeleteId(id);
    setOpenDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    router.delete(route("resep.destroy", deleteId), {
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
      } else if (showModal && e.key === "Escape") {
        e.preventDefault();
        setShowModal(false);
      } else if (openEditModal && e.key === "Escape") {
        e.preventDefault();
        setOpenEditModal(false);
      } else if (openViewModal && e.key === "Escape") {
        e.preventDefault();
        setOpenViewModal(false);
      }
    };

    if (openDeleteModal || showModal || openEditModal || openViewModal) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openDeleteModal, showModal, openEditModal, openViewModal, deleteId]);

  const openViewRecipe = (recipe: Recipe) => {
    setViewRecipe(recipe);
    setOpenViewModal(true);
  };

  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        item_id: null,
        item_name: "",
        amount: 1,
        unit: "porsi",
      },
    ]);
  };

  const removeIngredient = (id: number) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  const changeIngredient = (id: number, field: keyof Ingredient, value: any) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id !== id) return ing;
        const next = { ...ing, [field]: value };
        if (field === "item_name") {
          const raw = findRawItemByName(value);
          next.item_id = raw?.id ?? null;
          if (raw?.unit) next.unit = raw.unit;
        }
        return next;
      })
    );
  };

  const saveRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    const menu = findMenuByName(menuName);
    const invalid = ingredients.some((ing) => !ing.item_id || ing.amount <= 0);
    if (invalid) return alert("Pastikan semua bahan valid dan jumlah > 0.");
    
    // Cari Kategori Menu Otomatis
    const menuCategory = categories.find((c) => !isCategoryMentah(c.name));
    if (!menuCategory) return alert("Kategori Menu tidak ditemukan di sistem.");

    router.post(
      route("resep.store"),
      {
        name: menuName,
        division: selectedDivision,
        category_id: menuCategory.id,
        menu_item_id: menu?.id ?? null,
        ingredients: ingredients.map((i) => ({
          item_id: i.item_id,
          amount: i.amount,
          unit: i.unit,
        })),
        target_margin: parseFloat(targetMargin) || 0,
        harga_jual_real: parseRupiahInput(hargaJualReal) || null,
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setMenuName("");
          setIngredients([{ id: 1, item_id: null, item_name: "", amount: 1, unit: "porsi" }]);
          setTargetMargin("");
          setHargaJualReal("");
        },
      }
    );
  };

  const openEdit = (recipe: Recipe) => {
    setEditId(recipe.id);
    setEditName(recipe.name);
    setEditIngredients(
      recipe.ingredients?.map((ing, i) => ({
        id: i + 1,
        item_id: ing.item_id,
        item_name: findRawItemById(ing.item_id)?.name ?? ing.item_name ?? "",
        amount: ing.amount,
        unit: ing.unit,
      })) ?? []
    );
    setEditTargetMargin(recipe.target_margin != null ? String(recipe.target_margin) : "");
    setEditHargaJualReal(recipe.harga_jual_real != null ? String(Math.round(recipe.harga_jual_real)) : "");
    setOpenEditModal(true);
  };

  const changeEditIngredient = (id: number, field: keyof Ingredient, value: any) => {
    setEditIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id !== id) return ing;
        const next = { ...ing, [field]: value };
        if (field === "item_name") {
          const raw = findRawItemByName(value);
          next.item_id = raw?.id ?? null;
          if (raw?.unit) next.unit = raw.unit;
        }
        return next;
      })
    );
  };

  const addEditIngredient = () => {
    setEditIngredients((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        item_id: null,
        item_name: "",
        amount: 1,
        unit: "porsi",
      },
    ]);
  };

  const removeEditIngredient = (id: number) => {
    setEditIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  const updateRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = editIngredients.some((ing) => !ing.item_id || ing.amount <= 0);
    if (invalid) return alert("Pastikan semua bahan valid dan jumlah > 0.");
    
    // Cari Kategori Menu Otomatis
    const menuCategory = categories.find((c) => !isCategoryMentah(c.name));
    if (!menuCategory) return alert("Kategori Menu tidak ditemukan di sistem.");

    router.put(
      route("resep.update", editId!),
      {
        name: editName,
        division: selectedDivision,
        category_id: menuCategory.id,
        ingredients: editIngredients.map((ing) => ({
          item_id: ing.item_id,
          amount: ing.amount,
          unit: ing.unit,
        })),
        target_margin: parseFloat(editTargetMargin) || 0,
        harga_jual_real: parseRupiahInput(editHargaJualReal) || null,
      },
      { onSuccess: () => setOpenEditModal(false) }
    );
  };

  return (
    <AppLayout header={`Resep ${selectedDivision === "bar" ? "Bar" : "Dapur"}`}>
      <Head title="Resep" />

      {/* --- DATALISTS --- */}
      <datalist id="menu-datalist">
        {bahan_menu.map((it) => (
          <option key={it.id} value={it.name} />
        ))}
      </datalist>

      <datalist id="raw-datalist">
        {bahan_mentah.map((it) => (
          <option key={it.id} value={it.name} />
        ))}
      </datalist>

      {/* LAYOUT UTAMA */}
      <div className="space-y-6 py-6">
        <div className="rounded-3xl bg-[#F2ECE4] dark:bg-[#2A221C] p-4 md:p-8 shadow-sm border border-amber-200/60 dark:border-[#45372C]">
          <div className="rounded-3xl bg-white dark:bg-[#231C17] p-4 md:p-6 shadow-xs border border-gray-100 dark:border-[#3D3127] min-h-[600px] flex flex-col">
            
            {/* HEADER CONTROL & TOOLBAR */}
            <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-gray-100 dark:border-[#3D3127] pb-4 xl:border-b-0 xl:pb-0">
              
              {/* Kiri: Judul dan Dropdown Divisi */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full xl:w-auto">
                <h3 className="text-lg font-bold text-gray-800 dark:text-[#FAF5ED] whitespace-nowrap">
                  Daftar Resep
                </h3>
                
                {!isStaff ? (
                  <div className="relative inline-block w-full sm:w-32">
                    <button
                      type="button"
                      onClick={() => setShowDivisionDropdown((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-full bg-[#FDF3E4] dark:bg-[#2A221C] px-4 py-2.5 text-xs font-bold text-[#8B5E3C] dark:text-amber-400 border border-amber-100 dark:border-[#45372C] shadow-2xs transition"
                    >
                      <span className="capitalize">{selectedDivision}</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          showDivisionDropdown ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {showDivisionDropdown && (
                      <div className="absolute left-0 mt-1 w-full rounded-2xl bg-white dark:bg-[#2A221C] py-1.5 text-sm shadow-xl z-20 border border-gray-100 dark:border-[#45372C]">
                        <button
                          onClick={() => changeDivision("bar")}
                          className={`block w-full px-4 py-2 text-left font-semibold transition ${
                            selectedDivision === "bar"
                              ? "bg-[#FDF3E4] dark:bg-[#3E3024] text-[#8B5E3C] dark:text-amber-300"
                              : "text-gray-600 dark:text-[#C8BCAE] hover:bg-gray-50 dark:hover:bg-[#35291F]"
                          }`}
                        >
                          Bar
                        </button>
                        <button
                          onClick={() => changeDivision("dapur")}
                          className={`block w-full px-4 py-2 text-left font-semibold transition ${
                            selectedDivision === "dapur"
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
                  <div className="px-4 py-2.5 rounded-full bg-[#FDF3E4] dark:bg-[#231C17] text-xs font-bold text-[#8B5E3C] dark:text-amber-400 border border-amber-100 dark:border-[#45372C] capitalize w-fit shadow-2xs">
                    {selectedDivision}
                  </div>
                )}
              </div>

              {/* Kanan: Tombol Aksi & Pencarian */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
                <a
                  href={route('resep.export-excel', { division: selectedDivision })}
                  className="flex items-center justify-center gap-2 rounded-full bg-[#8B5E3C] hover:bg-[#6F4E37] px-5 py-2.5 sm:py-2 text-sm font-bold text-white shadow-md transition w-full sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  Export Excel
                </a>

                {!isStaff && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#D9A978] dark:bg-[#8B5E3C] hover:bg-[#c4925e] dark:hover:bg-[#6F4E37] px-5 py-2.5 sm:py-2 text-sm font-bold text-white shadow-md transition active:scale-95 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Resep
                  </button>
                )}
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

            {/* --- MOBILE VIEW (CARDS) --- */}
            <div className="grid grid-cols-1 gap-4 md:hidden mb-6 flex-1">
              {recipes.data.length === 0 ? (
                <div className="text-center text-gray-400 dark:text-[#8E8072] py-8 border border-gray-100 rounded-xl bg-gray-50 dark:bg-[#231C17] dark:border-[#3D3127]">
                  Belum ada resep.
                </div>
              ) : (
                recipes.data.map((r) => (
                  <div key={r.id} className="bg-white dark:bg-[#231C17] border border-gray-100 dark:border-[#3D3127] rounded-2xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-[#D9A978]/15 dark:bg-amber-400/10 text-[#8B5E3C] dark:text-amber-400 p-2.5 rounded-xl shadow-inner">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-800 dark:text-[#FAF5ED] text-sm">{r.name}</div>
                          <div className="text-xs text-gray-500 dark:text-[#A89B8C] font-medium mt-0.5">{r.total_ingredients} bahan</div>
                          {r.category_name && (
                            <div className="text-[11px] font-bold text-[#8B5E3C] dark:text-amber-300 mt-1.5 bg-[#FDF3E4] dark:bg-[#3E3024] px-2.5 py-0.5 rounded-md w-fit border border-amber-100 dark:border-amber-800/40 shadow-xs">
                              {r.category_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-[#8E8072] mb-3 pl-1 font-medium">
                      Dibuat: {r.created_at || "-"}
                    </div>
                    <div className="flex gap-2 border-t border-gray-100 dark:border-[#3D3127] pt-3 mt-3">
                      <button
                        onClick={() => openViewRecipe(r)}
                        className="flex-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-transparent dark:border-blue-800/40 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-xs flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      {!isStaff && (
                        <>
                          <button
                            onClick={() => openEdit(r)}
                            className="flex-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-transparent dark:border-blue-800/40 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-xs flex items-center justify-center gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(r.id)}
                            className="flex-1 bg-red-50 dark:bg-rose-950/60 text-red-600 dark:text-rose-400 border border-transparent dark:border-rose-800/40 px-3.5 py-2 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-rose-900/60 transition shadow-xs flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* --- DESKTOP VIEW (TABLE) --- */}
            <div className="hidden md:block w-full rounded-2xl border border-gray-100 dark:border-[#3D3127] bg-white dark:bg-[#231C17] shadow-sm overflow-hidden flex-1 mb-6">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#FAF7F2]/80 dark:bg-[#1E1915] text-gray-500 dark:text-[#A89B8C] font-bold uppercase text-[11px] tracking-wider border-b border-gray-100 dark:border-[#3D3127]">
                    <tr>
                      <th className="px-6 py-4 w-16 text-center">No</th>
                      <th className="px-6 py-4">Menu Jadi</th>
                      <th className="px-6 py-4 w-40 text-center">Kategori</th>
                      <th className="px-6 py-4 w-32 text-center">Total Bahan</th>
                      <th className="px-6 py-4 w-36">Dibuat</th>
                      <th className="px-6 py-4 text-center w-56">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-[#3D3127]">
                    {recipes.data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-[#8E8072] italic">Belum ada resep.</td>
                      </tr>
                    ) : (
                      recipes.data.map((r, i) => (
                        <tr key={r.id} className="hover:bg-[#FDF3E4]/50 dark:hover:bg-[#2A221C]/60 transition-colors duration-150">
                          <td className="px-6 py-4 text-center text-gray-400 dark:text-[#8E8072] font-medium">
                            {(recipes.current_page - 1) * recipes.per_page + i + 1}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-800 dark:text-[#FAF5ED]">{r.name}</td>
                          <td className="px-6 py-4 text-center">
                            {r.category_name ? (
                              <span className="bg-[#FDF3E4] dark:bg-[#3E3024] text-[#8B5E3C] dark:text-amber-300 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border border-amber-100 dark:border-amber-800/40 shadow-xs">{r.category_name}</span>
                            ) : "-"}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-gray-600 dark:text-[#C8BCAE]">
                            {r.total_ingredients} bahan
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-[#A89B8C] font-medium">{r.created_at || "-"}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => openViewRecipe(r)}
                                className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-transparent dark:border-blue-800/40 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-xs flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </button>
                              {!isStaff && (
                                <>
                                  <button
                                    onClick={() => openEdit(r)}
                                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-transparent dark:border-blue-800/40 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-xs flex items-center gap-1"
                                  >
                                    <Edit className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <button
                                    onClick={() => openDeleteConfirm(r.id)}
                                    className="px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-rose-950/60 text-red-600 dark:text-rose-400 border border-transparent dark:border-rose-800/40 font-bold text-xs hover:bg-red-100 dark:hover:bg-rose-900/60 transition shadow-xs flex items-center gap-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Hapus
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

            {/* --- PAGINATION (GAYA MODERN PILL) --- */}
            <div className="mt-auto pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs sm:text-sm text-gray-500 dark:text-[#A89B8C]">
              <div>
                {recipes.total && recipes.total > 0 ? (
                  <span>
                    Menampilkan {recipes.from ?? 1}–{recipes.to ?? recipes.data.length} dari {recipes.total} resep
                  </span>
                ) : (
                  <span>Tidak ada resep</span>
                )}
              </div>

              {recipes.links && recipes.links.length > 3 && (
                <div className="flex items-center gap-1.5 self-center sm:self-auto bg-gray-50 dark:bg-[#231C17] p-1 rounded-full border border-gray-200 dark:border-[#3D3127]">
                  {recipes.links.map((link: any, i: number) => {
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
      </div>

      {/* --- MODAL TAMBAH RESEP --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white dark:bg-[#2A221C] p-6 md:p-8 rounded-3xl w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-100 dark:border-[#45372C]">
            <div className="flex flex-col items-center text-center mb-6 relative">
              <button type="button" onClick={() => setShowModal(false)} className="absolute right-0 top-0 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-[#35291F] text-gray-500 transition" aria-label="Tutup">
                  <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-[#D9A978]/15 dark:bg-amber-400/10 text-[#8B5E3C] dark:text-amber-400 flex items-center justify-center mb-3 shadow-inner">
                  <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-800 dark:text-[#FAF5ED]">
                  Tambah Resep Baru
              </h2>
              <p className="text-xs text-gray-400 dark:text-[#A89B8C] mt-1">
                  Buat komposisi bahan dan hitung profitabilitas menu
              </p>
            </div>
            
            <form onSubmit={saveRecipe} className="space-y-5">
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-[#C8BCAE] block mb-1.5">Nama Menu Jadi</label>
                <input
                  type="text"
                  list="menu-datalist"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-[#45372C] bg-gray-50 dark:bg-[#1E1915] text-gray-800 dark:text-[#FAF5ED] px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#8B5E3C] outline-none"
                  placeholder="Pilih atau ketik nama menu..."
                  required
                />
              </div>
              <div className="space-y-3">
                <p className="font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-[#C8BCAE]">Bahan Mentah</p>
                {ingredients.map((ing, idx) => {
                  const raw = findRawItemById(ing.item_id);
                  return (
                    <div key={ing.id} className="bg-gray-50 dark:bg-[#1E1915] border border-gray-200/80 dark:border-[#3D3127] p-3.5 rounded-2xl flex flex-wrap gap-2.5 items-center">
                      <span className="text-xs font-bold text-gray-400 dark:text-[#8E8072] w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        list="raw-datalist"
                        value={ing.item_name}
                        onChange={(e) => changeIngredient(ing.id, "item_name", e.target.value)}
                        className="flex-1 bg-white dark:bg-[#231C17] text-gray-800 dark:text-[#FAF5ED] rounded-xl px-3 py-2 text-xs font-medium border border-gray-200 dark:border-[#45372C] outline-none min-w-[120px]"
                        placeholder="Pilih bahan..."
                        required
                      />
                      <input
                        type="number"
                        value={ing.amount}
                        onChange={(e) => changeIngredient(ing.id, "amount", Number(e.target.value))}
                        className="w-20 bg-white dark:bg-[#231C17] text-gray-800 dark:text-[#FAF5ED] rounded-xl px-3 py-2 text-center text-xs font-bold border border-gray-200 dark:border-[#45372C] outline-none"
                        placeholder="Jml"
                        required
                        step="0.01"
                      />
                      <input
                        type="text"
                        value={ing.unit}
                        onChange={(e) => changeIngredient(ing.id, "unit", e.target.value)}
                        className="w-20 bg-gray-100 dark:bg-[#2A221C] text-gray-500 dark:text-[#C8BCAE] rounded-xl px-2 py-2 text-center text-xs font-medium border border-gray-200 dark:border-[#45372C]"
                        readOnly
                      />
                      <div className="w-full text-right text-[11px] text-gray-500 dark:text-[#A89B8C] font-medium md:w-auto">
                        {raw?.harga_dasar != null
                          ? `${formatRupiah(raw.harga_dasar)} × ${ing.amount} = ${formatRupiah((raw.harga_dasar ?? 0) * ing.amount)}`
                          : "Harga dasar belum diisi"}
                      </div>
                      <button type="button" onClick={() => removeIngredient(ing.id)} className="text-red-400 dark:text-rose-400 hover:text-red-600 dark:hover:text-rose-300 p-1">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                <button type="button" onClick={addIngredient} className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#8B5E3C] bg-[#8B5E3C]/5 dark:bg-amber-400/10 px-4 py-2 text-xs font-bold text-[#8B5E3C] dark:text-amber-400 hover:bg-[#8B5E3C]/10 dark:hover:bg-amber-400/20 transition">
                  <Plus className="h-4 w-4" /> Tambah Bahan
                </button>
              </div>
              <div className="flex justify-end border-b border-gray-100 dark:border-[#3D3127] pb-4 text-sm text-gray-600 dark:text-[#C8BCAE] font-medium">
                Total HPP: <strong className="ml-2 text-base text-gray-900 dark:text-[#FAF5ED] font-black">{formatRupiah(totalHppPreview)}</strong>
              </div>
              <CostSummary
                totalHpp={totalHppPreview}
                targetMargin={targetMargin}
                onTargetMarginChange={setTargetMargin}
                hargaJualReal={hargaJualReal}
                onHargaJualRealChange={setHargaJualReal}
                hargaJualHitungan={hargaJualHitunganPreview}
                profitReal={profitRealPreview}
                formatRupiah={formatRupiah}
                formatInputRupiah={formatInputRupiah}
              />
              <div className="flex justify-between pt-4 gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 rounded-2xl bg-gray-100 dark:bg-[#35291F] py-3 text-sm font-bold text-gray-700 dark:text-[#C8BCAE] hover:bg-gray-200 dark:hover:bg-[#45372C] transition">
                  Batal
                </button>
                <button type="submit" className="flex-1 rounded-2xl bg-[#8B5E3C] py-3 text-sm font-bold text-white hover:bg-[#6F4E37] transition shadow-md">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDIT RESEP --- */}
      {openEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white dark:bg-[#2A221C] p-6 md:p-8 rounded-3xl w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-100 dark:border-[#45372C]">
            <div className="flex flex-col items-center text-center mb-6 relative">
              <button type="button" onClick={() => setOpenEditModal(false)} className="absolute right-0 top-0 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-[#35291F] text-gray-500 transition" aria-label="Tutup">
                  <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-[#D9A978]/15 dark:bg-amber-400/10 text-[#8B5E3C] dark:text-amber-400 flex items-center justify-center mb-3 shadow-inner">
                  <Edit className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-800 dark:text-[#FAF5ED]">
                  Edit Resep
              </h2>
              <p className="text-xs text-gray-400 dark:text-[#A89B8C] mt-1">
                  Perbarui bahan mentah dan target margin menu ini
              </p>
            </div>

            <form onSubmit={updateRecipe} className="space-y-5">
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-[#C8BCAE] block mb-1.5">Nama Menu Jadi</label>
                <input
                  type="text"
                  list="menu-datalist"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 dark:border-[#45372C] bg-gray-50 dark:bg-[#1E1915] text-gray-800 dark:text-[#FAF5ED] px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#8B5E3C] outline-none"
                  required
                />
              </div>
              <div className="space-y-3">
                <p className="font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-[#C8BCAE]">Bahan Mentah</p>
                {editIngredients.map((ing, idx) => {
                  const raw = findRawItemById(ing.item_id);
                  return (
                    <div key={ing.id} className="bg-gray-50 dark:bg-[#1E1915] border border-gray-200/80 dark:border-[#3D3127] p-3.5 rounded-2xl flex flex-wrap gap-2.5 items-center">
                      <span className="text-xs font-bold text-gray-400 dark:text-[#8E8072] w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        list="raw-datalist"
                        value={ing.item_name}
                        onChange={(e) => changeEditIngredient(ing.id, "item_name", e.target.value)}
                        className="flex-1 bg-white dark:bg-[#231C17] text-gray-800 dark:text-[#FAF5ED] rounded-xl px-3 py-2 text-xs font-medium border border-gray-200 dark:border-[#45372C] outline-none min-w-[120px]"
                      />
                      <input
                        type="number"
                        value={ing.amount}
                        onChange={(e) => changeEditIngredient(ing.id, "amount", Number(e.target.value))}
                        className="w-20 bg-white dark:bg-[#231C17] text-gray-800 dark:text-[#FAF5ED] rounded-xl px-3 py-2 text-center text-xs font-bold border border-gray-200 dark:border-[#45372C] outline-none"
                        step="0.01"
                      />
                      <input
                        type="text"
                        value={ing.unit}
                        onChange={(e) => changeEditIngredient(ing.id, "unit", e.target.value)}
                        className="w-20 bg-gray-100 dark:bg-[#2A221C] text-gray-500 dark:text-[#C8BCAE] rounded-xl px-2 py-2 text-center text-xs font-medium border border-gray-200 dark:border-[#45372C]"
                        readOnly
                      />
                      <div className="w-full text-right text-[11px] text-gray-500 dark:text-[#A89B8C] font-medium md:w-auto">
                        {raw?.harga_dasar != null
                          ? `${formatRupiah(raw.harga_dasar)} × ${ing.amount} = ${formatRupiah((raw.harga_dasar ?? 0) * ing.amount)}`
                          : "Harga dasar belum diisi"}
                      </div>
                      <button type="button" onClick={() => removeEditIngredient(ing.id)} className="text-red-400 dark:text-rose-400 hover:text-red-600 dark:hover:text-rose-300 p-1">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                <button type="button" onClick={addEditIngredient} className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[#8B5E3C] bg-[#8B5E3C]/5 dark:bg-amber-400/10 px-4 py-2 text-xs font-bold text-[#8B5E3C] dark:text-amber-400 hover:bg-[#8B5E3C]/10 dark:hover:bg-amber-400/20 transition">
                  <Plus className="h-4 w-4" /> Tambah Bahan
                </button>
              </div>
              <CostSummary
                totalHpp={editTotalHppPreview}
                targetMargin={editTargetMargin}
                onTargetMarginChange={setEditTargetMargin}
                hargaJualReal={editHargaJualReal}
                onHargaJualRealChange={setEditHargaJualReal}
                hargaJualHitungan={editHargaJualHitunganPreview}
                profitReal={editProfitRealPreview}
                formatRupiah={formatRupiah}
                formatInputRupiah={formatInputRupiah}
              />
              <div className="flex justify-between pt-4 gap-3">
                <button type="button" onClick={() => setOpenEditModal(false)} className="flex-1 rounded-2xl bg-gray-100 dark:bg-[#35291F] py-3 text-sm font-bold text-gray-700 dark:text-[#C8BCAE] hover:bg-gray-200 dark:hover:bg-[#45372C] transition">Batal</button>
                <button type="submit" className="flex-1 rounded-2xl bg-[#8B5E3C] py-3 text-sm font-bold text-white hover:bg-[#6F4E37] transition shadow-md">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL VIEW RESEP --- */}
      {openViewModal && viewRecipe && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white dark:bg-[#2A221C] p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-100 dark:border-[#45372C]">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-[#3D3127] pb-3">
              <h2 className="text-lg font-extrabold text-gray-800 dark:text-[#FAF5ED]">Detail Resep — <span className="text-[#8B5E3C] dark:text-amber-400">{viewRecipe.name}</span></h2>
              <button onClick={() => setOpenViewModal(false)} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-[#35291F] text-gray-500 dark:text-[#C8BCAE] transition"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 text-sm text-gray-700 dark:text-[#C8BCAE] mb-4 font-medium">
              <p><span className="text-gray-400 dark:text-[#8E8072] font-bold uppercase text-xs block">Menu Item</span> <strong className="text-gray-800 dark:text-[#FAF5ED] text-base">{viewRecipe.name}</strong></p>
              <p><span className="text-gray-400 dark:text-[#8E8072] font-bold uppercase text-xs block mt-2">Kategori</span> <span className="bg-[#FDF3E4] dark:bg-[#3E3024] text-[#8B5E3C] dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-100 dark:border-amber-800/40 inline-block mt-1">{viewRecipe.category_name || "-"}</span></p>
            </div>
            <div className="mt-4">
              <p className="font-bold text-xs uppercase tracking-wider text-gray-400 dark:text-[#8E8072] mb-2">Komposisi Bahan (Mentah):</p>
              <div className="space-y-1.5 bg-gray-50 dark:bg-[#231C17] p-3.5 rounded-2xl border border-gray-100 dark:border-[#3D3127]">
                {viewRecipe.ingredients?.map((ing, i) => {
                  const raw = findRawItemById(ing.item_id);
                  return <p key={i} className="text-sm font-medium text-gray-700 dark:text-[#C8BCAE]">{raw ? raw.name : ing.item_name} — <span className="font-bold text-gray-900 dark:text-[#FAF5ED]">{ing.amount} {ing.unit}</span></p>;
                })}
              </div>
            </div>
            <p className="font-bold text-xs text-gray-400 dark:text-[#8E8072] mt-3">Total {viewRecipe.ingredients?.length ?? 0} bahan</p>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-[#FDF3E4]/50 dark:bg-[#231C17] p-4 text-sm border border-amber-100/60 dark:border-[#3D3127]">
              <div><span className="block text-[10px] text-gray-400 dark:text-[#8E8072] font-bold uppercase">Total HPP</span><strong className="text-gray-800 dark:text-[#FAF5ED] font-black">{formatRupiah(viewRecipe.total_hpp)}</strong></div>
              <div><span className="block text-[10px] text-gray-400 dark:text-[#8E8072] font-bold uppercase">Harga Jual</span><strong className="text-gray-800 dark:text-[#FAF5ED] font-black">{formatRupiah(viewRecipe.harga_jual_real ?? viewRecipe.harga_jual_hitungan)}</strong></div>
              <div><span className="block text-[10px] text-gray-400 dark:text-[#8E8072] font-bold uppercase">Target Margin</span><strong className="text-gray-800 dark:text-[#FAF5ED] font-black">{viewRecipe.target_margin ?? 0}%</strong></div>
              <div><span className="block text-[10px] text-gray-400 dark:text-[#8E8072] font-bold uppercase">Profit Aktual</span><strong className={`font-black ${profitColor(viewRecipe.profit_real)}`}>{formatRupiah(viewRecipe.profit_real)}</strong></div>
            </div>
            <div className="flex justify-center mt-6">
              <button onClick={() => setOpenViewModal(false)} className="w-full py-3 bg-[#8B5E3C] text-white rounded-2xl font-bold hover:bg-[#6F4E37] transition shadow-md text-sm">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL HAPUS --- */}
      {openDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white dark:bg-[#2A221C] p-6 md:p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl border border-gray-100 dark:border-[#45372C]">
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-[#FAF5ED] mb-2">Hapus Resep? ⚠️</h2>
            <p className="text-gray-500 dark:text-[#A89B8C] text-xs mb-6 leading-relaxed">Menghapus resep ini akan menghapus semua data bahan terkait. Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-between gap-3">
              <button onClick={() => setOpenDeleteModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#35291F] rounded-2xl text-gray-700 dark:text-[#C8BCAE] font-bold hover:bg-gray-200 dark:hover:bg-[#45372C] transition text-sm">Batal</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-red-500 dark:bg-rose-600 text-white rounded-2xl font-bold shadow-md hover:bg-red-600 dark:hover:bg-rose-700 transition text-sm">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Resep;