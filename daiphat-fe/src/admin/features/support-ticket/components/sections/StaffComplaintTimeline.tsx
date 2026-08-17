"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    Box,
    Button,
    Card,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
    ADMIN_DIALOG_ACTIONS_SX,
    ADMIN_DIALOG_CONTENT_SX,
    ADMIN_DIALOG_PAPER_SX,
    ADMIN_DIALOG_TITLE_SX,
} from '../../../../components/ui/AdminConfirmDialog';
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

const REJECT_REASON_QUICK_REPLIES = [
    'Thông tin cung cấp chưa đủ điều kiện để tiếp tục xử lý khiếu nại.',
    'Yêu cầu không thuộc phạm vi hỗ trợ của hệ thống / đại lý.',
    'Không xác minh được giao dịch hoặc đối tượng liên quan theo nội dung khiếu nại.',
    'Khiếu nại trùng lặp hoặc đã được xử lý trước đó.',
] as const;


function TimelineStatusBanner({
    title,
    subtitle,
    tone,
}: {
    title: string;
    subtitle: string;
    tone: 'success' | 'error' | 'neutral' | 'warning' | 'info';
}) {
    const palette = {
        success: {
            bg: 'var(--palette-success-lighter)',
            dot: 'var(--palette-success-main)',
            title: 'var(--palette-success-darker)',
            sub: 'var(--palette-success-dark)',
        },
        error: {
            bg: 'var(--palette-error-lighter)',
            dot: 'var(--palette-error-main)',
            title: 'var(--palette-error-darker)',
            sub: 'var(--palette-error-dark)',
        },
        warning: {
            bg: 'var(--palette-warning-lighter)',
            dot: 'var(--palette-warning-main)',
            title: 'var(--palette-warning-darker)',
            sub: 'var(--palette-warning-dark)',
        },
        info: {
            bg: 'var(--palette-info-lighter)',
            dot: 'var(--palette-info-main)',
            title: 'var(--palette-info-darker)',
            sub: 'var(--palette-info-dark)',
        },
        neutral: {
            bg: 'var(--palette-background-neutral, #F4F6F8)',
            dot: 'var(--palette-grey-500, #919EAB)',
            title: 'var(--palette-text-primary)',
            sub: 'var(--palette-text-secondary)',
        },
    }[tone];

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.25,
                px: 1.5,
                py: 1.25,
                borderRadius: '10px',
                bgcolor: palette.bg,
            }}
        >
            <Box
                sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: palette.dot,
                    mt: '6px',
                    flexShrink: 0,
                }}
            />
            <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: palette.title, lineHeight: 1.4 }}>
                    {title}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: palette.sub, mt: 0.25, lineHeight: 1.45 }}>
                    {subtitle}
                </Typography>
            </Box>
        </Box>
    );
}

export const StaffComplaintTimeline = ({
    ticketId,
    status,
    formatSystemNote,
}: StaffComplaintTimelineProps) => {
    const [replyOpen, setReplyOpen] = useState(false);
    const [content, setContent] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [decisionReason, setDecisionReason] = useState('');
    const [selectedQuickReplyIndex, setSelectedQuickReplyIndex] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data, isLoading, isError } = useGetStaffTicketComments(ticketId);
    const respondMutation = useRespondSupportTicket();

    const comments: SupportTicketCommentResponse[] = sortCommentsByCreatedAt(data?.data ?? []);
    const { can } = usePermissions();
    const isTerminal = isTerminalTicketStatus(status);
    const hasProcessPermission = can(PERMISSIONS.SUPPORT_TICKET.PROCESS);
    const canSend = canOperatorSendComment(status, comments) && hasProcessPermission;
    const canReject =
        hasProcessPermission
        && (status === TicketStatus.IN_PROGRESS || status === TicketStatus.WAITING_FOR_CUSTOMER);

    const lastCommentId = comments.at(-1)?.id;

    const scrollToLatest = () => {
        const pane = scrollRef.current;
        if (!pane) return;
        pane.scrollTop = pane.scrollHeight;
    };

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
        images.forEach((img) => {
            if (!img.complete) {
                img.addEventListener('load', scrollToLatest);
            }
        });
        return () => {
            images.forEach((img) => img.removeEventListener('load', scrollToLatest));
        };
    }, [comments]);

    const openReplyDialog = () => {
        setContent('');
        setAttachmentFile(null);
        setReplyOpen(true);
    };

    const closeReplyDialog = () => {
        if (respondMutation.isPending) return;
        setReplyOpen(false);
        setContent('');
        setAttachmentFile(null);
    };

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
                        setReplyOpen(false);
                        setContent('');
                        setAttachmentFile(null);
                    }
                },
            }
        );
    };

    const openRejectDialog = () => {
        setRejectOpen(true);
        setDecisionReason('');
        setSelectedQuickReplyIndex(null);
    };

    const closeRejectDialog = () => {
        if (respondMutation.isPending) return;
        setRejectOpen(false);
        setDecisionReason('');
        setSelectedQuickReplyIndex(null);
    };

    const applyQuickReply = (reply: string, index: number) => {
        setDecisionReason(reply.slice(0, MAX_CONTENT_LENGTH));
        setSelectedQuickReplyIndex(index);
    };

    const submitReject = () => {
        const trimmed = decisionReason.trim();
        if (!trimmed || respondMutation.isPending) return;

        respondMutation.mutate(
            {
                ticketId,
                data: { content: trimmed, action: StaffTicketResponseAction.REJECT },
            },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        setRejectOpen(false);
                        setDecisionReason('');
                        setSelectedQuickReplyIndex(null);
                    }
                },
            }
        );
    };

    const quickReplies = REJECT_REASON_QUICK_REPLIES;

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
                {canReject && (
                    <Button
                        variant="outlined"
                        className="btn-outlined-admin"
                        disabled={respondMutation.isPending}
                        onClick={openRejectDialog}
                    >
                        Từ chối
                    </Button>
                )}
            </Box>

            <Box
                ref={scrollRef}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    overscrollBehavior: 'contain',
                    px: 3,
                    py: 1.5,
                    bgcolor: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: isLoading || isError || comments.length === 0 ? 'center' : 'flex-start',
                    gap: 2.5,
                }}
            >
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
                    <TimelineStatusBanner
                        tone={
                            status === TicketStatus.REJECTED
                                ? 'error'
                                : status === TicketStatus.CLOSED
                                  ? 'neutral'
                                  : 'success'
                        }
                        title={
                            status === TicketStatus.CLOSED
                                ? 'Yêu cầu đã đóng'
                                : status === TicketStatus.REJECTED
                                  ? 'Yêu cầu đã từ chối'
                                  : 'Yêu cầu đã giải quyết'
                        }
                        subtitle="Không thể gửi thêm tin nhắn."
                    />
                ) : status === TicketStatus.OPEN ? (
                    <TimelineStatusBanner
                        tone="info"
                        title="Chưa tiếp nhận"
                        subtitle="Tiếp nhận yêu cầu trước khi trao đổi với khách hàng."
                    />
                ) : !canSend ? (
                    <TimelineStatusBanner
                        tone="warning"
                        title="Đang chờ khách phản hồi"
                        subtitle="Khách xác nhận để đóng khiếu nại. Bạn vẫn có thể Từ chối nếu không hợp lệ."
                    />
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            className="btn-primary-admin"
                            disabled={respondMutation.isPending}
                            onClick={openReplyDialog}
                        >
                            Phản hồi khiếu nại
                        </Button>
                    </Box>
                )}
            </Box>

            <Dialog
                open={replyOpen}
                onClose={closeReplyDialog}
                fullWidth
                maxWidth="sm"
                scroll="paper"
                PaperProps={{
                    className: 'admin-theme',
                    sx: { ...ADMIN_DIALOG_PAPER_SX, maxHeight: 'calc(100dvh - 48px)' },
                }}
            >
                <DialogTitle sx={{ ...ADMIN_DIALOG_TITLE_SX, pr: 6, position: 'relative' }}>
                    Phản hồi khiếu nại
                    <IconButton
                        aria-label="Đóng"
                        onClick={closeReplyDialog}
                        sx={{ position: 'absolute', right: 12, top: 12 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ ...ADMIN_DIALOG_CONTENT_SX, overflowY: 'auto' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Nội dung này sẽ gửi cho khách. Sau khi gửi, chờ khách phản hồi mới được trả lời tiếp.
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        minRows={3}
                        maxRows={8}
                        label="Nội dung phản hồi"
                        value={content}
                        onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
                        placeholder="VD: Vui lòng gửi thêm ảnh biên lai / chúng tôi đang đối soát…"
                        helperText={`${content.length}/${MAX_CONTENT_LENGTH}`}
                        sx={{ mb: 2 }}
                    />
                    <ImageUploadPreview
                        value={attachmentFile}
                        onChange={setAttachmentFile}
                        label="Đính kèm hình (nếu cần)"
                        helperText=""
                    />
                </DialogContent>
                <DialogActions sx={ADMIN_DIALOG_ACTIONS_SX}>
                    <Button
                        variant="outlined"
                        className="btn-outlined-admin"
                        onClick={closeReplyDialog}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        className="btn-primary-admin"
                        disabled={!content.trim() || respondMutation.isPending}
                        onClick={submitNormalReply}
                    >
                        {respondMutation.isPending ? 'Đang gửi...' : 'Gửi phản hồi'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={rejectOpen}
                onClose={closeRejectDialog}
                fullWidth
                maxWidth="sm"
                scroll="paper"
                PaperProps={{
                    className: 'admin-theme',
                    sx: { ...ADMIN_DIALOG_PAPER_SX, maxHeight: 'calc(100dvh - 48px)' },
                }}
            >
                <DialogTitle sx={{ ...ADMIN_DIALOG_TITLE_SX, pr: 6, position: 'relative' }}>
                    Từ chối khiếu nại
                    <IconButton
                        aria-label="Đóng"
                        onClick={closeRejectDialog}
                        disabled={respondMutation.isPending}
                        sx={{ position: 'absolute', right: 12, top: 12 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ ...ADMIN_DIALOG_CONTENT_SX, overflowY: 'auto' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                        Nhập lý do từ chối. Thao tác này đóng khiếu nại và không thể hoàn tác từ phía khách.
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1 }}
                    >
                        Gợi ý lý do (nội bộ)
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
                        {quickReplies.map((reply, index) => {
                            const selected = selectedQuickReplyIndex === index;
                            return (
                                <Chip
                                    key={reply}
                                    label={reply}
                                    clickable
                                    variant={selected ? 'filled' : 'outlined'}
                                    onClick={() => applyQuickReply(reply, index)}
                                    sx={{
                                        maxWidth: '100%',
                                        height: 'auto',
                                        py: 0.75,
                                        borderRadius: '8px',
                                        fontWeight: selected ? 700 : 500,
                                        bgcolor: selected ? 'var(--palette-grey-800)' : '#fff',
                                        color: selected ? '#fff' : 'var(--palette-text-primary)',
                                        borderColor: selected
                                            ? 'var(--palette-grey-800)'
                                            : 'rgba(145, 158, 171, 0.32)',
                                        '&:hover': {
                                            bgcolor: selected ? 'var(--palette-grey-700)' : 'rgba(145, 158, 171, 0.08)',
                                        },
                                        '& .MuiChip-label': {
                                            whiteSpace: 'normal',
                                            textAlign: 'left',
                                            lineHeight: 1.35,
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
                        label="Lý do từ chối"
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
                        placeholder="VD: Thông tin không đủ điều kiện xử lý..."
                        helperText={`${decisionReason.length}/${MAX_CONTENT_LENGTH}`}
                    />
                </DialogContent>
                <DialogActions sx={ADMIN_DIALOG_ACTIONS_SX}>
                    <Button
                        variant="outlined"
                        className="btn-outlined-admin"
                        onClick={closeRejectDialog}
                        disabled={respondMutation.isPending}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        className="btn-primary-admin"
                        disabled={!decisionReason.trim() || respondMutation.isPending}
                        onClick={submitReject}
                    >
                        {respondMutation.isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};
