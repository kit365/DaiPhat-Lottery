import {
    Chip,
    FormControl,
    IconButton,
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
    const batchType = resolvedBatchType ?? selectedStation?.resolvedBatchType;

    useEffect(() => {
        if (selectedStation?.resolvedBatchType) {
            setValue(`lines.${index}.resolvedBatchType`, selectedStation.resolvedBatchType, {
                shouldValidate: true,
            });
        }
    }, [selectedStation?.resolvedBatchType, index, setValue]);

    const lineTotal = (declareQuantity || 0) * (importCost || 0);

    return (
        <TableRow>
            <TableCell>
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
            <TableCell>
                <Typography variant="body2">
                    {drawDate ? dayjs(drawDate).format('DD/MM/YYYY') : '—'}
                </Typography>
            </TableCell>
            <TableCell>
                {batchType ? (
                    <Chip
                        label={getBatchTypeLabel(batchType)}
                        size="small"
                        color={batchType === 'ADJUSTMENT' || batchType === 'LATE_IMPORT' ? 'warning' : 'default'}
                    />
                ) : (
                    <Typography variant="caption" color="text.secondary">
                        Chọn đài
                    </Typography>
                )}
            </TableCell>
            <TableCell>
                <Controller
                    name={`lines.${index}.declareQuantity`}
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            type="number"
                            size="small"
                            fullWidth
                            error={!!errors?.declareQuantity}
                            helperText={errors?.declareQuantity?.message}
                        />
                    )}
                />
            </TableCell>
            <TableCell>
                <Controller
                    name={`lines.${index}.importCost`}
                    control={control}
                    render={({ field }) => (
                        <TextField
                            {...field}
                            type="number"
                            size="small"
                            fullWidth
                            error={!!errors?.importCost}
                            helperText={errors?.importCost?.message}
                        />
                    )}
                />
            </TableCell>
            <TableCell align="right">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {lineTotal.toLocaleString('vi-VN')}
                </Typography>
            </TableCell>
            <TableCell align="center">
                {canRemove && (
                    <IconButton size="small" color="error" onClick={onRemove} aria-label="Xóa dòng">
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                )}
            </TableCell>
        </TableRow>
    );
};
