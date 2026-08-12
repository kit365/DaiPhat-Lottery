"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useGetMyPrizePayouts, useGetPrizePayoutStatuses } from '../../../../hooks/usePrizePayout';
import { PrizePayoutRequestStatus } from '../../../../../types/prize-payout.type';
import { PrizePayoutStatusBadge } from '../../../../components/prize-payout/PrizePayoutStatusBadge';
import { ProfileTablePagination } from '../components/ProfileTablePagination';
import { formatPrizePayoutCurrency } from '../../../../../types/prize-payout.type';
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
        ...statusOptions.map((s) => ({
            value: s.value as PrizePayoutRequestStatus,
            label: s.label,
            count: statusCounts[s.value],
        })),
    ];

    return (
        <div className="flex flex-col gap-5">
            <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[#919EAB]"></i>
                <input
                    type="text"
                    placeholder="Tìm theo mã yêu cầu..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314]"
                />
            </div>

            <div className="bg-white border border-[#E5E8EB] rounded-[20px] overflow-hidden shadow-sm">
                <div className="flex gap-4 overflow-x-auto px-6 pt-2 border-b border-[#E5E8EB]">
                    {tabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`py-3.5 text-[14px] font-bold whitespace-nowrap border-b-2 cursor-pointer ${
                                activeTab === tab.value
                                    ? 'text-[#ee1314] border-[#ee1314]'
                                    : 'text-[#637381] border-transparent'
                            }`}
                        >
                            {tab.label}
                            {tab.count != null && tab.count > 0 && (
                                <span className="ml-2 text-[11px] bg-[#F4F6F8] px-1.5 py-0.5 rounded-md">{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[920px]">
                        <thead>
                            <tr className="bg-[#F9FAFB] border-b border-[#E5E8EB] text-[13px] text-[#637381]">
                                <th className="py-4 px-5 text-left font-semibold">Mã yêu cầu</th>
                                <th className="py-4 px-5 text-left font-semibold">Đài / Ngày</th>
                                <th className="py-4 px-5 text-left font-semibold">Số tiền</th>
                                <th className="py-4 px-5 text-left font-semibold">Trạng thái</th>
                                <th className="py-4 px-5 text-left font-semibold">Ghi chú</th>
                                <th className="py-4 px-5 text-left font-semibold">Ngày tạo</th>
                                <th className="py-4 px-5 text-right font-semibold">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-[#637381]">
                                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>Đang tải...
                                    </td>
                                </tr>
                            ) : !data?.data?.recordList?.length ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-[#637381] text-[14px]">
                                        <div className="flex flex-col items-center gap-3">
                                            <p className="m-0 font-medium text-[#637381]">Chưa có yêu cầu trả thưởng</p>
                                            <p className="m-0 text-[13px] text-[#919EAB]">
                                                Bạn cần vào mục <span className="font-semibold text-[#454F5B]">Vé của tôi</span>, chọn 1 vé trúng để gửi yêu cầu.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => router.push('/profile/tickets')}
                                                className="px-4 py-2 rounded-lg bg-[#ee1314] text-white text-[13px] font-semibold hover:bg-[#d70f10] transition-colors cursor-pointer"
                                            >
                                                Đi tới Vé của tôi
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                data.data.recordList.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-[#F4F6F8] hover:bg-[#FAFBFC] cursor-pointer"
                                        onClick={() => router.push(`/profile/prize-payouts/${item.id}`)}
                                    >
                                        <td className="py-4 px-5 font-medium text-[14px]">{item.requestCode}</td>
                                        <td className="py-4 px-5 text-[14px]">
                                            <div>{item.stationName || '—'}</div>
                                            <div className="text-[#637381] text-[13px]">
                                                {item.drawDate ? dayjs(item.drawDate).format('DD/MM/YYYY') : '—'}
                                            </div>
                                        </td>
                                        <td className="py-4 px-5 font-bold text-[14px]">
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
                                        <td className="py-4 px-5 text-[14px] text-[#637381]">
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
