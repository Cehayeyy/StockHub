import React, { useState, useEffect } from "react";
import { Link } from "@inertiajs/react";
import { Instagram, Globe, MapPin, Package, ChefHat, BarChart3, Shield, Zap, Users, CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

export default function LandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { scrollYProgress } = useScroll();
  const scaleProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  const features = [
    {
      icon: Package,
      title: "Manajemen Stok",
      description: "Kelola bahan mentah, kategori, dan satuan dengan mudah",
      color: "from-[#8B5E3C] to-[#D9A978]"
    },
    {
      icon: ChefHat,
      title: "Resep Terstruktur",
      description: "Atur komposisi resep lengkap dengan bahan & porsinya",
      color: "from-[#8B5E3C] to-[#D9A978]"
    },
    {
      icon: BarChart3,
      title: "Laporan Real-Time",
      description: "Pantau aktivitas stok harian bar & dapur secara instan",
      color: "from-[#8B5E3C] to-[#D9A978]"
    }
  ];

  const stats = [
    { number: "100%", label: "Akurasi Data" },
    { number: "24/7", label: "Akses Sistem" },
    { number: "Real-Time", label: "Update" },
    { number: "Unlimited", label: "Users" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 overflow-hidden">
      {/* Animated Cursor Follower */}
      <motion.div
        className="fixed w-96 h-96 rounded-full pointer-events-none z-0 blur-3xl opacity-30"
        animate={{
          x: mousePosition.x - 192,
          y: mousePosition.y - 192,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        style={{
          background: "radial-gradient(circle, rgba(139,94,60,0.3) 0%, rgba(217,169,120,0.1) 100%)",
        }}
      />

      {/* NAVBAR */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 w-full px-6 md:px-12 py-4 flex justify-between items-center bg-white/80 backdrop-blur-2xl z-50 border-b border-gray-200 shadow-lg"
      >
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <motion.div
            className="w-10 h-10 bg-gradient-to-br from-[#8B5E3C] to-[#D9A978] rounded-xl flex items-center justify-center"
            animate={{
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <Package className="text-white" size={24} />
          </motion.div>
          <motion.h1
            className="text-2xl font-extrabold bg-gradient-to-r from-[#8B5E3C] via-[#D9A978] to-[#8B5E3C] bg-clip-text text-transparent"
            animate={{
              backgroundPosition: ["0%", "100%", "0%"],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
            }}
            style={{ backgroundSize: "200% auto" }}
          >
            StockHub
          </motion.h1>
        </motion.div>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            href="/login"
            className="relative px-6 py-2.5 bg-gradient-to-r from-[#8B5E3C] to-[#D9A978] text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl transform transition-all duration-300 flex items-center gap-2 overflow-hidden group"
          >
            <span className="absolute inset-0 w-0 bg-white/20 transition-all duration-500 ease-out group-hover:w-full"></span>
            <span className="relative">Login</span>
            <ArrowRight size={18} className="relative group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </motion.header>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-6 md:px-12 overflow-hidden">
        {/* Background Decorations */}
        <motion.div
          className="absolute top-0 left-0 w-96 h-96 bg-[#8B5E3C]/10 rounded-full blur-3xl -z-10"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-[#D9A978]/10 rounded-full blur-3xl -z-10"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />

        {/* Floating Elements */}
        <motion.div
          className="absolute top-20 right-20 w-32 h-32 border-2 border-[#8B5E3C]/20 rounded-full"
          animate={{
            y: [0, -20, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
          }}
        />
        <motion.div
          className="absolute bottom-40 left-10 w-20 h-20 bg-gradient-to-br from-[#D9A978]/20 to-transparent rounded-2xl"
          animate={{
            y: [0, 20, 0],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
          }}
        />

        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">

          {/* TEXT */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.h1
              className="text-5xl md:text-7xl font-black leading-tight mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                Kelola Stok
              </motion.span>
              <br />
              <motion.span
                className="bg-gradient-to-r from-[#8B5E3C] via-[#D9A978] to-[#8B5E3C] bg-clip-text text-transparent"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                style={{ backgroundSize: "200% auto" }}
                animate-bg={{
                  backgroundPosition: ["0%", "100%", "0%"],
                }}
              >
                Bar & Dapur
              </motion.span>
              <br />
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                lebih mudah & efisien
              </motion.span>
            </motion.h1>

            <motion.p
              className="text-gray-600 text-lg md:text-xl mb-8 max-w-lg leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
            >
              StockHub membantu mengatur bahan mentah, inventaris, dan resep secara cepat & akurat.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.6 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
                <Link
                  href="/login"
                  className="relative inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#8B5E3C] to-[#D9A978] text-white font-bold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 text-center overflow-hidden group"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-[#D9A978] to-[#8B5E3C] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                  <span className="relative">Mulai Sekarang</span>
                </Link>
              </motion.div>
              <motion.a
                href="#features"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-[#8B5E3C] hover:text-[#8B5E3C] transition-all duration-300 text-center relative overflow-hidden group"
              >
                <span className="absolute inset-0 w-0 bg-gradient-to-r from-[#8B5E3C]/5 to-[#D9A978]/5 group-hover:w-full transition-all duration-500"></span>
                <span className="relative">Pelajari Lebih Lanjut</span>
              </motion.a>
            </motion.div>
          </motion.div>

          {/* IMAGE/ILLUSTRATION */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <motion.div
              className="relative rounded-3xl overflow-hidden shadow-2xl"
              whileHover={{ scale: 1.02, rotate: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <motion.img
                src="/images/landing.jpg"
                alt="StockHub Dashboard"
                className="w-full h-auto object-cover"
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.5 }}
              />
              {/* Overlay gradient */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-tr from-[#8B5E3C]/20 to-transparent"
                whileHover={{ opacity: 0.5 }}
                transition={{ duration: 0.3 }}
              />

              {/* Animated Border */}
              <motion.div
                className="absolute inset-0 border-4 border-transparent rounded-3xl"
                whileHover={{
                  borderColor: ["#8B5E3C", "#D9A978", "#8B5E3C"],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 px-6 md:px-12 bg-white relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-32 h-32 border border-[#8B5E3C] rounded-full"
              style={{
                left: `${(i % 5) * 20}%`,
                top: `${Math.floor(i / 5) * 25}%`,
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 5 + i * 0.3,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <motion.h2
              className="text-4xl md:text-5xl font-black mb-4"
              initial={{ scale: 0.9 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              Tentang <motion.span
                className="bg-gradient-to-r from-[#8B5E3C] to-[#D9A978] bg-clip-text text-transparent inline-block"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                StockHub
              </motion.span>
            </motion.h2>
            <motion.p
              className="text-gray-600 text-lg max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Platform manajemen inventaris yang mudah dan efisien
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15, duration: 0.6 }}
                whileHover={{
                  y: -10,
                  scale: 1.03,
                  transition: { duration: 0.3 }
                }}
                className="group relative bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl border border-gray-200 hover:border-[#8B5E3C]/30 hover:shadow-2xl transition-all duration-500 overflow-hidden"
              >
                {/* Animated Background on Hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-[#8B5E3C]/5 to-[#D9A978]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  initial={false}
                />

                {/* Sparkle Effect on Hover */}
                <motion.div
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100"
                  animate={{
                    rotate: [0, 180, 360],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  <Sparkles className="text-[#D9A978]" size={20} />
                </motion.div>

                {/* Icon with gradient background */}
                <motion.div
                  className={`relative w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}
                  whileHover={{
                    rotate: [0, -10, 10, -10, 0],
                    scale: 1.15,
                  }}
                  transition={{
                    rotate: { duration: 0.5 },
                    scale: { duration: 0.3 }
                  }}
                >
                  <feature.icon className="text-white" size={32} />

                  {/* Icon Glow Effect */}
                  <motion.div
                    className="absolute inset-0 bg-white rounded-2xl opacity-0 group-hover:opacity-20"
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  />
                </motion.div>

                <h3 className="text-xl font-bold text-gray-800 mb-3 relative z-10 group-hover:text-[#8B5E3C] transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed relative z-10">
                  {feature.description}
                </p>

                {/* Animated Bottom Border */}
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#8B5E3C] to-[#D9A978]"
                  initial={{ width: 0 }}
                  whileInView={{ width: 0 }}
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.5 }}
                />

                {/* Corner Accent */}
                <motion.div
                  className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#D9A978]/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="py-20 px-6 md:px-12 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
        {/* Animated Lines Background */}
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <motion.path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#8B5E3C"
                strokeWidth="1"
                animate={{
                  strokeDashoffset: [0, 80],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <motion.div
            className="inline-block mb-6"
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Sparkles className="text-[#D9A978]" size={40} />
          </motion.div>

          <motion.h2
            className="text-4xl md:text-5xl font-black mb-6"
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Tentang <motion.span
              className="bg-gradient-to-r from-[#8B5E3C] to-[#D9A978] bg-clip-text text-transparent inline-block"
              whileHover={{
                scale: 1.1,
                rotate: [0, 2, -2, 0],
              }}
              transition={{ duration: 0.3 }}
            >
              Aplikasi
            </motion.span>
          </motion.h2>

          <motion.div
            className="relative"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            {/* Decorative Quotes */}
            <motion.div
              className="absolute -top-4 -left-4 text-6xl text-[#8B5E3C]/20 font-serif"
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              "
            </motion.div>
            <motion.div
              className="absolute -bottom-4 -right-4 text-6xl text-[#D9A978]/20 font-serif rotate-180"
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
            >
              "
            </motion.div>

            <motion.p
              className="text-gray-600 text-lg md:text-xl leading-relaxed relative z-10 bg-white/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-200"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              StockHub adalah sistem manajemen inventaris modern yang dirancang
              khusus untuk kebutuhan restoran Warung Cangkruk. Fokus
              pada kemudahan penggunaan, efisiensi, dan presisi data.
            </motion.p>
          </motion.div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16 relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">

            {/* BRAND */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                className="flex items-center gap-3 mb-4"
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="w-12 h-12 bg-gradient-to-br from-[#8B5E3C] to-[#D9A978] rounded-xl flex items-center justify-center shadow-lg"
                  animate={{
                    boxShadow: [
                      "0 0 20px rgba(139,94,60,0.3)",
                      "0 0 40px rgba(217,169,120,0.5)",
                      "0 0 20px rgba(139,94,60,0.3)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  <Package className="text-white" size={24} />
                </motion.div>
                <h2 className="text-2xl font-bold">StockHub</h2>
              </motion.div>
              <motion.p
                className="text-gray-400 leading-relaxed"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                Solusi manajemen stok bar & dapur yang modern, efisien, dan user-friendly untuk Warung Cangkruk.
              </motion.p>
            </motion.div>

            {/* SOCIAL MEDIA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Sparkles size={20} className="text-[#D9A978]" />
                </motion.div>
                Kontak & Sosial Media
              </h3>

              <ul className="space-y-4">
                {[
                  { icon: Instagram, text: "@warungcangkruk", href: "https://instagram.com/warungcangkruk" },
                  { icon: Globe, text: "warungcangkruk.com", href: "https://warungcangkruk.com" },
                  { icon: MapPin, text: "Warung Cangkringan", href: "https://www.facebook.com/warung.cangkringan" }
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    <motion.a
                      href={item.href}
                      target="_blank"
                      className="flex items-center gap-3 text-gray-400 hover:text-[#D9A978] transition-colors group"
                      whileHover={{ x: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div
                        className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-[#8B5E3C] transition-all duration-300"
                        whileHover={{
                          rotate: 360,
                          scale: 1.1,
                        }}
                        transition={{ duration: 0.5 }}
                      >
                        <item.icon size={20} />
                      </motion.div>
                      <span className="font-medium">{item.text}</span>
                    </motion.a>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* MAP SECTION */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <motion.div
                  animate={{
                    y: [0, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                >
                  <MapPin size={20} className="text-[#D9A978]" />
                </motion.div>
                Lokasi Kami
              </h3>

              <motion.div
                className="rounded-2xl overflow-hidden shadow-2xl border-2 border-gray-800 hover:border-[#8B5E3C] transition-all duration-500"
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 20px 40px rgba(139,94,60,0.3)",
                }}
                transition={{ duration: 0.3 }}
              >
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3958.8476829632254!2d112.732!3d-7.160!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zN8KwMDknMzYuMCJTIDExMsKwNDMnNTUuMyJF!5e0!3m2!1sen!2sid!4v1700000000000"
                  width="100%"
                  height="200"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                ></iframe>
              </motion.div>
            </motion.div>

          </div>

          {/* DIVIDER */}
          <motion.div
            className="border-t border-gray-800 pt-8"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
          >
            <motion.div
              className="flex flex-col md:flex-row justify-between items-center gap-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} <span className="font-semibold text-white">StockHub</span>. All rights reserved.
              </p>
              <motion.p
                className="text-gray-400 text-sm"
                whileHover={{ scale: 1.05 }}
              >
                Made By Prima<motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="inline-block"
                >❤️</motion.span> for <span className="text-[#D9A978] font-semibold">Warung Cangkruk</span>
              </motion.p>
            </motion.div>
          </motion.div>
        </div>
      </footer>

    </div>
  );
}


