"use client";

import React from "react";
import { motion } from "framer-motion";

export const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ring */}
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
           className="w-20 h-20 rounded-full border-4 border-[#FF6262]/20 border-t-[#FF6262] shadow-[0_0_15px_rgba(255,98,98,0.3)]"
        />
        
        {/* Inner pulsing orb */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-10 h-10 bg-[#FF6262] rounded-full blur-[2px]"
        />

        {/* Small rotating dot */}
        <motion.div
           animate={{ rotate: -360 }}
           transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
           className="absolute w-full h-full fle items-center justify-center"
        >
            <div className="w-2 h-2 bg-[#102937] rounded-full absolute -top-1" />
        </motion.div>
      </div>
      
      {/* Loading Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 flex flex-col items-center"
      >
        <span className="text-sm font-bold text-[#102937] tracking-[0.2em] uppercase">Đại Phát</span>
        <div className="flex gap-1 mt-2">
           {[0, 0.1, 0.2].map((delay) => (
             <motion.div
               key={delay}
               animate={{ y: [0, -4, 0] }}
               transition={{ duration: 0.6, repeat: Infinity, delay }}
               className="w-1 h-1 bg-[#FF6262] rounded-full"
             />
           ))}
        </div>
      </motion.div>
    </div>
  );
};
