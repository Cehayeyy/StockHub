import React, { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, router, usePage } from "@inertiajs/react";
import { Search, Calendar, CheckCircle, AlertCircle, Save, Package } from "lucide-react";

interface VerificationItem {
  id: number;
  nama: string;
  satuan: string;
  stok_sistem: number;
}

interface PageProps {
  items: VerificationItem[];
  tab: "bar" | "dapur";
  tanggal_picker: string; // Tanggal di Datepicker
  tanggal_data: string;   // Tanggal Senin (Sumber Data)
}

export default function VerifikasiStok() {
  // Ambil props baru dari Controller
  const { items, tab, tanggal_picker, tanggal_data } = usePage<any>().props as PageProps;

  const [physicalStocks, setPhysicalStocks] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");

  // Handler ganti tanggal
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    router.get(
      route("verifikasi-stok.index"),
      { tab, tanggal: e.target.value }, // Kirim tanggal baru
      { preserveScroll: true }
    );
  };

  const handleExport = async () => {
    const payload = {
      tab,
      tanggal: tanggal_picker,
      fisik: physicalStocks, // kirim stok fisik user
    };

    const query = new URLSearchParams(payload as any).toString();

    const response = await fetch(route("verifikasi-stok.export") + "?" + query, {
      method: "GET",
    });

    if (!response.ok) return alert("Gagal download laporan");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verifikasi-stok-${tab}-${tanggal_picker}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleTabSwitch = (t: "bar" | "dapur") => {
    router.get(
      route("verifikasi-stok.index"),
      { tab: t, tanggal: tanggal_picker }, // Jaga tanggal tetap sama saat ganti tab
      { preserveScroll: true }
    );
  };

  const handlePhysicalChange = (id: number, val: string) => {
    setPhysicalStocks((prev) => ({
      ...prev,
      [id]: val === "" ? 0 : parseFloat(val),
    }));
  };

  const filteredItems = items.filter((item) =>
    item.nama.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout header="Verifikasi Stok Mingguan">
      <Head title="Verifikasi Stok" />

      <div className="py-6 space-y-6">
        {/* INFO CARD */}
        <div className="bg-[#FFF9F0] border border-[#FDF3E4] p-4 rounded-2xl flex items-start gap-3 shadow-sm">
          <div className="p-2 bg-[#D9A978] rounded-full text-white shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[#8B5E3C] font-bold">Verifikasi Mingguan</h3>
            <p className="text-[#A68B6C] text-sm mt-1">
              Anda memilih tanggal <strong>{new Date(tanggal_picker).toLocaleDateString('id-ID')}</strong>.
              <br className="hidden md:block"/>
              <span className="md:ml-1">Sistem menampilkan data stok acuan dari hari <strong>Senin, {new Date(tanggal_data).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[500px]">

          {/* CONTROLS SECTION */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">

            {/* TABS */}
            <div className="w-full md:w-auto flex bg-[#FDF3E4] rounded-full p-1">
              <button onClick={() => handleTabSwitch("bar")} className={`flex-1 md:flex-none px-6 py-2 rounded-full text-sm font-bold transition-all ${tab === "bar" ? "bg-[#D9A978] text-white shadow-sm" : "text-gray-500 hover:text-[#D9A978]"}`}>Bar</button>
              <button onClick={() => handleTabSwitch("dapur")} className={`flex-1 md:flex-none px-6 py-2 rounded-full text-sm font-bold transition-all ${tab === "dapur" ? "bg-[#D9A978] text-white shadow-sm" : "text-gray-500 hover:text-[#D9A978]"}`}>Dapur</button>
            </div>

            {/* DATE PICKER & SEARCH */}
            <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
              <div className="relative w-full md:w-auto">
                <input
                  type="date"
                  value={tanggal_picker}
                  onChange={handleDateChange}
                  className="w-full md:w-auto bg-[#FDF3E4] border-none rounded-full px-4 py-2 text-sm text-[#8B5E3C] font-medium focus:ring-2 focus:ring-[#D9A978]"
                />
              </div>
              <div className="relative w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Cari item..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 bg-[#FDF3E4] border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#D9A978]"
                />
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* --- MOBILE VIEW (CARDS) --- */}
          {/* Tampil di Mobile, Sembunyi di Desktop */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const fisik = physicalStocks[item.id] ?? item.stok_sistem;
                const selisih = fisik - item.stok_sistem;
                const isMatch = selisih === 0;

                return (
                  <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="bg-orange-50 p-2 rounded-lg text-[#D9A978]">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{item.nama}</h4>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{item.satuan}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {isMatch ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> OK</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700"><AlertCircle className="w-3 h-3" /> Selisih</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <p className="text-xs text-blue-600 mb-1">Stok Sistem (Senin)</p>
                        <p className="font-bold text-blue-700 text-lg">{item.stok_sistem}</p>
                      </div>
                      <div className={`p-2 rounded-lg ${selisih === 0 ? 'bg-gray-50' : selisih < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className={`text-xs mb-1 ${selisih === 0 ? 'text-gray-500' : selisih < 0 ? 'text-red-600' : 'text-green-600'}`}>Selisih</p>
                        <p className={`font-bold text-lg ${selisih === 0 ? 'text-gray-700' : selisih < 0 ? 'text-red-700' : 'text-green-700'}`}>
                          {selisih > 0 ? `+${selisih}` : selisih}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Input Stok Fisik</label>
                      <input
                        type="number"
                        min="0"
                        placeholder={String(item.stok_sistem)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#D9A978] outline-none"
                        onChange={(e) => handlePhysicalChange(item.id, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl">
                Tidak ada data ditemukan.
              </div>
            )}
          </div>

          {/* --- DESKTOP VIEW (TABLE) --- */}
          {/* Sembunyi di Mobile, Tampil di Desktop */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                <tr>
                  <th className="p-4 text-center w-16">No</th>
                  <th className="p-4">Nama Item</th>
                  <th className="p-4 text-center bg-blue-50/50">Stok Sistem (Senin)</th>
                  <th className="p-4 text-center bg-yellow-50/50 w-40">Stok Fisik</th>
                  <th className="p-4 text-center">Selisih</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, i) => {
                    const fisik = physicalStocks[item.id] ?? item.stok_sistem;
                    const selisih = fisik - item.stok_sistem;
                    const isMatch = selisih === 0;

                    return (
                      <tr key={item.id} className="hover:bg-[#FFF9F0] transition">
                        <td className="p-4 text-center text-gray-500">{i + 1}</td>
                        <td className="p-4 font-medium text-gray-800">
                          {item.nama} <span className="text-xs text-gray-400 font-normal">({item.satuan})</span>
                        </td>
                        <td className="p-4 text-center font-bold text-blue-600 bg-blue-50/30">{item.stok_sistem}</td>
                        <td className="p-4 text-center bg-yellow-50/30">
                          <input
                            type="number"
                            min="0"
                            placeholder={String(item.stok_sistem)}
                            className="w-24 text-center border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-[#D9A978] bg-white"
                            onChange={(e) => handlePhysicalChange(item.id, e.target.value)}
                          />
                        </td>
                        <td className={`p-4 text-center font-bold ${selisih < 0 ? 'text-red-500' : selisih > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                          {selisih > 0 ? `+${selisih}` : selisih}
                        </td>
                        <td className="p-4 text-center">
                          {isMatch ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Cocok</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700"><AlertCircle className="w-3 h-3" /> Selisih</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 italic">
                      Tidak ada data stok pada hari Senin ({new Date(tanggal_data).toLocaleDateString('id-ID')}).<br/>
                      Pastikan <span className="font-bold text-gray-600">Stok Harian Mentah</span> sudah terisi pada hari Senin tersebut agar bisa diverifikasi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            {/* EXPORT EXCEL */}
            <button
              className="w-full md:w-auto justify-center bg-[#C19A6B] hover:bg-[#a8855a] text-white px-6 py-2.5 rounded-full font-bold shadow-md flex items-center gap-2 transition-all active:scale-95"
              onClick={handleExport}
            >
              <Save className="w-4 h-4" /> Simpan Laporan
            </button>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
