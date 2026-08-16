"use client";

import { useEffect, useState } from 'react';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import FormatListNumberedOutlinedIcon from '@mui/icons-material/FormatListNumberedOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { getImportBatchFileConfig } from '../../services/importBatchService';
import type {
    ImportBatchFileConfig,
    ImportBatchFileFieldRequirement,
} from '../../types/importBatch.type';

type ImportBatchFileConfigDialogProps = {
    open: boolean;
    onClose: () => void;
};

const REQUIREMENT_CHIP: Record<
    ImportBatchFileFieldRequirement,
    { label: string; color: 'error' | 'warning' | 'default' }
> = {
    MANDATORY: { label: 'Bắt buộc', color: 'error' },
    CONDITIONAL: { label: 'Tuỳ dạng tệp', color: 'warning' },
    OPTIONAL: { label: 'Tuỳ chọn', color: 'default' },
};

const formatDate = (value?: string) => (value ? dayjs(value).format('DD/MM/YYYY') : '—');

const YesNoBadge = ({ value }: { value: boolean }) => (
    <Chip
        size="small"
        sx={{
            fontWeight: 700,
            fontSize: '0.75rem',
            height: 22,
            bgcolor: value ? '#dcfce7' : '#f1f5f9',
            color: value ? '#15803d' : '#64748b',
            border: value ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
        }}
        icon={value ? <CheckCircleOutlineIcon sx={{ fontSize: 14, color: '#15803d !important' }} /> : <HighlightOffIcon sx={{ fontSize: 14, color: '#64748b !important' }} />}
        label={value ? 'Có' : 'Không'}
    />
);

export const ImportBatchFileConfigDialog = ({
    open,
    onClose,
}: ImportBatchFileConfigDialogProps) => {
    const [config, setConfig] = useState<ImportBatchFileConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        setLoading(true);
        setFailed(false);
        getImportBatchFileConfig()
            .then((result) => setConfig(result ?? null))
            .catch(() => setFailed(true))
            .finally(() => setLoading(false));
    }, [open]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '20px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                },
            }}
        >
            {/* Header */}
            <DialogTitle
                sx={{
                    px: 3,
                    py: 2.5,
                    borderBottom: '1px solid #f1f5f9',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Stack direction="row" spacing={1.75} alignItems="center">
                    <Box
                        sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '12px',
                            bgcolor: '#f1f5f9',
                            color: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #e2e8f0',
                        }}
                    >
                        <TuneOutlinedIcon fontSize="medium" />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={800} sx={{ color: '#0f172a', lineHeight: 1.2 }}>
                            Quy tắc & Cấu hình đọc tệp
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, fontSize: '0.85rem' }}>
                            Xem các thông số kỹ thuật và danh sách gợi ý tên cột để hệ thống tự nhận diện
                        </Typography>
                    </Box>
                </Stack>

                <IconButton
                    onClick={onClose}
                    aria-label="Đóng"
                    size="small"
                    sx={{ color: 'text.secondary', flexShrink: 0 }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: { xs: 2.5, md: 3.5 }, bgcolor: '#f8fafc' }}>
                {loading && (
                    <Stack alignItems="center" justifyContent="center" py={8} spacing={2}>
                        <CircularProgress size={36} sx={{ color: '#FF3030' }} />
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            Đang tải cấu hình hệ thống...
                        </Typography>
                    </Stack>
                )}

                {failed && (
                    <Alert severity="error" sx={{ borderRadius: '12px' }}>
                        Không đọc được cấu hình hệ thống. Vui lòng thử lại sau.
                    </Alert>
                )}

                {config && !loading && (
                    <Stack spacing={3}>
                        {/* Notice Card */}
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: '14px',
                                bgcolor: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                            }}
                        >
                            <InfoOutlinedIcon sx={{ color: '#2563eb', fontSize: 20 }} />
                            <Typography variant="body2" color="#1e40af" sx={{ fontSize: '0.875rem' }}>
                                Các thông số bên dưới có thể tuỳ chỉnh tại <b>Cài đặt hệ thống</b> → mục <b>Cấu hình nhập vé</b> (khoá <code>{config.configKey}</code>).
                            </Typography>
                        </Box>

                        {/* Parameter Grid Tiles */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 2 }}>
                                Thông số kỹ thuật tệp
                            </Typography>

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                                    gap: 2,
                                }}
                            >
                                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Định dạng hỗ trợ
                                    </Typography>
                                    <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                                        {config.allowedExtensions.map((ext) => `.${ext}`).join(', ')}
                                    </Typography>
                                </Box>

                                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Dung lượng tối đa
                                    </Typography>
                                    <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                                        {config.maxFileSizeMb} MB
                                    </Typography>
                                </Box>

                                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Số dòng tối đa
                                    </Typography>
                                    <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                                        {config.maxRows.toLocaleString('vi-VN')} dòng
                                    </Typography>
                                </Box>

                                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Dấu phân cách trong ô
                                    </Typography>
                                    <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                                        <code>{config.serialSeparator}</code>
                                    </Typography>
                                </Box>

                                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Lưu tệp gốc làm bằng chứng
                                    </Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        <YesNoBadge value={config.storeOriginalFile} />
                                    </Box>
                                </Box>

                                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Cho phép nhập dở dang
                                    </Typography>
                                    <Box sx={{ mt: 0.5 }}>
                                        <YesNoBadge value={config.allowPartialImport} />
                                    </Box>
                                </Box>

                                <Box sx={{ p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', gridColumn: { sm: 'span 2' } }}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Phạm vi ngày quay nhận được
                                    </Typography>
                                    <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ mt: 0.5 }}>
                                        {formatDate(config.drawDateWindowFrom)} – {formatDate(config.drawDateWindowTo)}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 2, p: 2, borderRadius: '12px', bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary">
                                    Định dạng ngày đọc được:
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="#334155" sx={{ mt: 0.5 }}>
                                    {config.supportedDateFormats.join(', ')}
                                </Typography>
                            </Box>
                        </Paper>

                        {/* Reading Direction */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 1.5 }}>
                                Hướng đọc dữ liệu
                            </Typography>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: '12px',
                                    bgcolor: '#f0fdfa',
                                    border: '1px solid #ccfbf1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                }}
                            >
                                <TableRowsOutlinedIcon sx={{ color: '#0d9488' }} />
                                <Typography variant="body2" fontWeight={600} color="#115e59">
                                    {config.readingDirectionNote}
                                </Typography>
                            </Box>
                        </Paper>

                        {/* Field Mappings Table */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" sx={{ mb: 0.5 }}>
                                Các trường hệ thống tự động nhận diện
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.85rem' }}>
                                Đặt tên tiêu đề cột trong tệp trùng với một trong các tên gợi ý dưới đây để hệ thống tự gán cột tự động.
                            </Typography>

                            <TableContainer sx={{ border: '1px solid #f1f5f9', borderRadius: '12px', overflow: 'hidden' }}>
                                <Table size="small">
                                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 800 }}>Tên trường</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Yêu cầu</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Giá trị ô</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Các tên cột tự động nhận</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {config.fields.map((field) => {
                                            const requirement =
                                                REQUIREMENT_CHIP[field.requirement] ??
                                                REQUIREMENT_CHIP.OPTIONAL;
                                            return (
                                                <TableRow key={field.field} hover sx={{ verticalAlign: 'top' }}>
                                                    <TableCell sx={{ minWidth: 160 }}>
                                                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                                                            {field.label}
                                                        </Typography>
                                                        {field.note && (
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                                sx={{ mt: 0.25, display: 'block', fontSize: '0.75rem', lineHeight: 1.4 }}
                                                            >
                                                                {field.note}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{ minWidth: 120 }}>
                                                        <Chip
                                                            size="small"
                                                            color={requirement.color}
                                                            label={requirement.label}
                                                            sx={{ fontWeight: 700, height: 22, fontSize: '0.75rem' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ minWidth: 120 }}>
                                                        <Chip
                                                            size="small"
                                                            variant="outlined"
                                                            color={field.list ? 'primary' : 'default'}
                                                            label={
                                                                field.list
                                                                    ? `Danh sách (${config.serialSeparator})`
                                                                    : '1 giá trị'
                                                            }
                                                            sx={{ fontWeight: 600, height: 22, fontSize: '0.75rem' }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {field.aliases.length > 0 ? (
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                {field.aliases.map((alias) => (
                                                                    <Chip
                                                                        key={alias}
                                                                        size="small"
                                                                        label={alias}
                                                                        sx={{
                                                                            height: 20,
                                                                            fontSize: '0.75rem',
                                                                            bgcolor: '#f1f5f9',
                                                                            color: '#334155',
                                                                            fontFamily: 'monospace',
                                                                        }}
                                                                    />
                                                                ))}
                                                            </Box>
                                                        ) : (
                                                            <Typography variant="caption" color="text.secondary">—</Typography>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                        {/* Fixed Rules */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                bgcolor: '#ffffff',
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                                <LockOutlinedIcon fontSize="small" sx={{ color: '#64748b' }} />
                                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                                    Quy tắc nghiệp vụ cố định
                                </Typography>
                            </Stack>
                            <Stack component="ul" spacing={1} sx={{ pl: 2.5, m: 0 }}>
                                {config.fixedRules.map((rule) => (
                                    <Typography
                                        key={rule}
                                        component="li"
                                        variant="body2"
                                        color="#334155"
                                        sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}
                                    >
                                        {rule}
                                    </Typography>
                                ))}
                            </Stack>
                        </Paper>
                    </Stack>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    px: 3,
                    py: 2,
                    borderTop: '1px solid #e2e8f0',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    justifyContent: 'flex-end',
                }}
            >
                <Button
                    variant="contained"
                    onClick={onClose}
                    sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 3,
                        bgcolor: '#FF3030',
                        color: '#ffffff',
                        boxShadow: '0 2px 8px rgba(255, 48, 48, 0.25)',
                        '&:hover': { bgcolor: '#e02828' },
                    }}
                >
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
};
