import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ComplaintStatusBadge } from '../../../../components/support/ComplaintStatusBadge';
import { ComplaintFormModal } from '../../../../components/support/ComplaintFormModal';
import { useGetMyTickets, useGetTicketCategories } from '../../../../hooks/useSupportTicket';
import { TicketStatus, TICKET_STATUS_LABELS } from '../../../../../types/support.type';

const STATUS_TABS: { value: TicketStatus | 'ALL'; label: string }[] = [
    { value: 'ALL', label: 'Tất cả' },
    { value: TicketStatus.OPEN, label: TICKET_STATUS_LABELS[TicketStatus.OPEN] },
    { value: TicketStatus.IN_PROGRESS, label: TICKET_STATUS_LABELS[TicketStatus.IN_PROGRESS] },
    { value: TicketStatus.WAITING_FOR_CUSTOMER, label: TICKET_STATUS_LABELS[TicketStatus.WAITING_FOR_CUSTOMER] },
    { value: TicketStatus.RESOLVED, label: TICKET_STATUS_LABELS[TicketStatus.RESOLVED] },
    { value: TicketStatus.CLOSED, label: TICKET_STATUS_LABELS[TicketStatus.CLOSED] },
];

export const ComplaintsTab = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TicketStatus | 'ALL'>('ALL');
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: categoriesData } = useGetTicketCategories();
    const { data: ticketsData, isLoading } = useGetMyTickets({
        page,
        limit: 10,
        status: activeTab === 'ALL' ? undefined : activeTab,
        search: searchTerm || undefined,
    });

    const categoryMap = useMemo(() => {
        const map = new Map<number, string>();
        (categoriesData?.data || []).forEach((c) => map.set(c.id, c.name));
        return map;
    }, [categoriesData]);

    useEffect(() => {
        setPage(1);
    }, [activeTab, searchTerm]);

    const tickets = ticketsData?.data?.recordList || [];
    const pagination = ticketsData?.data?.pagination;

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row gap-4 w-full items-stretch lg:items-center">
                <div className="relative flex-1">
                    <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[#919EAB] text-[14px]"></i>
                    <input
                        type="text"
                        placeholder="Tìm theo tiêu đề hoặc mô tả..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] text-[#212B36] font-medium outline-none focus:border-[#ee1314] transition-colors shadow-[0_2px_8px_rgb(0,0,0,0.02)]"
                    />
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-5 py-3 rounded-xl bg-[#ee1314] text-white font-bold text-[14px] hover:bg-[#c80f11] transition-colors cursor-pointer whitespace-nowrap shadow-sm"
                >
                    <i className="fa-solid fa-plus mr-2"></i> Tạo khiếu nại
                </button>
            </div>

            <div className="bg-white border border-[#E5E8EB] rounded-[20px] shadow-[0_2px_12px_rgb(0,0,0,0.03)] overflow-hidden">
                <div className="flex items-center gap-4 overflow-x-auto w-full scrollbar-hide px-6 pt-2 border-b border-[#E5E8EB]">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`py-3.5 text-[14px] font-bold whitespace-nowrap transition-all cursor-pointer border-b-2 ${
                                activeTab === tab.value
                                    ? 'text-[#ee1314] border-[#ee1314]'
                                    : 'text-[#637381] border-transparent hover:text-[#212B36]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-[#F9FAFB] border-b border-[#E5E8EB]">
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] align-middle">Mã</th>
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] align-middle">Danh mục</th>
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] align-middle">Tiêu đề</th>
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] align-middle">Trạng thái</th>
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] align-middle whitespace-nowrap">Hạn xử lý</th>
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] align-middle whitespace-nowrap">Ngày tạo</th>
                                <th className="py-4 px-5 text-[13px] font-semibold text-[#637381] align-middle w-[100px] min-w-[100px] text-center">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-[14px] text-[#637381]">
                                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : tickets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-14 h-14 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-xl">
                                                <i className="fa-solid fa-headset"></i>
                                            </div>
                                            <p className="text-[14px] text-[#637381]">Chưa có khiếu nại nào</p>
                                            <button
                                                onClick={() => setShowCreateModal(true)}
                                                className="text-[#ee1314] font-bold text-[14px] hover:underline cursor-pointer"
                                            >
                                                Tạo khiếu nại đầu tiên
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                tickets.map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        className="border-b border-[#F4F6F8] hover:bg-[#FAFBFC] transition-colors cursor-pointer"
                                        onClick={() => navigate(`/profile/complaints/${ticket.id}`)}
                                    >
                                        <td className="py-4 px-5 align-middle">
                                            <span className="text-[14px] font-medium text-[#212B36]">#{ticket.id}</span>
                                        </td>
                                        <td className="py-4 px-5 align-middle">
                                            <span className="text-[13px] text-[#637381] bg-[#F4F6F8] px-2 py-1 rounded-md font-medium inline-block">
                                                {categoryMap.get(ticket.ticketCategoryId) || '—'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 align-middle max-w-[240px]">
                                            <span className="text-[14px] font-medium text-[#212B36] line-clamp-2">
                                                {ticket.title}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 align-middle">
                                            <ComplaintStatusBadge status={ticket.status} />
                                        </td>
                                        <td className="py-4 px-5 align-middle whitespace-nowrap">
                                            <span className="text-[14px] text-[#454F5B]">
                                                {ticket.dueAt
                                                    ? format(new Date(ticket.dueAt), 'dd/MM/yyyy HH:mm')
                                                    : '—'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 align-middle whitespace-nowrap">
                                            <span className="text-[14px] text-[#454F5B]">
                                                {format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 align-middle w-[100px] min-w-[100px]">
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/profile/complaints/${ticket.id}`);
                                                    }}
                                                    className="w-8 h-8 shrink-0 rounded-lg border border-[#E5E8EB] inline-flex items-center justify-center text-[#919EAB] hover:text-[#2065D1] hover:border-[#2065D1] hover:bg-[#F0F5FF] transition-all cursor-pointer"
                                                    title="Xem chi tiết"
                                                    aria-label="Xem chi tiết"
                                                >
                                                    <i className="fa-regular fa-eye text-[13px]"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between p-5 border-t border-[#E5E8EB]">
                        <div className="text-[14px] text-[#637381]">
                            Hiển thị {(page - 1) * 10 + 1} đến{' '}
                            {Math.min(page * 10, pagination.totalRecords)} trong tổng số{' '}
                            {pagination.totalRecords}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={pagination.isFirst}
                                className={`w-8 h-8 rounded border border-[#E5E8EB] flex items-center justify-center transition-colors ${
                                    pagination.isFirst
                                        ? 'text-[#C4CDD5] cursor-not-allowed bg-[#F9FAFB]'
                                        : 'text-[#919EAB] hover:bg-[#F4F6F8] cursor-pointer'
                                }`}
                            >
                                <i className="fa-solid fa-chevron-left text-[12px]"></i>
                            </button>
                            <button className="w-8 h-8 rounded bg-[#ee1314] flex items-center justify-center text-white font-medium text-[13px] cursor-pointer">
                                {page}
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                disabled={pagination.isLast}
                                className={`w-8 h-8 rounded border border-[#E5E8EB] flex items-center justify-center transition-colors ${
                                    pagination.isLast
                                        ? 'text-[#C4CDD5] cursor-not-allowed bg-[#F9FAFB]'
                                        : 'text-[#919EAB] hover:bg-[#F4F6F8] cursor-pointer'
                                }`}
                            >
                                <i className="fa-solid fa-chevron-right text-[12px]"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ComplaintFormModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
        </div>
    );
};
