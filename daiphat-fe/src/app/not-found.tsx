"use client";

import Link from "next/link";
import React from 'react';
import { PartnerLogos } from '@/client/components/layout/PartnerLogos';
import { CLIENT_PAGE_BACKGROUND } from '@/client/constants/clientBannerAssets';

export default function NotFound() {
    return (
        <div
            className="min-h-screen font-client-main flex flex-col bg-fixed bg-cover bg-center"
            style={{ backgroundImage: `url("${CLIENT_PAGE_BACKGROUND}")` }}
        >
            <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-8 pt-[120px] lg:pt-[160px] pb-8 lg:pb-16 flex flex-col items-center justify-center relative z-10">
                <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-[#E5E8EB] w-full max-w-[1100px] overflow-hidden">
                    <div className="flex flex-col lg:flex-row items-center p-8 lg:p-16 gap-8 lg:gap-16">

                        {/* Left Side: Content */}
                        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
                            <div className="relative mb-4">
                                <h1 className="text-[120px] lg:text-[160px] font-black text-[#ee1314] leading-none tracking-tighter" style={{ textShadow: '4px 4px 0px #FFEBEB' }}>
                                    404
                                </h1>
                                <div className="absolute top-4 -right-8 lg:-right-12 text-[#F59E0B]">
                                    <i className="fa-solid fa-sparkles text-[40px] lg:text-[50px]"></i>
                                </div>
                            </div>

                            <h2 className="text-[32px] lg:text-[40px] font-bold text-[#212B36] mb-4 leading-tight">
                                Không tìm thấy trang
                            </h2>
                            <p className="text-[16px] text-[#637381] mb-10 max-w-[400px]">
                                Trang bạn đang tìm kiếm không tồn tại.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto mb-10">
                                <Link
                                    href="/"
                                    className="w-full sm:w-auto px-8 py-4 bg-[#ee1314] text-white font-bold rounded-2xl hover:bg-[#d00f10] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#ee1314]/30"
                                >
                                    <i className="fa-solid fa-house"></i> Về trang chủ
                                </Link>
                                <Link
                                    href="/"
                                    className="w-full sm:w-auto px-8 py-4 bg-white text-[#ee1314] font-bold rounded-2xl border-2 border-[#ee1314] hover:bg-[#FFF4F4] transition-colors flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-magnifying-glass"></i> Dò kết quả
                                </Link>
                            </div>
                        </div>

                        {/* Right Side: Image */}
                        <div className="flex-1 w-full flex justify-center lg:justify-end items-center relative">
                            <img
                                src="https://i.ibb.co/WpVSbTzf/t-i-xu-ng.png"
                                alt="Ông thổ địa 404"
                                className="w-full max-w-[500px] object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
                            />
                        </div>

                    </div>
                </div>
            </main>

            <div className="max-w-[1240px] mx-auto px-6 py-10 lg:py-16 w-full">
                <PartnerLogos />
            </div>
        </div>
    );
}
