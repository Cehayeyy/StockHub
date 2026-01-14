import React, { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Box, Layers, Users, BookOpen, TrendingUp, AlertTriangle, CheckCircle2, Clock, ShieldCheck, X, Calendar, Timer, XCircle } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";

const COLORS = ["#DC2626", "#F59E0B", "#22C55E"];

// Card sederhana dan formal
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

export default function Dashboard() {
  const {
    totalItem,
    totalResep,
    totalKategori,
    totalUser,
    izinRevisiPending,
    stokHampirHabis,
    stokHabis,
  } = usePage<any>().props;

  const [showPilihStok, setShowPilihStok] = useState(false);
  const [showFormRevisi, setShowFormRevisi] = useState(false);
  const [selectedIzin, setSelectedIzin] = useState<any>(null);

  const [formRevisi, setFormRevisi] = useState({
    tanggalMulai: "",
    jamMulai: "",
    tanggalSelesai: "",
    jamSelesai: "",
  });

  // Data untuk pie chart dengan 3 kategori
  const totalStokHarian = (stokHabis || 0) + (stokHampirHabis || 0);
  const stokAman = Math.max(totalItem - totalStokHarian, 0);

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
    <AppLayout header={<h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>}>
      <Head title="Dashboard" />

      <div className="space-y-8 pb-10">
        {/* Grid card: Simple dan formal dengan warna sama */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Status Stok dengan 3 kategori */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onClick={handlePieClick}
          className="bg-[#F9F6F3] p-6 rounded-2xl shadow-sm cursor-pointer hover:bg-[#F0EBE5] transition-all duration-300 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp size={20} className="text-[#8B5E3C]" />
                Status Stok Harian
              </h3>
              <p className="text-sm text-gray-500 mt-1">Klik untuk melihat detail stok</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-full md:w-1/2 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
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
                <span className="text-3xl font-bold text-gray-800">{totalItem}</span>
                <span className="text-xs text-gray-500">Total Item</span>
              </div>
            </div>

            {/* Legend kustom dengan 3 kategori */}
            <div className="w-full md:w-1/2 space-y-3">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <div>
                    <span className="font-medium text-gray-700">Stok Habis</span>
                    <p className="text-xs text-gray-500">Stok = 0</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-red-600">{stokHabis || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-amber-500" />
                  <div>
                    <span className="font-medium text-gray-700">Hampir Habis</span>
                    <p className="text-xs text-gray-500">Stok 1-7</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-amber-600">{stokHampirHabis || 0}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <div>
                    <span className="font-medium text-gray-700">Stok Aman</span>
                    <p className="text-xs text-gray-500">Stok &gt; 7</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">{stokAman}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* List Permintaan Izin Revisi */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#F9F6F3] p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheck size={20} className="text-[#8B5E3C]" />
              Permintaan Izin Revisi
            </h3>
            {izinRevisiPending.length > 0 && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-semibold rounded-full">
                {izinRevisiPending.length} Menunggu
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {izinRevisiPending.length > 0 ? (
              <motion.div className="space-y-3">
                {izinRevisiPending.map((izin: any, index: number) => (
                  <motion.div
                    key={izin.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl bg-white border border-gray-200 gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-[#8B5E3C] rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {izin.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{izin.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 bg-[#8B5E3C]/10 text-[#8B5E3C] text-xs font-medium rounded-full">
                            {izin.role}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={12} />
                            Menunggu persetujuan
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
                        className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={16} />
                        Setujui
                      </button>

                      <button
                        onClick={() => submitIzinRevisi(izin.id, 'reject')}
                        className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
                      >
                        <X size={16} />
                        Tolak
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-center"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <p className="text-gray-600 font-medium">Tidak ada permintaan izin revisi</p>
                <p className="text-sm text-gray-400 mt-1">Semua permintaan telah diproses</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* MODAL 1: PILIH STOK */}
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
              className="bg-white rounded-2xl p-6 w-full max-w-[340px] shadow-xl"
            >
              <h3 className="text-lg font-bold text-gray-800 text-center mb-2">
                Lihat Detail Stok
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Pilih divisi untuk melihat detail
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.visit("/stok-harian/bar")}
                  className="py-4 rounded-xl bg-[#8B5E3C] text-white font-semibold hover:bg-[#6F4E37] transition flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">🍸</span>
                  <span>Bar</span>
                </button>

                <button
                  onClick={() => router.visit("/stok-harian/dapur")}
                  className="py-4 rounded-xl bg-[#8B5E3C] text-white font-semibold hover:bg-[#6F4E37] transition flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">🍳</span>
                  <span>Dapur</span>
                </button>
              </div>

              <button
                onClick={() => setShowPilihStok(false)}
                className="mt-4 w-full py-2.5 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition font-medium"
              >
                Batal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: FORM IZIN REVISI */}
      <AnimatePresence>
        {showFormRevisi && (
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
              className="bg-white rounded-2xl p-6 w-full max-w-[420px] shadow-xl"
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

    </AppLayout>
  );
}
