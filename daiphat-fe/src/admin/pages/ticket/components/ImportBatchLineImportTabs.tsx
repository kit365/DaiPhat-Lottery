import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
    Box,
    IconButton,
    LinearProgress,
    Paper,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { Control, Controller, FieldArrayWithId, FieldErrors, UseFieldArrayAppend, UseFieldArrayRemove } from 'react-hook-form';
import type { ImportBatchLine, ImportBatchStatus } from '../../../api/importBatch.api';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { getBatchTypeLabel } from '../../import-batch/utils/batchTypeLabels';
import {
    displayImportBatchLineCodeRaw,
    formatImportBatchLineCode,
    importBatchCodeMonospaceSx,
} from '../../import-batch/utils/importBatchCode';
import { CreateTicketFormValues } from '../../../schemas/ticket.schema';
import { TicketSerialImageField } from './TicketSerialImageField';

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
    fields: FieldArrayWithId<CreateTicketFormValues, 'serials', 'id'>[];
    append: UseFieldArrayAppend<CreateTicketFormValues, 'serials'>;
    remove: UseFieldArrayRemove;
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
    fields,
    append,
    remove,
}: ImportBatchLineImportTabsProps) => {
    const activeLine = lines.find((line) => String(line.id) === String(activeLineId));
    const activeProgress = activeLine ? lineProgress(activeLine) : null;
    const canImport =
        batchStatus === 'DRAFT' && !!activeLine && activeProgress && !activeProgress.isComplete;

    const activeTabIndex = Math.max(
        0,
        lines.findIndex((line) => String(line.id) === String(activeLineId))
    );

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
                            mb: 2.5,
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

                    <Box sx={{ mb: 2 }}>
                        <Controller
                            name="numbers"
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    label="Dãy số"
                                    fullWidth
                                    disabled={!canImport}
                                    error={!!fieldState.error}
                                    helperText={fieldState.error?.message}
                                    autoFocus={canImport}
                                />
                            )}
                        />
                    </Box>

                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 1.5 }}
                    >
                        <Typography variant="subtitle2" fontWeight={700}>
                            Số sê-ri
                        </Typography>
                        <LoadingButton
                            type="button"
                            variant="outlined"
                            size="small"
                            label="Thêm dòng"
                            startIcon={<AddIcon />}
                            onClick={() => append({ serialNumber: '', ticketImg: undefined })}
                            disabled={!canImport}
                            sx={{ minHeight: '2rem' }}
                        />
                    </Stack>

                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell width={48}>#</TableCell>
                                    <TableCell>Số sê-ri</TableCell>
                                    <TableCell width={140}>Ảnh vé</TableCell>
                                    <TableCell width={48} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {fields.map((item, index) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell sx={{ py: 1 }}>
                                            <Controller
                                                name={`serials.${index}.serialNumber`}
                                                control={control}
                                                render={({ field, fieldState }) => (
                                                    <TextField
                                                        {...field}
                                                        size="small"
                                                        fullWidth
                                                        placeholder="Nhập số sê-ri"
                                                        disabled={!canImport}
                                                        error={!!fieldState.error}
                                                        helperText={fieldState.error?.message}
                                                    />
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ py: 1 }}>
                                            <TicketSerialImageField
                                                control={control}
                                                index={index}
                                                compact
                                                disabled={!canImport}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ py: 1 }}>
                                            {fields.length > 1 && (
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    aria-label="Xóa dòng"
                                                    disabled={!canImport}
                                                    onClick={() => remove(index)}
                                                >
                                                    <DeleteOutlineIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {errors.serials?.message && (
                        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                            {errors.serials.message}
                        </Typography>
                    )}
                </Box>
            )}
        </Paper>
    );
};
