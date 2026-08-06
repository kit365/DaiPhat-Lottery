"use client";

import { Box, Typography } from '@mui/material';
import { motion } from "framer-motion";

const LoadingScreen = () => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                minHeight: '400px',
            }}
        >
            <div className="flex items-center justify-center gap-4">
                {/* Red Ball - 6 (Lộc) */}
                <motion.div
                    className="relative w-10 h-10 rounded-full shadow-lg flex items-center justify-center"
                    style={{ background: 'radial-gradient(circle at 30% 30%, #ff8a80, #d32f2f)' }}
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0, ease: "easeInOut" }}
                >
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-inner">
                        <span className="text-[#d32f2f] text-[12px] font-black leading-none" style={{ fontFamily: 'sans-serif' }}>6</span>
                    </div>
                </motion.div>

                {/* Gold Ball - 8 (Phát) */}
                <motion.div
                    className="relative w-10 h-10 rounded-full shadow-lg flex items-center justify-center"
                    style={{ background: 'radial-gradient(circle at 30% 30%, #ffd54f, #f57c00)' }}
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.15, ease: "easeInOut" }}
                >
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-inner">
                        <span className="text-[#f57c00] text-[12px] font-black leading-none" style={{ fontFamily: 'sans-serif' }}>8</span>
                    </div>
                </motion.div>

                {/* Blue Ball - 9 (Cửu) */}
                <motion.div
                    className="relative w-10 h-10 rounded-full shadow-lg flex items-center justify-center"
                    style={{ background: 'radial-gradient(circle at 30% 30%, #81d4fa, #0288d1)' }}
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.3, ease: "easeInOut" }}
                >
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-inner">
                        <span className="text-[#0288d1] text-[12px] font-black leading-none" style={{ fontFamily: 'sans-serif' }}>9</span>
                    </div>
                </motion.div>
            </div>
            
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ marginTop: '24px' }}
            >
                <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'text.secondary', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Đang xử lý
                </Typography>
            </motion.div>
        </Box>
    );
};

export default LoadingScreen;
