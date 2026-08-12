"use client";

import React from "react";
import { motion } from "framer-motion";

export const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-4">
            {/* Red Ball - 6 (Lộc) */}
            <motion.div
                className="relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
                style={{ background: 'radial-gradient(circle at 30% 30%, #ff8a80, #d32f2f)' }}
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0, ease: "easeInOut" }}
            >
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-[#d32f2f] text-[14px] font-black leading-none" style={{ fontFamily: 'sans-serif' }}>6</span>
                </div>
            </motion.div>

            {/* Gold Ball - 8 (Phát) */}
            <motion.div
                className="relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
                style={{ background: 'radial-gradient(circle at 30% 30%, #ffd54f, #f57c00)' }}
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.15, ease: "easeInOut" }}
            >
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-[#f57c00] text-[14px] font-black leading-none" style={{ fontFamily: 'sans-serif' }}>8</span>
                </div>
            </motion.div>

            {/* Blue Ball - 9 (Cửu) */}
            <motion.div
                className="relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
                style={{ background: 'radial-gradient(circle at 30% 30%, #81d4fa, #0288d1)' }}
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.3, ease: "easeInOut" }}
            >
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-inner">
                    <span className="text-[#0288d1] text-[14px] font-black leading-none" style={{ fontFamily: 'sans-serif' }}>9</span>
                </div>
            </motion.div>
        </div>
        
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
        >
            <span className="text-sm font-semibold text-gray-500 tracking-[0.1em] uppercase">Đang xử lý</span>
        </motion.div>
    </div>
  );
};
