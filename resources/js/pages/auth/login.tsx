import React from 'react';
import { useForm, Head } from '@inertiajs/react';
import AuthLayout from '@/layouts/auth-layout';

const logoPath = '/images/stockhub-logo.png'; // atau .png

export default function LoginPage() {
  // --- INI SUDAH DIPERBAIKI ---
  const { data, setData, post, processing, errors } = useForm({
    username: '', // Ganti dari 'name'
    password: '',
    remember: false,
  });
  // --- BATAS PERBAIKAN ---

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    post(route('login'));
  };

  return (
    <AuthLayout>
      <Head title="Login" />

      <div className="flex justify-center mb-6">
        <img src={logoPath} alt="StockHub Logo" className="w-[70px] h-[70px]" />
      </div>

      <h2 className="text-center text-2xl font-semibold text-gray-800 mb-6">
        Login
      </h2>

      <form onSubmit={submit}>
        {/* --- INI SUDAH DIPERBAIKI --- */}
        <div className="mb-4">
          <input
            type="text"
            value={data.username} // Ganti dari data.name
            onChange={(e) => setData('username', e.target.value)} // Ganti ke 'username'
            placeholder="Username" // Ganti dari 'Name'
            className="w-full px-4 py-3 border border-gray-300 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          {/* Ganti error ke 'username'. Sekarang error akan muncul jika salah */}
          {errors.username && <div className="text-red-500 text-xs mt-1 ml-2">{errors.username}</div>}
        </div>
        {/* --- BATAS PERBAIKAN --- */}

        <div className="mb-6 relative">
          <input
            type="password"
            value={data.password}
            onChange={(e) => setData('password', e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 border border-gray-300 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          {errors.password && <div className="text-red-500 text-xs mt-1 ml-2">{errors.password}</div>}
        </div>

        <button
          type="submit"
          className="w-full bg-[#d2b48c] text-gray-800 font-semibold py-3 rounded-full hover:bg-[#c1a37c] transition-colors duration-200 disabled:opacity-50"
          disabled={processing}
        >
          {processing ? 'Loading...' : 'Login'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-gray-500 font-medium">
          stockHub
        </p>
      </div>
    </AuthLayout>
  );
}
