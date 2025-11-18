import React, { PropsWithChildren } from 'react';
const bgPath = '/images/background-cafe.jpg'; // Pastikan path ini benar

export default function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div className="relative w-screen h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center filter blur-md scale-105"
        style={{ backgroundImage: `url(${bgPath})` }}
      />
      <div className="relative z-10 bg-white p-10 rounded-2xl shadow-xl w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
