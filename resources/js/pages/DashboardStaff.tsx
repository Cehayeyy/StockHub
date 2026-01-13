import React from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Box, Layers, BookOpen, ShieldCheck } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import CountUp from "react-countup";

const COLORS = ["#8B5E3C", "#A97458"];

// Komponen Card Statistik Atas
const InfoCard = ({
  title,
  value,
  icon: Icon,
  bgColor,
  onClick,
}: any) => (
  <motion.div
    onClick={onClick}
    whileHover={{ scale: 1.05 }}
    className={`bg-[#F9F6F3] p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 ${
      onClick ? "cursor-pointer hover:bg-[#F0EBE5]" : ""
    }`}
  >
    <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center text-white shadow-sm`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-3xl font-extrabold text-gray-800">
        <CountUp end={value} duration={1.2} />
      </p>
    </div>
  </motion.div>
);

export default function DashboardStaff() {
  // Mengambil data dari Backend (DashboardController)
  const {
    auth,
    totalItem,
    totalResep,
    totalKategori,
    alreadyInputToday, // <--- INI VARIABEL KUNCI (TRUE/FALSE)
    totalStokHarian,
    stokHampirHabis,
    flash,
    alreadyRequestedRevision
  } = usePage<any>().props;

  const pieData = [
    { name: "Hampir Habis", value: stokHampirHabis },
    { name: "Aman", value: Math.max(totalStokHarian - stokHampirHabis, 0) },
  ];

  const ajukanRevisi = () => {
    router.post(route("izin-revisi.store"), {}, {
      preserveScroll: true,
    });
  };

  return (
    <AppLayout header={<h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>}>
      <Head title="Dashboard Staff" />

      {/* FLASH MESSAGE (Notifikasi Sukses/Gagal) */}
      <div className="space-y-4 mb-6">
        {flash?.error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
            ❌ {flash.error}
          </motion.div>
        )}
        {flash?.success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
            ✅ {flash.success}
          </motion.div>
        )}
      </div>

      <div className="space-y-8 pb-10">

        {/* 1. CARD STATISTIK */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoCard title="Total Item" value={totalItem} icon={Layers} bgColor="bg-[#8B5E3C]" onClick={() => router.visit("/item")} />
          <InfoCard title="Total Resep" value={totalResep} icon={BookOpen} bgColor="bg-[#A97458]" onClick={() => router.visit("/resep")} />
          <InfoCard title="Total Kategori" value={totalKategori} icon={Box} bgColor="bg-[#B9886C]" onClick={() => router.visit("/kategori")} />
        </div>

        {/* 2. CHART STOK */}
        <div onClick={() => {
            if (auth.user.role === "bar") router.visit("/stok-harian/bar");
            else if (["dapur", "kitchen", "staff_kitchen"].includes(auth.user.role)) router.visit("/stok-harian/dapur");
          }}
          className="relative bg-[#F9F6F3] p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:bg-[#F0EBE5] transition"
        >
          <p className="text-sm text-gray-600 font-medium mb-4">Stok Hampir Habis</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={5} stroke="none">
                  {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center pt-8 pointer-events-none">
                <span className="text-2xl font-bold text-[#8B5E3C]">{stokHampirHabis}</span>
            </div>
          </div>
        </div>

        {/* 3. CARD IZIN REVISI */}
        <div className="bg-[#F9F6F3] p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <ShieldCheck size={20} /> Meminta Izin Revisi
          </h3>
          <p className="text-sm text-gray-500 mb-4">Ajukan izin jika perlu mengubah stok yang sudah disubmit.</p>
          <button onClick={ajukanRevisi} disabled={alreadyRequestedRevision} className={`px-6 py-2.5 rounded-lg text-sm font-bold text-white transition ${alreadyRequestedRevision ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#967156] hover:bg-[#7a5c45]'}`}>
            {alreadyRequestedRevision ? "Pengajuan Sedang Diproses" : "Ajukan Izin Revisi Stok"}
          </button>
        </div>

        {/* 4. CARD INPUT HARIAN (DINAMIS SESUAI STATUS) */}
        {/* Ini bagian yang berubah sesuai screenshot Anda */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#F9F6F3] p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          {alreadyInputToday ? (
            // --- TAMPILAN SESUDAH DISIMPAN (Hijau) ---
            <div>
               <h3 className="font-bold text-lg text-black mb-2">
                 Stok Harian Sudah Disimpan
               </h3>
               <div className="flex items-center gap-2">
                 {/* Ikon Centang Hijau Custom */}
                 <div className="bg-[#4ADE80] text-white rounded-[4px] w-5 h-5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                 </div>
                 <span className="text-sm font-medium text-gray-500">
                   Kamu sudah menyimpan data stok harian hari ini
                 </span>
               </div>
            </div>
          ) : (
            // --- TAMPILAN SEBELUM INPUT (Tombol Coklat) ---
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-black mb-1">Mulai Input Stok Harian</h3>
                <p className="text-sm text-gray-500">
                  Input stok harian untuk divisi kamu hari ini
                </p>
              </div>

              <button
                onClick={() => {
                  const role = auth.user.role;
                  if (role === "bar") {
                    router.visit("/stok-harian/bar?tab=menu&autoInput=1");
                  } else if (["dapur", "kitchen", "staff_kitchen"].includes(role)) {
                    router.visit("/stok-harian/dapur?tab=menu&autoInput=1");
                  }
                }}
                className="px-6 py-2.5 bg-[#967156] text-white rounded-lg hover:bg-[#7a5c45] transition font-bold text-sm flex items-center gap-2 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Input Harian
              </button>
            </div>
          )}
        </motion.div>

      </div>
    </AppLayout>
  );
}
