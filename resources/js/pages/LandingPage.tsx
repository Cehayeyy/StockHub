import React from "react";
import { Link } from "@inertiajs/react";
import { Instagram, Globe, MapPin } from "lucide-react";


export default function LandingPage() {

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ==== NAVBAR ==== */}
      <header className="fixed top-0 w-full px-8 py-4 flex justify-between items-center shadow-sm bg-white/80 backdrop-blur-md z-50">
        <h1 className="text-2xl font-extrabold tracking-wide text-[#D9A978]">
          StockHub
        </h1>


        <Link
          href="/login"
          className="px-5 py-2 bg-[#D9A978] text-white font-medium rounded-xl shadow hover:bg-[#bf9465] transition"
        >
          Login
        </Link>
      </header>

      {/* ==== HERO SECTION ==== */}
      <main className="flex flex-col md:flex-row items-center justify-between gap-12 px-8 md:px-20 mt-32 mb-16">

        {/* TEXT */}
        <div className="flex-1">
          <h2 className="text-5xl md:text-6xl font-bold leading-tight">
            Kelola Stok Bar & Dapur <br />
            <span className="text-[#D9A978]">lebih mudah & efisien.</span>
          </h2>

          <p className="text-gray-600 mt-6 text-lg max-w-xl">
            StockHub membantu mengatur bahan mentah,
            inventaris, dan resep secara cepat & akurat.
          </p>
        </div>

        {/* IMAGE */}
        <div className="flex-1 flex justify-center">
          <img
            src="/images/landing.jpg"
            alt="Landing Image"
            className="rounded-3xl shadow-xl w-full h-full object-cover"
          />
        </div>
      </main>

      {/* ==== FEATURES SECTION ==== */}
      <section id="features" className="px-8 md:px-20 py-16 bg-white">
        <h3 className="text-3xl font-bold text-center mb-12">
          Tentang <span className="text-[#D9A978]">StockHub</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="p-6 bg-gray-100 rounded-2xl shadow hover:shadow-md transition">
            <h4 className="text-xl font-semibold text-[#D9A978]">Manajemen Stok</h4>
            <p className="text-gray-600 mt-2">
              Kelola bahan mentah, kategori, dan satuan dengan mudah.
            </p>
          </div>

          <div className="p-6 bg-gray-100 rounded-2xl shadow hover:shadow-md transition">
            <h4 className="text-xl font-semibold text-[#D9A978]">Resep Terstruktur</h4>
            <p className="text-gray-600 mt-2">
              Atur komposisi resep lengkap dengan bahan & porsinya.
            </p>
          </div>

          <div className="p-6 bg-gray-100 rounded-2xl shadow hover:shadow-md transition">
            <h4 className="text-xl font-semibold text-[#D9A978]">Laporan Real-Time</h4>
            <p className="text-gray-600 mt-2">
              Pantau aktivitas stok harian bar & kitchen secara instan.
            </p>
          </div>
        </div>
      </section>

      {/* ==== ABOUT SECTION ==== */}
      <section id="about" className="px-8 md:px-20 py-20 bg-gray-50">
        <h3 className="text-3xl font-bold text-center mb-10">
          Tentang <span className="text-[#D9A978]">Aplikasi</span>
        </h3>

        <p className="max-w-3xl mx-auto text-center text-gray-600 text-lg leading-relaxed">
          StockHub adalah sistem manajemen inventaris modern yang dirancang
          khusus untuk kebutuhan restoran Warung Cangkruk. Fokus
          pada kemudahan penggunaan, efisiensi, dan presisi data.
        </p>
      </section>

      {/* ==== SPACER AGAR FOOTER TIDAK NAIK ==== */}
      <div className="flex-grow"></div>

      {/* ==== FOOTER ==== */}
      <footer className="bg-[#D9A978] text-white py-12 mt-10">
  <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">

    {/* BRAND */}
    <div>
      <h2 className="text-2xl font-bold">StockHub</h2>
      <p className="text-sm mt-2 opacity-90">
        Solusi manajemen stok bar & dapur
      </p>
    </div>

    {/* SOCIAL MEDIA */}
    <div>
      <h3 className="font-semibold text-lg mb-3">Kontak & Sosial</h3>

      <ul className="space-y-3 text-black">
        <li>
          <a
            href="https://instagram.com/warungcangkruk"
            target="_blank"
            className="flex items-center gap-3 hover:text-white transition"
          >
            <Instagram className="w-5 h-5" />
            <span>Instagram</span>
          </a>
        </li>

        <li>
          <a
            href="https://warungcangkruk.com"
            target="_blank"
            className="flex items-center gap-3 hover:text-white transition"
          >
            <Globe className="w-5 h-5" />
            <span>Website</span>
          </a>
        </li>

        <li>
          <a
            href="https://www.facebook.com/warung.cangkringan"
            target="_blank"
            className="flex items-center gap-3 hover:text-white transition"
          >
            <MapPin className="w-5 h-5" />
            <span>Facebook</span>
          </a>
        </li>
      </ul>
    </div>

    {/* MAP SECTION */}
    <div>
      <h3 className="font-semibold text-lg mb-3">Lokasi Toko</h3>

      <div className="rounded-xl overflow-hidden shadow-lg border border-white/30">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3958.8476829632254!2d112.732!3d-7.160!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zN8KwMDknMzYuMCJTIDExMsKwNDMnNTUuMyJF!5e0!3m2!1sen!2sid!4v1700000000000"
          width="100%"
          height="160"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
        ></iframe>
      </div>
    </div>

  </div>

  {/* COPYRIGHT */}
  <p className="text-center text-sm mt-8 opacity-80">
    © {new Date().getFullYear()} StockHub. All rights reserved.
  </p>
</footer>



    </div>
  );
}


