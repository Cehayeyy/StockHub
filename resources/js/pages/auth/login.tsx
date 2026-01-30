import React, { useState, useEffect } from 'react';
import { useForm, Head } from '@inertiajs/react';
import AuthLayout from '@/layouts/auth-layout';
import SplashScreen from '@/components/SplashScreen';

const logoPath = '/images/stockhub-logo.png';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(true);

  const { data, setData, post, processing, errors } = useForm({
    login: '',
    password: '',
    remember: false,
  });

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

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <AuthLayout>
      <Head title="Login" />

      {/* Container utama dengan padding responsif */}
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md mx-auto px-2 md:px-0">

        {/* LOGO: Sedikit lebih kecil di mobile, normal di desktop */}
        <div className="flex justify-center mb-4 md:mb-6 animate-in fade-in zoom-in duration-500">
          <img
            src={logoPath}
            alt="StockHub Logo"
            className="w-16 h-16 md:w-[70px] md:h-[70px] transition-all"
          />
        </div>

        {/* JUDUL: Ukuran font responsif */}
        <h2 className="text-center text-xl md:text-2xl font-semibold text-gray-800 mb-4 md:mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          Login
        </h2>

        <form
          onSubmit={submit}
          className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200"
        >
          {/* INPUT LOGIN */}
          <div className="mb-3 md:mb-4">
            <input
              type="text"
              value={data.login}
              onChange={(e) => setData('login', e.target.value)}
              placeholder="Username"
              className="w-full px-4 py-2.5 md:py-3 border border-gray-300 rounded-full text-gray-700 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#DABA93] transition-all placeholder:text-gray-400"
            />
            {errors.login && (
              <div className="text-red-500 text-xs mt-1 ml-2">
                {errors.login}
              </div>
            )}
          </div>

          {/* INPUT PASSWORD */}
          <div className="mb-5 md:mb-6 relative">
            <input
              type="password"
              value={data.password}
              onChange={(e) => setData('password', e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2.5 md:py-3 border border-gray-300 rounded-full text-gray-700 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#DABA93] transition-all placeholder:text-gray-400"
            />
            {errors.password && (
              <div className="text-red-500 text-xs mt-1 ml-2">
                {errors.password}
              </div>
            )}
          </div>

          {/* BUTTON: Tinggi tombol disesuaikan */}
          <button
            type="submit"
            className="w-full bg-[#d2b48c] text-gray-800 font-semibold py-2.5 md:py-3 rounded-full hover:bg-[#c1a37c] transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98] text-sm md:text-base shadow-sm"
            disabled={processing}
          >
            {processing ? 'Loading...' : 'Login'}
          </button>
        </form>

        {/* FOOTER: Padding dan margin responsif */}
        <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-200 text-center animate-in fade-in duration-1000 delay-300">
          <p className="text-gray-500 font-medium text-sm md:text-base">stockHub</p>
        </div>
      </div>
    </AuthLayout>
  );
}
