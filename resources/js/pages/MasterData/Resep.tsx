import React, { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Search, Trash, ChevronDown, Plus } from "lucide-react"; // Tambahkan Plus

interface Recipe {
  id: number;
  name: string;
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

interface PageProps {
  recipes: Recipe[];
  bahan_menu: Item[];
  bahan_mentah: Item[];
  division: "bar" | "dapur";
  auth: {
    user: {
      role: string;
    };
  };
}

const Resep: React.FC = () => {
  const {
    recipes = [],
    bahan_menu = [],
    bahan_mentah = [],
    division,
    auth,
  } = usePage<PageProps>().props;

  const role = auth.user.role;
  const isStaff = role === "bar" || role === "kitchen";

  // State
  const [selectedDivision, setSelectedDivision] = useState<"bar" | "dapur">(division);
  const [showDivisionDropdown, setShowDivisionDropdown] = useState(false);
  const [search, setSearch] = useState("");

  // === TAMBAH ===
  const [showModal, setShowModal] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 1, item_id: null, item_name: "", amount: 1, unit: "porsi" },
  ]);

  // === VIEW/EDIT/DELETE ===
  const [openViewModal, setOpenViewModal] = useState(false);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [openEditModal, setOpenEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([]);

  // --- HELPERS ---
  const findRawItemById = (id: number | null) =>
    bahan_mentah.find((it) => it.id === id);

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
      { division: div },
      { preserveScroll: true, replace: true }
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

    if (selectedDivision === "bar" && !menu) {
      return alert("Menu jadi wajib dipilih dari daftar yang tersedia.");
    }

    const invalid = ingredients.some((ing) => !ing.item_id || ing.amount <= 0);
    if (invalid) return alert("Pastikan semua bahan valid dan jumlah > 0.");

    router.post(
      route("resep.store"),
      {
        name: menuName,
        division: selectedDivision,
        menu_item_id: selectedDivision === "bar" ? menu?.id : null,
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
          setIngredients([
            { id: 1, item_id: null, item_name: "", amount: 1, unit: "porsi" },
          ]);
        },
      }
    );
  };

  // --- FORM HANDLERS (EDIT) ---
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
    const invalid = editIngredients.some(
      (ing) => !ing.item_id || ing.amount <= 0
    );
    if (invalid)
      return alert(
        "Pastikan semua bahan valid (dipilih dari daftar dropdown) dan jumlah > 0."
      );

    router.put(
      route("resep.update", editId),
      {
        name: editName,
        division: selectedDivision,
        ingredients: editIngredients.map((ing) => ({
          item_id: ing.item_id,
          amount: ing.amount,
          unit: ing.unit,
        })),
      },
      { onSuccess: () => setOpenEditModal(false) }
    );
  };

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout header={`Resep ${selectedDivision === "bar" ? "Bar" : "Dapur"}`}>
      <Head title="Resep" />

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
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[600px] flex flex-col">
          {/* HEADER */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Division Selector */}
            {!isStaff ? (
              <div className="relative inline-block w-40">
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

            {/* Right Controls */}
            <div className="flex gap-3 items-center">
              {!isStaff && (
                // 🔥 UPDATE STYLE TOMBOL DISINI 🔥
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 rounded-full bg-[#C19A6B] px-6 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#a8855a]"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Resep
                </button>
              )}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 rounded-full bg-[#FDF3E4] pl-4 pr-10 py-2 text-sm border-none focus:ring-2 focus:ring-[#D9A978]"
                />
                <Search className="absolute right-3 top-2 h-4 w-4 text-[#C38E5F]" />
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="w-full overflow-x-auto rounded-xl border border-gray-100 bg-white">
            <table className="w-full text-sm whitespace-nowrap text-left">
              <thead className="bg-[#F3F3F3] text-gray-700 font-bold border-b">
                <tr>
                  <th className="p-4 w-16 text-center">No</th>
                  <th className="p-4">Menu Jadi</th>
                  <th className="p-4">Total Bahan</th>
                  <th className="p-4">Dibuat</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecipes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      Belum ada resep.
                    </td>
                  </tr>
                ) : (
                  filteredRecipes.map((r, i) => (
                    <tr key={r.id} className="hover:bg-[#FFF7EC] transition">
                      <td className="p-4 text-center text-gray-500">{i + 1}</td>
                      <td className="p-4 font-medium text-gray-800">{r.name}</td>
                      <td className="p-4 text-gray-600">
                        {r.total_ingredients} bahan
                      </td>
                      <td className="p-4 text-gray-600">
                        {r.created_at || "-"}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          {!isStaff && (
                            <button
                              onClick={() => openEdit(r)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => openViewRecipe(r)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs"
                          >
                            View
                          </button>
                          {!isStaff && (
                            <button
                              onClick={() => openDeleteConfirm(r.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-full text-xs"
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
        </div>
      </div>

      {/* --- MODAL TAMBAH (STYLE SEBELUMNYA) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-xl">
            <h3 className="text-xl font-semibold text-center mb-4">
              Tambah Resep
            </h3>

            <form onSubmit={saveRecipe} className="space-y-5">
              <div>
                <label className="font-semibold text-sm">Nama Menu Jadi</label>
                <input
                  type="text"
                  list={selectedDivision === "bar" ? "menu-datalist" : undefined}
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  className="w-full bg-gray-100 px-4 py-2 rounded"
                  placeholder="Ketik nama menu..."
                  required
                />
              </div>

              <div>
                <p className="font-semibold text-sm">Bahan Mentah</p>
                {ingredients.map((ing, idx) => (
                  <div key={ing.id} className="bg-gray-100 p-2 rounded-xl flex gap-2 items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      list="raw-datalist"
                      value={ing.item_name}
                      onChange={(e) => changeIngredient(ing.id, "item_name", e.target.value)}
                      className="flex-1 bg-white rounded px-2 py-1 text-xs"
                      placeholder="pilih bahan..."
                      required
                    />
                    <input
                      type="number"
                      value={ing.amount}
                      onChange={(e) => changeIngredient(ing.id, "amount", Number(e.target.value))}
                      className="w-16 bg-white rounded px-2 py-1 text-xs"
                      placeholder="Jml"
                      required
                      step="0.01"
                    />
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => changeIngredient(ing.id, "unit", e.target.value)}
                      className="w-16 bg-white rounded px-2 py-1 text-xs"
                      placeholder="Satuan"
                      readOnly
                    />
                    <button type="button" onClick={() => removeIngredient(ing.id)} className="text-red-500">
                        <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addIngredient} className="mt-2 px-3 py-1 bg-gray-200 rounded text-sm">
                    Tambah Bahan
                </button>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDIT (STYLE SEBELUMNYA) --- */}
      {openEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-xl">
            <h3 className="text-xl font-semibold text-center mb-4">Edit Resep</h3>
            <form onSubmit={updateRecipe} className="space-y-5">
              <div>
                <label className="font-semibold text-sm">Nama Menu Jadi</label>
                <input
                  type="text"
                  list="menu-datalist"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-gray-100 px-4 py-2 rounded"
                  required
                />
              </div>

              <div>
                <p className="font-semibold text-sm">Bahan Mentah</p>
                {editIngredients.map((ing, idx) => (
                  <div key={ing.id} className="bg-gray-100 p-2 rounded-xl flex gap-2 items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      list="raw-datalist"
                      value={ing.item_name}
                      onChange={(e) => changeEditIngredient(ing.id, "item_name", e.target.value)}
                      className="flex-1 bg-white rounded px-2 py-1 text-xs"
                    />
                    <input
                      type="number"
                      value={ing.amount}
                      onChange={(e) => changeEditIngredient(ing.id, "amount", Number(e.target.value))}
                      className="w-16 bg-white rounded px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => changeEditIngredient(ing.id, "unit", e.target.value)}
                      className="w-16 bg-white rounded px-2 py-1 text-xs"
                      readOnly
                    />
                    <button type="button" onClick={() => removeEditIngredient(ing.id)} className="text-red-500">
                        <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addEditIngredient} className="mt-2 px-3 py-1 bg-gray-200 rounded text-sm">
                    Tambah Bahan
                </button>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setOpenEditModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL VIEW (STYLE SEBELUMNYA) --- */}
      {openViewModal && viewRecipe && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-xl">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">
                Detail Resep — {viewRecipe.name}
              </h2>
              <button
                onClick={() => setOpenViewModal(false)}
                className="text-black font-bold text-xl"
              >
                ×
              </button>
            </div>

            <p className="font-semibold mb-2">
              Menu item: {viewRecipe.name}
            </p>

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

            <p className="font-semibold">
              Total {viewRecipe.ingredients?.length ?? 0} bahan
            </p>

            <div className="flex justify-center mt-6">
              <button
                onClick={() => setOpenViewModal(false)}
                className="px-6 py-2 bg-gray-300 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DELETE --- */}
      {openDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm text-center shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Hapus Resep?</h2>
            <p className="text-gray-500 text-sm mb-6">
              Menghapus resep ini akan menghapus semua data bahan terkait. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setOpenDeleteModal(false)}
                className="px-6 py-2 bg-gray-300 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2 bg-red-500 text-white rounded-xl"
              >
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
