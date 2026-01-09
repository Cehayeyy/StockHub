import React from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Box, Layers, BookOpen, ShieldCheck } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import CountUp from "react-countup";

const COLORS = ["#8B5E3C", "#A97458"];

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
    className={`bg-[#F5F0EB] p-6 rounded-xl shadow-lg flex items-center gap-4 ${
      onClick ? "cursor-pointer hover:bg-[#EFE8E1]" : ""
    }`}
  >
    <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center text-white`}>
      <Icon />
    </div>
    <div>
      <p className="text-sm text-gray-700">{title}</p>
      <p className="text-3xl font-bold">
        <CountUp end={value} duration={1.2} />
      </p>
    </div>
  </motion.div>
);




export default function DashboardStaff() {
  const { auth, totalItem, totalResep, totalKategori, alreadyInputToday, totalStokHarian, stokHampirHabis, flash, alreadyRequestedRevision} = usePage<any>().props;

  // Tambahkan log untuk memeriksa data dari usePage().props
  console.log('usePage props:', usePage().props);

  // Validasi tambahan untuk properti yang digunakan
  if (!auth || !auth.user) {
    return <div>Data tidak tersedia. Silakan coba lagi nanti.</div>;
  }

  console.log('alreadyInputToday:', alreadyInputToday);

  const pieData = [
    { name: "Hampir Habis", value: stokHampirHabis },
    { name: "Aman", value: Math.max(totalStokHarian - stokHampirHabis, 0) },
  ];

 const ajukanRevisi = () => {
  router.post(route("izin-revisi.store"), {}, {
    preserveScroll: true,
    onSuccess: (page) => {
      console.log('Page props after request:', page.props);
      // page.props.flash akan otomatis ada jika backend mengirim flash
    },
  });
};


console.log("FLASH:", flash);



  return (
    <AppLayout header={<h2 className="text-2xl font-bold">Dashboard</h2>}>
      <Head title="Dashboard Staff" />

      {/* FLASH MESSAGE */}
{flash?.error && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700"
  >
    ❌ {flash.error}
  </motion.div>
)}

{flash?.success && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-4 rounded-lg bg-green-100 px-4 py-3 text-sm text-green-700"
  >
    ✅ {flash.success}
  </motion.div>
)}


      <div className="space-y-8 pb-10">

        {/* FLASH MESSAGE */}
        {flash?.success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-100 text-green-800 p-4 rounded-lg shadow mb-4"
          >
            ✅ {flash.success}
          </motion.div>
        )}

        {/* Card statistik */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoCard
            title="Total Item"
            value={totalItem}
            icon={Layers}
            bgColor="bg-[#8B5E3C]"
            onClick={() => router.visit("/item")}
          />

          <InfoCard
            title="Total Resep"
            value={totalResep}
            icon={BookOpen}
            bgColor="bg-[#A97458]"
            onClick={() => router.visit("/resep")}
          />

          <InfoCard
            title="Total Kategori"
            value={totalKategori}
            icon={Box}
            bgColor="bg-[#B9886C]"
            onClick={() => router.visit("/kategori")}
          />
        </div>

        {/* Stok hampir habis (chart) */}
        <div
          onClick={() => {
            if (auth.user.role === "bar") {
              router.visit("/stok-harian/bar");
            } else if (auth.user.role === "dapur") {
              router.visit("/stok-harian/dapur");
            }
          }}
          className="relative bg-[#F5F0EB] p-6 rounded-xl shadow-lg cursor-pointer hover:bg-[#EFE8E1]"
        >
          <p className="text-sm text-gray-700 mb-2">Stok Hampir Habis</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Meminta izin revisi */}
        <div className="bg-[#F5F0EB] p-6 rounded-xl shadow-lg">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <ShieldCheck size={20} /> Meminta Izin Revisi
          </h3>

         <button
  onClick={ajukanRevisi}
  disabled={alreadyRequestedRevision}
  className={`px-4 py-2 rounded-lg text-white ${
    alreadyRequestedRevision ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#8B5E3C] hover:bg-[#6F4E37]'
  }`}
>
  {alreadyRequestedRevision ? "Ajukan akses revisi sudah terkirim" : "Ajukan Izin Revisi Stok"}
</button>


        </div>

        {/* Input stok harian */}
        <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
  className="bg-[#F5F0EB] p-6 rounded-xl shadow-lg flex items-center justify-between"
>
  {/* KIRI */}
  <div>
    <h3 className="font-bold text-lg mb-1">
      {alreadyInputToday
        ? "Stok Harian Sudah Disimpan"
        : "Mulai Input Stok Harian"}
    </h3>

    <p className="text-sm text-gray-600">
      {alreadyInputToday
        ? "✅ Kamu sudah menyimpan data stok harian hari ini"
        : "Input stok harian untuk divisi kamu hari ini"}
    </p>
  </div>

  {/* KANAN */}
  {!alreadyInputToday && (
    <button
      onClick={() => {
        const role = auth.user.role;

        if (role === "bar") {
          router.visit("/stok-harian/bar?autoInput=1", {
            onSuccess: () => {
              router.reload(); // Memuat ulang data dari server
            },
          });
        }

        if (role === "kitchen" || role === "dapur") {
          router.visit("/stok-harian/dapur?autoInput=1", {
            onSuccess: () => {
              router.reload(); // Memuat ulang data dari server
            },
          });
        }
      }}
      className="px-5 py-2 bg-[#8B5E3C] text-white rounded-lg hover:bg-[#6F4E37] transition"
    >
      ➕ Input Harian
    </button>
  )}
</motion.div>


      </div>
    </AppLayout>

  );
}
