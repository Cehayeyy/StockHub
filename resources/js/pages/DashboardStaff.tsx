import React, { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Box, Layers, BookOpen, ShieldCheck, Clock, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
import CountUp from "react-countup";

const COLORS = ["#DC2626", "#F59E0B", "#22C55E"];

// Komponen Countdown Timer - Flip Clock Style
const CountdownTimer = ({ endTime }: { endTime: string }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endTime).getTime();
      const now = new Date().getTime();
      const difference = end - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  const TimeBlock = ({ value, label }: { value: string; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Main block dengan efek 3D */}
        <div className="bg-gradient-to-b from-[#8B5E3C] to-[#6F4E37] w-14 h-16 rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden">
          {/* Garis tengah */}
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/20" />
          {/* Highlight atas */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/10 rounded-t-lg" />
          <span className="text-2xl font-bold text-white relative z-10">{value}</span>
        </div>
        {/* Shadow bawah */}
        <div className="absolute -bottom-1 left-1 right-1 h-2 bg-[#5D4037] rounded-b-lg -z-10" />
      </div>
      <span className="text-[11px] text-gray-500 mt-2 font-medium uppercase tracking-wide">{label}</span>
    </div>
  );

  const Separator = () => (
    <div className="flex flex-col gap-2 px-1 pb-6">
      <div className="w-2 h-2 bg-[#8B5E3C] rounded-full" />
      <div className="w-2 h-2 bg-[#8B5E3C] rounded-full" />
    </div>
  );

  return (
    <div className="flex items-start gap-1">
      {timeLeft.days > 0 && (
        <>
          <TimeBlock value={formatNumber(timeLeft.days)} label="Hari" />
          <Separator />
        </>
      )}
      <TimeBlock value={formatNumber(timeLeft.hours)} label="Jam" />
      <Separator />
      <TimeBlock value={formatNumber(timeLeft.minutes)} label="Menit" />
      <Separator />
      <TimeBlock value={formatNumber(timeLeft.seconds)} label="Detik" />
    </div>
  );
};

// Komponen Card Statistik Atas - Simple dan formal dengan warna sama
const InfoCard = ({
  title,
  value,
  icon: Icon,
  onClick,
}: any) => (
  <motion.div
    onClick={onClick}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={`bg-[#F9F6F3] p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 ${
      onClick ? "cursor-pointer hover:bg-[#F0EBE5] transition" : ""
    }`}
  >
    <div className="w-12 h-12 bg-[#8B5E3C] rounded-xl flex items-center justify-center text-white shadow-sm">
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
    stokHabis,
    flash,
    alreadyRequestedRevision,
    izinApproved, // Data izin yang sudah disetujui dengan waktu
  } = usePage<any>().props;

  // Data untuk pie chart dengan 3 kategori
  const totalStokData = (stokHabis || 0) + (stokHampirHabis || 0);
  const stokAman = Math.max(totalStokHarian - totalStokData, 0);

  const pieData = [
    { name: "Stok Habis", value: stokHabis || 0 },
    { name: "Hampir Habis", value: stokHampirHabis || 0 },
    { name: "Stok Aman", value: stokAman },
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

        {/* 1. CARD STATISTIK - Warna sama */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoCard title="Total Item" value={totalItem} icon={Layers} onClick={() => router.visit("/item")} />
          <InfoCard title="Total Resep" value={totalResep} icon={BookOpen} onClick={() => router.visit("/resep")} />
          <InfoCard title="Total Kategori" value={totalKategori} icon={Box} onClick={() => router.visit("/kategori")} />
        </div>

        {/* 2. STATUS STOK - 3 Kategori */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => {
            if (auth.user.role === "bar") router.visit("/stok-harian/bar");
            else if (["dapur", "kitchen", "staff_kitchen"].includes(auth.user.role)) router.visit("/stok-harian/dapur");
          }}
          className="bg-[#F9F6F3] p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:bg-[#F0EBE5] transition"
        >
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-[#8B5E3C]" />
              Status Stok Harian
            </h3>
            <p className="text-sm text-gray-500 mt-1">Klik untuk melihat detail stok</p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-full md:w-1/2 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {pieData.map((_, i) => (<Cell key={i} fill={COLORS[i]} />))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-gray-800">{totalStokHarian}</span>
                <span className="text-xs text-gray-500">Total</span>
              </div>
            </div>

            {/* Legend kustom dengan 3 kategori */}
            <div className="w-full md:w-1/2 space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div>
                    <span className="font-medium text-gray-700 text-sm">Stok Habis</span>
                    <p className="text-xs text-gray-500">Stok = 0</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-red-600">{stokHabis || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div>
                    <span className="font-medium text-gray-700 text-sm">Hampir Habis</span>
                    <p className="text-xs text-gray-500">Stok 1-7</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-amber-600">{stokHampirHabis || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div>
                    <span className="font-medium text-gray-700 text-sm">Stok Aman</span>
                    <p className="text-xs text-gray-500">Stok &gt; 7</p>
                  </div>
                </div>
                <span className="text-xl font-bold text-green-600">{stokAman}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. CARD IZIN REVISI - Desain lebih clean */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Izin Revisi Stok</h3>
              <p className="text-sm text-gray-500">Ajukan izin untuk mengubah stok yang sudah disubmit</p>
            </div>
          </div>

          {/* Tampilkan Timer jika izin sudah disetujui */}
          {izinApproved ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Izin Disetujui
              </div>

              <div className="bg-gray-50 p-5 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Sisa Waktu Revisi</p>
                <CountdownTimer endTime={izinApproved.end_time} />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 text-xs text-gray-500 pt-2">
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>Mulai: {new Date(izinApproved.start_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span>Selesai: {new Date(izinApproved.end_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={ajukanRevisi}
              disabled={alreadyRequestedRevision}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                alreadyRequestedRevision
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#8B5E3C] text-white hover:bg-[#6F4E37]'
              }`}
            >
              {alreadyRequestedRevision ? "Menunggu Persetujuan..." : "Ajukan Izin Revisi"}
            </button>
          )}
        </motion.div>

        {/* 4. CARD INPUT HARIAN - Desain lebih clean */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          {alreadyInputToday && !izinApproved ? (
            // --- TAMPILAN SESUDAH DISIMPAN ---
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Stok Harian Sudah Tersimpan</h3>
                <p className="text-sm text-gray-500">Data stok harian hari ini sudah berhasil disimpan</p>
              </div>
            </div>
          ) : (
            // --- TAMPILAN SEBELUM INPUT atau IZIN REVISI AKTIF ---
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#8B5E3C]/10 rounded-xl flex items-center justify-center">
                  <Layers size={24} className="text-[#8B5E3C]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Input Stok Harian</h3>
                  <p className="text-sm text-gray-500">Catat stok harian untuk divisi kamu</p>
                </div>
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
                className="w-full sm:w-auto px-6 py-3 bg-[#8B5E3C] text-white rounded-xl hover:bg-[#6F4E37] transition font-semibold text-sm flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Mulai Input
              </button>
            </div>
          )}
        </motion.div>

      </div>
    </AppLayout>
  );
}
