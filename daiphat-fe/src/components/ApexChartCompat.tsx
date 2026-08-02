"use client";

import dynamic from 'next/dynamic';

const ApexChart = dynamic(() => import('react-apexcharts'), {
  ssr: false,
  loading: () => <div className="h-[250px] w-full animate-pulse bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">Đang tải biểu đồ...</div>,
});

export default ApexChart;
