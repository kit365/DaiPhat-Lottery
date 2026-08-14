"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    canCustomerConfirmTicket,
    canCustomerSendComment,
    isTerminalTicketStatus,
    sortCommentsByCreatedAt,
    SupportTicketCommentResponse,
    TicketCommentSenderRole,
    TicketStatus,
} from '../../../types/support.type';
import {
    useCloseComplaint,
    useGetTicketComments,
    useSendTicketComment,
    useSubmitResolutionFeedback,
} from '../../hooks/useSupportTicket';
import { usePublicSystemConfig } from '../../hooks/useSystemConfig';
import { ImageUploadPreview } from './ImageUploadPreview';
import { ComplaintCommentBubble } from './ComplaintCommentBubble';
import { ComplaintSystemNotice } from './ComplaintSystemNotice';
import { AppToast } from '../../../utils/toast.util';

interface ComplaintTimelineChatProps {
    ticketId: number;
    status: TicketStatus;
    hideCommentIds?: number[];
    className?: string;
}

const MAX_CONTENT_LENGTH = 2000;

export const ComplaintTimelineChat: React.FC<ComplaintTimelineChatProps> = ({
    ticketId,
    status,
    hideCommentIds = [],
    className = '',
}) => {
    const [replyOpen, setReplyOpen] = useState(false);
    const [content, setContent] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data, isLoading, isError } = useGetTicketComments(ticketId);
    const sendMutation = useSendTicketComment();
    const closeMutation = useCloseComplaint();
    const feedbackMutation = useSubmitResolutionFeedback();
    const { data: autoCloseHoursConfig } = usePublicSystemConfig('SUPPORT_TICKET_AUTO_CLOSE_HOURS');
    const autoCloseHours = autoCloseHoursConfig?.configValue || '48';

    const hiddenIds = new Set(hideCommentIds.filter((id): id is number => typeof id === 'number'));
    const comments: SupportTicketCommentResponse[] = sortCommentsByCreatedAt(data?.data ?? []).filter(
        (comment) => !hiddenIds.has(comment.id)
    );
    const isResolved = status === TicketStatus.RESOLVED;
    const isRejected = status === TicketStatus.REJECTED;
    const isClosed = status === TicketStatus.CLOSED;
    const isTerminal = isTerminalTicketStatus(status) && !isResolved;
    const canSend = canCustomerSendComment(status, comments);
    const canConfirm = canCustomerConfirmTicket(status);

    const lastCommentId = comments.at(-1)?.id;

    useLayoutEffect(() => {
        if (isLoading) return;
        const pane = scrollRef.current;
        if (!pane) return;

        const toBottom = () => {
            pane.scrollTop = pane.scrollHeight;
        };

        toBottom();
        const frame = requestAnimationFrame(toBottom);
        const ro = new ResizeObserver(toBottom);
        ro.observe(pane);
        const stop = window.setTimeout(() => ro.disconnect(), 600);

        return () => {
            cancelAnimationFrame(frame);
            window.clearTimeout(stop);
            ro.disconnect();
        };
    }, [isLoading, lastCommentId]);

    useEffect(() => {
        const pane = scrollRef.current;
        if (!pane) return;
        const images = Array.from(pane.querySelectorAll('img'));
        const onLoad = () => {
            pane.scrollTop = pane.scrollHeight;
        };
        images.forEach((img) => {
            if (!img.complete) {
                img.addEventListener('load', onLoad);
            }
        });
        return () => {
            images.forEach((img) => img.removeEventListener('load', onLoad));
        };
    }, [comments]);

    const openReplyDialog = () => {
        setContent('');
        setAttachmentFile(null);
        setReplyOpen(true);
    };

    const closeReplyDialog = () => {
        if (sendMutation.isPending) return;
        setReplyOpen(false);
        setContent('');
        setAttachmentFile(null);
    };

    const handleSubmit = () => {
        const trimmed = content.trim();
        if (!trimmed) {
            AppToast.error('Vui lòng nhập nội dung phản hồi');
            return;
        }
        if (trimmed.length > MAX_CONTENT_LENGTH) {
            AppToast.error(`Nội dung không được vượt quá ${MAX_CONTENT_LENGTH} ký tự`);
            return;
        }

        sendMutation.mutate(
            {
                ticketId,
                data: { content: trimmed },
                file: attachmentFile,
            },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        setReplyOpen(false);
                        setContent('');
                        setAttachmentFile(null);
                    }
                },
            }
        );
    };

    const handleSatisfaction = (satisfied: boolean) => {
        feedbackMutation.mutate({ id: ticketId, satisfied });
    };

    const handleConfirmClose = async () => {
        const confirmed = await AppToast.confirm(
            'Bạn đồng ý xác nhận khiếu nại đã được giải quyết? Sau khi xác nhận sẽ không thể gửi thêm tin nhắn.',
            'Xác nhận khiếu nại'
        );
        if (confirmed) {
            closeMutation.mutate({ id: ticketId, intent: 'confirm' });
        }
    };

    return (
        <section
            className={`bg-white rounded-2xl border border-[rgba(145,158,171,0.16)] shadow-[0_0_2px_rgba(145,158,171,0.2),0_12px_24px_-4px_rgba(145,158,171,0.12)] flex flex-col overflow-hidden ${className}`}
        >
            <div className="px-5 min-h-[72px] border-b border-[rgba(145,158,171,0.16)] flex items-center justify-between gap-3 shrink-0">
                <div>
                    <h3 className="text-[15px] font-bold text-[#1C252E] leading-snug">Trao đổi</h3>
                    <p className="text-[12px] text-[#637381] mt-0.5">Với nhân viên hỗ trợ</p>
                </div>
                {canConfirm && (
                    <button
                        type="button"
                        onClick={handleConfirmClose}
                        disabled={closeMutation.isPending}
                        className="h-9 px-4 rounded-xl bg-[#ee1314] text-white font-semibold text-[13px] hover:bg-[#c80f11] disabled:opacity-50 cursor-pointer shrink-0"
                    >
                        {closeMutation.isPending ? 'Đang xác nhận…' : 'Xác nhận'}
                    </button>
                )}
            </div>

            <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 flex flex-col gap-6"
            >
                {isLoading && (
                    <p className="m-auto text-center text-[13px] text-[#637381]">Đang tải trao đổi…</p>
                )}

                {isError && (
                    <p className="m-auto text-center text-[13px] text-[#ee1314]">Không thể tải lịch sử trao đổi</p>
                )}

                {!isLoading && !isError && comments.length === 0 && (
                    <p className="m-auto text-center text-[13px] text-[#919EAB]">Chưa có trao đổi</p>
                )}

                {!isLoading &&
                    !isError &&
                    comments.map((comment) =>
                        comment.senderRole === TicketCommentSenderRole.SYSTEM ? (
                            <ComplaintSystemNotice key={comment.id} comment={comment} />
                        ) : (
                            <ComplaintCommentBubble key={comment.id} comment={comment} />
                        )
                    )}
            </div>

            <div className="border-t border-[rgba(145,158,171,0.16)] px-5 py-3 bg-white shrink-0">
                {isResolved ? (
                    <div className="flex flex-col gap-3">
                        <p className="text-[14px] font-semibold text-[#212B36]">
                            Bạn hài lòng với phương án giải quyết?
                        </p>
                        <p className="text-[13px] text-[#637381] leading-relaxed">
                            Chọn Có để hoàn tất. Chọn Không để mở lại yêu cầu.
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={feedbackMutation.isPending}
                                onClick={() => handleSatisfaction(true)}
                                className="h-9 px-4 rounded-xl bg-[#ee1314] text-white font-semibold text-[13px] hover:bg-[#c80f11] disabled:opacity-50 cursor-pointer"
                            >
                                Có
                            </button>
                            <button
                                type="button"
                                disabled={feedbackMutation.isPending}
                                onClick={() => handleSatisfaction(false)}
                                className="h-9 px-4 rounded-xl border border-[#E5E8EB] bg-white text-[#454F5B] font-semibold text-[13px] hover:bg-[#F4F6F8] disabled:opacity-50 cursor-pointer"
                            >
                                Không, mở lại
                            </button>
                        </div>
                        <p className="text-[12px] text-[#919EAB]">
                            Không phản hồi, yêu cầu tự đóng sau {autoCloseHours} giờ.
                        </p>
                    </div>
                ) : isRejected ? (
                    <div className="flex items-start gap-3 px-3.5 py-3 rounded-[10px] bg-[#FFE9D5]">
                        <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-[#FF5630]" />
                        <div>
                            <p className="text-[13px] font-bold text-[#7A0916] leading-snug m-0">
                                Yêu cầu đã từ chối
                            </p>
                            <p className="text-[12px] text-[#B71D18] mt-0.5 leading-snug m-0">
                                Không thể gửi thêm tin nhắn.
                            </p>
                        </div>
                    </div>
                ) : isClosed || isTerminal ? (
                    <div className="flex items-start gap-3 px-3.5 py-3 rounded-[10px] bg-[#F4F6F8]">
                        <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-[#919EAB]" />
                        <div>
                            <p className="text-[13px] font-bold text-[#1C252E] leading-snug m-0">
                                Yêu cầu đã đóng
                            </p>
                            <p className="text-[12px] text-[#637381] mt-0.5 leading-snug m-0">
                                Không thể gửi thêm tin nhắn.
                            </p>
                        </div>
                    </div>
                ) : !canSend ? (
                    <div className="flex items-start gap-3 px-3.5 py-3 rounded-[10px] bg-[#FFF5CC]">
                        <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 bg-[#FFAB00]" />
                        <div>
                            <p className="text-[13px] font-bold text-[#7A4100] leading-snug m-0">
                                Đang chờ phản hồi từ nhân viên
                            </p>
                            <p className="text-[12px] text-[#B76E00] mt-0.5 leading-snug m-0">
                                Nhân viên đang xử lý. Bạn có thể gửi tiếp sau khi có phản hồi.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={openReplyDialog}
                            disabled={sendMutation.isPending}
                            className="h-9 px-4 rounded-xl bg-[#ee1314] text-white font-semibold text-[13px] hover:bg-[#c80f11] disabled:opacity-50 cursor-pointer"
                        >
                            Phản hồi khiếu nại
                        </button>
                    </div>
                )}
            </div>

            {replyOpen && (
                <div className="fixed inset-0 z-[9998] flex items-start justify-center p-4 pt-10 sm:pt-16 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/40" onClick={closeReplyDialog} />
                    <div className="relative bg-white rounded-[20px] shadow-2xl w-full max-w-lg max-h-[calc(100dvh-48px)] flex flex-col overflow-hidden mb-8">
                        <div className="flex items-center justify-between p-5 border-b border-[#E5E8EB]">
                            <h2 className="text-[18px] font-bold text-[#212B36]">Phản hồi khiếu nại</h2>
                            <button
                                type="button"
                                onClick={closeReplyDialog}
                                className="w-8 h-8 rounded-lg hover:bg-[#F4F6F8] flex items-center justify-center text-[#637381] cursor-pointer"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                        <div className="p-5 flex flex-col gap-4 overflow-y-auto min-h-0">
                            <p className="text-[13px] text-[#637381] leading-relaxed">
                                Sau khi gửi, vui lòng chờ nhân viên phản hồi trước khi gửi tiếp.
                            </p>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[13px] font-bold text-[#454F5B]">Nội dung phản hồi *</label>
                                <textarea
                                    autoFocus
                                    value={content}
                                    onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                                    placeholder="Mô tả thêm thông tin bạn muốn gửi cho nhân viên..."
                                    className="w-full min-h-[140px] px-4 py-3 bg-white border border-[#E5E8EB] rounded-xl text-[14px] outline-none focus:border-[#ee1314] resize-none"
                                />
                                <span className="text-[11px] text-[#919EAB] text-right">
                                    {content.length}/{MAX_CONTENT_LENGTH}
                                </span>
                            </div>
                            <ImageUploadPreview
                                value={attachmentFile}
                                onChange={setAttachmentFile}
                                label="Đính kèm hình (nếu cần)"
                                helperText=""
                            />
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#E5E8EB]">
                            <button
                                type="button"
                                onClick={closeReplyDialog}
                                className="h-9 px-4 rounded-xl border border-[#E5E8EB] bg-white text-[#454F5B] font-semibold text-[13px] hover:bg-[#F4F6F8] cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={sendMutation.isPending || !content.trim()}
                                className="h-9 px-4 rounded-xl bg-[#ee1314] text-white font-semibold text-[13px] hover:bg-[#c80f11] disabled:opacity-50 cursor-pointer"
                            >
                                {sendMutation.isPending ? 'Đang gửi...' : 'Gửi phản hồi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
