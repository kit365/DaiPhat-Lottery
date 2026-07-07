import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
    Alert,
    Box,
    Fab,
    Paper,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { Control, FieldArrayWithId, FieldErrors, useFormState } from 'react-hook-form';
import type { ImportBatchLine, ImportBatchStatus } from '../../../api/importBatch.api';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { getBatchTypeLabel, getImportBatchLineCancelledAlertMessage } from '../../import-batch/utils/batchTypeLabels';
import {
    displayImportBatchLineCodeRaw,
    formatImportBatchLineCode,
    importBatchCodeMonospaceSx,
} from '../../import-batch/utils/importBatchCode';
import {
    getLineImportProgress,
    getLineStationColor,
    isLineCancelled,
} from '../../ticket/utils/importBatchProgress';
import { TicketImportProgressTrack } from '../../import-batch/components/TicketImportProgressTrack';
import { CreateTicketFormValues } from '../../../schemas/ticket.schema';
import { TicketNumberSectionBlock } from './TicketNumberSectionBlock';
import { ImportedTicketSectionsPanel } from './ImportedTicketSectionsPanel';
import { TicketNumberLengthRules } from '../utils/ticketNumberValidation';
import type { ImportedTicketForLine } from '../../../api/ticket.api';
import type { TicketEntryResumeFocus } from '../utils/ticketEntryResume';

type DraftSaveStatus = {
    isSaving: boolean;
    lastSavedAt: Date | null;
    saveError: string | null;
};

type ImportBatchLineImportTabsProps = {
    lines: ImportBatchLine[];
    activeLineId: string;
    batchStatus: ImportBatchStatus;
    drawDate?: string;
    resolveStationName: (stationId?: number | string) => string;
    onTabChange: (lineId: string) => void;
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
    remainingSerialQuota?: number;
    draftSaveStatus?: DraftSaveStatus;
    importedTickets?: ImportedTicketForLine[];
    isLoadingImportedTickets?: boolean;
    importBatchLineId?: string;
    canManageImportedTickets?: boolean;
    resumeFocusTarget?: TicketEntryResumeFocus | null;
};

export const ImportBatchLineImportTabs = ({
    lines,
    activeLineId,
    batchStatus,
    drawDate,
    resolveStationName,
    onTabChange,
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
    remainingSerialQuota,
    draftSaveStatus,
    importedTickets = [],
    isLoadingImportedTickets = false,
    importBatchLineId,
    canManageImportedTickets = false,
    resumeFocusTarget = null,
}: ImportBatchLineImportTabsProps) => {
    const { isSubmitted } = useFormState({ control });
    const activeLine = lines.find((line) => String(line.id) === String(activeLineId));
    const activeProgress = activeLine ? getLineImportProgress(activeLine) : null;
    const activeStationColors = activeLine ? getLineStationColor(lines, activeLine) : null;
    const canImport =
        (batchStatus === 'DRAFT' ||
            batchStatus === 'RECEIVING' ||
            batchStatus === 'PARTIALLY_IMPORTED') &&
        !!activeLine &&
        activeProgress &&
        !activeProgress.isComplete &&
        !isLineCancelled(activeLine);

    const activeTabIndex = Math.max(
        0,
        lines.findIndex((line) => String(line.id) === String(activeLineId))
    );

    const quotaHint =
        remainingSerialQuota !== undefined && remainingSerialQuota > 0
            ? `Còn lại ${remainingSerialQuota} vé có thể nhập`
            : undefined;

    const draftStatusLabel = draftSaveStatus?.isSaving
        ? 'Đang lưu...'
        : draftSaveStatus?.saveError
          ? draftSaveStatus.saveError
          : draftSaveStatus?.lastSavedAt
            ? `Đã lưu nháp lúc ${dayjs(draftSaveStatus.lastSavedAt).format('HH:mm')}`
            : null;

    return (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Tabs
                value={activeTabIndex}
                onChange={(_e, index) => {
                    const line = lines[index];
                    if (line) {
                        onTabChange(String(line.id));
                    }
                }}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                    px: 1,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                }}
            >
                {lines.map((line) => {
                    const { imported, declared, isComplete } = getLineImportProgress(line);
                    const stationColor = getLineStationColor(lines, line);
                    const cancelled = isLineCancelled(line);
                    return (
                        <Tab
                            key={line.id}
                            disabled={cancelled}
                            label={
                                <Stack direction="row" spacing={0.75} alignItems="center">
                                    <Box
                                        component="span"
                                        sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            bgcolor: stationColor.main,
                                            flexShrink: 0,
                                        }}
                                    />
                                    <span>{resolveStationName(line.lotteryStationId)}</span>
                                    {isComplete && (
                                        <CheckCircleOutlineIcon
                                            sx={{ fontSize: 16, color: 'success.main' }}
                                        />
                                    )}
                                    {!isComplete && declared > 0 && (
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            ({imported}/{declared})
                                        </Typography>
                                    )}
                                </Stack>
                            }
                        />
                    );
                })}
            </Tabs>

            {draftStatusLabel && (
                <Box sx={{ px: 2.5, pt: 1 }}>
                    <Typography
                        variant="caption"
                        color={draftSaveStatus?.saveError ? 'error.main' : 'text.secondary'}
                    >
                        {draftStatusLabel}
                    </Typography>
                </Box>
            )}

            {activeLine && activeProgress && activeStationColors && (
                <Box sx={{ p: 2.5 }}>
                    {isLineCancelled(activeLine) && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {getImportBatchLineCancelledAlertMessage(activeLine.cancelReason)}
                        </Alert>
                    )}
                    <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={2}
                        alignItems={{ md: 'center' }}
                        sx={{ mb: 2.5 }}
                    >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                                sx={{ mb: 0.75 }}
                            >
                                <Typography variant="body2" fontWeight={600}>
                                    Tiến độ nhập vé
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {activeProgress.imported.toLocaleString('vi-VN')} /{' '}
                                    {activeProgress.declared.toLocaleString('vi-VN')} vé
                                </Typography>
                            </Stack>
                            <TicketImportProgressTrack
                                imported={activeProgress.imported}
                                declared={activeProgress.declared}
                                color={activeStationColors.main}
                                trackColor={activeStationColors.track}
                                ariaLabel={`Tiến độ nhập vé ${resolveStationName(activeLine.lotteryStationId)}`}
                            />
                            {quotaHint && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mt: 0.5, display: 'block' }}
                                >
                                    {quotaHint}
                                </Typography>
                            )}
                        </Box>
                        <LoadingButton
                            type="button"
                            variant="contained"
                            color="warning"
                            label="Nhập vé"
                            loading={isSubmitting}
                            loadingLabel="Đang xử lý..."
                            disabled={!canImport}
                            onClick={onSubmit}
                            sx={{ minHeight: '2.5rem', minWidth: '7.5rem', flexShrink: 0 }}
                        />
                    </Stack>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 2,
                            mb: 2,
                        }}
                    >
                        <TextField
                            label="Loại lô"
                            fullWidth
                            size="small"
                            value={getBatchTypeLabel(activeLine.batchType)}
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            label="Mã lô"
                            fullWidth
                            size="small"
                            value={displayImportBatchLineCodeRaw(activeLine.batchCode)}
                            helperText={
                                activeLine.batchCode
                                    ? formatImportBatchLineCode(activeLine.batchCode)
                                    : undefined
                            }
                            InputProps={{ readOnly: true }}
                            sx={{ '& .MuiInputBase-input': importBatchCodeMonospaceSx }}
                        />
                        <TextField
                            label="Ngày quay"
                            fullWidth
                            size="small"
                            value={drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : '—'}
                            InputProps={{ readOnly: true }}
                        />
                        <TextField
                            label="Nhà đài"
                            fullWidth
                            size="small"
                            value={resolveStationName(activeLine.lotteryStationId)}
                            InputProps={{ readOnly: true }}
                        />
                    </Box>

                    <ImportedTicketSectionsPanel
                        tickets={importedTickets}
                        importBatchLineId={importBatchLineId}
                        canManage={canManageImportedTickets}
                        isLoading={isLoadingImportedTickets}
                        numberLengthRules={numberLengthRules}
                    />

                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                        {importedTickets.length > 0 ? 'Nhập thêm dãy số' : 'Danh sách dãy số'}
                    </Typography>

                    <Stack spacing={1.5} sx={{ pb: 10 }}>
                        {sectionFields.map((section, sectionIndex) => (
                            <TicketNumberSectionBlock
                                key={section.id}
                                sectionIndex={sectionIndex}
                                control={control}
                                errors={errors}
                                canEdit={!!canImport}
                                canRemove={sectionFields.length > 1}
                                numberLengthRules={numberLengthRules}
                                onRemove={() => removeSection(sectionIndex)}
                                onSerialFieldChange={onSerialFieldChange}
                                onRemoveSerial={onRemoveSerial}
                                onNumbersFieldChange={onNumbersFieldChange}
                                resumeFocusTarget={resumeFocusTarget}
                            />
                        ))}
                    </Stack>

                    {isSubmitted && errors.ticketSections?.message && (
                        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                            {errors.ticketSections.message}
                        </Typography>
                    )}

                    {canImport && (
                        <Tooltip title="Thêm dãy số" placement="left">
                            <Fab
                                type="button"
                                color="primary"
                                aria-label="Thêm dãy số"
                                onClick={onAppendSection}
                                sx={{
                                    position: 'fixed',
                                    bottom: 96,
                                    right: 24,
                                    zIndex: (theme) => theme.zIndex.speedDial,
                                    boxShadow: 4,
                                }}
                            >
                                <AddIcon />
                            </Fab>
                        </Tooltip>
                    )}
                </Box>
            )}
        </Paper>
    );
};
