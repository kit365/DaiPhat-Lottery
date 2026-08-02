import { useEffect, useRef, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
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
import { usePermissions } from '../../../../hooks/usePermission';
import { PERMISSIONS } from '../../../../constants/permission.constants';

interface StaffComplaintTimelineProps {
    ticketId: number;
    status: TicketStatus;
}

const MAX_CONTENT_LENGTH = 2000;

const RESOLVE_REASON_QUICK_REPLIES = [
    'Đối soát xong — đã xác nhận chuyển khoản thành công.',
    'Đã chuyển khoản lại theo STK khách cung cấp.',
    'Đã điều chỉnh thông tin yêu cầu và hoàn tất xử lý.',
    'Khách đã xác nhận nhận được tiền / đồng ý kết thúc khiếu nại.',
] as const;

const REJECT_REASON_QUICK_REPLIES = [
    'Thông tin cung cấp chưa đủ điều kiện để tiếp tục xử lý khiếu nại.',
    'Yêu cầu không thuộc phạm vi hỗ trợ của hệ thống / đại lý.',
    'Không xác minh được giao dịch hoặc đối tượng liên quan theo nội dung khiếu nại.',
    'Khiếu nại trùng lặp hoặc đã được xử lý trước đó.',
] as const;

type DecisionAction = StaffTicketResponseAction.RESOLVE | StaffTicketResponseAction.REJECT;

export const StaffComplaintTimeline = ({ ticketId, status }: StaffComplaintTimelineProps) => {
    const [content, setContent] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [decisionAction, setDecisionAction] = useState<DecisionAction | null>(null);
    const [decisionReason, setDecisionReason] = useState('');
    const [selectedQuickReplyIndex, setSelectedQuickReplyIndex] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isComposingRef = useRef(false);

    const { data, isLoading, isError } = useGetStaffTicketComments(ticketId);
    const respondMutation = useRespondSupportTicket();

    const comments: SupportTicketCommentResponse[] = sortCommentsByCreatedAt(data?.data ?? []);
    const { can } = usePermissions();
    const isTerminal = isTerminalTicketStatus(status);
    const hasProcessPermission = can(PERMISSIONS.SUPPORT_TICKET.PROCESS);
    const canSend = canOperatorSendComment(status, comments) && hasProcessPermission;
    const canDecide =
        hasProcessPermission
        && (status === TicketStatus.IN_PROGRESS || status === TicketStatus.WAITING_FOR_CUSTOMER);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments.length, isLoading]);

    const submitNormalReply = () => {
        const trimmed = content.trim();
        if (!trimmed || !canSend || respondMutation.isPending) return;

        respondMutation.mutate(
            {
                ticketId,
                data: { content: trimmed, action: StaffTicketResponseAction.NORMAL },
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

    const openDecisionDialog = (action: DecisionAction) => {
        setDecisionAction(action);
        setDecisionReason('');
        setSelectedQuickReplyIndex(null);
    };

    const closeDecisionDialog = () => {
        if (respondMutation.isPending) return;
        setDecisionAction(null);
        setDecisionReason('');
        setSelectedQuickReplyIndex(null);
    };

    const applyQuickReply = (reply: string, index: number) => {
        setDecisionReason(reply.slice(0, MAX_CONTENT_LENGTH));
        setSelectedQuickReplyIndex(index);
    };

    const submitDecision = () => {
        if (!decisionAction) return;
        const trimmed = decisionReason.trim();
        if (!trimmed || respondMutation.isPending) return;

        respondMutation.mutate(
            {
                ticketId,
                data: { content: trimmed, action: decisionAction },
            },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        setDecisionAction(null);
                        setDecisionReason('');
                        setSelectedQuickReplyIndex(null);
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
        submitNormalReply();
    };

    const isResolveDialog = decisionAction === StaffTicketResponseAction.RESOLVE;
    const quickReplies = isResolveDialog ? RESOLVE_REASON_QUICK_REPLIES : REJECT_REASON_QUICK_REPLIES;

    return (
        <div className="bg-white rounded-[var(--shape-borderRadius-lg)] border border-[var(--palette-divider)] shadow-[var(--customShadows-card)] flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 p-6 border-b border-[var(--palette-divider)]">
                <div className="w-10 h-10 rounded-full bg-[#F0F5FF] text-[#2065D1] flex items-center justify-center text-lg shrink-0">
                    <i className="fa-solid fa-comments"></i>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-[18px] font-bold text-[#212B36]">Trao đổi & lịch sử xử lý</h3>
                    <p className="text-[13px] text-[#637381] mt-0.5">
                        Trao đổi với khách hàng và các sự kiện hệ thống
                    </p>
                </div>
                {canDecide && (
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            disabled={respondMutation.isPending}
                            onClick={() => openDecisionDialog(StaffTicketResponseAction.REJECT)}
                            startIcon={<i className="fa-solid fa-times-circle text-[13px]" />}
                            sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '10px' }}
                        >
                            Từ chối
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            size="small"
                            disabled={respondMutation.isPending}
                            onClick={() => openDecisionDialog(StaffTicketResponseAction.RESOLVE)}
                            startIcon={<i className="fa-solid fa-check-circle text-[13px]" />}
                            sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '10px' }}
                        >
                            Đã giải quyết
                        </Button>
                    </div>
                )}
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
                ) : (
                    <div className="flex flex-col gap-4">
                        {!canSend && (
                            <p className="text-[13px] text-[#637381]">
                                <i className="fa-solid fa-clock mr-2 text-[#919EAB]" />
                                Đang chờ khách phản hồi — vẫn có thể bấm <strong>Đã giải quyết</strong> hoặc{' '}
                                <strong>Từ chối</strong> phía trên.
                            </p>
                        )}
                        {canSend && (
                            <>
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
                                        onClick={submitNormalReply}
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
                            </>
                        )}
                    </div>
                )}
            </div>

            <Dialog
                open={decisionAction != null}
                onClose={closeDecisionDialog}
                fullWidth
                maxWidth="sm"
                PaperProps={{ sx: { borderRadius: '16px' } }}
            >
                <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
                    {isResolveDialog ? 'Đã giải quyết khiếu nại' : 'Từ chối khiếu nại'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {isResolveDialog
                            ? 'Lưu lý do nội bộ vào hệ thống rồi đóng khiếu nại. Chỉ dùng khi khách đã đồng ý — không gửi tin nhắn cho khách.'
                            : 'Nhập lý do từ chối. Thao tác này đóng khiếu nại và không thể hoàn tác từ phía khách.'}
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}
                    >
                        Gợi ý lý do (nội bộ)
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {quickReplies.map((reply, index) => {
                            const selected = selectedQuickReplyIndex === index;
                            return (
                                <Chip
                                    key={reply}
                                    label={reply}
                                    clickable
                                    color={selected ? (isResolveDialog ? 'success' : 'error') : 'default'}
                                    variant={selected ? 'filled' : 'outlined'}
                                    onClick={() => applyQuickReply(reply, index)}
                                    sx={{
                                        maxWidth: '100%',
                                        height: 'auto',
                                        py: 0.75,
                                        '& .MuiChip-label': {
                                            whiteSpace: 'normal',
                                            textAlign: 'left',
                                            lineHeight: 1.35,
                                            fontWeight: selected ? 700 : 500,
                                        },
                                    }}
                                />
                            );
                        })}
                    </Box>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={4}
                        label={isResolveDialog ? 'Lý do giải quyết (nội bộ)' : 'Lý do từ chối'}
                        value={decisionReason}
                        onChange={(e) => {
                            const nextValue = e.target.value.slice(0, MAX_CONTENT_LENGTH);
                            setDecisionReason(nextValue);
                            if (
                                selectedQuickReplyIndex != null
                                && nextValue !== quickReplies[selectedQuickReplyIndex]
                            ) {
                                setSelectedQuickReplyIndex(null);
                            }
                        }}
                        placeholder={
                            isResolveDialog
                                ? 'VD: Đối soát xong, đã chuyển khoản lại theo STK khách...'
                                : 'VD: Thông tin không đủ điều kiện xử lý...'
                        }
                        helperText={`${decisionReason.length}/${MAX_CONTENT_LENGTH}`}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={closeDecisionDialog} sx={{ fontWeight: 700 }}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        color={isResolveDialog ? 'success' : 'error'}
                        disabled={!decisionReason.trim() || respondMutation.isPending}
                        onClick={submitDecision}
                        sx={{ fontWeight: 800 }}
                    >
                        {respondMutation.isPending
                            ? 'Đang xử lý...'
                            : isResolveDialog
                              ? 'Xác nhận đã giải quyết'
                              : 'Xác nhận từ chối'}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};
