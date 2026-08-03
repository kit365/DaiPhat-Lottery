"use client";

import {
    Box,
    Button,
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
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { Controller, Control, UseFormSetValue } from 'react-hook-form';
import { memo, useMemo, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { CreateImportBatchFormValues, UpdateImportBatchFormValues } from '../../schemas/importBatch.schema';
import { getBatchTypeLabel, getImportBatchLineStatusLabel, getImportBatchLineStatusChipColor } from '../../utils/batchTypeLabels';
import { resolveDisplayBatchType } from '../../utils/importBatchDrawDate';
import {
    formatViInteger,
    parseNonNegativeIntegerInput,
    preventNumberInputWheel,
} from '../../../../supplier';
import { computeImportBatchLineTotal } from '../../utils/importBatchTotals';
import { computeImportCostFromStation, formatImportCost } from '../../utils/importCostCalculator';
import type { ImportBatchEligibleStation, ImportBatchLineStatus, ImportBatchType } from '../../types/importBatch.type';

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
    canPause?: boolean;
    onPause?: () => void;
    pausePending?: boolean;
    canResume?: boolean;
    onResume?: () => void;
    resumePending?: boolean;
    /** Opens dedicated Pause & Adjust Quantity dialog for PAUSED lines. */
    canAdjustDeclareQuantity?: boolean;
    onAdjustDeclareQuantity?: () => void;
    /** Locks station + cost (IMPORTED / CANCELLED). */
    readOnly?: boolean;
    /** Locks declare quantity (IMPORTING / PAUSED / terminal — OPEN only is editable inline). */
    declareQuantityReadOnly?: boolean;
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
    canPause = false,
    onPause,
    pausePending = false,
    canResume = false,
    onResume,
    resumePending = false,
    canAdjustDeclareQuantity = false,
    onAdjustDeclareQuantity,
    readOnly = false,
    declareQuantityReadOnly = false,
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

    useEffect(() => {
        if (readOnly || stationLocked) {
            return;
        }
        const nextCost = computeImportCostFromStation(
            selectedStation?.price,
            selectedStation?.commissionRate
        );
        if (nextCost == null) {
            return;
        }
        if (Number(importCost) === nextCost) {
            return;
        }
        setValue(`lines.${index}.importCost`, nextCost, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }, [
        importCost,
        index,
        readOnly,
        selectedStation?.commissionRate,
        selectedStation?.price,
        setValue,
        stationLocked,
    ]);

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
                        color={batchType === 'ADJUSTMENT' ? 'warning' : 'default'}
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
            <TableCell sx={{ width: 112, overflow: 'visible' }}>
                {readOnly || declareQuantityReadOnly ? (
                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                        {declareQuantity.toLocaleString('vi-VN')}
                    </Typography>
                ) : (
                    <Controller
                        name={`lines.${index}.declareQuantity`}
                        control={control}
                        render={({ field, fieldState }) => (
                            <TextField
                                name={field.name}
                                onBlur={field.onBlur}
                                inputRef={(element) => {
                                    field.ref(element);
                                    declareQuantityInputRef.current = element;
                                }}
                                value={formatViInteger(field.value)}
                                size="small"
                                error={
                                    (showErrors && !!fieldState.error) || declareQuantityHighlighted
                                }
                                helperText={
                                    declareQuantityAdjustmentHelper ??
                                    (showErrors ? fieldState.error?.message : undefined)
                                }
                                sx={{
                                    width: 104,
                                    '& .MuiFormHelperText-root': { mx: 0, whiteSpace: 'normal' },
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: 'background.paper',
                                    },
                                    '& .MuiOutlinedInput-input': {
                                        py: 1,
                                        px: 1.25,
                                    },
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
                                onChange={(e) => {
                                    const parsed = parseNonNegativeIntegerInput(e.target.value);
                                    field.onChange(parsed ?? 0);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                                        e.preventDefault();
                                    }
                                }}
                                onWheel={preventNumberInputWheel}
                                inputProps={{
                                    inputMode: 'numeric',
                                    min: declareQuantityMin,
                                }}
                            />
                        )}
                    />
                )}
            </TableCell>
            <TableCell sx={{ width: 148 }}>
                <Typography variant="body2" sx={{ lineHeight: 1.5 }} title="Tính từ giá bán × (1 − hoa hồng đài)">
                    {formatImportCost(importCost)} VNĐ
                </Typography>
                <Controller
                    name={`lines.${index}.importCost`}
                    control={control}
                    render={({ field }) => <input type="hidden" {...field} value={field.value ?? ''} />}
                />
            </TableCell>
            <TableCell align="right" sx={{ width: 108, whiteSpace: 'nowrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.5 }}>
                    {formatImportCost(lineTotal)} VNĐ
                </Typography>
            </TableCell>
            <TableCell
                align="center"
                sx={{
                    width:
                        canPause || canResume || canAdjustDeclareQuantity || canRemove
                            ? 260
                            : 48,
                    px: 0.5,
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        flexWrap: 'wrap',
                    }}
                >
                    {canPause && (
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<PauseCircleOutlineIcon fontSize="small" />}
                            onClick={onPause}
                            disabled={pausePending || !onPause}
                            sx={{ whiteSpace: 'nowrap', minWidth: 0, px: 1 }}
                        >
                            Tạm dừng
                        </Button>
                    )}
                    {canAdjustDeclareQuantity && (
                        <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={onAdjustDeclareQuantity}
                            disabled={!onAdjustDeclareQuantity}
                            sx={{ whiteSpace: 'nowrap', minWidth: 0, px: 1 }}
                        >
                            Điều chỉnh SL
                        </Button>
                    )}
                    {canResume && (
                        <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<PlayCircleOutlineIcon fontSize="small" />}
                            onClick={onResume}
                            disabled={resumePending || !onResume}
                            sx={{ whiteSpace: 'nowrap', minWidth: 0, px: 1 }}
                        >
                            Tiếp tục
                        </Button>
                    )}
                    {canRemove && (
                        <IconButton size="small" color="error" onClick={onRemove} aria-label="Xóa dòng">
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
            </TableCell>
        </TableRow>
    );
});
