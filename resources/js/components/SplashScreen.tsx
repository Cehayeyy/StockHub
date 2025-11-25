import React from 'react';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#FDFBF7]">
      {/* Logo */}
      <div className="mb-8 animate-bounce">
        <img
          src="/images/stockhub-logo.png"
          alt="StockHub Logo"
          className="w-24 h-24 object-contain opacity-80"
        />
      </div>

      {/* Loading Bar Container */}
      <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden relative">
        {/* Animated Loading Bar */}
        <div className="absolute top-0 left-0 h-full bg-[#D4A373] animate-loading-bar rounded-full"></div>
      </div>

      {/* CSS untuk animasi loading khusus di sini */}
      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 2s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
