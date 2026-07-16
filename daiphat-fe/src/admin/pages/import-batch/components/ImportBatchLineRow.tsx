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
import { memo, useMemo, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { CreateImportBatchFormValues, UpdateImportBatchFormValues } from '../schemas/importBatch.schema';
import { getBatchTypeLabel, getImportBatchLineStatusLabel, getImportBatchLineStatusChipColor } from '../utils/batchTypeLabels';
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
    control: Control<any>;
    setValue: UseFormSetValue<any>;
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
    importedQuantity?: number;
    showStatusColumn?: boolean;
    showProgressColumn?: boolean;
    /** When false, inline field errors are hidden until form submit. */
    showErrors?: boolean;
    /** Temporary highlight for rows restored from the create screen. */
    highlighted?: boolean;
    /** Highlights declare quantity when batch total was reduced below line sum (draft lines). */
    declareQuantityHighlighted?: boolean;
    declareQuantityAdjustmentHelper?: string;
    shouldScrollDeclareQuantityIntoView?: boolean;
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
    importedQuantity = 0,
    showStatusColumn = false,
    showProgressColumn = false,
    showErrors = true,
    highlighted = false,
    declareQuantityHighlighted = false,
    declareQuantityAdjustmentHelper,
    shouldScrollDeclareQuantityIntoView = false,
}: ImportBatchLineRowProps) {
    const selectedStation = eligibleStations.find((s) => s.lotteryStationId === lotteryStationId);
    const batchType = resolveDisplayBatchType(resolvedBatchType, selectedStation?.resolvedBatchType);
    const displayStationName =
        stationName || selectedStation?.name || (lotteryStationId ? `Đài #${lotteryStationId}` : '—');

    const showStationSelect = !readOnly && !stationLocked;

    const lineTotal = computeImportBatchLineTotal({
        lotteryStationId,
        declareQuantity,
        importCost,
    });

    const availableStations = useMemo(() => {
        const filtered = eligibleStations.filter(
            (station) =>
                station.lotteryStationId === lotteryStationId
                || !selectedStationIdsInOtherRows.includes(station.lotteryStationId)
        );

        if (
            lotteryStationId > 0
            && !filtered.some((station) => station.lotteryStationId === lotteryStationId)
        ) {
            const current =
                eligibleStations.find((station) => station.lotteryStationId === lotteryStationId) ??
                (displayStationName
                    ? {
                          lotteryStationId,
                          name: displayStationName,
                          resolvedBatchType: batchType ?? ('NEW' as ImportBatchType),
                      }
                    : null);
            if (current) {
                return [current, ...filtered];
            }
        }

        return filtered;
    }, [
        eligibleStations,
        lotteryStationId,
        selectedStationIdsInOtherRows,
        displayStationName,
        batchType,
    ]);

    const declareQuantityMin = Math.max(
        1,
        lineStatus === 'IMPORTING' || lineStatus === 'IMPORTED' ? importedQuantity : 1
    );
    const declareQuantityInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (shouldScrollDeclareQuantityIntoView && declareQuantityInputRef.current) {
            declareQuantityInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [shouldScrollDeclareQuantityIntoView]);

    return (
        <TableRow
            sx={{
                verticalAlign: 'middle',
                bgcolor: highlighted ? 'rgba(255, 236, 179, 0.65)' : 'transparent',
                transition: 'background-color 0.8s ease',
                '& > td': {
                    py: 1.25,
                    verticalAlign: 'middle',
                },
            }}
        >
            <TableCell sx={{ width: '22%', minWidth: 140 }}>
                {!showStationSelect ? (
                    <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.5 }}>
                        {displayStationName}
                    </Typography>
                ) : (
                    <Controller
                        name={`lines.${index}.lotteryStationId`}
                        control={control}
                        render={({ field, fieldState }) => (
                            <FormControl
                                fullWidth
                                size="small"
                                error={showErrors && !!fieldState.error}
                                sx={{ '& .MuiFormHelperText-root': { mx: 0 } }}
                            >
                                <InputLabel id={`station-label-${index}`}>Nhà đài</InputLabel>
                                <Select
                                    labelId={`station-label-${index}`}
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
                                        setValue(
                                            `lines.${index}.stationName`,
                                            station?.name,
                                            { shouldDirty: true, shouldValidate: false }
                                        );
                                    }}
                                    disabled={stationLocked || eligibleStations.length === 0}
                                    sx={{ minHeight: 40 }}
                                >
                                    {availableStations.map((station) => (
                                        <MenuItem key={station.lotteryStationId} value={station.lotteryStationId}>
                                            {station.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {showErrors && fieldState.error && (
                                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
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
            {showStatusColumn && (
                <TableCell sx={{ width: 120, whiteSpace: 'nowrap' }}>
                    {lineStatus ? (
                        <Chip
                            label={getImportBatchLineStatusLabel(lineStatus)}
                            size="small"
                            color={getImportBatchLineStatusChipColor(lineStatus)}
                        />
                    ) : null}
                </TableCell>
            )}
            {showProgressColumn && (
                <TableCell sx={{ width: 108, whiteSpace: 'nowrap' }}>
                    {importedQuantity > 0 ? (
                        <Typography variant="body2">
                            {importedQuantity.toLocaleString('vi-VN')} /{' '}
                            {declareQuantity.toLocaleString('vi-VN')}
                        </Typography>
                    ) : null}
                </TableCell>
            )}
            <TableCell sx={{ width: 88 }}>
                {readOnly ? (
                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                        {declareQuantity.toLocaleString('vi-VN')}
                    </Typography>
                ) : (
                    <Controller
                        name={`lines.${index}.declareQuantity`}
                        control={control}
                        render={({ field, fieldState }) => (
                            <TextField
                                {...field}
                                type="number"
                                size="small"
                                inputRef={(element) => {
                                    field.ref(element);
                                    declareQuantityInputRef.current = element;
                                }}
                                error={
                                    (showErrors && !!fieldState.error) || declareQuantityHighlighted
                                }
                                helperText={
                                    declareQuantityAdjustmentHelper ??
                                    (showErrors ? fieldState.error?.message : undefined)
                                }
                                sx={{
                                    width: 80,
                                    '& .MuiFormHelperText-root': { mx: 0, whiteSpace: 'normal' },
                                    ...(declareQuantityHighlighted
                                        ? {
                                              '& .MuiOutlinedInput-root': {
                                                  bgcolor: 'rgba(255, 236, 179, 0.45)',
                                                  '& fieldset': {
                                                      borderColor: 'warning.main',
                                                      borderWidth: 2,
                                                  },
                                              },
                                          }
                                        : {}),
                                }}
                                inputProps={{ min: declareQuantityMin }}
                            />
                        )}
                    />
                )}
            </TableCell>
            <TableCell sx={{ width: 148 }}>
                {readOnly ? (
                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                        {Number(importCost).toLocaleString('vi-VN')} VNĐ
                    </Typography>
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
                                sx={{
                                    width: 136,
                                    '& .MuiFormHelperText-root': { mx: 0 },
                                }}
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
                                            <Typography variant="caption" color="text.secondary">
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
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.5 }}>
                    {lineTotal.toLocaleString('vi-VN')} VNĐ
                </Typography>
            </TableCell>
            <TableCell align="center" sx={{ width: 48, px: 0.5 }}>
                {canRemove && (
                    <IconButton size="small" color="error" onClick={onRemove} aria-label="Xóa dòng">
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                )}
            </TableCell>
        </TableRow>
    );
});
