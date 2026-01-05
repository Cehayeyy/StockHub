

import React, { useState } from "react";
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
    const { auth, totalItem, totalResep, totalKategori } = usePage<any>().props;



    const { totalStokHarian, stokHampirHabis } = usePage<any>().props;


  const pieData = [
    { name: "Hampir Habis", value: stokHampirHabis },
    { name: "Aman", value: totalItem - stokHampirHabis
        
     },
  ];

  const ajukanRevisi = () => {
    router.post("/izin-revisi");
  };

  return (
    <AppLayout header={<h2 className="text-2xl font-bold">Dashboard</h2>}>
      <Head title="Dashboard Staff" />

      <div className="space-y-8 pb-10">

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


        {/* Stok hampir habis */}
        {/* Stok hampir habis */}
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
            className="px-4 py-2 bg-[#8B5E3C] text-white rounded-lg hover:bg-[#6F4E37]"
          >
            Ajukan Izin Revisi Stok
          </button>
        </div>
      </div>
    </AppLayout>
  );
}


