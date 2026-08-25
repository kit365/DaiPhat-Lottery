import { useEffect, useRef } from 'react';
import {
    Box,
    Checkbox,
    Chip,
    FormControl,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import type { FieldValidationResult, OcrReviewRow } from '../types/ticketOcr.type';
import {
    OCR_FIELD_KEYS,
    OCR_FIELD_LABELS,
    canConfirmReviewRow,
    evaluateOcrFieldUiStatus,
    formatConfidence,
    formatTicketPriceDisplay,
    getConfidenceEmphasis,
    getOcrFieldUiLabel,
    getOverallValidationLabel,
    getScanStatusBadgeClass,
    getScanStatusLabel,
    ocrFieldUiChipColor,
    type OcrFieldKey,
    type OcrRowValidationContext,
} from '../utils/ocrImportHelpers';
import type { OcrFieldSelection } from './OcrReviewImagePane';

export type OcrStationOption = {
    id: number;
    name: string;
    code?: string;
};

type Props = {
    rows: OcrReviewRow[];
    selection: OcrFieldSelection | null;
    stationLabel: (stationId?: number) => string;
    stations?: OcrStationOption[];
    /** Prefer schedule-aware stations for the row's draw date. */
    stationsForRow?: (row: OcrReviewRow) => OcrStationOption[];
    validationContextForRow?: (row: OcrReviewRow) => OcrRowValidationContext | undefined;
    onSelect: (selection: OcrFieldSelection) => void;
    onToggle: (key: string, checked: boolean) => void;
    onUpdate: (key: string, patch: Partial<OcrReviewRow>) => void;
    /** When true, omit outer spacing wrapper (used inside per-image groups). */
    embedded?: boolean;
};

const chipColor = (status?: string | null): 'success' | 'warning' | 'error' | 'default' | 'info' => {
    switch (status) {
        case 'MATCHED':
        case 'VALID':
            return 'success';
        case 'UNCERTAIN':
        case 'NEEDS_REVIEW':
        case 'PARTIAL':
            return 'warning';
        case 'UNREADABLE':
        case 'FAILED':
            return 'info';
        case 'MISMATCHED':
        case 'NOT_FOUND':
        case 'INVALID':
        case 'INCOMPLETE':
            return 'error';
        default:
            return 'default';
    }
};

const fieldValue = (row: OcrReviewRow, fieldKey: OcrFieldKey, stationLabel: string): string => {
    switch (fieldKey) {
        case 'stationName':
            return row.stationName || stationLabel || '—';
        case 'batchCode':
            return row.batchCode || '—';
        case 'numbers':
            return row.numbers || '—';
        case 'serialNumber':
            return row.serialNumber || '—';
        case 'drawDate':
            return row.drawDate ? dayjs(row.drawDate).format('DD/MM/YYYY') : '—';
        case 'ticketType':
            return formatTicketPriceDisplay(row.ticketType);
        default:
            return '—';
    }
};

function FieldRow({
    row,
    fieldKey,
    label,
    editable,
    stationLabel,
    stations,
    validationCtx,
    highlighted,
    onSelect,
    onUpdate,
}: {
    row: OcrReviewRow;
    fieldKey: OcrFieldKey;
    label: string;
    editable?: 'numbers' | 'serialNumber' | 'drawDate' | 'stationId' | 'batchCode' | 'ticketType';
    stationLabel: string;
    stations: OcrStationOption[];
    validationCtx?: OcrRowValidationContext;
    highlighted: boolean;
    onSelect: () => void;
    onUpdate: (key: string, patch: Partial<OcrReviewRow>) => void;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const validation: FieldValidationResult | undefined = row.fieldValidations[fieldKey];
    const ocrConf = row.fields?.[fieldKey]?.confidence ?? row.fieldConfidences[fieldKey];
    const uiStatus = evaluateOcrFieldUiStatus(row, fieldKey, validationCtx);
    const mismatched = uiStatus.status === 'invalid';
    const unreadable = uiStatus.status === 'unreadable';
    const emphasis = getConfidenceEmphasis(ocrConf);
    const missingStation = fieldKey === 'stationName' && row.stationId == null;

    useEffect(() => {
        if (highlighted && ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [highlighted]);

    return (
        <Stack
            ref={ref}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            alignItems={{ sm: 'center' }}
            onClick={(event) => {
                event.stopPropagation();
                onSelect();
            }}
            sx={{
                py: 0.75,
                px: 1,
                borderRadius: 1,
                cursor: 'pointer',
                outline: highlighted ? '2px solid' : undefined,
                outlineColor: highlighted ? 'primary.main' : undefined,
                bgcolor: mismatched || missingStation
                    ? 'rgba(239,68,68,0.08)'
                    : unreadable
                      ? 'rgba(14,165,233,0.08)'
                      : uiStatus.status === 'corrected'
                        ? 'rgba(14,165,233,0.06)'
                        : emphasis === 'low'
                          ? 'rgba(239,68,68,0.05)'
                          : emphasis === 'medium'
                            ? 'rgba(245,158,11,0.06)'
                            : highlighted
                              ? 'rgba(37,99,235,0.06)'
                              : undefined,
            }}
        >
            <Typography variant="caption" sx={{ minWidth: 88, fontWeight: 700 }}>
                {label}
            </Typography>
            <Box flex={1}>
                {editable === 'numbers' ? (
                    <TextField
                        size="small"
                        fullWidth
                        value={row.numbers}
                        error={mismatched}
                        onFocus={onSelect}
                        onChange={(event) =>
                            onUpdate(row.key, { numbers: event.target.value })
                        }
                    />
                ) : editable === 'serialNumber' ? (
                    <TextField
                        size="small"
                        fullWidth
                        value={row.serialNumber}
                        error={mismatched}
                        onFocus={onSelect}
                        onChange={(event) =>
                            onUpdate(row.key, { serialNumber: event.target.value })
                        }
                    />
                ) : editable === 'batchCode' ? (
                    <TextField
                        size="small"
                        fullWidth
                        value={row.batchCode ?? ''}
                        placeholder="Mã lô sản xuất trên vé"
                        onFocus={onSelect}
                        onChange={(event) =>
                            onUpdate(row.key, { batchCode: event.target.value })
                        }
                    />
                ) : editable === 'ticketType' ? (
                    <TextField
                        size="small"
                        fullWidth
                        value={row.ticketType ?? ''}
                        error={mismatched}
                        placeholder="Giá vé"
                        onFocus={onSelect}
                        onChange={(event) =>
                            onUpdate(row.key, { ticketType: event.target.value })
                        }
                    />
                ) : editable === 'drawDate' ? (
                    <TextField
                        size="small"
                        fullWidth
                        type="date"
                        value={row.drawDate ? dayjs(row.drawDate).format('YYYY-MM-DD') : ''}
                        error={!row.drawDate?.trim() || mismatched}
                        InputLabelProps={{ shrink: true }}
                        onFocus={onSelect}
                        onChange={(event) =>
                            onUpdate(row.key, { drawDate: event.target.value || null })
                        }
                    />
                ) : editable === 'stationId' ? (
                    <FormControl size="small" fullWidth error={missingStation || mismatched}>
                        <Select
                            displayEmpty
                            value={row.stationId ?? ''}
                            onFocus={onSelect}
                            onChange={(event) => {
                                const raw = String(event.target.value ?? '');
                                const nextId = raw === '' ? null : Number(raw);
                                const matched = stations.find((s) => s.id === nextId);
                                onUpdate(row.key, {
                                    stationId: nextId,
                                    stationName: matched?.name ?? row.stationName,
                                });
                            }}
                        >
                            <MenuItem value="">
                                <em>Chọn nhà đài (xổ đúng ngày vé)</em>
                            </MenuItem>
                            {stations.map((station) => (
                                <MenuItem key={station.id} value={station.id}>
                                    {station.name}
                                    {station.code ? ` (${station.code})` : ''}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : (
                    <Typography variant="body2">{fieldValue(row, fieldKey, stationLabel)}</Typography>
                )}
                {(uiStatus.message || validation?.message) && (
                    <Typography
                        variant="caption"
                        color={
                            uiStatus.status === 'unreadable'
                                ? 'info.main'
                                : uiStatus.status === 'invalid'
                                  ? 'error.main'
                                  : 'text.secondary'
                        }
                        display="block"
                    >
                        {uiStatus.message || validation?.message}
                    </Typography>
                )}
                {missingStation && (
                    <Typography variant="caption" color="error.main" display="block">
                        Cần chọn nhà đài trước khi xác nhận nhập.
                    </Typography>
                )}
                {unreadable && !row.fields?.[fieldKey]?.boundingBox && !row.fieldBoxes?.[fieldKey] && (
                    <Typography variant="caption" color="text.secondary" display="block">
                        Không có khung vùng cho trường này (không đọc được trên ảnh).
                    </Typography>
                )}
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
                {ocrConf != null && (
                    <Typography
                        variant="caption"
                        color={
                            emphasis === 'low'
                                ? 'error.main'
                                : emphasis === 'medium'
                                  ? 'warning.main'
                                  : 'text.secondary'
                        }
                        fontWeight={emphasis === 'low' ? 700 : 400}
                    >
                        OCR {formatConfidence(ocrConf)}
                    </Typography>
                )}
                <Chip
                    size="small"
                    label={getOcrFieldUiLabel(uiStatus.status)}
                    color={ocrFieldUiChipColor(uiStatus.status)}
                    variant="outlined"
                />
            </Stack>
        </Stack>
    );
}

export default function OcrReviewResultCards({
    rows,
    selection,
    stationLabel,
    stations = [],
    stationsForRow,
    validationContextForRow,
    onSelect,
    onToggle,
    onUpdate,
    embedded = false,
}: Props) {
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        if (!selection?.rowKey) {
            return;
        }
        const node = cardRefs.current[selection.rowKey];
        if (node) {
            node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selection?.rowKey, selection?.fieldName]);

    return (
        <Stack spacing={1.5} sx={embedded ? { maxHeight: 480, overflowY: 'auto', pr: 0.5 } : undefined}>
            {rows.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    Không nhận diện được vé trong ảnh này.
                </Typography>
            ) : (
                rows.map((row, indexInImage) => {
                const ctx = validationContextForRow?.(row);
                const confirmable = canConfirmReviewRow(row, ctx);
                const rowStations = stationsForRow?.(row) ?? stations;
                const cardSelected = selection?.rowKey === row.key;
                const displayConfidence =
                    row.adjustedConfidence != null ? row.adjustedConfidence : row.confidence;
                const resolvedStationLabel = stationLabel(row.stationId ?? undefined);

                return (
                    <Box
                        key={row.key}
                        ref={(node: HTMLDivElement | null) => {
                            cardRefs.current[row.key] = node;
                        }}
                        onClick={() => onSelect({ rowKey: row.key, fieldName: null })}
                        sx={{
                            border: '1px solid',
                            borderColor: cardSelected ? 'primary.main' : 'divider',
                            borderRadius: 1.5,
                            p: 1.5,
                            cursor: 'pointer',
                            bgcolor:
                                row.status === 'FAILED' ||
                                row.overallValidationStatus === 'INVALID' ||
                                row.duplicate
                                    ? 'rgba(239,68,68,0.06)'
                                    : row.status === 'PARTIAL' ||
                                        row.overallValidationStatus === 'NEEDS_REVIEW'
                                      ? 'rgba(245,158,11,0.06)'
                                      : cardSelected
                                        ? 'rgba(37,99,235,0.04)'
                                        : 'background.paper',
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                            <Checkbox
                                checked={row.selected}
                                disabled={!confirmable && !row.selected}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(_, checked) => onToggle(row.key, checked)}
                            />
                            <Stack spacing={1} flex={1}>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    flexWrap="wrap"
                                    useFlexGap
                                >
                                    <Typography fontWeight={700}>
                                        Vé #{indexInImage + 1}
                                    </Typography>
                                    <span
                                        className={`admin-status-badge ${getScanStatusBadgeClass(row.status)}`}
                                    >
                                        {getScanStatusLabel(row.status)}
                                    </span>
                                    <Chip
                                        size="small"
                                        label={getOverallValidationLabel(row.overallValidationStatus)}
                                        color={chipColor(row.overallValidationStatus)}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        Confidence {formatConfidence(displayConfidence)}
                                        {row.adjustedConfidence != null &&
                                            ` (OCR ${formatConfidence(row.confidence)})`}
                                    </Typography>
                                </Stack>

                                {(row.businessValidationErrors?.length ?? 0) > 0 && (
                                    <Stack spacing={0.25}>
                                        {row.businessValidationErrors.map((msg) => (
                                            <Typography
                                                key={msg}
                                                variant="caption"
                                                color="error.main"
                                                fontWeight={600}
                                            >
                                                {msg}
                                            </Typography>
                                        ))}
                                    </Stack>
                                )}

                                {OCR_FIELD_KEYS.map((fieldKey) => (
                                    <FieldRow
                                        key={fieldKey}
                                        row={row}
                                        fieldKey={fieldKey}
                                        label={OCR_FIELD_LABELS[fieldKey]}
                                        editable={
                                            fieldKey === 'numbers'
                                                ? 'numbers'
                                                : fieldKey === 'serialNumber'
                                                  ? 'serialNumber'
                                                  : fieldKey === 'drawDate'
                                                    ? 'drawDate'
                                                    : fieldKey === 'stationName'
                                                      ? 'stationId'
                                                      : fieldKey === 'batchCode'
                                                        ? 'batchCode'
                                                        : fieldKey === 'ticketType'
                                                          ? 'ticketType'
                                                          : undefined
                                        }
                                        stationLabel={resolvedStationLabel}
                                        stations={rowStations}
                                        validationCtx={ctx}
                                        highlighted={
                                            selection?.rowKey === row.key &&
                                            selection.fieldName === fieldKey
                                        }
                                        onSelect={() =>
                                            onSelect({ rowKey: row.key, fieldName: fieldKey })
                                        }
                                        onUpdate={onUpdate}
                                    />
                                ))}
                            </Stack>
                        </Stack>
                    </Box>
                );
            })
            )}
        </Stack>
    );
}
