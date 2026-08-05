"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception for debugging
    console.error('Unhandled App Router Error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center font-client-main">
      <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 max-w-[540px] w-full flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#ee1314] flex items-center justify-center mb-6 text-2xl shadow-inner">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#102937] mb-3 tracking-tight">
          Đã có lỗi xảy ra!
        </h2>

        <p className="text-slate-500 text-sm sm:text-base mb-8 max-w-[380px] leading-relaxed">
          Rất tiếc, ứng dụng gặp sự cố ngoài ý muốn. Vui lòng nhấn nút bên dưới để tải lại trang.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#ee1314] hover:bg-[#c80f11] text-white font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-red-500/20 active:scale-95 text-sm"
          >
            <i className="fa-solid fa-rotate-right mr-2"></i> Thử lại
          </button>
          
          <Link
            href="/"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer active:scale-95 text-sm"
          >
            <i className="fa-solid fa-house mr-2"></i> Trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
