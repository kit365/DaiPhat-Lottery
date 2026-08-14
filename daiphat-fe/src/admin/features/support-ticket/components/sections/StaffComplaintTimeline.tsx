"use client";

import { useEffect, useRef, useState } from 'react';
import {
    Box,
    Button,
    Card,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    InputBase,
    Stack,
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
    formatSystemNote?: (content: string) => string;
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

export const StaffComplaintTimeline = ({
    ticketId,
    status,
    formatSystemNote,
}: StaffComplaintTimelineProps) => {
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

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key !== 'Enter' || event.shiftKey || isComposingRef.current) {
            return;
        }
        event.preventDefault();
        submitNormalReply();
    };

    const isResolveDialog = decisionAction === StaffTicketResponseAction.RESOLVE;
    const quickReplies = isResolveDialog ? RESOLVE_REASON_QUICK_REPLIES : REJECT_REASON_QUICK_REPLIES;

    return (
        <Card
            elevation={0}
            sx={{
                borderRadius: '16px',
                border: '1px solid rgba(145, 158, 171, 0.16)',
                boxShadow: '0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                width: '100%',
                height: '100%',
                minHeight: 0,
                flex: 1,
            }}
        >
            <Box
                sx={{
                    px: 2.5,
                    minHeight: 72,
                    borderBottom: '1px solid rgba(145, 158, 171, 0.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    flexWrap: 'wrap',
                    flexShrink: 0,
                }}
            >
                <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.3 }}>
                        Trao đổi
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Với khách hàng
                    </Typography>
                </Box>
                {canDecide && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Button
                            variant="outlined"
                            className="btn-outlined-admin"
                            disabled={respondMutation.isPending}
                            onClick={() => openDecisionDialog(StaffTicketResponseAction.REJECT)}
                        >
                            Từ chối
                        </Button>
                        <Button
                            variant="contained"
                            className="btn-primary-admin"
                            disabled={respondMutation.isPending}
                            onClick={() => openDecisionDialog(StaffTicketResponseAction.RESOLVE)}
                        >
                            Đã giải quyết
                        </Button>
                    </Stack>
                )}
            </Box>

            <Box
                ref={scrollRef}
                sx={{
                    flex: 1,
                    minHeight: 180,
                    overflowY: 'auto',
                    px: 3,
                    py: 1.5,
                    bgcolor: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: isLoading || isError || comments.length === 0 ? 'center' : 'flex-start',
                    gap: 2.5,
                }}
            >
                {!isLoading && !isError && comments.length > 0 ? (
                    <Box sx={{ flex: '1 1 auto', minHeight: 0 }} />
                ) : null}
                {isLoading && (
                    <Typography variant="body2" color="text.secondary" sx={{ m: 'auto' }}>
                        Đang tải trao đổi…
                    </Typography>
                )}
                {isError && (
                    <Typography variant="body2" color="error" sx={{ m: 'auto' }}>
                        Không thể tải lịch sử trao đổi
                    </Typography>
                )}
                {!isLoading && !isError && comments.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ m: 'auto' }}>
                        Chưa có trao đổi
                    </Typography>
                )}
                {!isLoading &&
                    !isError &&
                    comments.map((comment) =>
                        comment.senderRole === TicketCommentSenderRole.SYSTEM ? (
                            <ComplaintSystemNotice
                                key={comment.id}
                                comment={{
                                    ...comment,
                                    content: formatSystemNote
                                        ? formatSystemNote(comment.content)
                                        : comment.content,
                                }}
                            />
                        ) : (
                            <ComplaintCommentBubble
                                key={comment.id}
                                comment={comment}
                                viewerRole="staff"
                            />
                        )
                    )}
            </Box>

            <Box sx={{ borderTop: '1px solid rgba(145, 158, 171, 0.16)', px: 2.5, py: 1.25, bgcolor: '#fff', flexShrink: 0 }}>
                {isTerminal ? (
                    <Typography variant="body2" color="text.secondary">
                        Yêu cầu đã{' '}
                        {status === TicketStatus.CLOSED
                            ? 'đóng'
                            : status === TicketStatus.REJECTED
                              ? 'từ chối'
                              : 'giải quyết'}
                        . Không thể gửi thêm tin nhắn.
                    </Typography>
                ) : status === TicketStatus.OPEN ? (
                    <Typography variant="body2" color="text.secondary">
                        Tiếp nhận yêu cầu trước khi trao đổi với khách hàng.
                    </Typography>
                ) : !canSend ? (
                    <Typography variant="body2" color="text.secondary">
                        Đang chờ khách phản hồi — vẫn có thể chọn Đã giải quyết hoặc Từ chối.
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                gap: 1,
                            }}
                        >
                            <InputBase
                                fullWidth
                                multiline
                                maxRows={4}
                                placeholder="Nhập tin nhắn"
                                value={content}
                                onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                                onKeyDown={handleKeyDown}
                                onCompositionStart={() => {
                                    isComposingRef.current = true;
                                }}
                                onCompositionEnd={() => {
                                    isComposingRef.current = false;
                                }}
                                disabled={respondMutation.isPending}
                                sx={{ fontSize: '0.9375rem', py: 0.75 }}
                            />
                            <Button
                                variant="contained"
                                onClick={submitNormalReply}
                                disabled={respondMutation.isPending || !content.trim()}
                                sx={{
                                    height: 36,
                                    minWidth: 64,
                                    px: 2,
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    boxShadow: 'none',
                                    bgcolor: 'var(--palette-grey-800)',
                                    '&:hover': { bgcolor: 'var(--palette-grey-900)' },
                                    '&.Mui-disabled': {
                                        bgcolor: 'var(--palette-grey-300)',
                                        color: 'var(--palette-grey-500)',
                                        boxShadow: 'none',
                                    },
                                }}
                            >
                                {respondMutation.isPending ? '…' : 'Gửi'}
                            </Button>
                        </Box>
                        <ImageUploadPreview
                            value={attachmentFile}
                            onChange={setAttachmentFile}
                            label="Đính kèm hình (nếu cần)"
                            helperText=""
                        />
                    </Box>
                )}
            </Box>

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
        </Card>
    );
};
