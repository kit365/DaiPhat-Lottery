"use client";

import React from 'react';

export const FavoritesTab = () => {
    const favorites = [
        {
            id: 1,
            name: 'Số Lộc Phát',
            date: '13/03/2025 • 16:37',
            numbers: ['06', '16', '26', '36', '46', '56'],
            frequency: 'Hàng tuần',
            color: '#ee1314', // Red
            bgColor: '#FFF4F4'
        },
        {
            id: 2,
            name: 'Ngày Sinh Nhật',
            date: '10/03/2025 • 09:21',
            numbers: ['15', '08', '19', '95'],
            frequency: 'Hàng tháng',
            color: '#2065D1', // Blue
            bgColor: '#F0F5FF'
        },
        {
            id: 3,
            name: 'Thần Tài',
            date: '05/03/2025 • 14:55',
            numbers: ['39', '79', '39', '79'],
            frequency: 'Hàng tuần',
            color: '#1CD162', // Green
            bgColor: '#F4FBFA'
        },
        {
            id: 4,
            name: 'Gia Đình',
            date: '01/03/2025 • 11:10',
            numbers: ['02', '05', '07', '09', '11'],
            frequency: 'Hàng tháng',
            color: '#FFB020', // Orange
            bgColor: '#FFF9F3'
        },
        {
            id: 5,
            name: 'May Mắn',
            date: '28/02/2025 • 20:30',
            numbers: ['68', '86', '68', '86'],
            frequency: 'Hàng tuần',
            color: '#9E5FFF', // Purple
            bgColor: '#F8F5FF'
        }
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* Main Card */}
            <div className="bg-white border border-[#E5E8EB] rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
                <div className="p-6 md:p-8">
                    <h2 className="client-heading m-0 mb-6">Danh sách số yêu thích</h2>

                    {/* Summary & Actions */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                            {/* Total Box */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#FAFBFC] border border-[#F4F6F8] w-full md:w-auto min-w-[200px]">
                                <div className="w-12 h-12 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-xl shrink-0">
                                    <i className="fa-regular fa-heart"></i>
                                </div>
                                <div>
                                    <p className="text-[12px] text-[#637381] mb-0.5">Tổng số dãy số</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[18px] font-black text-[#212B36]">12</span>
                                        <span className="text-[12px] text-[#637381]">dãy số</span>
                                    </div>
                                </div>
                            </div>

                            {/* Latest Box */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-[#F0F5FF] border border-[#E1EBFF] w-full md:w-auto min-w-[220px]">
                                <div className="w-12 h-12 rounded-full bg-white text-[#2065D1] flex items-center justify-center text-xl shrink-0 shadow-sm">
                                    <i className="fa-regular fa-calendar"></i>
                                </div>
                                <div>
                                    <p className="text-[12px] text-[#2065D1] opacity-80 mb-0.5">Ngày tạo gần nhất</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[15px] font-black text-[#2065D1]">13/03/2025</span>
                                        <span className="text-[12px] text-[#2065D1] font-medium">16:37</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-[#ee1314] text-white rounded-xl text-[14px] font-bold hover:bg-[#c80f11] transition-colors shadow-sm w-full md:w-auto shrink-0">
                            <i className="fa-solid fa-plus"></i> Thêm số yêu thích
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex flex-col gap-4">
                        {favorites.map((fav) => (
                            <div key={fav.id} className="flex flex-col md:flex-row items-start md:items-center p-5 border border-[#E5E8EB] rounded-xl gap-4 md:gap-6 hover:shadow-md transition-shadow bg-white">
                                
                                {/* Icon & Name */}
                                <div className="flex items-center gap-4 min-w-[240px]">
                                    <div className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 text-[20px]" style={{ backgroundColor: fav.bgColor, color: fav.color }}>
                                        <i className="fa-regular fa-heart"></i>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-[15px] font-bold text-[#212B36]">{fav.name}</h4>
                                            <button className="text-[#919EAB] hover:text-[#212B36] transition-colors">
                                                <i className="fa-solid fa-pen text-[10px]"></i>
                                            </button>
                                        </div>
                                        <p className="text-[12px] text-[#637381]">Ngày tạo: {fav.date}</p>
                                    </div>
                                </div>

                                {/* Numbers */}
                                <div className="flex flex-col flex-1">
                                    <span className="text-[11px] text-[#637381] mb-1">Dãy số</span>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {fav.numbers.map((num, i) => (
                                            <span key={i} className="text-[15px] font-black" style={{ color: fav.color }}>
                                                {num}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Frequency */}
                                <div className="flex flex-col md:w-[120px] shrink-0">
                                    <span className="text-[11px] text-[#637381] mb-1">Tần suất chơi</span>
                                    <div 
                                        className="inline-flex items-center justify-center px-3 py-1 rounded-md text-[12px] font-bold w-max"
                                        style={{ backgroundColor: fav.bgColor, color: fav.color }}
                                    >
                                        {fav.frequency}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 md:w-[100px] justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E5E8EB] w-full md:w-auto mt-2 md:mt-0">
                                    <button className="w-9 h-9 rounded-lg border border-[#E5E8EB] flex items-center justify-center text-[#637381] hover:bg-[#F4F6F8] hover:text-[#212B36] transition-colors">
                                        <i className="fa-solid fa-pen text-[13px]"></i>
                                    </button>
                                    <button className="w-9 h-9 rounded-lg border border-[#FFE5E5] flex items-center justify-center text-[#ee1314] hover:bg-[#FFF4F4] transition-colors">
                                        <i className="fa-regular fa-trash-can text-[13px]"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Note Box */}
                    <div className="mt-6 flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-[#FFF4F4] rounded-xl gap-4">
                        <div className="flex items-start md:items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 text-[#2065D1] shadow-sm">
                                <i className="fa-solid fa-info text-[10px] font-black"></i>
                            </div>
                            <div>
                                <h4 className="text-[13px] font-bold text-[#212B36] mb-0.5">Lưu ý</h4>
                                <p className="text-[12px] text-[#637381]">Bạn có thể thêm tối đa 20 dãy số yêu thích. Các dãy số sẽ được gợi ý nhanh khi mua vé.</p>
                            </div>
                        </div>
                        <button className="text-[13px] font-bold text-[#2065D1] hover:underline whitespace-nowrap shrink-0">
                            Tìm hiểu thêm <i className="fa-solid fa-arrow-right text-[11px] ml-1"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
