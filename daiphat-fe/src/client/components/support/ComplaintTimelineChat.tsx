import React, { useEffect, useRef, useState } from 'react';
import {
    canCustomerSendComment,
    SupportTicketCommentResponse,
    TicketCommentSenderRole,
    TicketStatus,
} from '../../../types/support.type';
import { useGetTicketComments, useSendTicketComment } from '../../hooks/useSupportTicket';
import { ImageUploadPreview } from './ImageUploadPreview';
import { ComplaintCommentBubble } from './ComplaintCommentBubble';
import { ComplaintSystemNotice } from './ComplaintSystemNotice';
import { AppToast } from '../../utils/toast.util';

interface ComplaintTimelineChatProps {
    ticketId: number;
    status: TicketStatus;
}

const MAX_CONTENT_LENGTH = 2000;

export const ComplaintTimelineChat: React.FC<ComplaintTimelineChatProps> = ({ ticketId, status }) => {
    const [content, setContent] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data, isLoading, isError } = useGetTicketComments(ticketId);
    const sendMutation = useSendTicketComment();

    const comments: SupportTicketCommentResponse[] = data?.data ?? [];
    const isTerminal = status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED;
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
                className="flex-1 min-h-[280px] max-h-[480px] overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-4"
            >
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
                {isTerminal ? (
                    <p className="text-[13px] text-[#919EAB] text-center italic py-2">
                        Yêu cầu đã {status === TicketStatus.CLOSED ? 'đóng' : 'giải quyết'}. Không thể gửi thêm tin
                        nhắn.
                    </p>
                ) : !canSend ? (
                    <p className="text-[13px] text-[#637381] text-center py-2">
                        <i className="fa-solid fa-clock mr-2 text-[#919EAB]"></i>
                        Vui lòng chờ phản hồi từ nhân viên
                    </p>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-[#454F5B]">Nội dung tin nhắn</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                                rows={3}
                                placeholder="Nhập nội dung trao đổi..."
                                className="w-full rounded-xl border border-[#E5E8EB] bg-white px-4 py-3 text-[14px] text-[#212B36] placeholder:text-[#919EAB] focus:outline-none focus:border-[#ee1314]/50 resize-none"
                            />
                            <span className="text-[11px] text-[#919EAB] text-right">
                                {content.length}/{MAX_CONTENT_LENGTH}
                            </span>
                        </div>

                        <ImageUploadPreview
                            value={attachmentFile}
                            onChange={setAttachmentFile}
                            label="Hình ảnh đính kèm (tuỳ chọn)"
                            helperText="Hỗ trợ các định dạng hình ảnh (JPG, PNG, ...)"
                        />

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={sendMutation.isPending || !content.trim()}
                            className="self-end px-6 py-3 rounded-xl bg-[#ee1314] text-white font-bold text-[14px] hover:bg-[#c80f11] transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {sendMutation.isPending ? (
                                <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                                <>
                                    <i className="fa-solid fa-paper-plane mr-2"></i> Gửi tin nhắn
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
