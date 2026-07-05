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
import { useEffect } from 'react';
import dayjs from 'dayjs';
import { CreateImportBatchFormValues } from '../schemas/importBatch.schema';
import { getBatchTypeLabel } from '../utils/batchTypeLabels';
import { isPastDrawDate, resolveDisplayBatchType } from '../utils/importBatchDrawDate';
import {
    formatViInteger,
    parseNonNegativeIntegerInput,
    preventNumberInputWheel,
} from '../../supplier/utils/supplierNumberFields';
import type { ImportBatchEligibleStation, ImportBatchType } from '../../../api/importBatch.api';

interface ImportBatchLineRowProps {
    index: number;
    control: Control<CreateImportBatchFormValues>;
    setValue: UseFormSetValue<CreateImportBatchFormValues>;
    drawDate: string;
    eligibleStations: ImportBatchEligibleStation[];
    declareQuantity: number;
    importCost: number;
    lotteryStationId: number;
    resolvedBatchType?: ImportBatchType;
    canRemove: boolean;
    onRemove: () => void;
    errors?: {
        lotteryStationId?: { message?: string };
        declareQuantity?: { message?: string };
        importCost?: { message?: string };
    };
}

export const ImportBatchLineRow = ({
    index,
    control,
    setValue,
    drawDate,
    eligibleStations,
    declareQuantity,
    importCost,
    lotteryStationId,
    resolvedBatchType,
    canRemove,
    onRemove,
    errors,
}: ImportBatchLineRowProps) => {
    const selectedStation = eligibleStations.find((s) => s.lotteryStationId === lotteryStationId);
    const batchType = resolveDisplayBatchType(
        drawDate,
        resolvedBatchType,
        selectedStation?.resolvedBatchType
    );

    useEffect(() => {
        if (selectedStation?.resolvedBatchType) {
            setValue(`lines.${index}.resolvedBatchType`, selectedStation.resolvedBatchType, {
                shouldValidate: true,
            });
        } else if (isPastDrawDate(drawDate)) {
            setValue(`lines.${index}.resolvedBatchType`, 'ADJUSTMENT', {
                shouldValidate: true,
            });
        }
    }, [selectedStation?.resolvedBatchType, drawDate, index, setValue]);

    const lineTotal = (declareQuantity || 0) * (importCost || 0);

    return (
        <TableRow>
            <TableCell sx={{ width: '26%', minWidth: 140, maxWidth: 220 }}>
                <Controller
                    name={`lines.${index}.lotteryStationId`}
                    control={control}
                    render={({ field }) => (
                        <FormControl fullWidth size="small" error={!!errors?.lotteryStationId}>
                            <InputLabel>Nhà đài</InputLabel>
                            <Select
                                {...field}
                                label="Nhà đài"
                                value={field.value || ''}
                                onChange={(e) => {
                                    const stationId = Number(e.target.value);
                                    field.onChange(stationId);
                                    const station = eligibleStations.find(
                                        (s) => s.lotteryStationId === stationId
                                    );
                                    if (station) {
                                        setValue(`lines.${index}.resolvedBatchType`, station.resolvedBatchType, {
                                            shouldValidate: true,
                                        });
                                    }
                                }}
                                disabled={eligibleStations.length === 0}
                            >
                                {eligibleStations.map((station) => (
                                    <MenuItem key={station.lotteryStationId} value={station.lotteryStationId}>
                                        {station.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors?.lotteryStationId && (
                                <Typography variant="caption" color="error">
                                    {errors.lotteryStationId.message}
                                </Typography>
                            )}
                        </FormControl>
                    )}
                />
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
            <TableCell sx={{ width: 88 }}>
                <Controller
                    name={`lines.${index}.declareQuantity`}
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            type="number"
                            size="small"
                            error={!!errors?.declareQuantity}
                            helperText={errors?.declareQuantity?.message}
                            sx={{ width: 72 }}
                            inputProps={{ min: 1 }}
                        />
                    )}
                />
            </TableCell>
            <TableCell sx={{ width: 148 }}>
                <Controller
                    name={`lines.${index}.importCost`}
                    control={control}
                    render={({ field }) => (
                        <TextField
                            name={field.name}
                            onBlur={field.onBlur}
                            inputRef={field.ref}
                            value={formatViInteger(field.value)}
                            size="small"
                            error={!!errors?.importCost}
                            helperText={errors?.importCost?.message}
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
            </TableCell>
            <TableCell align="right" sx={{ width: 108, whiteSpace: 'nowrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
};
