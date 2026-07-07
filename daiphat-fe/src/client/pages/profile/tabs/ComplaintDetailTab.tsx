import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ComplaintFormModal } from '../../../components/support/ComplaintFormModal';
import { ComplaintStatusBadge } from '../../../components/support/ComplaintStatusBadge';
import { ComplaintStatusStepper } from '../../../components/support/ComplaintStatusStepper';
import { ComplaintTimelineChat } from '../../../components/support/ComplaintTimelineChat';
import { AttachmentUpdateSection } from '../../../components/support/AttachmentUpdateSection';
import {
    useCloseComplaint,
    useGetComplaintDetail,
    useGetTicketCategories,
} from '../../../hooks/useSupportTicket';
import { TicketRefType, TicketStatus, TICKET_REF_TYPE_LABELS } from '../../../../types/support.type';
import { AppToast } from '../../../../utils/toast.util';

export const ComplaintDetailTab = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const ticketId = Number(id);

    const [showEditModal, setShowEditModal] = useState(false);

    const { data, isLoading, isError } = useGetComplaintDetail(ticketId);
    const { data: categoriesData } = useGetTicketCategories();
    const closeMutation = useCloseComplaint();

    const ticket = data?.data;

    const categoryName = useMemo(() => {
        if (!ticket) return '';
        return (
            categoriesData?.data?.find((c) => c.id === ticket.ticketCategoryId)?.name || '—'
        );
    }, [ticket, categoriesData]);

    const handleClose = async () => {
        const confirmed = await AppToast.confirm(
            'Bạn có chắc muốn đóng yêu cầu hỗ trợ này? Hành động này không thể hoàn tác.',
            'Đóng yêu cầu hỗ trợ'
        );
        if (confirmed) {
            closeMutation.mutate(ticketId);
        }
    };

    if (isLoading) {
        return (
            <div className="py-16 text-center text-[14px] text-[#637381]">
                <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải chi tiết...
            </div>
        );
    }

    if (isError || !ticket) {
        return (
            <div className="py-16 text-center flex flex-col items-center gap-4">
                <p className="text-[14px] text-[#637381]">Không tìm thấy yêu cầu hỗ trợ</p>
                <Link to="/profile/complaints" className="text-[#ee1314] font-bold text-[14px] hover:underline">
                    Quay lại danh sách
                </Link>
            </div>
        );
    }

    const canEdit = ticket.status === TicketStatus.OPEN;
    const canClose = ticket.status === TicketStatus.OPEN;
    const isReadOnly = !canEdit;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/profile/complaints')}
                        className="text-[13px] text-[#637381] hover:text-[#ee1314] font-medium flex items-center gap-1.5 mb-2 cursor-pointer"
                    >
                        <i className="fa-solid fa-arrow-left text-[11px]"></i> Quay lại danh sách
                    </button>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-[22px] font-bold text-[#212B36]">Khiếu nại #{ticket.id}</h2>
                        <ComplaintStatusBadge status={ticket.status} />
                    </div>
                    <p className="text-[14px] text-[#637381] mt-1">
                        Tạo lúc {format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm')}
                        {ticket.dueAt && (
                            <> · Hạn xử lý: {format(new Date(ticket.dueAt), 'dd/MM/yyyy HH:mm')}</>
                        )}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    {canEdit && (
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="px-5 py-3 rounded-xl border border-[#2065D1] text-[#2065D1] font-bold text-[14px] hover:bg-[#F0F5FF] transition-colors cursor-pointer"
                        >
                            <i className="fa-solid fa-pen mr-2"></i> Chỉnh sửa
                        </button>
                    )}
                    {canClose && (
                        <button
                            onClick={handleClose}
                            disabled={closeMutation.isPending}
                            className="px-5 py-3 rounded-xl border border-[#ee1314] text-[#ee1314] font-bold text-[14px] hover:bg-[#FFF4F4] transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {closeMutation.isPending ? (
                                <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                                <>
                                    <i className="fa-solid fa-ban mr-2"></i> Đóng yêu cầu
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <ComplaintStatusStepper status={ticket.status} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-lg shrink-0">
                            <i className="fa-solid fa-file-lines"></i>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#212B36]">Thông tin khiếu nại</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 border-t border-[#F4F6F8] pt-5">
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-[#637381]">Danh mục</span>
                            <span className="text-[15px] font-semibold text-[#212B36]">{categoryName}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-[#637381]">Tiêu đề</span>
                            <span className="text-[15px] font-semibold text-[#212B36]">{ticket.title}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[13px] text-[#637381]">Mô tả</span>
                            <span className="text-[15px] font-medium text-[#212B36] leading-relaxed whitespace-pre-wrap">
                                {ticket.description}
                            </span>
                        </div>
                        {ticket.refId && ticket.refType && (
                            <div className="flex flex-col gap-1">
                                <span className="text-[13px] text-[#637381]">
                                    {TICKET_REF_TYPE_LABELS[ticket.refType]}
                                </span>
                                {ticket.refType === TicketRefType.ORDER ? (
                                    <Link
                                        to={`/profile/orders/${ticket.refId}`}
                                        className="text-[15px] font-semibold text-[#2065D1] hover:underline w-max"
                                    >
                                        Xem đơn hàng #{ticket.refId.slice(0, 8).toUpperCase()}
                                    </Link>
                                ) : (
                                    <span className="text-[15px] font-semibold text-[#212B36] font-mono">
                                        {ticket.refId}
                                    </span>
                                )}
                            </div>
                        )}
                        {isReadOnly && ticket.status !== TicketStatus.CLOSED && (
                            <p className="text-[12px] text-[#919EAB] italic">
                                Thông tin trên không thể chỉnh sửa ở trạng thái hiện tại.
                            </p>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-[20px] p-6 lg:p-8 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-lg shrink-0">
                            <i className="fa-solid fa-image"></i>
                        </div>
                        <h3 className="text-[18px] font-bold text-[#212B36]">Tệp đính kèm</h3>
                    </div>

                    {ticket.attachmentUrl ? (
                        <div className="border-t border-[#F4F6F8] pt-5">
                            <a
                                href={ticket.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-xl border border-[#E5E8EB] overflow-hidden hover:border-[#ee1314]/30 transition-colors"
                            >
                                <img
                                    src={ticket.attachmentUrl}
                                    alt="Đính kèm"
                                    className="w-full max-h-[280px] object-contain bg-[#F9FAFB]"
                                />
                            </a>
                            <a
                                href={ticket.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-[#2065D1] font-bold text-[14px] hover:underline mt-3"
                            >
                                <i className="fa-solid fa-up-right-from-square"></i> Xem ảnh gốc
                            </a>
                        </div>
                    ) : (
                        <p className="text-[14px] text-[#637381] border-t border-[#F4F6F8] pt-5">
                            Chưa có tệp đính kèm
                        </p>
                    )}
                </div>
            </div>

            {ticket.status === TicketStatus.RESOLVED && ticket.resolvedAt && (
                <div className="bg-[#E4F8ED] rounded-[20px] p-6 lg:p-8 border border-[#1CD162]/20 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1CD162] text-white flex items-center justify-center text-lg shrink-0">
                        <i className="fa-solid fa-check"></i>
                    </div>
                    <div>
                        <h3 className="text-[18px] font-bold text-[#212B36]">Đã giải quyết</h3>
                        <p className="text-[14px] text-[#637381] mt-1">
                            {format(new Date(ticket.resolvedAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                    </div>
                </div>
            )}

            {ticket.status === TicketStatus.WAITING_FOR_CUSTOMER && (
                <AttachmentUpdateSection ticket={ticket} />
            )}

            <ComplaintTimelineChat ticketId={ticket.id} status={ticket.status} />

            <div className="text-center text-[13px] text-[#919EAB]">
                Cập nhật lần cuối: {format(new Date(ticket.updatedAt), 'dd/MM/yyyy HH:mm')}
            </div>

            {canEdit && (
                <ComplaintFormModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    editingTicket={ticket}
                />
            )}
        </div>
    );
};
