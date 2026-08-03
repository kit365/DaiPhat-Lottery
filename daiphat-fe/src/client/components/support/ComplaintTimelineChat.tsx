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
}

const MAX_CONTENT_LENGTH = 2000;

export const ComplaintTimelineChat: React.FC<ComplaintTimelineChatProps> = ({ ticketId, status }) => {
    const [content, setContent] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isComposingRef = useRef(false);

    const { data, isLoading, isError } = useGetTicketComments(ticketId);
    const sendMutation = useSendTicketComment();
    const feedbackMutation = useSubmitResolutionFeedback();
    const { data: autoCloseHoursConfig } = usePublicSystemConfig('SUPPORT_TICKET_AUTO_CLOSE_HOURS');
    const autoCloseHours = autoCloseHoursConfig?.configValue || '48';

    const comments: SupportTicketCommentResponse[] = sortCommentsByCreatedAt(data?.data ?? []);
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
        <div className="bg-white rounded-[20px] border border-[#E5E8EB] shadow-[0_2px_12px_rgb(0,0,0,0.03)] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 p-6 lg:px-8 border-b border-[#F4F6F8]">
                <div className="w-10 h-10 rounded-full bg-[#F4F6F8] text-[#637381] flex items-center justify-center text-lg shrink-0">
                    <i className="fa-solid fa-comments"></i>
                </div>
                <div>
                    <h3 className="text-[18px] font-bold text-[#212B36]">Trao đổi</h3>
                    <p className="text-[13px] text-[#637381] mt-0.5">Lịch sử trao đổi với nhân viên hỗ trợ</p>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 min-h-[280px] max-h-[480px] overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 relative"
            >
                <div className="absolute left-8 sm:left-10 lg:left-12 top-6 bottom-6 w-[2px] bg-[#E5E8EB] z-0 rounded-full"></div>
                {isLoading && (
                    <div className="flex-1 flex items-center justify-center text-[14px] text-[#637381]">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải trao đổi...
                    </div>
                )}

                {isError && (
                    <div className="flex-1 flex items-center justify-center text-[14px] text-[#ee1314]">
                        Không thể tải lịch sử trao đổi
                    </div>
                )}

                {!isLoading && !isError && comments.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-[14px] text-[#919EAB] italic">
                        Chưa có trao đổi
                    </div>
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

            <div className="border-t border-[#F4F6F8] p-4 sm:p-6 lg:px-8 lg:pb-6 bg-[#FAFBFC]">
                {isResolved ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center bg-white border border-[#E5E8EB] rounded-2xl shadow-sm px-4 sm:px-6 mb-2">
                        <div className="w-12 h-12 rounded-full bg-[#E4F8ED] text-[#1CD162] flex items-center justify-center text-2xl mb-1">
                            <i className="fa-solid fa-clipboard-check"></i>
                        </div>
                        <h4 className="text-[16px] font-bold text-[#212B36]">
                            Bạn có hài lòng với phương án giải quyết của chúng tôi không?
                        </h4>
                        <p className="text-[13px] text-[#637381] max-w-md mb-2">
                            Nếu chọn <strong className="text-[#00A76F]">Có</strong>, yêu cầu sẽ được hoàn tất. Nếu chọn <strong className="text-[#ee1314]">Không</strong>, yêu cầu sẽ được mở lại để nhân viên tiếp tục hỗ trợ bạn.
                        </p>
                        <div className="flex items-center gap-3 flex-wrap justify-center w-full mb-3">
                            <button
                                type="button"
                                disabled={feedbackMutation.isPending}
                                onClick={() => handleSatisfaction(true)}
                                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#00A76F] text-white font-bold text-[14px] hover:bg-[#007867] shadow-sm hover:shadow-none transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-thumbs-up"></i> Có, tôi hài lòng
                            </button>
                            <button
                                type="button"
                                disabled={feedbackMutation.isPending}
                                onClick={() => handleSatisfaction(false)}
                                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#FFF4F4] text-[#ee1314] font-bold text-[14px] hover:bg-[#FFE4E4] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-rotate-left"></i> Không, mở lại yêu cầu
                            </button>
                        </div>
                        <p className="text-[12px] text-[#919EAB] italic">
                            * Lưu ý: Nếu không có phản hồi, khiếu nại sẽ tự động đóng sau <strong className="font-semibold text-[#637381]">{autoCloseHours} giờ</strong>.
                        </p>
                    </div>
                ) : isRejected ? (
                    <p className="text-[13px] text-[#919EAB] text-center italic py-2">
                        Yêu cầu đã bị từ chối. Vui lòng xem lý do trong lịch sử trao đổi phía trên.
                    </p>
                ) : isClosed || isTerminal ? (
                    <p className="text-[13px] text-[#919EAB] text-center italic py-2">
                        Yêu cầu đã đóng. Không thể gửi thêm tin nhắn.
                    </p>
                ) : !canSend ? (
                    <p className="text-[13px] text-[#637381] text-center py-2">
                        <i className="fa-solid fa-clock mr-2 text-[#919EAB]"></i>
                        Vui lòng chờ phản hồi từ nhân viên
                    </p>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col relative border border-[#E5E8EB] bg-white rounded-[20px] overflow-hidden focus-within:border-[#ee1314]/40 focus-within:shadow-[0_0_0_4px_rgba(238,19,20,0.05)] transition-all">
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
                                rows={2}
                                placeholder="Nhập nội dung trao đổi... (Enter để gửi, Shift+Enter xuống dòng)"
                                className="w-full px-4 pt-4 pb-14 text-[14px] text-[#212B36] placeholder:text-[#919EAB] focus:outline-none resize-none bg-transparent"
                            />

                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                                <div className="flex items-center gap-2 pl-2">
                                    <span className="text-[12px] font-medium text-[#919EAB]">
                                        {content.length}/{MAX_CONTENT_LENGTH}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={sendMutation.isPending || !content.trim()}
                                    className="px-4 py-2 rounded-xl bg-[#ee1314] text-white flex items-center gap-2 hover:bg-[#c80f11] font-bold text-[13px] transition-all disabled:opacity-50 disabled:bg-[#F4F6F8] disabled:text-[#919EAB] cursor-pointer"
                                >
                                    {sendMutation.isPending ? (
                                        <i className="fa-solid fa-spinner fa-spin text-[14px]"></i>
                                    ) : (
                                        <>
                                            <span>Gửi</span>
                                            <i className="fa-solid fa-paper-plane text-[13px]"></i>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <ImageUploadPreview
                            value={attachmentFile}
                            onChange={setAttachmentFile}
                            label="Đính kèm thêm hình ảnh (nếu cần)"
                            helperText=""
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
