"use client";

import React, { useEffect, useRef, useState } from 'react';
import {
    canCustomerSendComment,
    isTerminalTicketStatus,
    sortCommentsByCreatedAt,
    SupportTicketCommentResponse,
    TicketCommentSenderRole,
    TicketStatus,
} from '../../../types/support.type';
import {
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
    const [content, setContent] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isComposingRef = useRef(false);

    const { data, isLoading, isError } = useGetTicketComments(ticketId);
    const sendMutation = useSendTicketComment();
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

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments.length, isLoading]);

    const handleSubmit = () => {
        const trimmed = content.trim();
        if (!trimmed) {
            AppToast.error('Vui lòng nhập nội dung tin nhắn');
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
                        setContent('');
                        setAttachmentFile(null);
                    }
                },
            }
        );
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key !== 'Enter' || event.shiftKey || isComposingRef.current) {
            return;
        }
        event.preventDefault();
        if (!sendMutation.isPending && content.trim() && canSend) {
            handleSubmit();
        }
    };

    const handleSatisfaction = (satisfied: boolean) => {
        feedbackMutation.mutate({ id: ticketId, satisfied });
    };

    return (
        <section
            className={`bg-white rounded-2xl border border-[rgba(145,158,171,0.16)] shadow-[0_0_2px_rgba(145,158,171,0.2),0_12px_24px_-4px_rgba(145,158,171,0.12)] flex flex-col overflow-hidden ${className}`}
        >
            <div className="px-5 min-h-[72px] border-b border-[rgba(145,158,171,0.16)] flex flex-col justify-center shrink-0">
                <h3 className="text-[15px] font-bold text-[#1C252E] leading-snug">Trao đổi</h3>
                <p className="text-[12px] text-[#637381] mt-0.5">Với nhân viên hỗ trợ</p>
            </div>

            <div
                ref={scrollRef}
                className={`flex-1 min-h-[280px] max-h-[min(520px,55vh)] overflow-y-auto px-5 py-6 flex flex-col gap-6 ${
                    isLoading || isError || comments.length === 0 ? 'justify-center' : 'justify-end'
                }`}
            >
                {isLoading && (
                    <p className="text-center text-[13px] text-[#637381]">Đang tải trao đổi…</p>
                )}

                {isError && (
                    <p className="text-center text-[13px] text-[#ee1314]">Không thể tải lịch sử trao đổi</p>
                )}

                {!isLoading && !isError && comments.length === 0 && (
                    <p className="text-center text-[13px] text-[#919EAB]">Chưa có trao đổi</p>
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
                    <p className="text-[13px] text-[#919EAB]">
                        Yêu cầu đã bị từ chối. Không thể gửi thêm tin nhắn.
                    </p>
                ) : isClosed || isTerminal ? (
                    <p className="text-[13px] text-[#919EAB]">
                        Yêu cầu đã đóng. Không thể gửi thêm tin nhắn.
                    </p>
                ) : !canSend ? (
                    <p className="text-[13px] text-[#637381]">
                        Đang chờ phản hồi từ nhân viên.
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-end gap-2">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                                onKeyDown={handleKeyDown}
                                onCompositionStart={() => {
                                    isComposingRef.current = true;
                                }}
                                onCompositionEnd={() => {
                                    isComposingRef.current = false;
                                }}
                                rows={1}
                                placeholder="Nhập tin nhắn"
                                className="w-full max-h-28 px-0.5 py-2 text-[15px] text-[#1C252E] placeholder:text-[#919EAB] focus:outline-none resize-none bg-transparent"
                            />
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={sendMutation.isPending || !content.trim()}
                                className="h-9 shrink-0 px-4 rounded-lg bg-[#1C252E] text-white font-bold text-[13px] hover:bg-[#141A21] disabled:opacity-40 disabled:bg-[#C4CDD5] cursor-pointer"
                            >
                                {sendMutation.isPending ? '…' : 'Gửi'}
                            </button>
                        </div>
                        <ImageUploadPreview
                            value={attachmentFile}
                            onChange={setAttachmentFile}
                            label="Đính kèm hình (nếu cần)"
                            helperText=""
                        />
                    </div>
                )}
            </div>
        </section>
    );
};
