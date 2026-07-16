import React from 'react';
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

export const SpendingChart: React.FC = () => {
    const series = [
        {
            name: "Chi tiêu (VNĐ)",
            data: [4500, 4100, 5200, 5800, 6200, 5900, 6800, 6400, 7100, 6900, 7500, 7200],
        },
    ];

    const options: ApexOptions = {
        chart: {
            type: "area",
            height: 350,
            toolbar: { show: false },
            zoom: { enabled: false },
            fontFamily: "inherit",
        },
        colors: ["#FF6262"],
        dataLabels: { enabled: false },
        stroke: {
            curve: "smooth",
            width: 3,
        },
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.3,
                opacityTo: 0,
                stops: [0, 90, 100],
            },
        },
        grid: {
            borderColor: "#F1F5F9",
            strokeDashArray: 4,
            xaxis: { lines: { show: true } },
            yaxis: { lines: { show: true } },
        },
        xaxis: {
            categories: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
                style: {
                    colors: "#94A3B8",
                    fontSize: "12px",
                    fontWeight: 600,
                },
            },
        },
        yaxis: {
            labels: {
                formatter: (val) => `${val}k`,
                style: {
                    colors: "#94A3B8",
                    fontSize: "12px",
                    fontWeight: 600,
                },
            },
        },
        tooltip: {
            theme: "light",
            x: { show: true },
            y: {
                formatter: (val) => `${val.toLocaleString()} VNĐ`,
            },
            marker: { show: false },
        },
        markers: {
            size: 5,
            colors: ["#FFFFFF"],
            strokeColors: "#FF6262",
            strokeWidth: 3,
            hover: {
                size: 7,
            },
        },
    };

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-[#102937]">Biểu đồ chi tiêu</h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">Xu hướng chi tiêu trong 12 tháng qua</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF6262]"></div>
                    <span className="text-xs font-bold text-[#102937]">Chi tiêu</span>
                </div>
            </div>
            <div className="h-[350px]">
                <Chart options={options} series={series} type="area" height="100%" />
            </div>
        </div>
    );
};
