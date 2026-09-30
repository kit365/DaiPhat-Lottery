"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useGetMyPrizePayouts, useGetPrizePayoutStatuses } from '../../../../hooks/usePrizePayout';
import { PrizePayoutRequestStatus, PRIZE_PAYOUT_STATUS_MAP, formatPrizePayoutCurrency } from '../../../../../types/prize-payout.type';
import { PrizePayoutStatusBadge } from '../../../../components/prize-payout/PrizePayoutStatusBadge';
import { ProfileTablePagination } from '../components/ProfileTablePagination';
import { PrizePayoutComplaintButton } from '../../../../components/support/PrizePayoutComplaintButton';

export const PrizePayoutsTab = () => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<PrizePayoutRequestStatus | 'ALL'>('ALL');
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: statusesData } = useGetPrizePayoutStatuses();
    const { data, isLoading } = useGetMyPrizePayouts({
        page,
        limit: 10,
        status: activeTab === 'ALL' ? undefined : activeTab,
        search: searchTerm || undefined,
    });

    useEffect(() => {
        setPage(1);
    }, [activeTab, searchTerm]);

    const statusCounts = data?.data?.statusCounts || {};
    const statusOptions = statusesData?.data || [];

    const tabs: { value: PrizePayoutRequestStatus | 'ALL'; label: string; count?: number }[] = [
        { value: 'ALL', label: 'Tất cả' },
        ...statusOptions.map((s) => {
            const statusKey = s.value as PrizePayoutRequestStatus;
            const mappedLabel = PRIZE_PAYOUT_STATUS_MAP[statusKey]?.label || s.label;
            return {
                value: statusKey,
                label: mappedLabel,
                count: statusCounts[s.value],
            };
        }),
    ];

    return (
        <div className="flex flex-col gap-5">
            {/* Search and Header Controls */}
            <div className="bg-white border border-[#E5E8EB] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-80">
                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[#919EAB] text-[14px]"></i>
                    <input
                        type="text"
                        placeholder="Tìm theo mã yêu cầu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-9 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[14px] text-[#1E293B] placeholder:text-[#94A3B8] outline-none focus:border-[#ee1314] focus:bg-white focus:ring-2 focus:ring-[#ee1314]/10 transition-all"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#919EAB] hover:text-[#212B36] transition-colors"
                        >
                            <i className="fa-solid fa-circle-xmark text-[14px]"></i>
                        </button>
                    )}
                </div>
                <div className="text-[13px] text-[#637381] font-medium self-end sm:self-center">
                    Tổng số: <span className="font-bold text-[#212B36]">{data?.data?.pagination?.totalRecords ?? 0}</span> yêu cầu
                </div>
            </div>

            {/* Filter Tabs & Table Container */}
            <div className="bg-white border border-[#E5E8EB] rounded-2xl overflow-hidden shadow-sm">
                {/* Sleek Pill Tab Navigation */}
                <div className="px-5 pt-4 pb-3 border-b border-[#E5E8EB] bg-[#FAFCFF]">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    onClick={() => setActiveTab(tab.value)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                        isActive
                                            ? 'bg-[#ee1314] text-white shadow-md shadow-[#ee1314]/20'
                                            : 'bg-white text-[#637381] border border-[#E5E8EB] hover:bg-[#F4F6F8] hover:text-[#212B36]'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {tab.count != null && tab.count > 0 && (
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                isActive
                                                    ? 'bg-white/25 text-white'
                                                    : 'bg-[#F4F6F8] text-[#637381]'
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px]">
                        <thead>
                            <tr className="bg-[#F8FAFC] border-b border-[#E5E8EB] text-[13px] text-[#637381]">
                                <th className="py-3.5 px-5 text-left font-semibold">Mã yêu cầu</th>
                                <th className="py-3.5 px-5 text-left font-semibold">Đài / Ngày</th>
                                <th className="py-3.5 px-5 text-left font-semibold">Số tiền</th>
                                <th className="py-3.5 px-5 text-left font-semibold">Trạng thái</th>
                                <th className="py-3.5 px-5 text-left font-semibold">Ghi chú</th>
                                <th className="py-3.5 px-5 text-left font-semibold">Ngày tạo</th>
                                <th className="py-3.5 px-5 text-right font-semibold">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F4F6F8]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-[#637381]">
                                        <i className="fa-solid fa-spinner fa-spin text-xl text-[#ee1314] mb-2 block"></i>
                                        <span className="text-[14px]">Đang tải dữ liệu...</span>
                                    </td>
                                </tr>
                            ) : !data?.data?.recordList?.length ? (
                                <tr>
                                    <td colSpan={7} className="py-14 text-center text-[#637381] text-[14px]">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-14 h-14 rounded-full bg-[#F4F6F8] flex items-center justify-center text-[#919EAB] text-2xl">
                                                <i className="fa-solid fa-receipt"></i>
                                            </div>
                                            <p className="m-0 font-bold text-[#212B36] text-[15px]">
                                                {searchTerm ? 'Không tìm thấy yêu cầu phù hợp' : 'Chưa có yêu cầu trả thưởng'}
                                            </p>
                                            <p className="m-0 text-[13px] text-[#919EAB] max-w-sm">
                                                {searchTerm
                                                    ? 'Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác.'
                                                    : 'Bạn cần vào mục Vé của tôi, chọn 1 vé trúng thưởng để gửi yêu cầu đổi thưởng.'}
                                            </p>
                                            {!searchTerm && (
                                                <button
                                                    type="button"
                                                    onClick={() => router.push('/profile/tickets')}
                                                    className="mt-1 px-5 py-2.5 rounded-xl bg-[#ee1314] text-white text-[13px] font-semibold hover:bg-[#d70f10] shadow-sm shadow-[#ee1314]/20 transition-all cursor-pointer"
                                                >
                                                    Đi tới Vé của tôi
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                data.data.recordList.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-[#FAFBFC] transition-colors cursor-pointer"
                                        onClick={() => router.push(`/profile/prize-payouts/${item.id}`)}
                                    >
                                        <td className="py-4 px-5 font-semibold text-[14px] text-[#212B36]">
                                            {item.requestCode}
                                        </td>
                                        <td className="py-4 px-5 text-[14px]">
                                            <div className="font-medium text-[#212B36]">{item.stationName || '—'}</div>
                                            <div className="text-[#637381] text-[12px] mt-0.5">
                                                {item.drawDate ? dayjs(item.drawDate).format('DD/MM/YYYY') : '—'}
                                            </div>
                                        </td>
                                        <td className="py-4 px-5 font-bold text-[14px] text-[#ee1314]">
                                            {formatPrizePayoutCurrency(item.netAmount ?? item.grossAmount)}
                                        </td>
                                        <td className="py-4 px-5">
                                            <PrizePayoutStatusBadge status={item.status} />
                                        </td>
                                        <td className="py-4 px-5 text-[13px] text-[#637381] max-w-[240px]">
                                            {(item.status === PrizePayoutRequestStatus.REJECTED ||
                                                item.status === PrizePayoutRequestStatus.MANUAL_RESOLUTION) &&
                                            item.rejectReason ? (
                                                <p className="m-0 truncate text-[#ee1314]" title={item.rejectReason}>
                                                    {item.rejectReason}
                                                </p>
                                            ) : (
                                                <span>—</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-5 text-[13px] text-[#637381]">
                                            {item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
                                        </td>
                                        <td
                                            className="py-4 px-5 text-right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <PrizePayoutComplaintButton payout={item} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <ProfileTablePagination
                    page={page}
                    pagination={data?.data?.pagination}
                    onPageChange={setPage}
                />
            </div>
        </div>
    );
};
