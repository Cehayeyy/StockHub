// resources/js/Pages/MasterData/Resep.tsx
import React, { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Search, Trash } from "lucide-react";

interface Recipe {
  id: number;
  name: string;
  total_ingredients: number;
  created_at: string;
  ingredients?: { item_id: number; item_name: string; amount: number; unit: string }[];
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
}

const Resep: React.FC = () => {
  const { recipes = [], bahan_menu = [], bahan_mentah = [] } =
    usePage<PageProps>().props;

  const [search, setSearch] = useState("");

  // === TAMBAH ===
  const [showModal, setShowModal] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 1, item_id: null, item_name: "", amount: 1, unit: "porsi" },
  ]);

  // === VIEW ===
  const [openViewModal, setOpenViewModal] = useState(false);
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null);

  // === HAPUS ===
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // === EDIT ===
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([]);

  const findRawItemById = (id: number | null) =>
    bahan_mentah.find((it) => it.id === id);

  const findRawItemByName = (name: string) =>
    bahan_mentah.find((it) => it.name === name);

  // === DELETE ===
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

  // === VIEW ===
  const openViewRecipe = (recipe: Recipe) => {
    setViewRecipe(recipe);
    setOpenViewModal(true);
  };

  // === TAMBAH BAHAN ===
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
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));
  };

  const changeIngredient = (id: number, field: keyof Ingredient, value: any) => {
    setIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id !== id) return ing;
        const next = { ...ing, [field]: value };

        if (field === "item_name") {
          const match = findRawItemByName(value);
          next.item_id = match?.id ?? null;
          next.unit = match?.unit ?? next.unit;
        }

        if (field === "item_id") {
          const match = findRawItemById(Number(value));
          if (match) {
            next.item_name = match.name;
            next.unit = match.unit ?? next.unit;
          }
        }

        return next;
      })
    );
  };

  // === SIMPAN RESEP BARU ===
  const saveRecipe = (e: React.FormEvent) => {
    e.preventDefault();

    const invalid = ingredients.some((ing) => !ing.item_id || ing.amount <= 0);
    if (invalid) {
      alert("Pastikan semua bahan valid dan jumlah > 0");
      return;
    }

    router.post(
      route("resep.store"),
      {
        name: menuName,
        ingredients: ingredients.map((ing) => ({
          item_id: ing.item_id,
          amount: ing.amount,
          unit: ing.unit,
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

  // === BUKA EDIT ===
  const openEdit = (recipe: Recipe) => {
    setEditId(recipe.id);
    setEditName(recipe.name);

    setEditIngredients(
      recipe.ingredients?.map((ing, i) => ({
        id: i + 1,
        item_id: ing.item_id,
        item_name: bahan_mentah.find((x) => x.id === ing.item_id)?.name ?? "",
        amount: ing.amount,
        unit: ing.unit,
      })) ?? []
    );

  setOpenEditModal(true);
};

// === SIMPAN EDIT RESEP ===
const updateRecipe = (e: React.FormEvent) => {
    e.preventDefault();

    const invalid = editIngredients.some(
      (ing) => !ing.item_id || ing.amount <= 0
    );
    if (invalid) {
      alert("Pastikan semua bahan valid & jumlah > 0");
      return;
    }

    router.put(
      route("resep.update", editId),
      {
        name: editName,
        ingredients: editIngredients.map((ing) => ({
          item_id: ing.item_id,
          amount: ing.amount,
          unit: ing.unit,
        })),
      },
      {
        onSuccess: () => {
          setOpenEditModal(false);
        },
      }
    );
  };

  // === FUNGSI EDIT INGREDIENT ===
  const changeEditIngredient = (
    id: number,
    field: keyof Ingredient,
    value: any
  ) => {
    setEditIngredients((prev) =>
      prev.map((ing) => {
        if (ing.id !== id) return ing;
        const next = { ...ing, [field]: value };

        if (field === "item_name") {
          const raw = findRawItemByName(value);
          next.item_id = raw?.id ?? null;
          next.unit = raw?.unit ?? next.unit;
        }

        if (field === "item_id") {
          const raw = findRawItemById(Number(value));
          if (raw) {
            next.item_name = raw.name;
            next.unit = raw.unit ?? next.unit;
          }
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
    setEditIngredients((prev) => prev.filter((ing) => ing.id !== id));
  };
// FILTER SEARCH
const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  // =========================
  // RETURN UI
  // =========================

  return (
    <AppLayout header="Resep">
      <Head title="Resep" />

      {/* datalist menu */}
      <datalist id="menu-datalist">
        {bahan_menu.map((it) => (
          <option key={it.id} value={it.name} />
        ))}
      </datalist>

      {/* datalist bahan mentah */}
      <datalist id="raw-datalist">
        {bahan_mentah.map((it) => (
          <option key={it.id} value={it.name} />
        ))}
      </datalist>

      {/* TABLE LIST */}
      <div className={showModal || openViewModal || openEditModal || openDeleteModal ? "blur-sm pointer-events-none" : ""}>
        <div className="p-8">
          <div className="bg-white p-6 rounded-3xl shadow space-y-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowModal(true)}
                className="rounded-full bg-[#D9A978] px-5 py-2 text-sm font-semibold text-white"
              >
                Tambah Resep
              </button>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 rounded-full bg-[#FDF3E4] px-4 py-2 text-sm border"
                />
                <Search className="absolute right-3 top-2 h-4 w-4 text-[#C38E5F]" />
              </div>
            </div>

            {/* TABLE */}
            <div className="border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3">No</th>
                    <th className="p-3">Menu Finish</th>
                    <th className="p-3">Total Bahan</th>
                    <th className="p-3">Dibuat</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {recipes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-6 text-gray-500"
                      >
                        Belum ada resep.
                      </td>
                    </tr>
                  ) : (
                    filteredRecipes.map((r, i) => (
                        <tr key={r.id} className="border-t">
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3">{r.name}</td>
                        <td className="p-3">{r.total_ingredients} bahan</td>
                        <td className="p-3">
                          {new Date(r.created_at).toLocaleDateString("id-ID")}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs"
                              onClick={() => openEdit(r)}
                            >
                              Edit
                            </button>

                            <button
                              className="px-3 py-1 bg-blue-500 text-white rounded-full text-xs"
                              onClick={() => openViewRecipe(r)}
                            >
                              View
                            </button>

                            <button
                              onClick={() => openDeleteConfirm(r.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded-full text-xs"
                            >
                              Hapus
                            </button>
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

      {/* ==================== */}
      {/* MODAL TAMBAH RESEP */}
      {/* ==================== */}

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
                  list="menu-datalist"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  className="w-full bg-gray-100 px-4 py-2 rounded"
                  required
                />
              </div>

              <div>
                <p className="font-semibold text-sm">Bahan Mentah</p>

                {ingredients.map((ing, idx) => (
                  <div
                    key={ing.id}
                    className="bg-gray-100 p-2 rounded-xl flex gap-2 items-center"
                  >
                    <span>{idx + 1}.</span>

                    <input
                      type="text"
                      list="raw-datalist"
                      value={ing.item_name}
                      onChange={(e) =>
                        changeIngredient(ing.id, "item_name", e.target.value)
                      }
                      className="bg-white rounded px-2 py-1 text-xs"
                      placeholder="pilih bahan..."
                    />

                    <input
                      type="number"
                      value={ing.amount}
                      onChange={(e) =>
                        changeIngredient(ing.id, "amount", Number(e.target.value))
                      }
                      className="w-20 bg-white rounded px-2 py-1 text-xs"
                    />

                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) =>
                        changeIngredient(ing.id, "unit", e.target.value)
                      }
                      className="w-20 bg-white rounded px-2 py-1 text-xs"
                    />

                    <button
                      type="button"
                      className="text-red-500"
                      onClick={() => removeIngredient(ing.id)}
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addIngredient}
                  className="mt-2 px-3 py-1 bg-gray-200 rounded text-sm"
                >
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

      {/* ==================== */}
      {/* MODAL VIEW */}
      {/* ==================== */}
      {openViewModal && viewRecipe && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-center mb-4">
              Detail Resep: {viewRecipe.name}
            </h2>

            <div className="space-y-3">
              {viewRecipe.ingredients?.map((ing, idx) => {
                const raw = findRawItemById(ing.item_id);
                return (
                  <div
                    key={idx}
                    className="flex justify-between border-b pb-2"
                  >
                    <p className="font-semibold">
                      {raw ? raw.name : ing.item_name}
                    </p>
                    <p>
                      {ing.amount} {ing.unit}
                    </p>
                  </div>
                );
              })}
            </div>

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

      {/* ==================== */}
      {/* MODAL EDIT */}
      {/* ==================== */}
      {openEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-xl">
            <h3 className="text-xl font-semibold text-center mb-4">
              Edit Resep
            </h3>

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
                  <div
                    key={ing.id}
                    className="bg-gray-100 p-2 rounded-xl flex gap-2 items-center"
                  >
                    <span>{idx + 1}.</span>

                    <input
                      type="text"
                      list="raw-datalist"
                      value={ing.item_name}
                      onChange={(e) =>
                        changeEditIngredient(ing.id, "item_name", e.target.value)
                      }
                      className="bg-white rounded px-2 py-1 text-xs"
                    />

                    <input
                      type="number"
                      value={ing.amount}
                      onChange={(e) =>
                        changeEditIngredient(
                          ing.id,
                          "amount",
                          Number(e.target.value)
                        )
                      }
                      className="w-20 bg-white rounded px-2 py-1 text-xs"
                    />

                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) =>
                        changeEditIngredient(ing.id, "unit", e.target.value)
                      }
                      className="w-20 bg-white rounded px-2 py-1 text-xs"
                    />

                    <button
                      type="button"
                      onClick={() => removeEditIngredient(ing.id)}
                      className="text-red-500"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addEditIngredient}
                  className="mt-2 px-3 py-1 bg-gray-200 rounded text-sm"
                >
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

      {/* ==================== */}
      {/* MODAL HAPUS */}
      {/* ==================== */}
      {openDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-3xl w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-center mb-4">
              Hapus Resep?
            </h2>

            <p className="text-center text-gray-700 mb-4">
              Menghapus resep ini akan menghapus semua bahan terkait.
            </p>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setOpenDeleteModal(false)}
                className="px-6 py-2 bg-gray-300 rounded-xl"
              >
                Batal
              </button>

              <button
                onClick={confirmDelete}
                className="px-6 py-2 bg-red-500 text-white rounded-xl font-semibold"
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
