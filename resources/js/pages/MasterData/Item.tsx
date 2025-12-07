import React, { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Search } from "lucide-react";

type Item = {
  id: number;
  nama: string;
  satuan?: string | null;
  kategori_item?: string | null;
};

type PaginationData<T> = { data: T[] };

type PageProps = {
  items?: Item[] | PaginationData<Item>;
  filters?: {
    type?: string;
    search?: string;
  };
};

export default function ItemPage() {
  const { items, filters } = usePage<PageProps>().props;

  const type = filters?.type ?? "all";

  const itemsArray: Item[] = Array.isArray(items)
    ? items
    : items?.data ?? [];

  const [search, setSearch] = useState<string>(filters?.search ?? "");

  const [openModal, setOpenModal] = useState<boolean>(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [nama, setNama] = useState<string>("");

  // ⭐ FIX UTAMA: kategori = bar / dapur
  const [kategoriItem, setKategoriItem] = useState<string>("");

  const [satuan, setSatuan] = useState<string>("porsi");

  const [showKategori, setShowKategori] = useState<boolean>(false);

  // FILTER SEARCH
  const filteredItems = itemsArray.filter((item: Item) =>
    (item.nama ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const changeType = (value: string) => {
    router.get(
      route("item.index"),
      { type: value },
      { preserveState: true, preserveScroll: true, replace: true }
    );
  };

  const handleEdit = (item: Item) => {
    setEditId(item.id);
    setNama(item.nama);
    setKategoriItem(item.kategori_item ?? "");
    setSatuan(item.satuan ?? "porsi");
    setOpenModal(true);
  };

  const submitItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = {
      nama,
      kategori_item: kategoriItem,
      satuan: "porsi",
    };

    if (editId) {
      router.put(route("item.update", editId), payload, {
        onSuccess: () => closeModal(),
      });
    } else {
      router.post(route("item.store"), payload, {
        onSuccess: () => closeModal(),
      });
    }
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditId(null);
    setNama("");
    setKategoriItem("");
    setSatuan("porsi");
  };

  return (
    <AppLayout
      header={
        <h2 className="font-semibold text-xl">
          {type === "all"
            ? "Item"
            : type === "bar"
            ? "Item Bar"
            : type === "dapur"
            ? "Item Dapur"
            : "Item"}
        </h2>
      }
    >
      <Head title="Item" />

      <div className="py-6">
        <div className="bg-white p-6 rounded-2xl shadow-md">

          {/* FILTER AREA */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <select
              value={type}
              onChange={(e) => changeType(e.target.value)}
              className="w-48 rounded-full border bg-[#FDF3E4] px-4 py-2 text-sm"
            >
              <option value="all">Item</option>
              <option value="bar">Bar</option>
              <option value="dapur">Dapur</option>
            </select>

            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <button
                type="button"
                onClick={() => setOpenModal(true)}
                className="rounded-full bg-[#D9A978] px-5 py-2 text-sm text-white font-semibold"
              >
                Tambah Item
              </button>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search...."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 rounded-full border bg-[#FDF3E4] px-4 py-2 pr-10 text-sm"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-[#C38E5F]">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-[#F3F3F3] text-gray-700 font-semibold">
                <tr>
                  <th className="p-3 border text-center">No</th>
                  <th className="p-3 border">Nama Item</th>
                  <th className="p-3 border">Kategori</th>
                  <th className="p-3 border">Satuan</th>
                  <th className="p-3 border text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item: Item, index: number) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-3 border text-center">{index + 1}</td>
                      <td className="p-3 border">{item.nama}</td>
                      <td className="p-3 border">{item.kategori_item}</td>
                      <td className="p-3 border">{item.satuan}</td>
                      <td className="p-3 border text-center">
                        <div className="flex items-center justify-center gap-2">

                          <button
                            onClick={() => handleEdit(item)}
                            className="bg-blue-500 text-white px-4 py-1 rounded-md text-xs"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => {
                              if (confirm("Yakin ingin menghapus item ini?")) {
                                router.delete(route("item.destroy", item.id));
                              }
                            }}
                            className="bg-red-500 text-white px-4 py-1 rounded-md text-xs"
                          >
                            Hapus
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      Tidak ada data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {openModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[450px] rounded-3xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-center mb-6">
              {editId ? "Edit Item" : "Tambah Item"}
            </h2>

            <form onSubmit={submitItem} className="space-y-5">

              <div>
                <label className="block mb-1">Nama Item</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full bg-[#EDEDED] rounded-xl p-3 border"
                  required
                />
              </div>

              {/* FIX KATEGORI: BAR / DAPUR */}
              <div className="relative">
                <label className="block mb-1">Kategori Item</label>

                <button
                  type="button"
                  onClick={() => setShowKategori(!showKategori)}
                  className="w-full bg-[#EDEDED] border rounded-xl p-3 flex justify-between"
                >
                  {kategoriItem === ""
                    ? "Pilih"
                    : kategoriItem === "bar"
                    ? "Bar"
                    : "Dapur"}
                  <span className={`${showKategori ? "rotate-180" : ""}`}>▼</span>
                </button>

                {showKategori && (
                  <div className="absolute w-full bg-white rounded-xl shadow border mt-1 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setKategoriItem("bar");
                        setShowKategori(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100"
                    >
                      Finish
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setKategoriItem("dapur");
                        setShowKategori(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100"
                    >
                      Raw
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block mb-1">Satuan</label>
                <input
                  type="text"
                  value="porsi"
                  readOnly
                  className="w-full bg-[#EDEDED] rounded-xl p-3 border opacity-70"
                />
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2 bg-gray-200 rounded-xl"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 bg-green-500 text-white rounded-xl font-semibold"
                >
                  {editId ? "Update" : "Simpan"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
