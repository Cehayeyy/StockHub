import React, { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Box, Layers, Users, BookOpen, TrendingUp, AlertTriangle, CheckCircle2, Clock, ShieldCheck, X, Calendar, Timer, XCircle, UserCheck, UserX, ClipboardCheck, Activity, Monitor, Smartphone, Globe, Shield, Eye, LogIn, LogOut, BarChart3, UserCog, Crown } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";

const COLORS = ["#DC2626", "#F59E0B", "#22C55E"];

// Card sederhana dan formal - RESPONSIVE
const InfoCard = ({
  title,
  value,
  icon: Icon,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  onClick?: () => void;
}) => (
  <motion.div
    onClick={onClick}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={`bg-[#F9F6F3] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 sm:gap-4 ${
      onClick ? "cursor-pointer hover:bg-[#F0EBE5] transition active:scale-95" : ""
    }`}
  >
    <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-[#8B5E3C] rounded-lg sm:rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0">
      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
    </div>
    <div className="min-w-0">
      <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{title}</p>
      <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-800">
        <CountUp end={value} duration={1.2} />
      </p>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const {
    totalItem,
    totalResep,
    totalKategori,
    totalUser,
    izinRevisiPending,
    stokHampirHabis,
    stokHabis,
    staffSudahInput,
    staffBelumInput,
    totalStaff,
    ownerData,
    stokAman,
    auth,
  } = usePage<any>().props;

  const isOwner = auth?.user?.role === 'owner';

  const [showPilihStok, setShowPilihStok] = useState(false);
  const [showFormRevisi, setShowFormRevisi] = useState(false);
  const [selectedIzin, setSelectedIzin] = useState<any>(null);
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [selectedDayActivity, setSelectedDayActivity] = useState<any>(null);

  const [formRevisi, setFormRevisi] = useState({
    tanggalMulai: "",
    jamMulai: "",
    tanggalSelesai: "",
    jamSelesai: "",
  });

  // Data untuk pie chart dengan 3 kategori (menggunakan data dari backend)
  const totalStokHarian = (stokHabis || 0) + (stokHampirHabis || 0) + (stokAman || 0);

  const pieData = [
    { name: "Stok Habis", value: stokHabis || 0 },
    { name: "Hampir Habis", value: stokHampirHabis || 0 },
    { name: "Stok Aman", value: stokAman },
  ];

  const handlePieClick = () => {
    setShowPilihStok(true);
  };


const updateIzinRevisi = (id: number, action: 'approve' | 'reject') => {
  router.post(
    route('izin-revisi.update', id),
    { action },
    {
      preserveScroll: true,
      onSuccess: () => {
        setShowFormRevisi(false);
        setSelectedIzin(null);
        router.reload({
          only: ['izinRevisiPending'],
        });
      },
    }
  );
};

  // --- FUNGSI UPDATE IZIN (DIGABUNGKAN) ---
  const submitIzinRevisi = (id: number, action: 'approve' | 'reject', extraData: any = {}) => {
    router.post(route('izin-revisi.update', id), { action, ...extraData }, {
        onSuccess: () => {
            setShowFormRevisi(false);
            setFormRevisi({ tanggalMulai: "", jamMulai: "", tanggalSelesai: "", jamSelesai: "" });
        },
        onError: (err) => {
            console.error(err);
            alert("Terjadi kesalahan, coba lagi.");
        }
    });
  };

  return (
    <AppLayout header={<h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Dashboard</h2>}>
      <Head title="Dashboard" />

      <div className="space-y-4 sm:space-y-6 md:space-y-8 pb-6 sm:pb-8 md:pb-10">
        {/* Grid card: Simple dan formal dengan warna sama - RESPONSIVE */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <InfoCard
            title="Total Item"
            value={totalItem}
            icon={Layers}
            onClick={() => router.visit("/item")}
          />

          <InfoCard
            title="Total Resep"
            value={totalResep}
            icon={BookOpen}
            onClick={() => router.visit("/resep")}
          />

          <InfoCard
            title="Total Kategori"
            value={totalKategori}
            icon={Box}
            onClick={() => router.visit("/kategori")}
          />

          <InfoCard
            title="Total User"
            value={totalUser}
            icon={Users}
            onClick={() => router.visit("/manajemen-akun")}
          />
        </div>

        {/* Status Stok dengan 3 kategori - RESPONSIVE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onClick={handlePieClick}
          className="bg-[#F9F6F3] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-sm cursor-pointer hover:bg-[#F0EBE5] transition-all duration-300 border border-gray-100 active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B5E3C]" />
                Status Stok Harian
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Klik untuk melihat detail stok</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-8">
            <div className="relative w-full md:w-1/2 h-[180px] sm:h-[200px] md:h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
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
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl sm:text-3xl font-bold text-gray-800">{totalItem}</span>
                <span className="text-xs text-gray-500">Total Item</span>
              </div>
            </div>

            {/* Legend kustom dengan 3 kategori - RESPONSIVE */}
            <div className="w-full md:w-1/2 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between p-3 sm:p-4 bg-red-50 rounded-lg sm:rounded-xl border border-red-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-red-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-700 text-sm sm:text-base">Stok Habis</span>
                    <p className="text-xs text-gray-500 hidden sm:block">Stok = 0</p>
                  </div>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-red-600">{stokHabis || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 sm:p-4 bg-amber-50 rounded-lg sm:rounded-xl border border-amber-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-amber-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-700 text-sm sm:text-base">Hampir Habis</span>
                    <p className="text-xs text-gray-500 hidden sm:block">Stok 1-7</p>
                  </div>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-amber-600">{stokHampirHabis || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 sm:p-4 bg-green-50 rounded-lg sm:rounded-xl border border-green-100">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-gray-700 text-sm sm:text-base">Stok Aman</span>
                    <p className="text-xs text-gray-500 hidden sm:block">Stok &gt; 7</p>
                  </div>
                </div>
                <span className="text-xl sm:text-2xl font-bold text-green-600">{stokAman}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* List Permintaan Izin Revisi - RESPONSIVE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#F9F6F3] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B5E3C]" />
              <span className="hidden sm:inline">Permintaan Izin Revisi</span>
              <span className="sm:hidden">Izin Revisi</span>
            </h3>
            {izinRevisiPending.length > 0 && (
              <span className="px-2 sm:px-3 py-1 bg-amber-100 text-amber-700 text-xs sm:text-sm font-semibold rounded-full">
                {izinRevisiPending.length} Menunggu
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {izinRevisiPending.length > 0 ? (
              <motion.div className="space-y-2 sm:space-y-3">
                {izinRevisiPending.map((izin: any, index: number) => (
                  <motion.div
                    key={izin.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 rounded-lg sm:rounded-xl bg-white border border-gray-200 gap-3 sm:gap-4"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 bg-[#8B5E3C] rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                        {izin.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm sm:text-base">{izin.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 sm:mt-1 flex-wrap">
                          <span className="px-2 py-0.5 bg-[#8B5E3C]/10 text-[#8B5E3C] text-xs font-medium rounded-full">
                            {izin.role}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={10} className="sm:w-3 sm:h-3" />
                            <span className="hidden sm:inline">Menunggu persetujuan</span>
                            <span className="sm:hidden">Pending</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => {
                          setSelectedIzin(izin);
                          setShowFormRevisi(true);
                        }}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-green-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-1 sm:gap-2 active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Setujui</span>
                      </button>

                      <button
                        onClick={() => submitIzinRevisi(izin.id, 'reject')}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-red-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-1 sm:gap-2 active:scale-95"
                      >
                        <X className="w-4 h-4" />
                        <span>Tolak</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-6 sm:py-8 text-center"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
                </div>
                <p className="text-gray-600 font-medium text-sm sm:text-base">Tidak ada permintaan izin revisi</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Semua permintaan telah diproses</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Status Input Harian Staff - RESPONSIVE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#F9F6F3] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B5E3C]" />
                <span className="hidden sm:inline">Status Input Harian Staff</span>
                <span className="sm:hidden">Status Input Staff</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Monitoring input stok harian hari ini</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 text-xs sm:text-sm font-semibold rounded-full">
                {staffSudahInput?.length || 0} / {totalStaff || 0} Sudah Input
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Staff Sudah Input */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-3 sm:px-4 py-2 sm:py-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-green-600" />
                <span className="font-semibold text-green-700 text-sm sm:text-base">Sudah Input</span>
                <span className="ml-auto px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full">
                  {staffSudahInput?.length || 0}
                </span>
              </div>
              <div className="max-h-[200px] sm:max-h-[280px] overflow-y-auto">
                {staffSudahInput && staffSudahInput.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {staffSudahInput.map((staff: any) => (
                      <div key={staff.id} className="px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 hover:bg-gray-50 transition">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                          {staff.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate text-sm sm:text-base">{staff.name}</p>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full ${
                              staff.role === 'bar'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                            {staff.role === 'bar' ? 'Bar' : 'Dapur'}
                            </span>
                            {staff.input_time && (
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(staff.input_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                        <CheckCircle2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-green-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 sm:py-8 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500">Belum ada staff yang input</p>
                  </div>
                )}
              </div>
            </div>

            {/* Staff Belum Input */}
            <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-3 sm:px-4 py-2 sm:py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                <UserX className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-red-600" />
                <span className="font-semibold text-red-700 text-sm sm:text-base">Belum Input</span>
                <span className="ml-auto px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                  {staffBelumInput?.length || 0}
                </span>
              </div>
              <div className="max-h-[200px] sm:max-h-[280px] overflow-y-auto">
                {staffBelumInput && staffBelumInput.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {staffBelumInput.map((staff: any) => (
                      <div key={staff.id} className="px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 hover:bg-gray-50 transition">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                          {staff.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate text-sm sm:text-base">{staff.name}</p>
                          <span className={`px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded-full ${
                            staff.role === 'bar'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {staff.role === 'bar' ? 'Bar' : 'Dapur'}
                          </span>
                        </div>
                        <XCircle className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-red-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 sm:py-8 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500">Semua staff sudah input!</p>
                    <p className="text-xs text-gray-400">Kerja bagus! 🎉</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============================================= */}
        {/* SECTION KHUSUS OWNER - RINGKASAN EKSEKUTIF - RESPONSIVE */}
        {/* ============================================= */}
        {isOwner && ownerData && (
          <>
            {/* Header Ringkasan Eksekutif */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-[#F9F6F3] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#8B5E3C] rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800">Ringkasan Eksekutif</h3>
                  <p className="text-gray-500 text-xs sm:text-sm">Pemantauan & Analisis khusus Pemilik</p>
                </div>
              </div>

              {/* Executive Stats Cards - RESPONSIVE */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mt-4">
                <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-[#8B5E3C]" />
                    <span className="text-gray-500 text-[10px] sm:text-xs font-medium truncate">Aktivitas Minggu Ini</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-800">{ownerData.activityThisWeek}</p>
                  <p className={`text-[10px] sm:text-xs ${ownerData.activityGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {ownerData.activityGrowth >= 0 ? '↑' : '↓'} {Math.abs(ownerData.activityGrowth)}%
                  </p>
                </div>

                <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <LogIn className="w-3 h-3 sm:w-4 sm:h-4 text-[#8B5E3C]" />
                    <span className="text-gray-500 text-[10px] sm:text-xs font-medium truncate">Masuk Minggu Ini</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-800">{ownerData.loginThisWeek}</p>
                  <p className={`text-[10px] sm:text-xs ${ownerData.loginGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {ownerData.loginGrowth >= 0 ? '↑' : '↓'} {Math.abs(ownerData.loginGrowth)}%
                  </p>
                </div>

                <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <UserCog className="w-3 h-3 sm:w-4 sm:h-4 text-[#8B5E3C]" />
                    <span className="text-gray-500 text-[10px] sm:text-xs font-medium truncate">Total Supervisor</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-800">{ownerData.totalSupervisor}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Pengawas</p>
                </div>

                <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 text-[#8B5E3C]" />
                    <span className="text-gray-500 text-[10px] sm:text-xs font-medium truncate">Izin Diproses</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-800">{ownerData.izinProcessedThisMonth}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">Bulan ini</p>
                </div>
              </div>
            </motion.div>

            {/* Grafik Aktivitas & Distribusi Pengguna - RESPONSIVE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Grafik Aktivitas Mingguan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-[#F9F6F3] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B5E3C]" />
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-800">Aktivitas 7 Hari</h3>
                  </div>
                  <button
                    onClick={() => setShowActivityDetail(true)}
                    className="text-xs sm:text-sm text-[#8B5E3C] hover:underline font-medium flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Lihat Detail</span>
                    <span className="sm:hidden">Detail</span>
                  </button>
                </div>
                <div className="h-[160px] sm:h-[180px] md:h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ownerData.activityPerDay}
                      onClick={(data) => {
                        if (data && data.activePayload && data.activePayload[0]) {
                          setSelectedDayActivity(data.activePayload[0].payload);
                          setShowActivityDetail(true);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        fontSize={10}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('id-ID', { weekday: 'short' })}
                      />
                      <YAxis fontSize={10} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                        formatter={(value: any) => [`${value} aktivitas`, 'Total']}
                      />
                      <Bar dataKey="total" fill="#8B5E3C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-400 text-center mt-2">Klik bar untuk melihat detail</p>
              </motion.div>

              {/* Distribusi Pengguna per Peran - RESPONSIVE */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-[#F9F6F3] p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B5E3C]" />
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-800">Distribusi Pengguna</h3>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-[#8B5E3C]/20">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Crown className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#8B5E3C]" />
                      <span className="font-medium text-gray-700 text-sm sm:text-base">Pemilik</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-[#8B5E3C]">{ownerData.usersByRole?.owner || 1}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-blue-100">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <UserCog className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-blue-600" />
                      <span className="font-medium text-gray-700 text-sm sm:text-base">Supervisor</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-blue-600">{ownerData.totalSupervisor}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-purple-100">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-base sm:text-lg">🍸</span>
                      <span className="font-medium text-gray-700 text-sm sm:text-base">Staf Bar</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-purple-600">{ownerData.totalBarStaff}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg sm:rounded-xl border border-orange-100">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-base sm:text-lg">🍳</span>
                      <span className="font-medium text-gray-700 text-sm sm:text-base">Staf Dapur</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-orange-600">{ownerData.totalDapurStaff}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>

      {/* MODAL 1: PILIH STOK - RESPONSIVE */}
      <AnimatePresence>
        {showPilihStok && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-[300px] sm:max-w-[340px] shadow-xl"
            >
              <h3 className="text-base sm:text-lg font-bold text-gray-800 text-center mb-2">
                Lihat Detail Stok
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 text-center mb-4 sm:mb-6">
                Pilih divisi untuk melihat detail
              </p>

              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  onClick={() => router.visit("/stok-harian/bar")}
                  className="py-3 sm:py-4 rounded-lg sm:rounded-xl bg-[#8B5E3C] text-white font-semibold hover:bg-[#6F4E37] transition flex flex-col items-center gap-1 sm:gap-2 active:scale-95"
                >
                  <span className="text-xl sm:text-2xl">🍸</span>
                  <span className="text-sm sm:text-base">Bar</span>
                </button>

                <button
                  onClick={() => router.visit("/stok-harian/dapur")}
                  className="py-3 sm:py-4 rounded-lg sm:rounded-xl bg-[#8B5E3C] text-white font-semibold hover:bg-[#6F4E37] transition flex flex-col items-center gap-1 sm:gap-2 active:scale-95"
                >
                  <span className="text-xl sm:text-2xl">🍳</span>
                  <span className="text-sm sm:text-base">Dapur</span>
                </button>
              </div>

              <button
                onClick={() => setShowPilihStok(false)}
                className="mt-3 sm:mt-4 w-full py-2 sm:py-2.5 text-xs sm:text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition font-medium"
              >
                Batal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: FORM IZIN REVISI - RESPONSIVE */}
      <AnimatePresence>
        {showFormRevisi && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-[360px] sm:max-w-[420px] shadow-xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-800">Izin Revisi Stok</h3>
                <button
                  onClick={() => setShowFormRevisi(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* User info */}
              <div className="flex items-center gap-3 p-3 bg-[#F9F6F3] rounded-xl mb-5">
                <div className="w-10 h-10 bg-[#8B5E3C] rounded-full flex items-center justify-center text-white font-bold">
                  {selectedIzin?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{selectedIzin?.name}</p>
                  <span className="text-xs text-gray-500">{selectedIzin?.role}</span>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tanggal Mulai</label>
                    <input
                      type="date"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition outline-none text-sm"
                      onChange={(e) =>
                        setFormRevisi({ ...formRevisi, tanggalMulai: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Jam Mulai</label>
                    <input
                      type="time"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition outline-none text-sm"
                      onChange={(e) =>
                        setFormRevisi({ ...formRevisi, jamMulai: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tanggal Selesai</label>
                    <input
                      type="date"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition outline-none text-sm"
                      onChange={(e) =>
                        setFormRevisi({ ...formRevisi, tanggalSelesai: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Jam Selesai</label>
                    <input
                      type="time"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#8B5E3C]/20 focus:border-[#8B5E3C] transition outline-none text-sm"
                      onChange={(e) =>
                        setFormRevisi({ ...formRevisi, jamSelesai: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    if (
                      !formRevisi.tanggalMulai ||
                      !formRevisi.jamMulai ||
                      !formRevisi.tanggalSelesai ||
                      !formRevisi.jamSelesai
                    ) {
                      alert("Lengkapi semua waktu izin revisi");
                      return;
                    }

                    // Submit ke backend
                    submitIzinRevisi(selectedIzin.id, 'approve', formRevisi);
                  }}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-semibold transition flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Setujui
                </button>

                <button
                  onClick={() => setShowFormRevisi(false)}
                  className="flex-1 bg-gray-100 py-2.5 rounded-lg hover:bg-gray-200 font-semibold transition"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DETAIL AKTIVITAS 7 HARI */}
      <AnimatePresence>
        {showActivityDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#8B5E3C] rounded-xl flex items-center justify-center">
                    <Activity size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {selectedDayActivity
                        ? `Aktivitas ${new Date(selectedDayActivity.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`
                        : 'Detail Aktivitas 7 Hari Terakhir'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedDayActivity
                        ? `Total ${selectedDayActivity.total} aktivitas`
                        : 'Ringkasan aktivitas per hari'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowActivityDetail(false);
                    setSelectedDayActivity(null);
                  }}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                {selectedDayActivity ? (
                  // Detail aktivitas untuk hari tertentu
                  <div className="space-y-3">
                    {selectedDayActivity.activities?.length > 0 ? (
                      selectedDayActivity.activities.map((activity: any, index: number) => (
                        <div key={index} className="p-3 bg-[#F9F6F3] rounded-xl border border-gray-100">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                              activity.activity === 'Login' ? 'bg-green-500' :
                              activity.activity === 'Logout' ? 'bg-red-500' :
                              activity.activity?.includes('Tambah') ? 'bg-blue-500' :
                              activity.activity?.includes('Update') ? 'bg-amber-500' :
                              activity.activity?.includes('Hapus') ? 'bg-red-500' :
                              'bg-gray-500'
                            }`}>
                              {activity.user_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-800 text-sm">{activity.user_name}</span>
                                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                                  activity.user_role === 'owner' ? 'bg-[#8B5E3C]/20 text-[#8B5E3C]' :
                                  activity.user_role === 'supervisor' ? 'bg-blue-100 text-blue-700' :
                                  activity.user_role === 'bar' ? 'bg-purple-100 text-purple-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  {activity.user_role}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-0.5">{activity.activity}</p>
                              {activity.description && (
                                <p className="text-xs text-gray-400 mt-1">{activity.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(activity.created_at).toLocaleString('id-ID', {
                                  hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Activity size={32} className="mx-auto mb-2 text-gray-300" />
                        <p>Belum ada detail aktivitas</p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Ringkasan semua hari
                  <div className="space-y-3">
                    {ownerData?.activityPerDay?.map((day: any, index: number) => (
                      <div
                        key={index}
                        className="p-4 bg-[#F9F6F3] rounded-xl border border-gray-100 hover:bg-[#F0EBE5] transition cursor-pointer"
                        onClick={() => setSelectedDayActivity(day)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#8B5E3C] rounded-xl flex items-center justify-center text-white font-bold">
                              {new Date(day.date).getDate()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800">
                                {new Date(day.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                              </p>
                              <p className="text-sm text-gray-500">Klik untuk lihat detail</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-[#8B5E3C]">{day.total}</span>
                            <span className="text-sm text-gray-500">aktivitas</span>
                            <Eye size={16} className="text-gray-400 ml-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                {selectedDayActivity && (
                  <button
                    onClick={() => setSelectedDayActivity(null)}
                    className="flex-1 bg-gray-100 py-2.5 rounded-lg hover:bg-gray-200 font-semibold transition"
                  >
                    Kembali ke Ringkasan
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowActivityDetail(false);
                    setSelectedDayActivity(null);
                  }}
                  className={`${selectedDayActivity ? 'flex-1' : 'w-full'} bg-[#8B5E3C] text-white py-2.5 rounded-lg hover:bg-[#7A5235] font-semibold transition`}
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </AppLayout>
  );
}
