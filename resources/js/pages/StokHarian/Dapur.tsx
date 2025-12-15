import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head } from "@inertiajs/react";
import axios from "axios";
import { Search, Calendar, X } from "lucide-react";

/* ======================
   TYPES
====================== */
type Ingredient = {
  item_id: number;
  amount: number;
  unit: string;
  item?: {
    name: string;
    satuan?: string;
  };
};

type Recipe = {
  id: number;
  name: string;
  ingredients: Ingredient[];
};

type MentahItem = {
  item_id: number;
  name: string;
  unit: string;
  total: number;
};

/* ======================
   COMPONENT
====================== */
export default function StokHarianDapur() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"menu" | "mentah">("menu");

  /* ===== MODAL INPUT ===== */
  const [openInput, setOpenInput] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | "">("");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  /* ======================
     FETCH DATA
  ====================== */
  const fetchData = () => {
    axios.get("/dapur/stok-harian").then((res) => {
      setRecipes(res.data);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedRecipe = useMemo(
    () => recipes.find((r) => r.id === selectedRecipeId),
    [recipes, selectedRecipeId]
  );

  /* ======================
     MENU
  ====================== */
  const menuData = useMemo(() => {
    return recipes.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [recipes, search]);

  /* ======================
     MENTAH (GROUP)
  ====================== */
  const mentahData = useMemo(() => {
    const map = new Map<number, MentahItem>();

    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => {
        if (!map.has(ing.item_id)) {
          map.set(ing.item_id, {
            item_id: ing.item_id,
            name: ing.item?.name ?? "Unknown",
            unit: ing.unit,
            total: ing.amount,
          });
        }
      });
    });

    return Array.from(map.values()).filter((i) =>
      i.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [recipes, search]);

  /* ======================
     PREVIEW BAHAN
  ====================== */
  const previewIngredients = useMemo(() => {
    if (!selectedRecipe) return [];

    return selectedRecipe.ingredients.map((ing) => ({
      name: ing.item?.name ?? "Unknown",
      unit: ing.unit,
      total: ing.amount * qty,
    }));
  }, [selectedRecipe, qty]);

  /* ======================
     SUBMIT INPUT MENU
  ====================== */
  const submitInput = () => {
    if (!selectedRecipeId) {
      alert("Pilih menu terlebih dahulu");
      return;
    }

    setLoading(true);

    axios
      .post("/stok-harian/dapur/menu", {
        recipe_id: selectedRecipeId,
        date: new Date().toISOString().slice(0, 10),
        stok_masuk: qty,
      })
      .then(() => {
        setOpenInput(false);
        setSelectedRecipeId("");
        setQty(1);
        fetchData(); // reload tabel
      })
      .finally(() => setLoading(false));
  };

  return (
    <AppLayout header="Stok Harian Dapur">
      <Head title="Stok Harian Dapur" />

      <div className="p-8">
        <div className="bg-white rounded-3xl p-6 shadow space-y-6">
          {/* HEADER */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {tab === "menu" ? "Stok Harian Menu" : "Stok Harian Mentah"}
            </h2>

            <div className="flex gap-3">
              {tab === "menu" && (
                <button
                  onClick={() => setOpenInput(true)}
                  className="px-5 py-2 rounded-full bg-[#D6B48A] text-white text-sm"
                >
                  Input Data
                </button>
              )}
              <button className="px-5 py-2 rounded-full bg-[#D6B48A] text-white text-sm">
                Tambah Data
              </button>
            </div>
          </div>

          {/* FILTER */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#F3E2C7] px-4 py-2 rounded-full text-sm">
              <Calendar className="w-4 h-4" />
              13/12/2025
            </div>

            <div className="relative ml-auto">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-full px-4 py-2 pr-10 border text-sm"
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-500" />
            </div>

            <div className="flex rounded-full bg-gray-200 overflow-hidden">
              <button
                onClick={() => setTab("menu")}
                className={`px-4 py-1 ${
                  tab === "menu" ? "bg-[#D6B48A] text-white" : ""
                }`}
              >
                Menu
              </button>
              <button
                onClick={() => setTab("mentah")}
                className={`px-4 py-1 ${
                  tab === "mentah" ? "bg-[#D6B48A] text-white" : ""
                }`}
              >
                Mentah
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 w-12">No</th>
                  <th className="p-3 text-left">Nama</th>
                  <th className="p-3 w-32">Satuan</th>
                  <th className="p-3 w-32">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {tab === "menu" &&
                  menuData.map((r, i) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 text-center">{i + 1}</td>
                      <td className="p-3">{r.name}</td>
                      <td className="p-3 text-center">porsi</td>
                      <td className="p-3 text-center">
                        <button className="px-4 py-1 bg-[#D6B48A] text-white rounded-full text-xs">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}

                {tab === "mentah" &&
                  mentahData.map((m, i) => (
                    <tr key={m.item_id} className="border-t">
                      <td className="p-3 text-center">{i + 1}</td>
                      <td className="p-3">{m.name}</td>
                      <td className="p-3 text-center">{m.unit}</td>
                      <td className="p-3 text-center">
                        <button className="px-4 py-1 bg-[#D6B48A] text-white rounded-full text-xs">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL INPUT */}
      {openInput && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Input Produksi Menu</h3>
              <button onClick={() => setOpenInput(false)}>
                <X />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium">Menu</label>
              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 mt-1"
              >
                <option value="">Pilih menu</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium">Jumlah Produksi</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 mt-1"
              />
            </div>

            {previewIngredients.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold mb-2">Kebutuhan Bahan</p>
                {previewIngredients.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{i.name}</span>
                    <span>
                      {i.total} {i.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpenInput(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={submitInput}
                disabled={loading}
                className="px-4 py-2 bg-[#D6B48A] text-white rounded-lg disabled:opacity-50"
              >
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
