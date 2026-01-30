import React, { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router, Link } from "@inertiajs/react";
import { Search, Trash, ChevronDown, Plus, BookOpen, Edit } from "lucide-react";

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
  created_at: string | null;
  ingredients?: {
    item_id: number;
    item_name: string;
    amount: number;
    unit: string;
  }[];
}

interface Item {
  id: number;
  name: string;
  unit?: string;
}

interface Ingredient {
  id: number;
  item_id: number | null;
  item_name: string;
  amount: number;
  unit: string;
}

// 🔥 UPDATE INTERFACE PAGINATION
interface PageProps {
  recipes: {
    data: Recipe[];
    links: any[];
    current_page: number;
    per_page: number;
    total: number;
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

const Resep: React.FC = () => {
  const {
    recipes, // Data Pagination dari server
    categories = [],
    bahan_menu = [],
    bahan_mentah = [],
    division,
    search: initialSearch,
    auth,
  } = usePage<any>().props as PageProps;

  const role = auth.user.role;
  const isStaff = role === "bar" || role === "dapur";

  // State
  const [selectedDivision, setSelectedDivision] = useState<"bar" | "dapur">(division);
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
  const [search, setSearch] = useState(initialSearch || "");

  // === TAMBAH STATE ===
  const [showModal, setShowModal] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [categoryId, setCategoryId] = useState<number | string>("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 1, item_id: null, item_name: "", amount: 1, unit: "porsi" },
  ]);

  // === VIEW/EDIT/DELETE STATE ===
  const [openViewModal, setOpenViewModal] = useState(false);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [openEditModal, setOpenEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | string>("");
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([]);

  // --- HELPERS ---
  const findRawItemById = (id: number | null) => bahan_mentah.find((it) => it.id === id);
  const findRawItemByName = (name: string) =>
    bahan_mentah.find((it) => it.name.trim().toLowerCase() === name.trim().toLowerCase());
  const findMenuByName = (name: string) =>
    bahan_menu.find((it) => it.name.trim().toLowerCase() === name.trim().toLowerCase());

  // --- HANDLERS ---
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

  const openViewRecipe = (recipe: Recipe) => {
    setViewRecipe(recipe);
    setOpenViewModal(true);
  };

  // --- FORM HANDLERS (ADD) ---
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
    if (!categoryId) return alert("Silakan pilih kategori terlebih dahulu.");

    router.post(
      route("resep.store"),
      {
        name: menuName,
        division: selectedDivision,
        category_id: categoryId,
        menu_item_id: menu?.id ?? null,
        ingredients: ingredients.map((i) => ({
          item_id: i.item_id,
          amount: i.amount,
          unit: i.unit,
        })),
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setMenuName("");
          setCategoryId("");
          setIngredients([{ id: 1, item_id: null, item_name: "", amount: 1, unit: "porsi" }]);
        },
      }
    );
  };

  // --- FORM HANDLERS (EDIT) ---
  const openEdit = (recipe: Recipe) => {
    setEditId(recipe.id);
    setEditName(recipe.name);
    setEditCategoryId(recipe.category_id || "");
    setEditIngredients(
      recipe.ingredients?.map((ing, i) => ({
        id: i + 1,
        item_id: ing.item_id,
        item_name: findRawItemById(ing.item_id)?.name ?? ing.item_name ?? "",
        amount: ing.amount,
        unit: ing.unit,
      })) ?? []
    );
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
    if (!editCategoryId) return alert("Silakan pilih kategori terlebih dahulu.");

    router.put(
      route("resep.update", editId),
      {
        name: editName,
        division: selectedDivision,
        category_id: editCategoryId,
        ingredients: editIngredients.map((ing) => ({
          item_id: ing.item_id,
          amount: ing.amount,
          unit: ing.unit,
        })),
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

      <div className="py-6">
        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
          {/* HEADER CONTROL */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {!isStaff ? (
              <div className="relative inline-block w-full md:w-40">
                <button
                  type="button"
                  onClick={() => setShowDivisionDropdown((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-full bg-[#F6E1C6] px-4 py-2 text-sm font-medium text-[#7A4A2B] shadow-sm hover:bg-[#eacba6] transition"
                >
                  <span className="capitalize">{selectedDivision}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showDivisionDropdown ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showDivisionDropdown && (
                  <div className="absolute left-0 mt-1 w-full rounded-2xl bg-[#E7BE8B] py-1 text-sm shadow-lg z-20 overflow-hidden">
                    <button
                      onClick={() => changeDivision("bar")}
                      className="block w-full px-4 py-2 text-left hover:bg-[#d9a978]"
                    >
                      Bar
                    </button>
                    <button
                      onClick={() => changeDivision("dapur")}
                      className="block w-full px-4 py-2 text-left hover:bg-[#d9a978]"
                    >
                      Dapur
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-2 rounded-full bg-[#F6E1C6] text-sm font-medium text-[#7A4A2B] capitalize w-fit">
                {selectedDivision}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto">
              {!isStaff && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex w-full md:w-auto items-center justify-center gap-2 rounded-full bg-[#C19A6B] px-6 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#a8855a]"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Resep
                </button>
              )}
              <div className="relative w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={handleSearch}
                  className="w-full md:w-64 rounded-full bg-[#FDF3E4] pl-4 pr-10 py-2 text-sm border-none focus:ring-2 focus:ring-[#D9A978]"
                />
                <Search className="absolute right-3 top-2 h-4 w-4 text-[#C38E5F]" />
              </div>
            </div>
          </div>

          {/* --- MOBILE VIEW (CARDS) --- */}
          <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
            {recipes.data.length === 0 ? (
              <div className="text-center text-gray-400 py-8 border rounded-xl bg-gray-50">
                Belum ada resep.
              </div>
            ) : (
              recipes.data.map((r) => (
                <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-50 p-2 rounded-lg text-[#D9A978]">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{r.name}</div>
                        <div className="text-xs text-gray-500">{r.total_ingredients} bahan</div>
                        {r.category_name && (
                          <div className="text-xs text-[#7A4A2B] mt-1 bg-[#F6E1C6] px-2 py-0.5 rounded-full w-fit">
                            {r.category_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mb-3 pl-1">
                    Dibuat: {r.created_at || "-"}
                  </div>
                  <div className="flex gap-2 border-t pt-3">
                    <button
                      onClick={() => openViewRecipe(r)}
                      className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-blue-600 transition"
                    >
                      View
                    </button>
                    {!isStaff && (
                      <>
                        <button
                          onClick={() => openEdit(r)}
                          className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-blue-600 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(r.id)}
                          className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-red-600 transition"
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
          <div className="hidden md:block w-full overflow-x-auto rounded-xl border border-gray-100 bg-white">
            <table className="w-full text-sm whitespace-nowrap text-left">
              <thead className="bg-[#F3F3F3] text-gray-700 font-bold border-b">
                <tr>
                  <th className="p-4 w-16 text-center">No</th>
                  <th className="p-4">Menu Jadi</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Total Bahan</th>
                  <th className="p-4">Dibuat</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recipes.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      Belum ada resep.
                    </td>
                  </tr>
                ) : (
                  recipes.data.map((r, i) => (
                    <tr key={r.id} className="hover:bg-[#FFF7EC] transition">
                      <td className="p-4 text-center text-gray-500">
                        {/* UPDATE LOGIC PENOMORAN HALAMAN */}
                        {(recipes.current_page - 1) * recipes.per_page + i + 1}
                      </td>
                      <td className="p-4 font-medium text-gray-800">{r.name}</td>
                      <td className="p-4 text-gray-600">
                        {r.category_name ? (
                          <span className="bg-[#F6E1C6] text-[#7A4A2B] px-2 py-1 rounded-lg text-xs font-medium">
                            {r.category_name}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-4 text-gray-600">{r.total_ingredients} bahan</td>
                      <td className="p-4 text-gray-600">{r.created_at || "-"}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          {!isStaff && (
                            <button
                              onClick={() => openEdit(r)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs hover:bg-blue-600 transition"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => openViewRecipe(r)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs hover:bg-blue-600 transition"
                          >
                            View
                          </button>
                          {!isStaff && (
                            <button
                              onClick={() => openDeleteConfirm(r.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* --- PAGINATION (ADDED HERE) --- */}
          {recipes.links && recipes.links.length > 3 && (
            <div className="mt-auto flex justify-center pt-6 pb-2">
              <div className="flex flex-wrap justify-center gap-1 bg-gray-50 p-1 rounded-full border border-gray-200">
                {recipes.links.map((link: any, i: number) => {
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

      {/* --- MODAL TAMBAH RESEP --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-semibold text-center mb-4">Tambah Resep</h3>
            <form onSubmit={saveRecipe} className="space-y-5">
              <div>
                <label className="font-semibold text-sm">Pilih Kategori</label>
                <select
                  className="w-full bg-gray-100 px-4 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#D9A978] mt-1"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-sm">Nama Menu Jadi</label>
                <input
                  type="text"
                  list="menu-datalist"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  className="w-full bg-gray-100 px-4 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                  placeholder="Pilih atau ketik nama menu..."
                  required
                />
              </div>
              <div>
                <p className="font-semibold text-sm">Bahan Mentah</p>
                {ingredients.map((ing, idx) => (
                  <div key={ing.id} className="bg-gray-100 p-2 rounded-xl flex flex-wrap gap-2 items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      list="raw-datalist"
                      value={ing.item_name}
                      onChange={(e) => changeIngredient(ing.id, "item_name", e.target.value)}
                      className="flex-1 bg-white rounded px-2 py-1 text-xs border border-gray-200 min-w-[120px]"
                      placeholder="pilih bahan..."
                      required
                    />
                    <input
                      type="number"
                      value={ing.amount}
                      onChange={(e) => changeIngredient(ing.id, "amount", Number(e.target.value))}
                      className="w-16 bg-white rounded px-2 py-1 text-xs border border-gray-200"
                      placeholder="Jml"
                      required
                      step="0.01"
                    />
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => changeIngredient(ing.id, "unit", e.target.value)}
                      className="w-16 bg-white rounded px-2 py-1 text-xs border border-gray-200"
                      placeholder="Satuan"
                      readOnly
                    />
                    <button type="button" onClick={() => removeIngredient(ing.id)} className="text-red-500">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addIngredient} className="mt-2 px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300 transition w-full md:w-auto">
                  Tambah Bahan
                </button>
              </div>
              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded-xl hover:bg-gray-400 transition">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDIT RESEP --- */}
      {openEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-semibold text-center mb-4">Edit Resep</h3>
            <form onSubmit={updateRecipe} className="space-y-5">
              <div>
                <label className="font-semibold text-sm">Pilih Kategori</label>
                <select
                  className="w-full bg-gray-100 px-4 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#D9A978] mt-1"
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-semibold text-sm">Nama Menu Jadi</label>
                <input
                  type="text"
                  list="menu-datalist"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-100 px-4 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#D9A978]"
                  required
                />
              </div>
              <div>
                <p className="font-semibold text-sm">Bahan Mentah</p>
                {editIngredients.map((ing, idx) => (
                  <div key={ing.id} className="bg-gray-100 p-2 rounded-xl flex flex-wrap gap-2 items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      list="raw-datalist"
                      value={ing.item_name}
                      onChange={(e) => changeEditIngredient(ing.id, "item_name", e.target.value)}
                      className="flex-1 bg-white rounded px-2 py-1 text-xs border border-gray-200 min-w-[120px]"
                    />
                    <input
                      type="number"
                      value={ing.amount}
                      onChange={(e) => changeEditIngredient(ing.id, "amount", Number(e.target.value))}
                      className="w-16 bg-white rounded px-2 py-1 text-xs border border-gray-200"
                    />
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => changeEditIngredient(ing.id, "unit", e.target.value)}
                      className="w-16 bg-white rounded px-2 py-1 text-xs border border-gray-200"
                      readOnly
                    />
                    <button type="button" onClick={() => removeEditIngredient(ing.id)} className="text-red-500">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addEditIngredient} className="mt-2 px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300 transition w-full md:w-auto">
                  Tambah Bahan
                </button>
              </div>
              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setOpenEditModal(false)} className="px-4 py-2 bg-gray-300 rounded-xl hover:bg-gray-400 transition">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL VIEW --- */}
      {openViewModal && viewRecipe && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Detail Resep — {viewRecipe.name}</h2>
              <button onClick={() => setOpenViewModal(false)} className="text-black font-bold text-xl">
                ×
              </button>
            </div>
            <p className="font-semibold mb-2">Menu item: {viewRecipe.name}</p>
            <p className="font-semibold mb-2">Kategori: {viewRecipe.category_name || "-"}</p>
            <p className="font-semibold">Komposisi bahan (mentah):</p>
            <div className="space-y-1 mt-2 mb-4">
              {viewRecipe.ingredients?.map((ing, i) => {
                const raw = findRawItemById(ing.item_id);
                return (
                  <p key={i}>
                    • {raw ? raw.name : ing.item_name} — {ing.amount} {ing.unit}
                  </p>
                );
              })}
            </div>
            <p className="font-semibold">Total {viewRecipe.ingredients?.length ?? 0} bahan</p>
            <div className="flex justify-center mt-6">
              <button onClick={() => setOpenViewModal(false)} className="px-6 py-2 bg-gray-300 rounded-xl hover:bg-gray-400 transition">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DELETE --- */}
      {openDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm text-center shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Hapus Resep?</h2>
            <p className="text-gray-500 text-sm mb-6">Menghapus resep ini akan menghapus semua data bahan terkait. Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setOpenDeleteModal(false)} className="px-6 py-2 bg-gray-300 rounded-xl hover:bg-gray-400 transition">
                Batal
              </button>
              <button onClick={confirmDelete} className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Resep;
