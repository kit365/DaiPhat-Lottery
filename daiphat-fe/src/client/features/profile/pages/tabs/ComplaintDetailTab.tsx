"use client";

import { useRouter } from "next/navigation";
import { useRouteParams } from "@/hooks/useRouteParams";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ComplaintFormModal } from '../../../../components/support/ComplaintFormModal';
import { ComplaintStatusBadge } from '../../../../components/support/ComplaintStatusBadge';
import { ComplaintStatusStepper } from '../../../../components/support/ComplaintStatusStepper';
import { ComplaintTimelineChat } from '../../../../components/support/ComplaintTimelineChat';
import {
    useCloseComplaint,
    useGetComplaintDetail,
    useGetTicketCategories,
} from '../../../../hooks/useSupportTicket';
import { TicketRefType, TicketStatus, TICKET_REF_TYPE_LABELS, canCustomerCancelTicket, findReasonComment } from '../../../../../types/support.type';
import { AppToast } from '../../../../../utils/toast.util';
import { UnavailableReferenceState, UNAVAILABLE_REFERENCE_MESSAGE } from '../../../../components/notification/UnavailableReferenceState';

const Field = ({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) => (
    <div className="grid grid-cols-1 sm:grid-cols-[8.5rem_minmax(0,1fr)] gap-1 sm:gap-4 py-3.5 border-b border-[#F4F6F8]">
        <dt className="text-[13px] text-[#637381] pt-0.5">{label}</dt>
        <dd className="text-[14px] text-[#212B36] font-medium min-w-0">{children}</dd>
    </div>
);

export const ComplaintDetailTab = () => {
    const { id } = useRouteParams();
    const router = useRouter();
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

    const reasonText = useMemo(() => {
        if (!ticket) return '';
        const reason =
            findReasonComment(ticket.comments || [], ticket.resolvedReasonId) ||
            findReasonComment(ticket.comments || [], ticket.rejectedReasonId);
        return reason?.content || ticket.response || '';
    }, [ticket]);

    const handleCancel = async () => {
        const confirmed = await AppToast.confirm(
            'Bạn có chắc muốn huỷ khiếu nại này? Hành động này không thể hoàn tác.',
            'Huỷ khiếu nại'
        );
        if (confirmed) {
            closeMutation.mutate(ticketId);
        }
    };

    if (isLoading) {
        return (
            <div className="py-16 text-center text-[14px] text-[#637381]">
                Đang tải chi tiết…
            </div>
        );
    }

    if (isError || !ticket) {
        return (
            <UnavailableReferenceState
                title="Thông báo không còn hiệu lực"
                message={data?.message || UNAVAILABLE_REFERENCE_MESSAGE}
                primaryTo="/profile/notifications"
                primaryLabel="Về danh sách thông báo"
                secondaryTo="/profile/complaints"
                secondaryLabel="Xem khiếu nại / hỗ trợ"
            />
        );
    }

    const canEdit = ticket.status === TicketStatus.OPEN;
    const canCancel = canCustomerCancelTicket(ticket.status);
    const isReadOnly = !canEdit;

    const relatedLink = (() => {
        if (!ticket.refId || !ticket.refType) return null;
        if (ticket.refType === TicketRefType.ORDER) {
            return {
                href: `/profile/orders/${ticket.refId}`,
                label: ticket.refId.slice(0, 8).toUpperCase(),
            };
        }
        if (ticket.refType === TicketRefType.REFUND_REQUEST) {
            return {
                href: `/profile/refunds/${ticket.refId}`,
                label: `#${ticket.refId}`,
            };
        }
        return null;
    })();

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0">
                    <button
                        type="button"
                        onClick={() => router.push('/profile/complaints')}
                        className="text-[13px] text-[#637381] hover:text-[#212B36] font-medium mb-3 cursor-pointer bg-transparent border-0 p-0"
                    >
                        Quay lại danh sách
                    </button>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h1 className="client-heading m-0">{ticket.title}</h1>
                        <ComplaintStatusBadge status={ticket.status} />
                    </div>
                    <p className="text-[13px] text-[#637381] mt-1.5 tabular-nums">
                        Khiếu nại #{ticket.id} · Tạo {format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm')}
                        {ticket.dueAt && (
                            <> · Hạn {format(new Date(ticket.dueAt), 'dd/MM/yyyy HH:mm')}</>
                        )}
                    </p>
                    <div className="mt-3">
                        <ComplaintStatusStepper status={ticket.status} />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() => setShowEditModal(true)}
                            className="h-9 px-4 rounded-xl border border-[#E5E8EB] bg-white text-[#212B36] font-semibold text-[13px] hover:bg-[#F9FAFB] cursor-pointer"
                        >
                            Chỉnh sửa
                        </button>
                    )}
                    {canCancel && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={closeMutation.isPending}
                            className="h-9 px-4 rounded-xl border border-[#ee1314]/30 bg-white text-[#ee1314] font-semibold text-[13px] hover:bg-[#FFF4F4] cursor-pointer disabled:opacity-50"
                        >
                            {closeMutation.isPending ? 'Đang huỷ…' : 'Huỷ khiếu nại'}
                        </button>
                    )}
                </div>
            </div>

            {(ticket.status === TicketStatus.RESOLVED ||
                ticket.status === TicketStatus.CLOSED ||
                ticket.status === TicketStatus.REJECTED) && (
                <div
                    className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                        ticket.status === TicketStatus.REJECTED
                            ? 'bg-[#FFF4F4] text-[#454F5B]'
                            : ticket.status === TicketStatus.RESOLVED
                              ? 'bg-[#F3FAF6] text-[#454F5B]'
                              : 'bg-[#F4F6F8] text-[#637381]'
                    }`}
                >
                    {ticket.status === TicketStatus.RESOLVED && (
                        <>
                            Đã giải quyết
                            {ticket.resolvedAt
                                ? ` · ${format(new Date(ticket.resolvedAt), 'dd/MM/yyyy HH:mm')}`
                                : ''}
                            . Xác nhận trong phần trao đổi bên phải.
                        </>
                    )}
                    {ticket.status === TicketStatus.CLOSED && (
                        <>
                            Khiếu nại đã đóng
                            {ticket.resolvedAt
                                ? ` · ${format(new Date(ticket.resolvedAt), 'dd/MM/yyyy HH:mm')}`
                                : ''}
                            .
                        </>
                    )}
                    {ticket.status === TicketStatus.REJECTED && (
                        <>
                            <span className="font-semibold text-[#212B36]">Đã từ chối</span>
                            {ticket.resolvedAt
                                ? ` · ${format(new Date(ticket.resolvedAt), 'dd/MM/yyyy HH:mm')}`
                                : ''}
                            {reasonText ? `. ${reasonText}` : '.'}
                        </>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                <section className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)]">
                    <h2 className="text-[15px] font-bold text-[#212B36] mb-1">Thông tin khiếu nại</h2>
                    <dl>
                        <Field label="Danh mục">{categoryName}</Field>
                        <Field label="Mô tả">
                            <p className="font-normal leading-relaxed whitespace-pre-wrap text-[#454F5B]">
                                {ticket.description}
                            </p>
                        </Field>
                        {ticket.refId && ticket.refType && (
                            <Field label={TICKET_REF_TYPE_LABELS[ticket.refType]}>
                                {relatedLink ? (
                                    <Link
                                        href={relatedLink.href}
                                        className="text-[#ee1314] font-semibold hover:underline"
                                    >
                                        {relatedLink.label}
                                    </Link>
                                ) : ticket.refType === TicketRefType.PRIZE_CLAIM ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (typeof window !== 'undefined') {
                                                window.sessionStorage.setItem(
                                                    `prizePayoutBack:${ticket.refId}`,
                                                    String(ticket.id)
                                                );
                                            }
                                            router.push(
                                                `/profile/prize-payouts/${ticket.refId}?fromComplaintId=${ticket.id}`
                                            );
                                        }}
                                        className="text-[#ee1314] font-semibold hover:underline cursor-pointer bg-transparent border-0 p-0"
                                    >
                                        #{ticket.refId}
                                    </button>
                                ) : (
                                    <span className="tabular-nums">{ticket.refId}</span>
                                )}
                            </Field>
                        )}
                        <Field label="Tệp đính kèm">
                            {ticket.attachmentUrl ? (
                                <a
                                    href={ticket.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2.5 text-[#212B36] font-semibold hover:underline"
                                >
                                    <img
                                        src={ticket.attachmentUrl}
                                        alt=""
                                        className="w-12 h-12 rounded-lg object-cover border border-[#E5E8EB] bg-[#F9FAFB]"
                                    />
                                    Xem tệp
                                </a>
                            ) : (
                                <span className="font-normal text-[#919EAB]">Không có</span>
                            )}
                        </Field>
                    </dl>
                    {isReadOnly && ticket.status !== TicketStatus.CLOSED && (
                        <p className="text-[12px] text-[#919EAB] mt-4">
                            Không thể chỉnh sửa thông tin ở trạng thái hiện tại.
                        </p>
                    )}
                </section>

                <ComplaintTimelineChat
                    ticketId={ticket.id}
                    status={ticket.status}
                    hideCommentIds={
                        ticket.resolvedReasonId != null ? [ticket.resolvedReasonId] : undefined
                    }
                    className="lg:min-h-[560px]"
                />
            </div>

            <p className="text-[12px] text-[#919EAB] tabular-nums">
                Cập nhật {format(new Date(ticket.updatedAt), 'dd/MM/yyyy HH:mm')}
            </p>

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
