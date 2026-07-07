import {
    Chip,
    FormControl,
    IconButton,
    InputAdornment,
    InputLabel,
    MenuItem,
    Select,
    TableCell,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Controller, Control, UseFormSetValue } from 'react-hook-form';
import { memo, useMemo } from 'react';
import dayjs from 'dayjs';
import { CreateImportBatchFormValues, UpdateImportBatchFormValues } from '../schemas/importBatch.schema';
import { getBatchTypeLabel, getImportBatchLineStatusLabel } from '../utils/batchTypeLabels';
import { resolveDisplayBatchType } from '../utils/importBatchDrawDate';
import {
    formatViInteger,
    parseNonNegativeIntegerInput,
    preventNumberInputWheel,
} from '../../supplier/utils/supplierNumberFields';
import { computeImportBatchLineTotal } from '../utils/importBatchTotals';
import type { ImportBatchEligibleStation, ImportBatchLineStatus, ImportBatchType } from '../../../api/importBatch.api';

type ImportBatchLineFormValues = CreateImportBatchFormValues | UpdateImportBatchFormValues;

interface ImportBatchLineRowProps {
    index: number;
    control: Control<ImportBatchLineFormValues>;
    setValue: UseFormSetValue<ImportBatchLineFormValues>;
    drawDate: string;
    eligibleStations: ImportBatchEligibleStation[];
    declareQuantity: number;
    importCost: number;
    lotteryStationId: number;
    resolvedBatchType?: ImportBatchType;
    /** Station IDs already chosen in other rows — excluded from this row's dropdown. */
    selectedStationIdsInOtherRows: number[];
    canRemove: boolean;
    onRemove: () => void;
    readOnly?: boolean;
    lineStatus?: ImportBatchLineStatus;
    stationLocked?: boolean;
    stationName?: string;
    /** When false, inline field errors are hidden until form submit. */
    showErrors?: boolean;
}

export const ImportBatchLineRow = memo(function ImportBatchLineRow({
    index,
    control,
    setValue,
    drawDate,
    eligibleStations,
    declareQuantity,
    importCost,
    lotteryStationId,
    resolvedBatchType,
    selectedStationIdsInOtherRows,
    canRemove,
    onRemove,
    readOnly = false,
    lineStatus,
    stationLocked = false,
    stationName,
    showErrors = true,
}: ImportBatchLineRowProps) {
    const selectedStation = eligibleStations.find((s) => s.lotteryStationId === lotteryStationId);
    const batchType = resolveDisplayBatchType(resolvedBatchType, selectedStation?.resolvedBatchType);
    const displayStationName =
        stationName || selectedStation?.name || (lotteryStationId ? `Đài #${lotteryStationId}` : '—');

    const lineTotal = computeImportBatchLineTotal({
        lotteryStationId,
        declareQuantity,
        importCost,
    });

    const availableStations = useMemo(
        () =>
            eligibleStations.filter(
                (station) =>
                    station.lotteryStationId === lotteryStationId
                    || !selectedStationIdsInOtherRows.includes(station.lotteryStationId)
            ),
        [eligibleStations, lotteryStationId, selectedStationIdsInOtherRows]
    );

    return (
        <TableRow>
            <TableCell sx={{ width: '26%', minWidth: 140, maxWidth: 220 }}>
                {readOnly || stationLocked ? (
                    <Typography variant="body2">{displayStationName}</Typography>
                ) : (
                    <Controller
                        name={`lines.${index}.lotteryStationId`}
                        control={control}
                        render={({ field, fieldState }) => (
                            <FormControl fullWidth size="small" error={showErrors && !!fieldState.error}>
                                <InputLabel>Nhà đài</InputLabel>
                                <Select
                                    name={field.name}
                                    onBlur={field.onBlur}
                                    inputRef={field.ref}
                                    label="Nhà đài"
                                    value={field.value && field.value > 0 ? field.value : ''}
                                    onChange={(e) => {
                                        const stationId = Number(e.target.value);
                                        field.onChange(stationId);
                                        const station = eligibleStations.find(
                                            (s) => s.lotteryStationId === stationId
                                        );
                                        setValue(
                                            `lines.${index}.resolvedBatchType`,
                                            station?.resolvedBatchType,
                                            { shouldValidate: true, shouldDirty: true }
                                        );
                                    }}
                                    disabled={eligibleStations.length === 0}
                                >
                                    {availableStations.map((station) => (
                                        <MenuItem key={station.lotteryStationId} value={station.lotteryStationId}>
                                            {station.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {showErrors && fieldState.error && (
                                    <Typography variant="caption" color="error">
                                        {fieldState.error.message}
                                    </Typography>
                                )}
                            </FormControl>
                        )}
                    />
                )}
            </TableCell>
            <TableCell sx={{ width: 100, whiteSpace: 'nowrap' }}>
                <Typography variant="body2">
                    {drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : '—'}
                </Typography>
            </TableCell>
            <TableCell sx={{ width: 168, whiteSpace: 'nowrap' }}>
                {batchType ? (
                    <Chip
                        label={getBatchTypeLabel(batchType)}
                        size="small"
                        color={batchType === 'ADJUSTMENT' || batchType === 'LATE_IMPORT' ? 'warning' : 'default'}
                        sx={{
                            maxWidth: '100%',
                            '& .MuiChip-label': {
                                overflow: 'visible',
                                whiteSpace: 'nowrap',
                                textOverflow: 'clip',
                            },
                        }}
                    />
                ) : (
                    <Typography variant="caption" color="text.secondary">
                        Chọn đài
                    </Typography>
                )}
            </TableCell>
            {readOnly && lineStatus && (
                <TableCell sx={{ width: 120, whiteSpace: 'nowrap' }}>
                    <Chip label={getImportBatchLineStatusLabel(lineStatus)} size="small" />
                </TableCell>
            )}
            <TableCell sx={{ width: 88 }}>
                {readOnly ? (
                    <Typography variant="body2">{declareQuantity}</Typography>
                ) : (
                    <Controller
                        name={`lines.${index}.declareQuantity`}
                        control={control}
                        render={({ field, fieldState }) => (
                            <TextField
                                {...field}
                                type="number"
                                size="small"
                                error={showErrors && !!fieldState.error}
                                helperText={showErrors ? fieldState.error?.message : undefined}
                                sx={{ width: 72 }}
                                inputProps={{ min: 1 }}
                            />
                        )}
                    />
                )}
            </TableCell>
            <TableCell sx={{ width: 148 }}>
                {readOnly ? (
                    <Typography variant="body2">{Number(importCost).toLocaleString('vi-VN')} VNĐ</Typography>
                ) : (
                    <Controller
                        name={`lines.${index}.importCost`}
                        control={control}
                        render={({ field, fieldState }) => (
                            <TextField
                                name={field.name}
                                onBlur={field.onBlur}
                                inputRef={field.ref}
                                value={formatViInteger(field.value)}
                                size="small"
                                error={showErrors && !!fieldState.error}
                                helperText={showErrors ? fieldState.error?.message : undefined}
                                sx={{ width: 132 }}
                                onChange={(e) => {
                                    const parsed = parseNonNegativeIntegerInput(e.target.value);
                                    field.onChange(parsed ?? undefined);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                        e.preventDefault();
                                    }
                                }}
                                onWheel={preventNumberInputWheel}
                                inputProps={{ inputMode: 'numeric' }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Typography variant="body2" color="text.secondary">
                                                VNĐ
                                            </Typography>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        )}
                    />
                )}
            </TableCell>
            <TableCell align="right" sx={{ width: 108, whiteSpace: 'nowrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {lineTotal.toLocaleString('vi-VN')} VNĐ
                </Typography>
            </TableCell>
            <TableCell align="center" sx={{ width: 48, px: 0.5 }}>
                {canRemove && !readOnly && (
                    <IconButton size="small" color="error" onClick={onRemove} aria-label="Xóa dòng">
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                )}
            </TableCell>
        </TableRow>
    );
});
