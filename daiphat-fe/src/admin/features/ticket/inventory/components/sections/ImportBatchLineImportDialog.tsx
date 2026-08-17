"use client";

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import {
    Alert,
    Box,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { Control, FieldArrayWithId, FieldErrors, useFormState, useWatch } from 'react-hook-form';
import type { ImportBatchLine, ImportBatchStatus } from '../../../import-batch/types/importBatch.type';
import { Button } from '../../../../../components/ui/Button';
import { AdminStatusBadge } from '../../../../../components/ui/AdminStatusBadge';
import {
    getBatchTypeBadgeClass,
    getBatchTypeLabel,
    getImportBatchLineCancelledAlertMessage,
    getImportBatchLineStatusBadgeClass,
    getImportBatchLineStatusLabel,
    IMPORT_BATCH_LINE_PAUSED_ENTRY_MESSAGE,
} from '../../../import-batch/utils/batchTypeLabels';
import {
    displayImportBatchLineCodeRaw,
    formatImportBatchLineCode,
    importBatchCodeMonospaceSx,
} from '../../../import-batch/utils/importBatchCode';
import {
    getLineImportProgress,
    isLineCancelled,
    isLinePaused,
} from '../../../import-batch/utils/importBatchProgress';
import { TicketImportProgressTrack } from '../../../import-batch/components/sections/TicketImportProgressTrack';
import { CreateTicketFormValues } from '../../schemas/ticket.schema';
import { canAppendTicketSection } from '../../utils/ticketSectionQuantity';
import { TicketNumberSectionBlock } from './TicketNumberSectionBlock';
import { TicketNumberLengthRules } from '../../utils/ticketNumberValidation';

type ImportBatchLineImportDialogProps = {
    open: boolean;
    line: ImportBatchLine | null;
    lines: ImportBatchLine[];
    batchStatus: ImportBatchStatus;
    drawDate?: string;
    resolveStationName: (stationId?: number | string) => string;
    onClose: () => void;
    onSubmit: () => void;
    isSubmitting: boolean;
    control: Control<CreateTicketFormValues>;
    errors: FieldErrors<CreateTicketFormValues>;
    sectionFields: FieldArrayWithId<CreateTicketFormValues, 'ticketSections', 'id'>[];
    onAppendSection: () => void;
    removeSection: (index: number) => void;
    onSerialFieldChange?: (sectionIndex: number, serialIndex: number) => void;
    onRemoveSerial?: (sectionIndex: number, serialIndex: number) => void;
    onNumbersFieldChange?: (sectionIndex: number) => void;
    numberLengthRules: TicketNumberLengthRules;
    missingImageConfirmOpen?: boolean;
    missingImageCount?: number;
    onConfirmMissingImageSubmit?: () => void;
    onCancelMissingImageSubmit?: () => void;
    importIntakeBlocked?: boolean;
    importIntakeBlockedMessage?: string;
};

const InfoItem = ({
    label,
    value,
    monospace,
    title,
}: {
    label: string;
    value: string;
    monospace?: boolean;
    title?: string;
}) => {
    const content = (
        <Typography
            variant="body2"
            fontWeight={600}
            color="text.primary"
            noWrap={!!monospace}
            sx={monospace ? { ...importBatchCodeMonospaceSx, maxWidth: '100%' } : undefined}
        >
            {value}
        </Typography>
    );

    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography className="admin-form-label" display="block" sx={{ mb: 0.25 }}>
                {label}
            </Typography>
            {title ? (
                <Tooltip title={title} arrow placement="top">
                    {content}
                </Tooltip>
            ) : (
                content
            )}
        </Box>
    );
};

const compactActionButtonSx = {
    minHeight: '2rem !important',
    py: '2px !important',
    px: '10px !important',
    fontSize: '0.8125rem !important',
};

const dialogFooterButtonSx = {
    minHeight: '2.25rem !important',
    height: '2.25rem !important',
    py: '0 !important',
    px: '14px !important',
    fontSize: '0.8125rem !important',
    lineHeight: 1.2,
};

export const ImportBatchLineImportDialog = ({
    open,
    line,
    lines,
    batchStatus,
    drawDate,
    resolveStationName,
    onClose,
    onSubmit,
    isSubmitting,
    control,
    errors,
    sectionFields,
    onAppendSection,
    removeSection,
    onSerialFieldChange,
    onRemoveSerial,
    onNumbersFieldChange,
    numberLengthRules,
    missingImageConfirmOpen = false,
    missingImageCount = 0,
    onConfirmMissingImageSubmit,
    onCancelMissingImageSubmit,
    importIntakeBlocked = false,
    importIntakeBlockedMessage,
}: ImportBatchLineImportDialogProps) => {
    const { isSubmitted } = useFormState({ control });
    const watchedSections = useWatch({ control, name: 'ticketSections' });

    if (!line) {
        return null;
    }

    const progress = getLineImportProgress(line);
    const stationName = resolveStationName(line.lotteryStationId);
    const linePaused = isLinePaused(line);
    const lineCancelled = isLineCancelled(line);
    const canImport =
        (batchStatus === 'DRAFT' ||
            batchStatus === 'RECEIVING' ||
            batchStatus === 'PARTIALLY_IMPORTED') &&
        !progress.isComplete &&
        !lineCancelled &&
        !linePaused &&
        !importIntakeBlocked;

    const dialogRemainingQuota = Math.max(
        0,
        (line.declareQuantity ?? 0) - (line.totalQuantity ?? 0)
    );
    const canAppendSection =
        canImport && canAppendTicketSection(watchedSections ?? [], dialogRemainingQuota);

    const quotaHint =
        dialogRemainingQuota > 0 && canImport
            ? `Còn ${dialogRemainingQuota.toLocaleString('vi-VN')} vé`
            : undefined;

    const batchCodeRaw = displayImportBatchLineCodeRaw(line.batchCode);
    const batchCodeFormatted = line.batchCode ? formatImportBatchLineCode(line.batchCode) : undefined;
    const statusBadgeClass = getImportBatchLineStatusBadgeClass(line.status);

    return (
        <>
            <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            scroll="paper"
            PaperProps={{
                className: 'admin-theme',
                sx: {
                    borderRadius: '16px',
                    boxShadow: 'var(--customShadows-dialog)',
                },
            }}
        >
            <DialogTitle
                component="div"
                sx={{
                    m: 0,
                    px: 2.5,
                    py: 1.75,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1.5,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                        minWidth: 0,
                    }}
                >
                    <Typography component="span" sx={{ fontWeight: 700, fontSize: '1.0625rem' }}>
                        {stationName}
                    </Typography>
                    <AdminStatusBadge
                        label={getImportBatchLineStatusLabel(line.status)}
                        modifier={statusBadgeClass}
                    />
                </Box>
                <IconButton
                    onClick={onClose}
                    aria-label="Đóng"
                    size="small"
                    sx={{ color: 'text.secondary', flexShrink: 0 }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ border: 'none', px: 2.5, py: 2 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1.4fr 0.9fr' },
                        gap: 1.5,
                        mb: 2,
                    }}
                >
                    <Box sx={{ minWidth: 0 }}>
                        <Typography className="admin-form-label" display="block" sx={{ mb: 0.25 }}>
                            Loại lô
                        </Typography>
                        <AdminStatusBadge
                            label={getBatchTypeLabel(line.batchType)}
                            modifier={getBatchTypeBadgeClass(line.batchType)}
                        />
                    </Box>
                    <InfoItem
                        label="Mã lô"
                        value={batchCodeRaw || '—'}
                        monospace={!!batchCodeRaw}
                        title={batchCodeFormatted}
                    />
                    <InfoItem
                        label="Ngày quay"
                        value={drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : '—'}
                    />
                </Box>

                {lineCancelled && (
                    <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
                        {getImportBatchLineCancelledAlertMessage(line.cancelReason)}
                    </Alert>
                )}

                {linePaused && (
                    <Alert severity="warning" sx={{ mb: 1.5, py: 0.5 }} icon={<PauseCircleOutlineIcon />}>
                        {IMPORT_BATCH_LINE_PAUSED_ENTRY_MESSAGE}
                    </Alert>
                )}

                {importIntakeBlocked && importIntakeBlockedMessage && (
                    <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
                        {importIntakeBlockedMessage}
                    </Alert>
                )}

                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <TicketImportProgressTrack
                            imported={progress.imported}
                            declared={progress.declared}
                            ariaLabel={`Tiến độ nhập vé ${stationName}`}
                        />
                    </Box>
                    {quotaHint && (
                        <Typography className="admin-form-helper" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {quotaHint}
                        </Typography>
                    )}
                </Stack>

                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                    sx={{ mb: 1 }}
                >
                    <Typography className="admin-form-title" sx={{ fontSize: '0.875rem !important' }}>
                        Dãy số & sê-ri
                    </Typography>
                    {canImport && (
                        <Button
                            type="button"
                            variant="outlined"
                            className="btn-outlined-admin"
                            label="Thêm dãy"
                            startIcon={<AddIcon sx={{ fontSize: '1rem !important' }} />}
                            onClick={onAppendSection}
                            disabled={!canAppendSection}
                            sx={compactActionButtonSx}
                        />
                    )}
                </Stack>

                <Stack
                    spacing={1}
                    sx={{
                        ...(linePaused || lineCancelled
                            ? {
                                  opacity: 0.55,
                                  pointerEvents: 'none',
                                  userSelect: 'none',
                              }
                            : {}),
                    }}
                >
                    {sectionFields.map((section, sectionIndex) => (
                        <TicketNumberSectionBlock
                            key={section.id}
                            sectionIndex={sectionIndex}
                            control={control}
                            errors={errors}
                            canEdit={canImport}
                            canRemove={sectionFields.length > 1}
                            numberLengthRules={numberLengthRules}
                            compact
                            remainingQuota={dialogRemainingQuota}
                            onRemove={() => removeSection(sectionIndex)}
                            onSerialFieldChange={onSerialFieldChange}
                            onRemoveSerial={onRemoveSerial}
                            onNumbersFieldChange={onNumbersFieldChange}
                        />
                    ))}
                </Stack>

                {isSubmitted && errors.ticketSections?.message && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                        {errors.ticketSections.message}
                    </Typography>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 2.5, py: 1.5, gap: 0.75 }}>
                <Button
                    type="button"
                    variant="outlined"
                    className="btn-outlined-admin"
                    label="Đóng"
                    onClick={onClose}
                    sx={dialogFooterButtonSx}
                />
                <Button
                    type="button"
                    variant="outlined"
                    className="import-batch-import-cta"
                    label="Nhập vé"
                    loading={isSubmitting}
                    loadingLabel="Đang xử lý..."
                    disabled={!canImport}
                    onClick={onSubmit}
                    startIcon={
                        <ConfirmationNumberOutlinedIcon
                            className="import-batch-import-cta__ticket"
                            sx={{ fontSize: '1rem !important' }}
                        />
                    }
                    sx={dialogFooterButtonSx}
                />
            </DialogActions>
        </Dialog>

        {/* Confirmation Dialog: Nhập vé chưa tải ảnh */}
        <Dialog
            open={Boolean(missingImageConfirmOpen)}
            onClose={onCancelMissingImageSubmit}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                className: 'admin-theme',
                sx: {
                    borderRadius: '16px',
                    p: 1,
                    boxShadow: 'var(--customShadows-dialog)',
                },
            }}
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, pt: 1.5, px: 2 }}>
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        bgcolor: '#fffbeb',
                        color: '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #fde68a',
                        flexShrink: 0,
                    }}
                >
                    <WarningAmberOutlinedIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ fontSize: '1rem' }}>
                        Chưa tải lên hình ảnh vé
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        Xác nhận lưu vé vào hệ thống
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent sx={{ py: 1.5, px: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                    Có <strong>{missingImageCount} vé</strong> chưa được tải lên hình ảnh minh chứng. Bạn có chắc chắn muốn tiếp tục nhập vé vào hệ thống không?
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 2, pb: 1.5, pt: 1, gap: 1 }}>
                <Button
                    type="button"
                    variant="outlined"
                    className="btn-outlined-admin"
                    label="Hủy / Tải ảnh tiếp"
                    onClick={onCancelMissingImageSubmit}
                    sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' }}
                />
                <Button
                    type="button"
                    variant="contained"
                    className="btn-admin"
                    label="Xác nhận nhập vé"
                    loading={isSubmitting}
                    onClick={onConfirmMissingImageSubmit}
                    sx={{
                        borderRadius: '8px',
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        bgcolor: '#2563eb',
                        color: '#fff',
                        '&:hover': { bgcolor: '#1d4ed8' },
                    }}
                />
            </DialogActions>
        </Dialog>
        </>
    );
};
