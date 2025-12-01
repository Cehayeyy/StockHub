import React, { useState, useEffect } from 'react';
import { useForm, Head } from '@inertiajs/react';
import AuthLayout from '@/layouts/auth-layout';
import SplashScreen from '@/components/SplashScreen';

const logoPath = '/images/stockhub-logo.png';

export default function LoginPage() {
  // State untuk kontrol splash screen
  const [isLoading, setIsLoading] = useState(true);

  // GANTI: dari "username" menjadi "name"
  const { data, setData, post, processing, errors } = useForm({
    name: '',        // <- ini yang dikirim ke backend
    password: '',
    remember: false,
  });

  // Efek untuk menghilangkan splash screen setelah 2.5 detik
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    post(route('login'));
  };

  // Kalau masih loading, tampilkan splash
  if (isLoading) {
    return <SplashScreen />;
  }

  // Kalau sudah selesai loading, tampilkan halaman login
  return (
    <AuthLayout>
      <Head title="Login" />

      <div className="flex justify-center mb-6 animate-in fade-in zoom-in duration-500">
        <img src={logoPath} alt="StockHub Logo" className="w-[70px] h-[70px]" />
      </div>

      <h2 className="text-center text-2xl font-semibold text-gray-800 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
        Login
      </h2>

      <form
        onSubmit={submit}
        className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200"
      >
        {/* INPUT NAMA (BUKAN USERNAME) */}
        <div className="mb-4">
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData('name', e.target.value)}
            placeholder="Nama"
            className="w-full px-4 py-3 border border-gray-300 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#DABA93] transition-all"
          />
          {errors.name && (
            <div className="text-red-500 text-xs mt-1 ml-2">
              {errors.name}
            </div>
          )}
        </div>

        {/* INPUT PASSWORD */}
        <div className="mb-6 relative">
          <input
            type="password"
            value={data.password}
            onChange={(e) => setData('password', e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 border border-gray-300 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#DABA93] transition-all"
          />
          {errors.password && (
            <div className="text-red-500 text-xs mt-1 ml-2">
              {errors.password}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-[#d2b48c] text-gray-800 font-semibold py-3 rounded-full hover:bg-[#c1a37c] transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
          disabled={processing}
        >
          {processing ? 'Loading...' : 'Login'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200 text-center animate-in fade-in duration-1000 delay-300">
        <p className="text-gray-500 font-medium">stockHub</p>
      </div>
    </AuthLayout>
  );
}
