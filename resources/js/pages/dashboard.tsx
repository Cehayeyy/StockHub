import React, { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import {
  Box,
  Layers,
  Users,
  BookOpen,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import CountUp from "react-countup";

const COLORS = ["#8B5E3C", "#A97458", "#B9886C", "#6F4E37"];

// Card dengan animasi
const InfoCard = ({
    title,
    value,
    icon: Icon,
    bgColor,
    onClick,
  }: {
    title: string;
    value: number;
    icon: React.ElementType;
    bgColor: string;
    onClick?: () => void;
  }) => (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.05, boxShadow: "0px 10px 20px rgba(0,0,0,0.2)" }}
      className={`bg-[#F5F0EB] p-6 rounded-xl shadow-lg flex items-center gap-4 transition-transform ${
        onClick ? "cursor-pointer hover:bg-[#EFE8E1]" : ""
      }`}
    >

    <div className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center text-white`}>
      <Icon />
    </div>
    <div>
      <p className="text-sm text-gray-700">{title}</p>
      <p className="text-3xl font-bold">
        <CountUp end={value} duration={1.5} />
      </p>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const {
    auth,
    totalItem,
    totalResep,
    totalKategori,
    totalUser,
  } = usePage<any>().props;



  const { totalStokHarian, stokHampirHabis } = usePage<any>().props;

  const [showPilihStok, setShowPilihStok] = useState(false);


  const pieData = [
    { name: "Hampir Habis", value: stokHampirHabis },
    { name: "Aman", value: totalItem - stokHampirHabis },
  ];

  // Akses revisi
  const [aksesRevisi, setAksesRevisi] = useState([
    { id: 1, name: "Bar 1 meminta akses revisi stok harian", status: "pending" },
    { id: 2, name: "Bar 2 meminta akses revisi stok harian", status: "pending" },
    { id: 3, name: "Kitchen 1 meminta akses revisi stok harian", status: "pending" },
    { id: 4, name: "Kitchen 2 meminta akses revisi stok harian", status: "pending" },

  ]);

  const [chartRevisi, setChartRevisi] = useState([
    { name: "Permintaan Revisi", value: 7 },
    { name: "Diterima", value: 0 },
    { name: "Ditolak", value: 0 },
  ]);

  // Fungsi tombol setujui/tolak
  const handleApprove = (id: number) => {
    setAksesRevisi(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: "approved" } : item
      )
    );
    setChartRevisi(prev => [
      { name: "Permintaan Revisi", value: prev[0].value - 1 },
      { name: "Diterima", value: prev[1].value + 1 },
      { name: "Ditolak", value: prev[2].value },
    ]);
  };

  const handleReject = (id: number) => {
    setAksesRevisi(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: "rejected" } : item
      )
    );
    setChartRevisi(prev => [
      { name: "Permintaan Revisi", value: prev[0].value - 1 },
      { name: "Diterima", value: prev[1].value },
      { name: "Ditolak", value: prev[2].value + 1 },
    ]);
  };

  const handlePieClick = () => {
    setShowPilihStok(true);
  };




  return (
    <AppLayout header={<h2 className="text-2xl font-bold">Dashboard</h2>}>
      <Head title="Dashboard" />
      <div className="space-y-8 pb-10">

        {/* Grid card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

  <InfoCard
    title="Total User"
    value={totalUser}
    icon={Users}
    bgColor="bg-[#6F4E37]"
    onClick={() => router.visit("/manajemen-akun")}
  />
</div>

        {/* Pie chart */}
        <div
          onClick={handlePieClick}
          className="bg-[#F5F0EB] p-6 rounded-xl shadow-lg cursor-pointer hover:shadow-2xl transition-all duration-300"
        >
          <p className="text-sm text-gray-700 mb-2">Stok Hampir Habis</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Akses revisi */}
<div className="bg-[#F5F0EB] p-6 rounded-xl shadow-lg overflow-hidden">
  <h3 className="font-bold mb-4">Akses Revisi</h3>
  <motion.div layout className="space-y-2">
    {aksesRevisi.map(item =>
      item.status === "pending" ? (
        <motion.div
          key={item.id}
          layout
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4 }}
          className="flex justify-between items-center p-2 border rounded-lg"
        >
          <span>{item.name}</span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
              onClick={() => handleApprove(item.id)}
            >
              Setujui
            </button>
            <button
              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
              onClick={() => handleReject(item.id)}
            >
              Tolak
            </button>
          </div>
        </motion.div>
      ) : null
    )}
  </motion.div>
</div>
      </div>

      {showPilihStok && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-[#F5F0EB] rounded-xl p-6 w-[320px] shadow-xl"
    >
      <h3 className="text-lg font-bold mb-2 text-center">
        Stok Hampir Habis
      </h3>
      <p className="text-sm text-gray-600 mb-4 text-center">
        Kamu mau cek stok di mana?
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => router.visit("/stok-harian/bar")}
          className="flex-1 py-2 rounded-lg bg-[#8B5E3C] text-white hover:bg-[#6F4E37]"
        >
          🍸 Bar
        </button>

        <button
          onClick={() => router.visit("/stok-harian/dapur")}
          className="flex-1 py-2 rounded-lg bg-[#8B5E3C] text-white hover:bg-[#6F4E37]"
        >
          🍳 Dapur
        </button>
      </div>

      <button
        onClick={() => setShowPilihStok(false)}
        className="mt-4 text-xs text-gray-500 hover:underline block mx-auto"
      >
        Batal
      </button>
    </motion.div>
  </div>
)}



    </AppLayout>


  );
}
