import React, { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Search } from "lucide-react";

interface ItemCategory {
  id: number;
  nama: string;
}

interface Item {
  id: number;
  nama: string;
  satuan?: string;

  stok_awal?: number;
  stok_masuk?: number;
  stok_total?: number;
  pemakaian?: number;
  tersisa?: number;
}


interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

interface ItemsProps {
  data: Item[];
  links: PaginationLink[];
}

interface PageProps {
  items: ItemsProps;
  tab: "menu" | "mentah";
  division: string;
   tanggal: string;
}

export default function Bar() {
 const {
  items: serverItems,
  tab: serverTab = "menu",
  tanggal: serverTanggal,
} = usePage().props as PageProps;


  const [tab, setTab] = useState<"menu" | "mentah">(serverTab);
  const [items, setItems] = useState<ItemsProps>(serverItems);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(serverTanggal);

  // FORM STATE
  const [showCreate, setShowCreate] = useState(false);
  const [menuId, setMenuId] = useState<number | "">("");

useEffect(() => {
  setTab(serverTab);
  setItems(serverItems);
  setDate(serverTanggal);
}, [serverTab, serverItems, serverTanggal]);


  const headerLabel =
    tab === "menu" ? "Stok Harian Menu" : "Stok Harian Mentah";

  const handleTab = (newTab: "menu" | "mentah") => {
    setTab(newTab);
    router.get(
      route("stok-harian.bar"),
      { tab: newTab, search },
      { preserveScroll: true, preserveState: true }
    );
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    router.get(
      route("stok-harian.bar"),
      { tab, search: value },
      { preserveScroll: true, preserveState: true }
    );
  };

  // ===== INPUT STOK AWAL =====
const [showInput, setShowInput] = useState(false);
const [inputDate] = useState(
  new Date().toISOString().slice(0, 10)
);
const [inputItemId, setInputItemId] = useState<number | "">("");
const [inputUnit, setInputUnit] = useState("");
const [stokAwal, setStokAwal] = useState<number | "">("");

  return (
    <AppLayout header={headerLabel}>
      <Head title={headerLabel} />

      <div className="py-6">
        <div className="bg-white p-6 rounded-3xl shadow-inner">

          {/* HEADER */}
          <div className="flex flex-col items-end gap-4 mb-6">
            <div className="flex gap-3">
              <button
                onClick={() => setShowInput(true)}
                className="rounded-full bg-[#D9A978] px-6 py-2 text-sm text-white font-semibold"
                >
                Input Data
                </button>

              {tab === "menu" && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="rounded-full bg-[#D9A978] px-6 py-2 text-sm text-white font-semibold"
                >
                  Tambah Data
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-48 rounded-full border bg-[#FDF3E4] px-4 py-2 text-sm"
              />

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search...."
                  value={search}
                  onChange={handleSearch}
                  className="w-64 rounded-full border bg-[#FDF3E4] px-4 py-2 pr-10 text-sm"
                />
                <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#C38E5F]" />
              </div>
            </div>

            <div className="flex justify-end w-full mt-2">
              <div className="flex rounded-full bg-[#E6E6E6] p-1 w-[170px]">
                <button
                  onClick={() => handleTab("menu")}
                  className={`flex-1 px-4 py-1 rounded-full ${
                    tab === "menu"
                      ? "bg-[#D9A978] text-white font-semibold"
                      : ""
                  }`}
                >
                  Menu
                </button>

                <button
                  onClick={() => handleTab("mentah")}
                  className={`flex-1 px-4 py-1 rounded-full ${
                    tab === "mentah"
                      ? "bg-[#D9A978] text-white font-semibold"
                      : ""
                  }`}
                >
                  Mentah
                </button>
              </div>
            </div>
          </div>

          {/* FORM TAMBAH RESEP */}
          {showCreate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white w-full max-w-xl rounded-3xl p-8 shadow-xl">

                <h2 className="text-xl font-semibold text-center mb-6">
                    Tambah Data
                </h2>

                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                    Nama Menu Jadi
                    </label>

                    <select
                    value={menuId}
                    onChange={(e) => setMenuId(Number(e.target.value))}
                    className="
                        w-full
                        rounded-xl
                        border
                        border-gray-300
                        px-4
                        py-3
                        text-sm
                        focus:ring-2
                        focus:ring-[#D9A978]
                        focus:outline-none
                    "
                    >
                    <option value=""></option>
                    {items.data.map((item) => (
                        <option key={item.id} value={item.id}>
                        {item.nama}
                        </option>
                    ))}
                    </select>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                    onClick={() => setShowCreate(false)}
                    className="px-6 py-2 rounded-full border"
                    >
                    Batal
                    </button>

                    <button
                    onClick={() => {
                        router.post(route("resep.store"), {
                        menu_id: menuId,
                        });
                        setMenuId("");
                        setShowCreate(false);
                    }}
                    disabled={!menuId}
                    className="px-6 py-2 rounded-full bg-[#D9A978] text-white font-semibold disabled:opacity-50"
                    >
                    Simpan
                    </button>
                </div>
                </div>
            </div>
            )}

            {showInput && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-xl">

                <h2 className="text-xl font-semibold text-center mb-6">
                    Input Stok Awal {tab === "menu" ? "Menu" : "Bahan Mentah"}
                </h2>

                {/* TANGGAL */}
                <div className="mb-4">
                    <label className="block text-sm mb-1">Tanggal</label>
                    <input
                    type="date"
                    value={inputDate}
                    disabled
                    className="w-full rounded-xl border bg-gray-100 px-4 py-2 text-sm"
                    />
                </div>

                {/* ITEM */}
                <div className="mb-4">
                    <label className="block text-sm mb-1">
                    {tab === "menu" ? "Nama Menu" : "Nama Bahan"}
                    </label>

                    <select
                    value={inputItemId}
                    onChange={(e) => {
                        const id = Number(e.target.value);
                        setInputItemId(id);

                        const found = items.data.find(i => i.id === id);
                        setInputUnit(found?.satuan ?? "");
                    }}
                    className="w-full rounded-xl border px-4 py-2 text-sm"
                    >
                    <option value="">Pilih</option>
                    {items.data.map(item => (
                        <option key={item.id} value={item.id}>
                        {item.nama}
                        </option>
                    ))}
                    </select>
                </div>

                {/* SATUAN */}
                <div className="mb-4">
                    <label className="block text-sm mb-1">Satuan</label>
                    <input
                    value={inputUnit}
                    disabled
                    className="w-full rounded-xl border bg-gray-100 px-4 py-2 text-sm"
                    />
                </div>

                {/* STOK AWAL */}
                <div className="mb-6">
                    <label className="block text-sm mb-1">Stok Awal</label>
                    <input
                    type="number"
                    value={stokAwal}
                    onChange={(e) =>
                    setStokAwal(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full rounded-xl border px-4 py-2 text-sm"
                    />
                </div>

                {/* ACTION */}
                <div className="flex justify-end gap-3">
                    <button
                    onClick={() => setShowInput(false)}
                    className="px-6 py-2 rounded-full border"
                    >
                    Batal
                    </button>

                    <button
                    onClick={() => {
                        router.post(
                        tab === "menu"
                            ? route("stok-harian-menu.store")
                            : route("stok-harian-mentah.store"),
                        {
                            item_id: inputItemId,
                            tanggal: inputDate,
                            stok_awal: stokAwal,
                        },
                        {
                            onSuccess: () => {
                            setShowInput(false);
                            setInputItemId("");
                            setInputUnit("");
                            setStokAwal("");
                            }
                        }
                        );
                    }}
                    disabled={inputItemId === "" || stokAwal === "" || stokAwal < 0}
                    className="px-6 py-2 rounded-full bg-[#D9A978] text-white font-semibold disabled:opacity-50"
                    >
                    Simpan
                    </button>
                </div>

                </div>
            </div>
            )}

          {/* TABLE + PAGINATION (TIDAK DIHAPUS) */}
          {!showCreate && (
            <>
              <div className="max-h-[500px] overflow-y-auto rounded-xl border bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-[#F3F3F3] sticky top-0">
                    <tr>
                      <th className="p-3 border">No</th>
                      <th className="p-3 border">Nama</th>
                      <th className="p-3 border">Satuan</th>
                      <th className="p-3 border">Stok Awal</th>
                      <th className="p-3 border">Stok Masuk</th>
                      <th className="p-3 border">Stok Total</th>
                      <th className="p-3 border">Pemakaian</th>
                      <th className="p-3 border">Tersisa</th>
                      <th className="p-3 border">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.data.length > 0 ? (
                        items.data.map((item, i) => (
                        <tr key={item.id}>
                            <td className="p-3 border">{i + 1}</td>

                            <td className="p-3 border">{item.nama}</td>

                            <td className="p-3 border">{item.satuan ?? "-"}</td>

                            {/* STOK AWAL */}
                            <td className="p-3 border">
                            {item.stok_awal !== null && item.stok_awal !== undefined
                                ? item.stok_awal
                                : ""}
                            </td>

                            {/* STOK MASUK */}
                            <td className="p-3 border">
                            {item.stok_masuk !== null && item.stok_masuk !== undefined
                                ? item.stok_masuk
                                : ""}
                            </td>

                            {/* STOK TOTAL */}
                            <td className="p-3 border">
                            {item.stok_total !== null && item.stok_total !== undefined
                                ? item.stok_total
                                : ""}
                            </td>

                            {/* PEMAKAIAN */}
                            <td className="p-3 border">
                            {item.pemakaian !== null && item.pemakaian !== undefined
                                ? item.pemakaian
                                : ""}
                            </td>

                            {/* TERSISA */}
                            <td className="p-3 border">
                            {item.tersisa !== null && item.tersisa !== undefined
                                ? item.tersisa
                                : ""}
                            </td>

                            <td className="p-3 border text-center">
                            <button className="bg-[#D9A978] text-white px-3 py-1 rounded-full text-xs">
                                Edit
                            </button>
                            </td>
                        </tr>
                        ))
                    ) : (
                        <tr>
                        <td colSpan={9} className="p-6 text-center text-gray-500">
                            Tidak ada data.
                        </td>
                        </tr>
                    )}
                    </tbody>

                </table>
              </div>

              {/* PAGINATION */}
              {items.links && (
                <div className="flex justify-center mt-4 mb-2">
                  <div className="flex gap-1">
                    {items.links.map((link, i) => (
                      <button
                        key={i}
                        disabled={!link.url}
                        onClick={() => link.url && router.get(link.url)}
                        className={`px-3 py-1 border rounded text-sm ${
                          link.active
                            ? "bg-[#D9A978] text-white font-semibold"
                            : "bg-[#D9A978]/60 text-white"
                        } ${!link.url ? "opacity-50" : ""}`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
