import React, { useEffect, useRef, useState } from 'react';
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

interface StaffTimelineChatProps {
    ticketId: number;
    status: TicketStatus;
}

const MAX_CONTENT_LENGTH = 2000;

export const StaffTimelineChat: React.FC<StaffTimelineChatProps> = ({ ticketId, status }) => {
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
            { ticketId, data: { content: trimmed }, file: attachmentFile },
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
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-[16px] font-bold text-gray-900">Trao đổi với khách hàng</h3>
            </div>

            <div
                ref={scrollRef}
                className="min-h-[280px] max-h-[480px] overflow-y-auto px-4 py-4 flex flex-col gap-3"
            >
                {isLoading && (
                    <p className="text-center text-sm text-gray-500 py-8">Đang tải trao đổi...</p>
                )}
                {isError && (
                    <p className="text-center text-sm text-red-500 py-8">Không thể tải lịch sử trao đổi</p>
                )}
                {!isLoading && !isError && comments.length === 0 && (
                    <p className="text-center text-sm text-gray-400 italic py-8">Chưa có trao đổi</p>
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

            <div className="border-t border-gray-100 p-4 bg-gray-50">
                {isTerminal ? (
                    <p className="text-sm text-gray-500 text-center italic">
                        Yêu cầu đã kết thúc. Không thể gửi thêm tin nhắn.
                    </p>
                ) : status === TicketStatus.OPEN ? (
                    <p className="text-sm text-gray-600 text-center">
                        Vui lòng tiếp nhận ticket trước khi trả lời khách hàng
                    </p>
                ) : !canSend ? (
                    <p className="text-sm text-gray-600 text-center">
                        Vui lòng chờ phản hồi từ khách hàng
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                            rows={3}
                            placeholder="Nhập nội dung trả lời..."
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400"
                        />
                        <ImageUploadPreview
                            value={attachmentFile}
                            onChange={setAttachmentFile}
                            label="Hình ảnh đính kèm (tuỳ chọn)"
                        />
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={sendMutation.isPending || !content.trim()}
                            className="self-end px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                        >
                            {sendMutation.isPending ? 'Đang gửi...' : 'Gửi tin nhắn'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
