import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
    Box,
    Fab,
    LinearProgress,
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
import { getBatchTypeLabel } from '../../import-batch/utils/batchTypeLabels';
import {
    displayImportBatchLineCodeRaw,
    formatImportBatchLineCode,
    importBatchCodeMonospaceSx,
} from '../../import-batch/utils/importBatchCode';
import { CreateTicketFormValues } from '../../../schemas/ticket.schema';
import { TicketNumberSectionBlock } from './TicketNumberSectionBlock';
import { TicketNumberLengthRules } from '../utils/ticketNumberValidation';

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
};

const lineProgress = (line: ImportBatchLine) => {
    const imported = line.totalQuantity ?? 0;
    const declared = line.declareQuantity ?? 0;
    const percent = declared > 0 ? Math.min(100, Math.round((imported / declared) * 100)) : 0;
    const isComplete = declared > 0 && imported >= declared;
    return { imported, declared, percent, isComplete };
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
}: ImportBatchLineImportTabsProps) => {
    const { isSubmitted } = useFormState({ control });
    const activeLine = lines.find((line) => String(line.id) === String(activeLineId));
    const activeProgress = activeLine ? lineProgress(activeLine) : null;
    const canImport =
        batchStatus === 'DRAFT' && !!activeLine && activeProgress && !activeProgress.isComplete;

    const activeTabIndex = Math.max(
        0,
        lines.findIndex((line) => String(line.id) === String(activeLineId))
    );

    const quotaHint =
        remainingSerialQuota !== undefined && remainingSerialQuota > 0
            ? `Còn lại ${remainingSerialQuota} vé có thể nhập`
            : undefined;

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
                    const { imported, declared, isComplete } = lineProgress(line);
                    return (
                        <Tab
                            key={line.id}
                            label={
                                <Stack direction="row" spacing={0.75} alignItems="center">
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

            {activeLine && activeProgress && (
                <Box sx={{ p: 2.5 }}>
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
                                    {activeProgress.imported} / {activeProgress.declared}
                                </Typography>
                            </Stack>
                            <LinearProgress
                                variant="determinate"
                                value={activeProgress.percent}
                                color={activeProgress.isComplete ? 'success' : 'warning'}
                                sx={{ height: 8, borderRadius: 1 }}
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

                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                        Danh sách dãy số
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
