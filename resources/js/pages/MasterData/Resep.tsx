import React, { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Search, Trash } from "lucide-react";

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
}

const Resep: React.FC = () => {
  const { recipes = [], bahan_menu = [], bahan_mentah = [], division } =
    usePage<PageProps>().props;

  const [selectedDivision, setSelectedDivision] = useState<"bar" | "dapur">(division);
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

  // === DELETE ===
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

  const findMenuByName = (name: string) =>
  bahan_menu.find((it) => it.name === name);


  // === DELETE HANDLER ===
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

  // === VIEW HANDLER ===
  const openViewRecipe = (recipe: Recipe) => {
    setViewRecipe(recipe);
    setOpenViewModal(true);
  };

  // === TAMBAH BAHAN HANDLER ===
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

  // === SIMPAN TAMBAH RESEP ===
  const saveRecipe = (e: React.FormEvent) => {
  e.preventDefault();

  const menu = findMenuByName(menuName);

  if (selectedDivision === "bar" && !menu) {
    return alert("Menu jadi wajib dipilih dari daftar");
  }

  const invalid = ingredients.some(
    (ing) => !ing.item_id || ing.amount <= 0
  );
  if (invalid) return alert("Pastikan semua bahan valid");

  router.post(
    route("resep.store"),
    {
      name: menuName,
      division: selectedDivision,
      menu_item_id: selectedDivision === "bar" ? menu?.id : null, // 🔑 INI KUNCI
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
      onError: (err) => {
        console.error(err);
        alert("Gagal menyimpan resep");
      },
    }
  );
};


  // === EDIT HANDLER ===
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
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, item_id: null, item_name: "", amount: 1, unit: "porsi" },
    ]);
  };

  const removeEditIngredient = (id: number) => {
    setEditIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  const updateRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = editIngredients.some((ing) => !ing.item_id || ing.amount <= 0);
    if (invalid) return alert("Pastikan semua bahan valid");

    router.put(
      route("resep.update", editId),
      {
        name: editName,
        division: selectedDivision,
        ingredients: editIngredients.map((ing) => ({ item_id: ing.item_id, amount: ing.amount, unit: ing.unit })),
      },
      { onSuccess: () => setOpenEditModal(false) }
    );
  };

  // === SEARCH FILTER ===
  const filteredRecipes = recipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  // ==============================
  // UI
  // ==============================
  return (
    <AppLayout header={`Resep ${selectedDivision === "bar" ? "Bar" : "Dapur"}`}>
      <Head title="Resep" />

      <datalist id="menu-datalist">
        {bahan_menu.map((it) => (<option key={it.id} value={it.name} />))}
      </datalist>

      <datalist id="raw-datalist">
        {bahan_mentah.map((it) => (<option key={it.id} value={it.name} />))}
      </datalist>

      {/* SELECT DIVISION */}
      <div className={showModal || openViewModal || openEditModal || openDeleteModal ? "blur-sm pointer-events-none" : ""}>
        <div className="p-4">
          <select
            value={selectedDivision}
            onChange={(e) => {
              const div = e.target.value as "bar" | "dapur";
              setSelectedDivision(div);
              router.get(route("resep"), { division: div }, { preserveScroll: true, replace: true });
            }}
            className="rounded-full border px-4 py-2 text-sm bg-[#FDF3E4]"
          >
            <option value="bar">Bar</option>
            <option value="dapur">Dapur</option>
          </select>

          {/* LIST RECIPES */}
          <div className="mt-4 bg-white p-6 rounded-3xl shadow space-y-6">
            <div className="flex justify-between items-center">
              <button onClick={() => setShowModal(true)} className="rounded-full bg-[#D9A978] px-5 py-2 text-sm font-semibold text-white">
                Tambah Resep
              </button>
              <div className="relative">
                <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-64 rounded-full bg-[#FDF3E4] px-4 py-2 text-sm border" />
                <Search className="absolute right-3 top-2 h-4 w-4 text-[#C38E5F]" />
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100">
                  <tr className="border">
                    <th className="p-3 border">No</th>
                    <th className="p-3 border">Menu Jadi</th>
                    <th className="p-3 border">Total Bahan</th>
                    <th className="p-3 border">Dibuat</th>
                    <th className="p-3 border text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipes.length === 0 ? (
                    <tr className="border"><td colSpan={5} className="text-center py-6 border">Belum ada resep.</td></tr>
                  ) : (
                    filteredRecipes.map((r, i) => (
                      <tr key={r.id} className="border">
                        <td className="p-3 border">{i + 1}</td>
                        <td className="p-3 border">{r.name}</td>
                        <td className="p-3 border">{r.total_ingredients} bahan</td>
                        <td className="p-3 border">
                        {r.created_at
                            ? new Date(r.created_at).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                            })
                            : "-"}
                        </td>

                        <td className="p-3 border text-center">
                          <div className="flex justify-center gap-2">
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
                            className="px-3 py-1 bg-red-500 text-white rounded-full text-xs"
                            onClick={() => openDeleteConfirm(r.id)}
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

      {/* MODAL TAMBAH */}
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

      {/* MODAL VIEW */}
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

      {/* MODAL EDIT */}
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

      {/* MODAL DELETE */}
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
