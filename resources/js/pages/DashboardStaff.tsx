import React, { useState, useEffect } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Box, Layers, BookOpen, ShieldCheck, Clock, TrendingUp, AlertTriangle, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";

const COLORS = ["#DC2626", "#F59E0B", "#22C55E"];

// 1. Komponen Countdown Timer
const CountdownTimer = ({ endTime, onExpire }: { endTime: string; onExpire?: () => void }) => {
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
        if (onExpire) onExpire();
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  const TimeBlock = ({ value, label }: { value: string; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="bg-gradient-to-b from-[#8B5E3C] to-[#6F4E37] w-12 h-14 sm:w-14 sm:h-16 rounded-2xl flex items-center justify-center shadow-md shadow-[#8B5E3C]/20 relative overflow-hidden">
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/25" />
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/10 rounded-t-2xl" />
          <span className="text-xl sm:text-2xl font-black text-white relative z-10">{value}</span>
        </div>
      </div>
      <span className="text-[10px] sm:text-[11px] text-gray-400 mt-2 font-bold uppercase tracking-wider">{label}</span>
    </div>
  );

  const Separator = () => (
    <div className="flex flex-col gap-2 px-1 pb-6">
      <div className="w-1.5 h-1.5 bg-[#8B5E3C] rounded-full" />
      <div className="w-1.5 h-1.5 bg-[#8B5E3C] rounded-full" />
    </div>
  );

  return (
    <div className="flex items-center gap-1 sm:gap-2">
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

const InfoCard = ({
  title,
  value,
  icon: Icon,
  onClick,
}: any) => (
  <motion.div
    onClick={onClick}
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    className={`bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-gray-100/80 flex items-center gap-4 transition-all duration-300 group ${
      onClick ? "cursor-pointer hover:shadow-md hover:border-[#8B5E3C]/30" : ""
    }`}
  >
    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#8B5E3C] to-[#6F4E37] rounded-2xl flex items-center justify-center text-white shadow-md shadow-[#8B5E3C]/20 flex-shrink-0 group-hover:scale-105 transition-transform">
      <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
    </div>
    <div className="min-w-0">
      <p className="text-xs sm:text-sm text-gray-400 font-bold uppercase tracking-wider">{title}</p>
      <p className="text-2xl sm:text-3xl font-black text-gray-800 mt-0.5">
        <CountUp end={value} duration={1.2} />
      </p>
    </div>
  </motion.div>
);

export default function DashboardStaff() {
  const {
    auth,
    totalItem,
    totalResep,
    totalKategori,
    alreadyInputToday,
    sudahInputHariIni,
    totalStokHarian,
    stokHampirHabis,
    stokHabis,
    flash,
    alreadyRequestedRevision,
    izinApproved,
    itemDetails,
    stokDate,
    isStokFromPreviousDay,
  } = usePage<any>().props;

  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    setIsExpired(false);
  }, [izinApproved]);

  const effectiveIzinApproved = izinApproved && !isExpired;

  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [selectedDetailCategory, setSelectedDetailCategory] = useState<'habis' | 'hampir' | 'aman'>('habis');

  const isBar = auth.user.role === 'bar';
  const myDivisionData = isBar ? itemDetails?.bar : itemDetails?.dapur;
  const myDivisionName = isBar ? 'Bar' : 'Dapur';

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
    <AppLayout header={<h2 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h2>}>
      <Head title="Dashboard Staff" />

      {/* FLASH MESSAGE */}
      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        {flash?.error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs sm:text-sm text-rose-700 font-bold shadow-xs">
            ❌ {flash.error}
          </motion.div>
        )}
        {flash?.success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm text-emerald-700 font-bold shadow-xs">
            ✅ {flash.success}
          </motion.div>
        )}
      </div>

      <div className="space-y-6 sm:space-y-8 pb-6 sm:pb-8 md:pb-10">

        {/* 1. CARD STATISTIK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <InfoCard title="Total Item" value={totalItem} icon={Layers} onClick={() => router.visit("/item")} />
          <InfoCard title="Total Resep" value={totalResep} icon={BookOpen} onClick={() => router.visit("/resep")} />
          <div className="sm:col-span-2 md:col-span-1">
            <InfoCard title="Total Kategori" value={totalKategori} icon={Box} onClick={() => router.visit("/kategori")} />
          </div>
        </div>

        {/* 2. STATUS STOK */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ duration: 0.3 }}
          onClick={() => setShowItemDetailModal(true)}
          className="bg-[#F2ECE4] p-5 sm:p-6 md:p-7 rounded-3xl shadow-xs cursor-pointer hover:shadow-md hover:border-[#8B5E3C]/40 transition-all duration-300 border border-amber-200/60 group"
        >
          <div className="mb-5 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#8B5E3C]/10 flex items-center justify-center text-[#8B5E3C]">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              Status Stok Harian
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {isStokFromPreviousDay
                ? `Data terakhir: ${new Date(stokDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} (belum ada input hari ini)`
                : 'Klik untuk melihat rincian lengkap item stok'}
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
            <div className="relative w-full md:w-1/2 h-[180px] sm:h-[200px] md:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl sm:text-3xl font-black text-gray-800">{totalStokHarian}</span>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Stok</span>
              </div>
            </div>

            <div className="w-full md:w-1/2 space-y-3">
              <div className="flex items-center justify-between p-3.5 sm:p-4 bg-red-50 rounded-2xl border border-red-100 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-red-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-gray-700 text-sm">Stok Habis</span>
                    <p className="text-xs text-gray-400">Stok = 0</p>
                  </div>
                </div>
                <span className="text-xl sm:text-2xl font-black text-red-600">{stokHabis || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 sm:p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-gray-700 text-sm">Hampir Habis</span>
                    <p className="text-xs text-gray-400">Stok 1-7</p>
                  </div>
                </div>
                <span className="text-xl sm:text-2xl font-black text-amber-600">{stokHampirHabis || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3.5 sm:p-4 bg-green-50 rounded-2xl border border-green-100 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-green-500 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-gray-700 text-sm">Stok Aman</span>
                    <p className="text-xs text-gray-400">Stok &gt; 7</p>
                  </div>
                </div>
                <span className="text-xl sm:text-2xl font-black text-green-600">{stokAman}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. CARD IZIN REVISI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ duration: 0.3 }}
          className="bg-[#F2ECE4] p-5 sm:p-6 md:p-7 rounded-3xl shadow-xs border border-amber-200/60 hover:shadow-md hover:border-[#8B5E3C]/40 transition-all duration-300"
        >
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base sm:text-lg">Izin Revisi Sales Report</h3>
              <p className="text-xs sm:text-sm text-gray-500">Ajukan izin untuk membuka kembali atau mengubah sales report hari ini</p>
            </div>
          </div>

          {effectiveIzinApproved ? (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs sm:text-sm font-bold shadow-2xs">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Izin Disetujui
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3">Sisa Waktu Revisi</p>
                <CountdownTimer 
                  endTime={izinApproved.end_time} 
                  onExpire={() => setIsExpired(true)} 
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 text-xs text-gray-500 font-medium pt-1">
                <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl border border-gray-100">
                  <Clock className="w-3.5 h-3.5 text-[#8B5E3C]" />
                  <span>Mulai: {new Date(izinApproved.start_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</span>
                </div>
                <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl border border-gray-100">
                  <Clock className="w-3.5 h-3.5 text-[#8B5E3C]" />
                  <span>Selesai: {new Date(izinApproved.end_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={ajukanRevisi}
              disabled={alreadyRequestedRevision}
              className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition shadow-xs ${
                alreadyRequestedRevision
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                  : 'bg-[#8B5E3C] text-white hover:bg-[#6F4E37] active:scale-95 shadow-md'
              }`}
            >
              {alreadyRequestedRevision ? "Menunggu Persetujuan..." : "Ajukan Izin Revisi"}
            </button>
          )}
        </motion.div>

        {/* 4. CARD SALES REPORT (BILL) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01, y: -2 }}
          transition={{ duration: 0.3 }}
          className="bg-[#F2ECE4] p-5 sm:p-6 md:p-7 rounded-3xl shadow-xs border border-amber-200/60 hover:shadow-md hover:border-[#8B5E3C]/40 transition-all duration-300"
        >
          {alreadyInputToday && !effectiveIzinApproved ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
                <AlertTriangle className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base">Waktu Input Sales Report Ditutup (Pukul 21:00 WIB)</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Waktu input harian telah berakhir. Ajukan izin revisi jika diperlukan.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-[#8B5E3C]/10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Layers className="w-6 h-6 text-[#8B5E3C]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-base sm:text-lg">Sales Report (Bill)</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Catat transaksi penjualan, diskon, dan nota harian</p>
                </div>
              </div>

              {sudahInputHariIni && !effectiveIzinApproved ? (
                <div className="w-full sm:w-auto inline-flex px-6 py-3 rounded-2xl bg-gray-200 text-gray-500 font-bold text-xs sm:text-sm text-center cursor-not-allowed select-none shadow-inner">
                  Selesai Input Nota Hari Ini
                </div>
              ) : (
                <button
                  onClick={() => {
                    router.visit(route("sales-report.open"));
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl transition font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#8B5E3C] text-white hover:bg-[#6F4E37] active:scale-95 shadow-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Buat Bill Baru / Input Nota
                </button>
              )}
            </>
          )}
        </motion.div>

      </div>

      {/* === MODAL RINCIAN ITEM STOK === */}
      <AnimatePresence>
        {showItemDetailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-100"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-800">Stok {myDivisionName}</h3>
                  <p className="text-xs text-gray-400 font-medium">Rincian item divisi kamu hari ini</p>
                </div>
                <button
                  onClick={() => setShowItemDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 flex gap-2 border-b border-gray-100 bg-gray-50/30">
                {[
                  { id: 'habis', label: 'Habis', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
                  { id: 'hampir', label: 'Hampir', color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
                  { id: 'aman', label: 'Aman', color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50' }
                ].map((cat: any) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedDetailCategory(cat.id)}
                    className={`flex-1 py-2 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs ${
                      selectedDetailCategory === cat.id
                        ? `${cat.color} text-white shadow-md`
                        : `${cat.bg} ${cat.text} hover:opacity-80`
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${selectedDetailCategory === cat.id ? 'bg-white' : cat.color}`} />
                    {cat.label} ({myDivisionData?.[cat.id]?.length || 0})
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-white">
                {myDivisionData?.[selectedDetailCategory]?.length > 0 ? (
                  myDivisionData[selectedDetailCategory].map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3.5 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-gray-100 transition">
                      <span className="text-sm font-bold text-gray-800">{item.nama}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                        selectedDetailCategory === 'habis' ? 'bg-red-100 text-red-600' :
                        selectedDetailCategory === 'hampir' ? 'bg-amber-100 text-amber-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        Sisa: {item.stok}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                    <p className="text-xs italic">Tidak ada item di kategori ini.</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <button
                  onClick={() => {
                    const url = isBar ? "/stok-harian/bar" : "/stok-harian/dapur";
                    router.visit(url);
                  }}
                  className="w-full py-3 bg-[#8B5E3C] text-white rounded-2xl text-sm font-bold hover:bg-[#6F4E37] transition shadow-md flex items-center justify-center gap-2"
                >
                  <span>📝</span> Kelola Stok {myDivisionName}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </AppLayout>
  );
}