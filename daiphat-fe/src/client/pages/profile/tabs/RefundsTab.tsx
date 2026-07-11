import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useGetMyRefunds, useGetRefundStatuses } from '../../../hooks/useRefund';
import { RefundRequestStatus, RefundType } from '../../../../types/refund.type';
import { RefundStatusBadge } from '../../../components/refund/RefundStatusBadge';
import { ProfileTablePagination } from '../components/ProfileTablePagination';

const REFUND_TYPE_LABELS: Record<RefundType, string> = {
    [RefundType.FULL_ORDER]: 'Hoàn cả đơn',
    [RefundType.ORDER_DETAIL]: 'Hoàn từng vé'
};

export const RefundsTab = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<RefundRequestStatus | 'ALL'>('ALL');
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: statusesData } = useGetRefundStatuses();
    const { data: refundData, isLoading } = useGetMyRefunds({
        page,
        limit: 10,
        status: activeTab === 'ALL' ? undefined : activeTab,
        search: searchTerm || undefined
    });

    useEffect(() => {
        setPage(1);
    }, [activeTab, searchTerm]);

    const statusCounts = refundData?.data?.statusCounts || {};
    const statusOptions = statusesData?.data || [];

    const refundTabs: { value: RefundRequestStatus | 'ALL'; label: string; count?: number }[] = [
        { value: 'ALL', label: 'Tất cả', count: statusCounts.all },
        ...statusOptions.map((s) => ({
            value: s.value as RefundRequestStatus,
            label: s.label,
            count: statusCounts[s.value]
        }))
    ];

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row gap-4 w-full">
                <div className="relative flex-1">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[#919EAB] text-[14px]"></i>
                    <input
                        type="text"
                        placeholder="Tìm theo lý do hoàn tiền..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] text-[#212B36] font-medium outline-none focus:border-[#ee1314] transition-colors shadow-[0_2px_8px_rgb(0,0,0,0.02)]"
                    />
                </div>
            </div>

            <div className="bg-white border border-[#E5E8EB] rounded-[20px] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
                <div className="flex items-center gap-6 overflow-x-auto w-full scrollbar-hide px-6 pt-2 border-b border-[#E5E8EB]">
                    {refundTabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`py-3.5 text-[14px] font-bold whitespace-nowrap transition-all cursor-pointer border-b-2 flex items-center gap-2 ${
                                activeTab === tab.value
                                    ? 'text-[#ee1314] border-[#ee1314]'
                                    : 'text-[#637381] border-transparent hover:text-[#212B36]'
                            }`}
                        >
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="text-[11px] bg-[#F4F6F8] px-1.5 py-0.5 rounded-md">{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-[#F9FAFB] border-b border-[#E5E8EB]">
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381]">Mã yêu cầu</th>
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381]">Loại hoàn</th>
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381]">Đơn hàng</th>
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381]">Số tiền</th>
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381]">Trạng thái</th>
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381]">Ngày tạo</th>
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-[14px] text-[#637381]">
                                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : refundData?.data?.recordList?.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-14 h-14 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-xl">
                                                <i className="fa-solid fa-rotate-left"></i>
                                            </div>
                                            <p className="text-[14px] text-[#637381]">Chưa có yêu cầu hoàn tiền nào</p>
                                            <Link
                                                to="/profile/orders"
                                                className="text-[#ee1314] font-bold text-[14px] hover:underline"
                                            >
                                                Xem đơn hàng
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                refundData?.data?.recordList?.map((refund) => (
                                    <tr
                                        key={refund.id}
                                        className="border-b border-[#F4F6F8] hover:bg-[#FAFBFC] transition-colors cursor-pointer"
                                        onClick={() => navigate(`/profile/refunds/${refund.id}`)}
                                    >
                                        <td className="py-4 px-5 align-top">
                                            <span className="text-[14px] font-medium text-[#212B36]">#{refund.id}</span>
                                        </td>
                                        <td className="py-4 px-5 align-top">
                                            <span className="text-[13px] text-[#637381] bg-[#F4F6F8] px-2 py-1 rounded-md font-medium">
                                                {REFUND_TYPE_LABELS[refund.refundType] || refund.refundType}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 align-top">
                                            <Link
                                                to={`/profile/orders/${refund.orderId}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-[14px] text-[#2065D1] hover:underline font-medium"
                                            >
                                                {refund.orderId.slice(0, 8).toUpperCase()}...
                                            </Link>
                                        </td>
                                        <td className="py-4 px-5 align-top">
                                            <span className="text-[14px] font-bold text-[#212B36]">
                                                {refund.refundAmount.toLocaleString('vi-VN')}đ
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 align-top">
                                            <RefundStatusBadge status={refund.status} />
                                        </td>
                                        <td className="py-4 px-5 align-top">
                                            <span className="text-[14px] text-[#454F5B]">
                                                {format(new Date(refund.createdAt), 'dd/MM/yyyy HH:mm')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 text-right align-top">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/profile/refunds/${refund.id}`);
                                                }}
                                                className="w-8 h-8 rounded-lg border border-[#E5E8EB] flex items-center justify-center text-[#919EAB] hover:text-[#2065D1] hover:border-[#2065D1] hover:bg-[#F0F5FF] transition-all cursor-pointer"
                                                title="Xem chi tiết"
                                            >
                                                <i className="fa-regular fa-eye text-[13px]"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <ProfileTablePagination
                    page={page}
                    pageSize={10}
                    pagination={refundData?.data?.pagination}
                    onPageChange={setPage}
                />
            </div>
        </div>
    );
};
