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
    TableHead,
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
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { CreateTicketFormValues } from '../../../schemas/ticket.schema';
import { TicketSerialImageField } from './TicketSerialImageField';
import {
    getVisibleFieldErrorMessage,
    shouldShowFieldError,
} from '../utils/ticketSerialValidation';
import {
    TicketNumberLengthRules,
    getTicketNumberLengthHint,
    sanitizeTicketNumberInput,
} from '../utils/ticketNumberValidation';

type TicketNumberSectionBlockProps = {
    sectionIndex: number;
    control: Control<CreateTicketFormValues>;
    errors: FieldErrors<CreateTicketFormValues>;
    canEdit: boolean;
    canRemove: boolean;
    numberLengthRules: TicketNumberLengthRules;
    onRemove: () => void;
    onSerialFieldChange?: (sectionIndex: number, serialIndex: number) => void;
    onRemoveSerial?: (sectionIndex: number, serialIndex: number) => void;
    onNumbersFieldChange?: (sectionIndex: number) => void;
};

export const TicketNumberSectionBlock = ({
    sectionIndex,
    control,
    errors,
    canEdit,
    canRemove,
    numberLengthRules,
    onRemove,
    onSerialFieldChange,
    onRemoveSerial,
    onNumbersFieldChange,
}: TicketNumberSectionBlockProps) => {
    const { fields, append, remove } = useFieldArray({
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

    return (
        <Box
            sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                p: 1.5,
                bgcolor: 'background.default',
            }}
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                        Dãy số #{sectionIndex + 1}
                    </Typography>
                    {!serialsExpanded && (
                        <Typography variant="caption" color="text.secondary">
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
                    {canRemove && (
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

            <Box id={`ticket-number-field-${sectionIndex}`} sx={{ mb: 1.5 }}>
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
                            disabled={!canEdit}
                            error={shouldShowFieldError(fieldState, isSubmitted)}
                            helperText={getVisibleFieldErrorMessage(fieldState, isSubmitted)}
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

            <Collapse in={serialsExpanded}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                        Số sê-ri
                    </Typography>
                    <LoadingButton
                        type="button"
                        variant="text"
                        size="small"
                        label="Thêm dòng"
                        startIcon={<AddIcon fontSize="small" />}
                        onClick={() => append({ serialNumber: '', ticketImg: undefined })}
                        disabled={!canEdit}
                        sx={{ minHeight: '1.75rem', px: 0.5 }}
                    />
                </Stack>

                <TableContainer>
                    <Table size="small" sx={{ '& .MuiTableCell-root': { px: 0.75 } }}>
                        <TableHead>
                            <TableRow>
                                <TableCell width={36}>#</TableCell>
                                <TableCell>Số sê-ri</TableCell>
                                <TableCell width={120}>Ảnh</TableCell>
                                <TableCell width={36} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {fields.map((item, serialIndex) => (
                                <TableRow key={item.id} hover>
                                    <TableCell sx={{ py: 0.75 }}>{serialIndex + 1}</TableCell>
                                    <TableCell sx={{ py: 0.75 }}>
                                        <Box id={`ticket-serial-field-${sectionIndex}-${serialIndex}`}>
                                            <Controller
                                                name={`ticketSections.${sectionIndex}.serials.${serialIndex}.serialNumber`}
                                                control={control}
                                                render={({ field, fieldState }) => (
                                                    <TextField
                                                        {...field}
                                                        size="small"
                                                        fullWidth
                                                        placeholder="Nhập số sê-ri"
                                                        disabled={!canEdit}
                                                        error={shouldShowFieldError(fieldState, isSubmitted)}
                                                        helperText={getVisibleFieldErrorMessage(
                                                            fieldState,
                                                            isSubmitted
                                                        )}
                                                        onChange={(event) => {
                                                            field.onChange(event);
                                                            onSerialFieldChange?.(sectionIndex, serialIndex);
                                                        }}
                                                    />
                                                )}
                                            />
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 0.75 }}>
                                        <TicketSerialImageField
                                            control={control}
                                            sectionIndex={sectionIndex}
                                            serialIndex={serialIndex}
                                            compact
                                            disabled={!canEdit}
                                        />
                                    </TableCell>
                                    <TableCell sx={{ py: 0.75 }}>
                                        {fields.length > 1 && (
                                            <IconButton
                                                size="small"
                                                color="error"
                                                aria-label="Xóa dòng"
                                                disabled={!canEdit}
                                                onClick={() => {
                                                    remove(serialIndex);
                                                    onRemoveSerial?.(sectionIndex, serialIndex);
                                                }}
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

                {sectionSerialMessage && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                        {sectionSerialMessage}
                    </Typography>
                )}
            </Collapse>
        </Box>
    );
};
