import React, { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { Search } from 'lucide-react';

interface Recipe {
  id: number;
  name: string;
  total_ingredients: number;
  created_at: string;
}

interface Ingredient {
  id: number;
  name: string;
  amount: string;
  unit: string;
}

interface PageProps {
  recipes: Recipe[];
  errors: Record<string, string>;
  [key: string]: any;
}

const Resep: React.FC = () => {
  const { recipes = [], errors } = usePage<PageProps>().props;

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [menuName, setMenuName] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 1, name: '', amount: '', unit: '' },
  ]);

  // Filter untuk search
  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  // Tambah baris bahan
  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        name: '',
        amount: '',
        unit: '',
      },
    ]);
  };

  // Hapus baris bahan
  const handleRemoveIngredient = (id: number) => {
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));
  };

  // Ubah field bahan
  const handleChangeIngredient = (
    id: number,
    field: keyof Ingredient,
    value: string
  ) => {
    setIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  };

  // Reset form
  const resetForm = () => {
    setMenuName('');
    setIngredients([{ id: 1, name: '', amount: '', unit: '' }]);
  };

  const handleCancel = () => {
    resetForm();
    setShowModal(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: menuName,
      ingredients: ingredients.map((ing) => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
      })),
    };

    router.post(route('resep.store'), payload, {
      preserveScroll: true,
      onSuccess: () => {
        resetForm();
        setShowModal(false);
      },
    });
  };

  return (
    <AppLayout header="Resep">
      <Head title="Resep" />

      {/* blur kalau modal terbuka */}
      <div className={showModal ? 'pointer-events-none blur-sm' : ''}>
        <div className="space-y-6">
          <div className="rounded-3xl bg-[#F5E2C8] p-8 shadow-inner">
            <div className="rounded-3xl bg-[#FDF3E4] p-6 shadow">
              {/* header + tombol + search */}
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h2 className="text-2xl font-semibold text-[#8B5E3C]">
                  Resep
                </h2>

                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="rounded-full bg-[#D9A978] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#c39160]"
                  >
                    Tambah Resep
                  </button>

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search...."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-64 rounded-full border border-[#E5C39C] bg-[#FDF3E4] px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#E5C39C]"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#C38E5F]"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* tabel */}
              <div className="rounded-lg border border-gray-200 bg-white">
                <div className="max-h-[48vh] overflow-y-auto">
                  <table className="min-w-full table-auto text-left text-sm">
                    <thead className="border-b bg-gray-100 text-xs font-semibold uppercase text-gray-700 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 w-16">No</th>
                        <th className="px-4 py-3">Menu Finish</th>
                        <th className="px-4 py-3 w-40">Total bahan</th>
                        <th className="px-4 py-3 w-40">Dibuat pada</th>
                        <th className="px-4 py-3 w-40 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecipes.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-6 text-center text-gray-500"
                          >
                            Belum ada resep.
                          </td>
                        </tr>
                      ) : (
                        filteredRecipes.map((r, idx) => (
                          <tr
                            key={r.id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 align-middle">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              {r.name}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              {r.total_ingredients} Bahan
                            </td>
                            <td className="px-4 py-3 align-middle">
                              {r.created_at
                                ? new Date(r.created_at).toLocaleDateString(
                                    'id-ID',
                                    {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                    }
                                  )
                                : '-'}
                            </td>
                            <td className="px-4 py-3 align-middle text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button className="rounded-full bg-[#005DFF] px-4 py-1 text-xs font-semibold text-white hover:bg-[#0048c2]">
                                  edit
                                </button>
                                <button className="rounded-full bg-[#005DFF] px-4 py-1 text-xs font-semibold text-white hover:bg-[#0048c2]">
                                  view
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
              {/* end tabel */}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH RESEP */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl rounded-3xl bg-white px-8 py-8 shadow-2xl">
            <h3 className="mb-6 text-center text-2xl font-semibold text-gray-800">
              Tambah Resep
            </h3>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Nama menu Jadi
                </label>
                <input
                  type="text"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="Contoh : Matcha"
                  className="w-full rounded-xl bg-[#EDEDED] px-4 py-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#D9A978]"
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-800">
                  Daftar bahan mentah
                </p>

                <div className="space-y-2">
                  {ingredients.map((ing, index) => (
                    <div
                      key={ing.id}
                      className="flex items-center gap-2 rounded-xl bg-[#EDEDED] px-3 py-2 text-sm"
                    >
                      <span className="mr-1 text-gray-700">
                        {index + 1}.
                      </span>
                      <div className="flex flex-1 flex-wrap gap-2">
                        <input
                          type="text"
                          placeholder="Nama bahan"
                          value={ing.name}
                          onChange={(e) =>
                            handleChangeIngredient(
                              ing.id,
                              'name',
                              e.target.value
                            )
                          }
                          className="min-w-[120px] flex-1 rounded-md bg-white px-2 py-1 text-xs outline-none"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Jumlah"
                          value={ing.amount}
                          onChange={(e) =>
                            handleChangeIngredient(
                              ing.id,
                              'amount',
                              e.target.value
                            )
                          }
                          className="w-20 rounded-md bg-white px-2 py-1 text-xs outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Satuan (porsi, gr, ml...)"
                          value={ing.unit}
                          onChange={(e) =>
                            handleChangeIngredient(
                              ing.id,
                              'unit',
                              e.target.value
                            )
                          }
                          className="min-w-[100px] rounded-md bg-white px-2 py-1 text-xs outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(ing.id)}
                        className="ml-2 text-red-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="mt-3 rounded-xl bg-[#E0E0E0] px-4 py-2 text-sm font-medium text-gray-800 hover:bg-[#d0d0d0]"
                >
                  Tambah Bahan
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full rounded-xl bg-[#E0E0E0] px-4 py-2 text-sm font-medium text-gray-800 hover:bg-[#d0d0d0] sm:w-32"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#005DFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0048c2] sm:w-32"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Resep;
