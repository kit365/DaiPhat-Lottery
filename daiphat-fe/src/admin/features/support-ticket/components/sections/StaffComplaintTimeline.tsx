import { useEffect, useRef, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import {
    canOperatorSendComment,
    isTerminalTicketStatus,
    sortCommentsByCreatedAt,
    StaffTicketResponseAction,
    SupportTicketCommentResponse,
    TicketCommentSenderRole,
    TicketStatus,
} from '../../../../../types/support.type';
import { ComplaintCommentBubble } from '../../../../../client/components/support/ComplaintCommentBubble';
import { ComplaintSystemNotice } from '../../../../../client/components/support/ComplaintSystemNotice';
import { ImageUploadPreview } from '../../../../../client/components/support/ImageUploadPreview';
import {
    useGetStaffTicketComments,
    useRespondSupportTicket,
} from '../../hooks/useSupportTicket';

interface StaffComplaintTimelineProps {
    ticketId: number;
    status: TicketStatus;
}

const MAX_CONTENT_LENGTH = 2000;

const ACTION_LABELS: Record<StaffTicketResponseAction, string> = {
    [StaffTicketResponseAction.NORMAL]: 'Trả lời thông thường',
    [StaffTicketResponseAction.RESOLVE]: 'Giải quyết yêu cầu',
    [StaffTicketResponseAction.REJECT]: 'Từ chối yêu cầu',
};

export const StaffComplaintTimeline = ({ ticketId, status }: StaffComplaintTimelineProps) => {
    const [content, setContent] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<StaffTicketResponseAction>(
        StaffTicketResponseAction.NORMAL
    );
    const scrollRef = useRef<HTMLDivElement>(null);
    const isComposingRef = useRef(false);

    const { data, isLoading, isError } = useGetStaffTicketComments(ticketId);
    const respondMutation = useRespondSupportTicket();

    const comments: SupportTicketCommentResponse[] = sortCommentsByCreatedAt(data?.data ?? []);
    const isTerminal = isTerminalTicketStatus(status);
    const canSend = canOperatorSendComment(status, comments);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments.length, isLoading]);

    const openActionChooser = () => {
        const trimmed = content.trim();
        if (!trimmed) return;
        setSelectedAction(StaffTicketResponseAction.NORMAL);
        setActionDialogOpen(true);
    };

    const handleActionContinue = () => {
        setActionDialogOpen(false);
        if (selectedAction === StaffTicketResponseAction.NORMAL) {
            submitResponse(StaffTicketResponseAction.NORMAL);
            return;
        }
        setConfirmDialogOpen(true);
    };

    const submitResponse = (action: StaffTicketResponseAction) => {
        const trimmed = content.trim();
        if (!trimmed) return;

        respondMutation.mutate(
            {
                ticketId,
                data: { content: trimmed, action },
                file: attachmentFile,
            },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        setContent('');
                        setAttachmentFile(null);
                        setConfirmDialogOpen(false);
                        setActionDialogOpen(false);
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
        if (!respondMutation.isPending && content.trim() && canSend) {
            openActionChooser();
        }
    };

    const confirmMessage =
        selectedAction === StaffTicketResponseAction.RESOLVE
            ? 'Tin nhắn này sẽ được lưu làm lý do giải quyết và ticket chuyển sang trạng thái Đã giải quyết. Khách hàng sẽ được hỏi xác nhận hài lòng.'
            : 'Tin nhắn này sẽ được lưu làm lý do từ chối và ticket chuyển sang trạng thái Đã từ chối. Thao tác này không thể hoàn tác từ phía khách hàng.';

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
                        Yêu cầu đã{' '}
                        {status === TicketStatus.CLOSED
                            ? 'đóng'
                            : status === TicketStatus.REJECTED
                              ? 'từ chối'
                              : 'giải quyết'}
                        . Không thể gửi thêm tin nhắn.
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
                            onKeyDown={handleKeyDown}
                            onCompositionStart={() => {
                                isComposingRef.current = true;
                            }}
                            onCompositionEnd={() => {
                                isComposingRef.current = false;
                            }}
                            rows={3}
                            placeholder="Nhập nội dung phản hồi cho khách hàng... (Enter để gửi, Shift+Enter xuống dòng)"
                            className="w-full px-4 py-3 text-[14px] text-[#212B36] placeholder:text-[#919EAB] focus:outline-none resize-none bg-white border border-[#E5E8EB] rounded-xl"
                        />
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <span className="text-[12px] font-medium text-[#919EAB]">
                                {content.length}/{MAX_CONTENT_LENGTH}
                            </span>
                            <button
                                type="button"
                                onClick={openActionChooser}
                                disabled={respondMutation.isPending || !content.trim()}
                                className="px-4 py-2 rounded-xl bg-[#2065D1] text-white flex items-center gap-2 hover:bg-[#184ea8] font-bold text-[13px] transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {respondMutation.isPending ? (
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

            <Dialog 
                open={actionDialogOpen} 
                onClose={() => setActionDialogOpen(false)} 
                fullWidth 
                maxWidth="sm"
                PaperProps={{
                    sx: { borderRadius: '16px' }
                }}
            >
                <div className="p-6">
                    <div className="mb-6">
                        <h2 className="text-[20px] font-bold text-[#212B36]">Chọn loại phản hồi</h2>
                        <p className="text-[14px] text-[#637381] mt-1">
                            Tin nhắn của bạn sẽ được gửi cho khách hàng. Vui lòng chọn hành động tương ứng để tiếp tục.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div 
                            onClick={() => setSelectedAction(StaffTicketResponseAction.NORMAL)}
                            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                selectedAction === StaffTicketResponseAction.NORMAL
                                    ? 'border-[#2065D1] bg-[#F0F5FF]'
                                    : 'border-[#E5E8EB] hover:border-[#2065D1]/40'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                selectedAction === StaffTicketResponseAction.NORMAL
                                    ? 'bg-[#2065D1] text-white'
                                    : 'bg-[#F4F6F8] text-[#919EAB]'
                            }`}>
                                <i className="fa-solid fa-comment-dots text-lg"></i>
                            </div>
                            <div>
                                <h4 className={`text-[15px] font-bold ${selectedAction === StaffTicketResponseAction.NORMAL ? 'text-[#2065D1]' : 'text-[#212B36]'}`}>
                                    {ACTION_LABELS[StaffTicketResponseAction.NORMAL]}
                                </h4>
                                <p className="text-[13px] text-[#637381] mt-0.5">
                                    Gửi phản hồi thông thường, yêu cầu thêm thông tin và tiếp tục trao đổi với khách hàng.
                                </p>
                            </div>
                        </div>

                        <div 
                            onClick={() => setSelectedAction(StaffTicketResponseAction.RESOLVE)}
                            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                selectedAction === StaffTicketResponseAction.RESOLVE
                                    ? 'border-[#1CD162] bg-[#E4F8ED]'
                                    : 'border-[#E5E8EB] hover:border-[#1CD162]/40'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                selectedAction === StaffTicketResponseAction.RESOLVE
                                    ? 'bg-[#1CD162] text-white'
                                    : 'bg-[#F4F6F8] text-[#919EAB]'
                            }`}>
                                <i className="fa-solid fa-check-circle text-lg"></i>
                            </div>
                            <div>
                                <h4 className={`text-[15px] font-bold ${selectedAction === StaffTicketResponseAction.RESOLVE ? 'text-[#1CD162]' : 'text-[#212B36]'}`}>
                                    {ACTION_LABELS[StaffTicketResponseAction.RESOLVE]}
                                </h4>
                                <p className="text-[13px] text-[#637381] mt-0.5">
                                    Đánh dấu đã giải quyết xong yêu cầu của khách hàng. Trạng thái khiếu nại sẽ là hoàn thành.
                                </p>
                            </div>
                        </div>

                        <div 
                            onClick={() => setSelectedAction(StaffTicketResponseAction.REJECT)}
                            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                selectedAction === StaffTicketResponseAction.REJECT
                                    ? 'border-[#ee1314] bg-[#FFF4F4]'
                                    : 'border-[#E5E8EB] hover:border-[#ee1314]/40'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                selectedAction === StaffTicketResponseAction.REJECT
                                    ? 'bg-[#ee1314] text-white'
                                    : 'bg-[#F4F6F8] text-[#919EAB]'
                            }`}>
                                <i className="fa-solid fa-times-circle text-lg"></i>
                            </div>
                            <div>
                                <h4 className={`text-[15px] font-bold ${selectedAction === StaffTicketResponseAction.REJECT ? 'text-[#ee1314]' : 'text-[#212B36]'}`}>
                                    {ACTION_LABELS[StaffTicketResponseAction.REJECT]}
                                </h4>
                                <p className="text-[13px] text-[#637381] mt-0.5">
                                    Từ chối yêu cầu và đóng vĩnh viễn. Không thể hoàn tác thao tác này.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button 
                            onClick={() => setActionDialogOpen(false)}
                            className="px-5 py-2.5 rounded-xl font-bold text-[14px] text-[#637381] hover:bg-[#F4F6F8] transition-colors"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            onClick={handleActionContinue}
                            className="px-5 py-2.5 rounded-xl font-bold text-[14px] text-white bg-[#2065D1] hover:bg-[#184ea8] transition-colors shadow-[0_8px_16px_rgba(32,101,209,0.24)] hover:shadow-none"
                        >
                            Tiếp tục
                        </button>
                    </div>
                </div>
            </Dialog>

            <Dialog 
                open={confirmDialogOpen} 
                onClose={() => setConfirmDialogOpen(false)} 
                fullWidth 
                maxWidth="sm"
                PaperProps={{
                    sx: { borderRadius: '16px' }
                }}
            >
                <div className="p-8">
                    <div className="flex flex-col items-center text-center gap-4 mb-6 mt-2">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${
                            selectedAction === StaffTicketResponseAction.REJECT
                                ? 'bg-[#FFF4F4] text-[#ee1314]'
                                : 'bg-[#E4F8ED] text-[#1CD162]'
                        }`}>
                            <i className={`fa-solid ${
                                selectedAction === StaffTicketResponseAction.REJECT 
                                    ? 'fa-triangle-exclamation' 
                                    : 'fa-check-circle'
                            }`}></i>
                        </div>
                        <div>
                            <h2 className="text-[22px] font-bold text-[#212B36] mb-2">
                                Xác nhận {ACTION_LABELS[selectedAction].toLowerCase()}
                            </h2>
                            <p className="text-[14px] text-[#637381] leading-relaxed max-w-[85%] mx-auto">
                                {confirmMessage}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-center gap-3 mt-8">
                        <button 
                            onClick={() => setConfirmDialogOpen(false)}
                            className="px-6 py-2.5 rounded-xl font-bold text-[14px] text-[#637381] bg-[#F4F6F8] hover:bg-[#DFE3E8] transition-colors"
                        >
                            Trở lại
                        </button>
                        <button 
                            onClick={() => submitResponse(selectedAction)}
                            disabled={respondMutation.isPending}
                            className={`px-6 py-2.5 rounded-xl font-bold text-[14px] text-white flex items-center gap-2 transition-colors shadow-sm hover:shadow-none disabled:opacity-50 ${
                                selectedAction === StaffTicketResponseAction.REJECT
                                    ? 'bg-[#ee1314] hover:bg-[#c80f11] shadow-[0_8px_16px_rgba(238,19,20,0.24)]'
                                    : 'bg-[#1CD162] hover:bg-[#15a34a] shadow-[0_8px_16px_rgba(28,209,98,0.24)]'
                            }`}
                        >
                            {respondMutation.isPending ? (
                                <i className="fa-solid fa-spinner fa-spin text-[14px]" />
                            ) : (
                                <span>Tiến hành xác nhận</span>
                            )}
                        </button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
};
