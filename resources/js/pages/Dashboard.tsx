import React, { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Head, usePage, router } from "@inertiajs/react";
import { Box, Layers, Users, BookOpen } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
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
    <div
      className={`w-12 h-12 ${bgColor} rounded-lg flex items-center justify-center text-white shrink-0`}
    >
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
    totalItem,
    totalResep,
    totalKategori,
    totalUser,
    izinRevisiPending,
    stokHampirHabis,
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

  const pieData = [
    { name: "Hampir Habis", value: stokHampirHabis },
    { name: "Aman", value: totalItem - stokHampirHabis },
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
    <AppLayout header={<h2 className="text-2xl font-bold">Dashboard</h2>}>
      <Head title="Dashboard" />

      {/* Grid card: Sudah responsif (1 kolom di mobile, 4 di desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
        className="bg-[#F5F0EB] p-6 rounded-xl shadow-lg cursor-pointer hover:shadow-2xl transition-all duration-300 mb-6"
      >
        <p className="text-sm text-gray-700 mb-2 font-semibold">Stok Hampir Habis</p>
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

      {/* List Permintaan Izin Revisi */}
      {izinRevisiPending.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
         className="bg-[#F5F0EB] p-4 sm:p-6 rounded-xl shadow-lg"
        >
          <h3 className="font-bold mb-4 text-gray-800">
  Permintaan Izin Revisi
</h3>


          {izinRevisiPending.map((izin: any) => (
            <motion.div
              key={izin.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.01 }}
              // RESPONSIVE FIX: flex-col di mobile, flex-row di sm ke atas
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center
            mb-3 p-3 rounded-lg border border-[#E6DCD2]
            bg-transparent hover:bg-[#EFE8E1] transition
            gap-3 sm:gap-0"

            >
              <div>
                <p className="font-semibold text-gray-800">{izin.name}</p>
                <p className="text-xs sm:text-sm text-gray-500">
                  Role: {izin.role}
                </p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setSelectedIzin(izin);
                    setShowFormRevisi(true);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                >
                  Setujui
                </button>

                <button
                  onClick={() => submitIzinRevisi(izin.id, 'reject')}
                  className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                >
                  Tolak
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* MODAL 1: PILIH STOK */}
      {showPilihStok && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#F5F0EB] rounded-xl p-6 w-full max-w-[320px] shadow-2xl"
          >
            <h3 className="text-lg font-bold mb-2 text-center text-gray-800">
              Stok Hampir Habis
            </h3>
            <p className="text-sm text-gray-600 mb-6 text-center">
              Kamu mau cek stok di mana?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => router.visit("/stok-harian/bar")}
                className="flex-1 py-3 rounded-lg bg-[#8B5E3C] text-white font-medium hover:bg-[#6F4E37] transition shadow-md"
              >
                🍸 Bar
              </button>

              <button
                onClick={() => router.visit("/stok-harian/dapur")}
                className="flex-1 py-3 rounded-lg bg-[#8B5E3C] text-white font-medium hover:bg-[#6F4E37] transition shadow-md"
              >
                🍳 Dapur
              </button>
            </div>

            <button
              onClick={() => setShowPilihStok(false)}
              className="mt-6 text-sm text-gray-500 hover:text-gray-800 hover:underline block mx-auto transition"
            >
              Batal
            </button>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: FORM IZIN REVISI */}
      {showFormRevisi && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 w-[400px] shadow-xl"
          >
            <h3 className="text-lg font-bold mb-4">
              Izin Revisi Stok
            </h3>

            <p className="text-sm text-gray-600 mb-4">
              {selectedIzin?.name} ({selectedIzin?.role})
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Tanggal Mulai</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) =>
                    setFormRevisi({ ...formRevisi, tanggalMulai: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Jam Mulai</label>
                <input
                  type="time"
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) =>
                    setFormRevisi({ ...formRevisi, jamMulai: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tanggal Selesai</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) =>
                    setFormRevisi({ ...formRevisi, tanggalSelesai: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Jam Selesai</label>
                <input
                  type="time"
                  className="w-full border rounded px-3 py-2"
                  onChange={(e) =>
                    setFormRevisi({ ...formRevisi, jamSelesai: e.target.value })
                  }
                />
              </div>
            </div>

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
                className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700"
              >
                Simpan
              </button>


              <button
                onClick={() => setShowFormRevisi(false)}
                className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </AppLayout>
  );
}
