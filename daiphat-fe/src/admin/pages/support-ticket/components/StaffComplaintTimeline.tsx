import { useEffect, useRef, useState } from 'react';
import {
    canOperatorSendComment,
    sortCommentsByCreatedAt,
    SupportTicketCommentResponse,
    TicketCommentSenderRole,
    TicketStatus,
} from '../../../../types/support.type';
import { ComplaintCommentBubble } from '../../../../client/components/support/ComplaintCommentBubble';
import { ComplaintSystemNotice } from '../../../../client/components/support/ComplaintSystemNotice';
import { ImageUploadPreview } from '../../../../client/components/support/ImageUploadPreview';
import {
    useGetStaffTicketComments,
    useSendStaffTicketComment,
} from '../hooks/useSupportTicket';

interface StaffComplaintTimelineProps {
    ticketId: number;
    status: TicketStatus;
}

const MAX_CONTENT_LENGTH = 2000;

export const StaffComplaintTimeline = ({ ticketId, status }: StaffComplaintTimelineProps) => {
    const [content, setContent] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data, isLoading, isError } = useGetStaffTicketComments(ticketId);
    const sendMutation = useSendStaffTicketComment();

    const comments: SupportTicketCommentResponse[] = sortCommentsByCreatedAt(data?.data ?? []);
    const isTerminal = status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED;
    const canSend = canOperatorSendComment(status, comments);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments.length, isLoading]);

    const handleSubmit = () => {
        const trimmed = content.trim();
        if (!trimmed) return;

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
        <div className="bg-white rounded-[var(--shape-borderRadius-lg)] border border-[var(--palette-divider)] shadow-[var(--customShadows-card)] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 p-6 border-b border-[var(--palette-divider)]">
                <div className="w-10 h-10 rounded-full bg-[#F0F5FF] text-[#2065D1] flex items-center justify-center text-lg shrink-0">
                    <i className="fa-solid fa-comments"></i>
                </div>
                <div>
                    <h3 className="text-[18px] font-bold text-[#212B36]">Trao đổi & lịch sử xử lý</h3>
                    <p className="text-[13px] text-[#637381] mt-0.5">
                        Trao đổi với khách hàng và các sự kiện hệ thống
                    </p>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 min-h-[320px] max-h-[520px] overflow-y-auto px-4 sm:px-6 py-6 flex flex-col gap-6 relative"
            >
                <div className="absolute left-8 sm:left-10 top-6 bottom-6 w-[2px] bg-[#E5E8EB] z-0 rounded-full" />
                {isLoading && (
                    <div className="flex-1 flex items-center justify-center text-[14px] text-[#637381]">
                        <i className="fa-solid fa-spinner fa-spin mr-2" /> Đang tải trao đổi...
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
                            <ComplaintCommentBubble
                                key={comment.id}
                                comment={comment}
                                viewerRole="staff"
                            />
                        )
                    )}
            </div>

            <div className="border-t border-[#F4F6F8] p-4 sm:p-6 bg-[#FAFBFC]">
                {isTerminal ? (
                    <p className="text-[13px] text-[#919EAB] text-center italic py-2">
                        Yêu cầu đã {status === TicketStatus.CLOSED ? 'đóng' : 'giải quyết'}. Không thể gửi thêm tin nhắn.
                    </p>
                ) : status === TicketStatus.OPEN ? (
                    <p className="text-[13px] text-[#637381] text-center py-2">
                        Vui lòng tiếp nhận yêu cầu trước khi trao đổi với khách hàng.
                    </p>
                ) : !canSend ? (
                    <p className="text-[13px] text-[#637381] text-center py-2">
                        <i className="fa-solid fa-clock mr-2 text-[#919EAB]" />
                        Vui lòng chờ khách hàng phản hồi trước khi gửi tin nhắn tiếp theo.
                    </p>
                ) : (
                    <div className="flex flex-col gap-4">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                            rows={3}
                            placeholder="Nhập nội dung phản hồi cho khách hàng..."
                            className="w-full px-4 py-3 text-[14px] text-[#212B36] placeholder:text-[#919EAB] focus:outline-none resize-none bg-white border border-[#E5E8EB] rounded-xl"
                        />
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <span className="text-[12px] font-medium text-[#919EAB]">
                                {content.length}/{MAX_CONTENT_LENGTH}
                            </span>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={sendMutation.isPending || !content.trim()}
                                className="px-4 py-2 rounded-xl bg-[#2065D1] text-white flex items-center gap-2 hover:bg-[#184ea8] font-bold text-[13px] transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {sendMutation.isPending ? (
                                    <i className="fa-solid fa-spinner fa-spin text-[14px]" />
                                ) : (
                                    <>
                                        <span>Gửi phản hồi</span>
                                        <i className="fa-solid fa-paper-plane text-[13px]" />
                                    </>
                                )}
                            </button>
                        </div>
                        <ImageUploadPreview
                            value={attachmentFile}
                            onChange={setAttachmentFile}
                            label="Đính kèm hình ảnh (nếu cần)"
                            helperText=""
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
