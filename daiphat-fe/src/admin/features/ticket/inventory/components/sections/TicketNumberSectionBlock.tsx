"use client";

import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    Box,
    Collapse,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import {
    Control,
    Controller,
    FieldErrors,
    useFieldArray,
    useFormState,
    useWatch,
} from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Button } from '../../../../../components/ui/Button';
import { CreateTicketFormValues } from '../../schemas/ticket.schema';
import { TicketSerialImageField } from './TicketSerialImageField';
import {
    getVisibleFieldErrorMessage,
    shouldShowFieldError,
} from '../../utils/ticketSerialValidation';
import {
    TicketNumberLengthRules,
    getTicketNumberLengthHint,
    sanitizeTicketNumberInput,
} from '../../utils/ticketNumberValidation';
import { isPersistedSerial } from '../../utils/ticketLineFormHydration';
import {
    buildSerialsForQuantity,
    getMaxQuantityForSection,
} from '../../utils/ticketSectionQuantity';

type TicketNumberSectionBlockProps = {
    sectionIndex: number;
    control: Control<CreateTicketFormValues>;
    errors: FieldErrors<CreateTicketFormValues>;
    canEdit: boolean;
    canRemove: boolean;
    numberLengthRules: TicketNumberLengthRules;
    compact?: boolean;
    remainingQuota?: number;
    onRemove: () => void;
    onSerialFieldChange?: (sectionIndex: number, serialIndex: number) => void;
    onRemoveSerial?: (sectionIndex: number, serialIndex: number) => void;
    onNumbersFieldChange?: (sectionIndex: number) => void;
};

const COMPACT_ROW_HEIGHT = 32;
const COMPACT_HEADER_FIELD_HEIGHT = 40;

const compactFieldSx = {
    '& .MuiInputBase-root': {
        minHeight: COMPACT_ROW_HEIGHT,
        height: COMPACT_ROW_HEIGHT,
    },
    '& .MuiInputBase-input': {
        py: 0,
        height: `${COMPACT_ROW_HEIGHT}px`,
        boxSizing: 'border-box',
        fontSize: '0.8125rem',
    },
    '& .MuiFormHelperText-root': {
        mt: 0.25,
        fontSize: '0.6875rem',
    },
};

const compactHeaderFieldSx = {
    '& .MuiInputBase-root': {
        minHeight: COMPACT_HEADER_FIELD_HEIGHT,
    },
    '& .MuiInputBase-input': {
        py: '10px',
        fontSize: '0.875rem',
        boxSizing: 'border-box',
    },
    '& .MuiInputLabel-root': {
        fontSize: '0.875rem',
    },
    '& .MuiFormHelperText-root': {
        mt: 0.25,
        fontSize: '0.6875rem',
    },
};

const compactActionButtonSx = {
    minHeight: '2rem !important',
    py: '2px !important',
    px: '10px !important',
    fontSize: '0.8125rem !important',
};

export const TicketNumberSectionBlock = ({
    sectionIndex,
    control,
    errors,
    canEdit,
    canRemove,
    numberLengthRules,
    compact = false,
    remainingQuota,
    onRemove,
    onSerialFieldChange,
    onRemoveSerial,
    onNumbersFieldChange,
}: TicketNumberSectionBlockProps) => {
    const { fields, replace, remove } = useFieldArray({
        control,
        name: `ticketSections.${sectionIndex}.serials`,
    });

    const sectionErrors = errors.ticketSections?.[sectionIndex];
    const { isSubmitted } = useFormState({ control });
    const [serialsExpanded, setSerialsExpanded] = useState(true);
    const watchedSerials = useWatch({
        control,
        name: `ticketSections.${sectionIndex}.serials`,
    });
    const sectionTicketId = useWatch({
        control,
        name: `ticketSections.${sectionIndex}.ticketId`,
    });
    const numbersLocked = sectionTicketId != null;
    const numbersEditable = canEdit && !numbersLocked;

    const filledSerialCount = (watchedSerials ?? []).filter(
        (serial) => !!serial?.serialNumber?.trim()
    ).length;

    const sectionSerialMessage =
        isSubmitted && sectionErrors?.serials?.message ? sectionErrors.serials.message : undefined;

    useEffect(() => {
        if (sectionSerialMessage) {
            setSerialsExpanded(true);
        }
    }, [sectionSerialMessage]);

    const watchedSections = useWatch({
        control,
        name: 'ticketSections',
    });

    const maxQuantity =
        remainingQuota != null
            ? getMaxQuantityForSection(watchedSections ?? [], sectionIndex, remainingQuota)
            : 999;

    return (
        <Box
            className={compact ? undefined : 'admin-ticket-create-section'}
            sx={
                compact
                    ? {
                          border: '1px solid var(--palette-divider)',
                          borderRadius: '8px',
                          bgcolor: 'var(--palette-grey-50)',
                          p: 1.25,
                      }
                    : undefined
            }
        >
            <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: compact ? 1 : 1.5 }}
            >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Typography
                        className="admin-form-title"
                        sx={{ fontSize: compact ? '0.8125rem !important' : '0.9375rem !important' }}
                    >
                        Dãy số #{sectionIndex + 1}
                        {numbersLocked ? ' (đã lưu)' : ''}
                    </Typography>
                    {!serialsExpanded && (
                        <Typography className="admin-form-helper">
                            ({fields.length} sê-ri
                            {filledSerialCount > 0 ? `, ${filledSerialCount} đã nhập` : ''})
                        </Typography>
                    )}
                </Stack>
                <Stack direction="row" spacing={0.25} alignItems="center">
                    <IconButton
                        size="small"
                        aria-label={serialsExpanded ? 'Thu gọn số sê-ri' : 'Mở rộng số sê-ri'}
                        aria-expanded={serialsExpanded}
                        onClick={() => setSerialsExpanded((prev) => !prev)}
                    >
                        {serialsExpanded ? (
                            <ExpandLessIcon fontSize="small" />
                        ) : (
                            <ExpandMoreIcon fontSize="small" />
                        )}
                    </IconButton>
                    {canRemove && !numbersLocked && (
                        <IconButton
                            size="small"
                            color="error"
                            aria-label="Xóa dãy số"
                            disabled={!canEdit}
                            onClick={onRemove}
                        >
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                    )}
                </Stack>
            </Stack>

            <Box id={`ticket-number-field-${sectionIndex}`} sx={{ mb: compact ? 1 : 1.5 }}>
                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Controller
                            name={`ticketSections.${sectionIndex}.numbers`}
                            control={control}
                            render={({ field, fieldState }) => (
                                <TextField
                                    {...field}
                                    label="Dãy số"
                                    size="small"
                                    fullWidth
                                    placeholder={getTicketNumberLengthHint(numberLengthRules)}
                                    disabled={!numbersEditable}
                                    InputProps={numbersLocked ? { readOnly: true } : undefined}
                                    error={shouldShowFieldError(fieldState, isSubmitted)}
                                    helperText={getVisibleFieldErrorMessage(fieldState, isSubmitted)}
                                    sx={compact ? compactHeaderFieldSx : undefined}
                                    inputProps={{
                                        inputMode: 'numeric',
                                        maxLength: numberLengthRules.maxLength,
                                    }}
                                    onChange={(event) => {
                                        const nextValue = sanitizeTicketNumberInput(
                                            event.target.value,
                                            numberLengthRules.maxLength
                                        );
                                        field.onChange(nextValue);
                                        onNumbersFieldChange?.(sectionIndex);
                                    }}
                                />
                            )}
                        />
                    </Box>
                    {compact && !numbersLocked && (
                        <Box sx={{ width: 80, flexShrink: 0 }}>
                            <Controller
                                name={`ticketSections.${sectionIndex}.quantity`}
                                control={control}
                                render={({ field, fieldState }) => {
                                    const qtyValue = field.value ?? 1;
                                    const isQuantityUnderFilled = qtyValue < filledSerialCount;
                                    const hasError = isQuantityUnderFilled || shouldShowFieldError(fieldState, isSubmitted);
                                    const errorMsg = isQuantityUnderFilled
                                        ? `SL (${qtyValue}) < ${filledSerialCount} sê-ri đã nhập. Vui lòng xóa bớt dòng sê-ri thừa.`
                                        : getVisibleFieldErrorMessage(fieldState, isSubmitted);

                                    return (
                                        <Box>
                                            <TextField
                                                {...field}
                                                value={qtyValue}
                                                label="SL"
                                                type="number"
                                                size="small"
                                                fullWidth
                                                disabled={!canEdit}
                                                error={Boolean(hasError)}
                                                helperText={compact ? undefined : errorMsg}
                                                sx={compact ? compactHeaderFieldSx : undefined}
                                                inputProps={{
                                                    min: 1,
                                                    max: maxQuantity,
                                                    inputMode: 'numeric',
                                                    style: { textAlign: 'center' },
                                                }}
                                                onChange={(event) => {
                                                    const raw = parseInt(event.target.value, 10);
                                                    const nextQty = Number.isFinite(raw)
                                                        ? Math.min(maxQuantity, Math.max(1, raw))
                                                        : 1;
                                                    field.onChange(nextQty);
                                                    if (nextQty >= filledSerialCount) {
                                                        replace(
                                                            buildSerialsForQuantity(
                                                                watchedSerials ?? [],
                                                                nextQty
                                                            )
                                                        );
                                                    }
                                                }}
                                            />
                                        </Box>
                                    );
                                }}
                            />
                        </Box>
                    )}
                </Stack>
                {compact && (useWatch({ control, name: `ticketSections.${sectionIndex}.quantity` }) ?? 1) < filledSerialCount && (
                    <Typography
                        variant="caption"
                        color="error"
                        sx={{
                            display: 'block',
                            mt: 0.75,
                            fontSize: '0.725rem',
                            lineHeight: 1.3,
                            fontWeight: 700,
                        }}
                    >
                        ⚠ Số lượng vé ({useWatch({ control, name: `ticketSections.${sectionIndex}.quantity` }) ?? 1}) nhỏ hơn {filledSerialCount} số sê-ri đã nhập. Vui lòng bấm biểu tượng thùng rác để xóa dòng sê-ri thừa.
                    </Typography>
                )}
            </Box>

            <Collapse in={serialsExpanded}>
                {!compact && (
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
                    <Typography className="admin-form-label" sx={{ fontSize: compact ? '0.75rem' : undefined }}>
                        Số sê-ri
                    </Typography>
                    <Button
                        type="button"
                        variant="outlined"
                        size="small"
                        className="btn-outlined-admin"
                        label="Thêm sê-ri"
                        startIcon={<AddIcon sx={{ fontSize: '1rem !important' }} />}
                        onClick={() =>
                            replace([
                                ...(watchedSerials ?? []),
                                { serialNumber: '', ticketImg: undefined },
                            ])
                        }
                        disabled={!canEdit}
                        sx={compact ? compactActionButtonSx : { minHeight: '2rem', px: 1.25, py: 0.25 }}
                    />
                </Stack>
                )}

                {compact ? (
                    <Stack spacing={0.75}>
                        {fields.map((item, serialIndex) => {
                            const serialPersisted = isPersistedSerial(watchedSerials?.[serialIndex]);
                            const serialEditable = canEdit && !serialPersisted;
                            const canDeleteRow = fields.length > 1 && !serialPersisted && canEdit;

                            return (
                                <Stack
                                    key={item.id}
                                    direction="row"
                                    alignItems="center"
                                    spacing={0.75}
                                    sx={{ minHeight: COMPACT_ROW_HEIGHT }}
                                >
                                    <Box
                                        sx={{
                                            width: 24,
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Typography
                                            component="span"
                                            sx={{ fontSize: '0.75rem', lineHeight: 1, fontWeight: 700, color: '#64748b' }}
                                        >
                                            {serialIndex + 1}
                                        </Typography>
                                    </Box>

                                    <Box
                                        id={`ticket-serial-field-${sectionIndex}-${serialIndex}`}
                                        sx={{ flex: 1, minWidth: 0 }}
                                    >
                                        <Controller
                                            name={`ticketSections.${sectionIndex}.serials.${serialIndex}.serialNumber`}
                                            control={control}
                                            render={({ field, fieldState }) => (
                                                <TextField
                                                    {...field}
                                                    size="small"
                                                    fullWidth
                                                    placeholder="Số sê-ri"
                                                    disabled={!serialEditable}
                                                    InputProps={
                                                        serialPersisted ? { readOnly: true } : undefined
                                                    }
                                                    error={shouldShowFieldError(fieldState, isSubmitted)}
                                                    sx={compactFieldSx}
                                                    onChange={(event) => {
                                                        field.onChange(event);
                                                        onSerialFieldChange?.(sectionIndex, serialIndex);
                                                    }}
                                                />
                                            )}
                                        />
                                    </Box>

                                    <Box sx={{ flexShrink: 0 }}>
                                        <TicketSerialImageField
                                            control={control}
                                            sectionIndex={sectionIndex}
                                            serialIndex={serialIndex}
                                            compact
                                            compactThumbSize={COMPACT_ROW_HEIGHT}
                                            disabled={!serialEditable}
                                        />
                                    </Box>

                                    {canDeleteRow && (
                                        <IconButton
                                            size="small"
                                            color="error"
                                            aria-label={`Xóa dòng sê-ri ${serialIndex + 1}`}
                                            onClick={() => {
                                                remove(serialIndex);
                                                onRemoveSerial?.(sectionIndex, serialIndex);
                                            }}
                                            sx={{
                                                p: 0.25,
                                                width: 28,
                                                height: 28,
                                                color: '#ef4444',
                                                flexShrink: 0,
                                                '&:hover': { bgcolor: '#fee2e2' },
                                            }}
                                        >
                                            <DeleteOutlineIcon sx={{ fontSize: '1.15rem' }} />
                                        </IconButton>
                                    )}
                                </Stack>
                            );
                        })}
                    </Stack>
                ) : (
                <TableContainer className="admin-table-container">
                    <Table
                        size="small"
                        className="admin-table"
                        sx={{
                            '& .MuiTableCell-root': {
                                py: 0.75,
                                px: 0.75,
                            },
                        }}
                    >
                        <TableBody>
                            {fields.map((item, serialIndex) => {
                                const serialPersisted = isPersistedSerial(
                                    watchedSerials?.[serialIndex]
                                );
                                const serialEditable = canEdit && !serialPersisted;
                                const canDeleteRow =
                                    fields.length > 1 && !serialPersisted && canEdit;

                                return (
                                    <TableRow key={item.id} hover>
                                        <TableCell align="center" width={36}>
                                            {serialIndex + 1}
                                        </TableCell>
                                        <TableCell>
                                            <Box
                                                id={`ticket-serial-field-${sectionIndex}-${serialIndex}`}
                                            >
                                                <Controller
                                                    name={`ticketSections.${sectionIndex}.serials.${serialIndex}.serialNumber`}
                                                    control={control}
                                                    render={({ field, fieldState }) => (
                                                        <TextField
                                                            {...field}
                                                            size="small"
                                                            fullWidth
                                                            placeholder="Số sê-ri"
                                                            disabled={!serialEditable}
                                                            InputProps={
                                                                serialPersisted
                                                                    ? { readOnly: true }
                                                                    : undefined
                                                            }
                                                            error={shouldShowFieldError(
                                                                fieldState,
                                                                isSubmitted
                                                            )}
                                                            helperText={getVisibleFieldErrorMessage(
                                                                fieldState,
                                                                isSubmitted
                                                            )}
                                                            onChange={(event) => {
                                                                field.onChange(event);
                                                                onSerialFieldChange?.(
                                                                    sectionIndex,
                                                                    serialIndex
                                                                );
                                                            }}
                                                        />
                                                    )}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right" width={120}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'flex-end',
                                                    width: '100%',
                                                }}
                                            >
                                                <TicketSerialImageField
                                                    control={control}
                                                    sectionIndex={sectionIndex}
                                                    serialIndex={serialIndex}
                                                    disabled={!serialEditable}
                                                />
                                            </Box>
                                        </TableCell>
                                        <TableCell width={36}>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                aria-label="Xóa dòng"
                                                disabled={!canDeleteRow}
                                                onClick={() => {
                                                    remove(serialIndex);
                                                    onRemoveSerial?.(sectionIndex, serialIndex);
                                                }}
                                                sx={{
                                                    opacity: canDeleteRow ? 1 : 0.28,
                                                    cursor: canDeleteRow ? 'pointer' : 'not-allowed',
                                                }}
                                            >
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
                )}

                {sectionSerialMessage && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                        {sectionSerialMessage}
                    </Typography>
                )}
            </Collapse>
        </Box>
    );
};
