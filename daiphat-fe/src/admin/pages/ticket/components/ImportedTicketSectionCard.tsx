import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
    Box,
    Chip,
    IconButton,
    Paper,
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
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import type { ImportedTicketForLine, UpdateImportedTicketPayload } from '../../../api/ticket.api';
import { uploadAdminImage } from '../../../api/upload.api';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { UploadSingleFile } from '../../../components/upload/UploadSingleFile';
import {
    TicketNumberLengthRules,
    getTicketNumberLengthHint,
    isTicketNumberLengthValid,
    sanitizeTicketNumberInput,
} from '../utils/ticketNumberValidation';
import { ImportedTicketDeleteConfirmDialog } from './ImportedTicketDeleteConfirmDialog';

type EditableSerial = {
    id?: number;
    serialNumber: string;
    ticketImg?: string;
};

type ImportedTicketSectionCardProps = {
    ticket: ImportedTicketForLine;
    sectionIndex: number;
    canManage: boolean;
    numberLengthRules: TicketNumberLengthRules;
    isSaving?: boolean;
    isDeleting?: boolean;
    onSave: (ticketId: number, payload: UpdateImportedTicketPayload) => Promise<void>;
    onDelete: (ticketId: number) => Promise<void>;
};

const toEditableSerials = (ticket: ImportedTicketForLine): EditableSerial[] =>
    (ticket.serials ?? []).map((serial) => ({
        id: serial.id,
        serialNumber: serial.serialNumber ?? '',
        ticketImg: serial.ticketImg,
    }));

export const ImportedTicketSectionCard = ({
    ticket,
    sectionIndex,
    canManage,
    numberLengthRules,
    isSaving = false,
    isDeleting = false,
    onSave,
    onDelete,
}: ImportedTicketSectionCardProps) => {
    const [numbers, setNumbers] = useState(ticket.numbers ?? '');
    const [serials, setSerials] = useState<EditableSerial[]>(() => toEditableSerials(ticket));
    const [numberError, setNumberError] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    useEffect(() => {
        setNumbers(ticket.numbers ?? '');
        setSerials(toEditableSerials(ticket));
        setNumberError(null);
    }, [ticket]);

    const isDirty = useMemo(() => {
        const originalPayload = JSON.stringify({
            numbers: ticket.numbers ?? '',
            serials: toEditableSerials(ticket),
        });
        const currentPayload = JSON.stringify({
            numbers,
            serials: serials.map((serial) => ({
                id: serial.id,
                serialNumber: serial.serialNumber.trim(),
                ticketImg: serial.ticketImg,
            })),
        });
        return originalPayload !== currentPayload;
    }, [numbers, serials, ticket]);

    const handleSave = async () => {
        const trimmedNumbers = numbers.trim();
        if (!trimmedNumbers) {
            setNumberError('Vui lòng nhập dãy số.');
            return;
        }
        if (!isTicketNumberLengthValid(trimmedNumbers, numberLengthRules)) {
            setNumberError(getTicketNumberLengthHint(numberLengthRules));
            return;
        }

        const normalizedSerials = serials
            .map((serial) => ({
                id: serial.id,
                serialNumber: serial.serialNumber.trim(),
                ticketImg: serial.ticketImg?.trim() || undefined,
            }))
            .filter((serial) => serial.serialNumber);

        if (normalizedSerials.length === 0) {
            toast.error('Vui lòng nhập ít nhất một số sê-ri.');
            return;
        }

        const duplicateSerials = normalizedSerials.filter(
            (serial, index) =>
                normalizedSerials.findIndex(
                    (candidate) =>
                        candidate.serialNumber.toLowerCase() === serial.serialNumber.toLowerCase()
                ) !== index
        );
        if (duplicateSerials.length > 0) {
            toast.error('Số sê-ri bị trùng trong cùng dãy số.');
            return;
        }

        await onSave(ticket.id, {
            numbers: trimmedNumbers,
            serials: normalizedSerials,
        });
    };

    const handleConfirmDelete = async () => {
        try {
            await onDelete(ticket.id);
            setIsDeleteDialogOpen(false);
        } catch {
            // Parent handler shows error toast; keep dialog open for retry.
        }
    };

    return (
        <>
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                        Dãy số #{sectionIndex + 1}
                    </Typography>
                    {ticket.status && <Chip size="small" label={ticket.status} variant="outlined" />}
                </Stack>
                {canManage && (
                    <IconButton
                        size="small"
                        color="error"
                        aria-label="Xóa dãy số đã nhập"
                        disabled={isSaving || isDeleting}
                        onClick={() => setIsDeleteDialogOpen(true)}
                    >
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                )}
            </Stack>

            <TextField
                label="Dãy số"
                fullWidth
                size="small"
                value={numbers}
                placeholder={getTicketNumberLengthHint(numberLengthRules)}
                InputProps={{ readOnly: !canManage }}
                disabled={!canManage || isSaving || isDeleting}
                error={!!numberError}
                helperText={numberError ?? undefined}
                inputProps={{
                    inputMode: 'numeric',
                    maxLength: numberLengthRules.maxLength,
                }}
                onChange={(event) => {
                    const next = sanitizeTicketNumberInput(event.target.value, numberLengthRules);
                    setNumbers(next);
                    if (numberError && isTicketNumberLengthValid(next, numberLengthRules)) {
                        setNumberError(null);
                    }
                }}
                sx={{ mb: 1.5 }}
            />

            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell width={48}>#</TableCell>
                            <TableCell>Số sê-ri</TableCell>
                            <TableCell width={canManage ? 180 : 120}>Ảnh</TableCell>
                            {canManage && <TableCell width={48} />}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {serials.map((serial, serialIndex) => (
                            <TableRow key={serial.id ?? `new-${serialIndex}`}>
                                <TableCell>{serialIndex + 1}</TableCell>
                                <TableCell>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        placeholder="Nhập số sê-ri"
                                        value={serial.serialNumber}
                                        InputProps={{ readOnly: !canManage }}
                                        disabled={!canManage || isSaving || isDeleting}
                                        onChange={(event) => {
                                            const next = [...serials];
                                            next[serialIndex] = {
                                                ...next[serialIndex],
                                                serialNumber: event.target.value,
                                            };
                                            setSerials(next);
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    {canManage ? (
                                        <UploadSingleFile
                                            value={serial.ticketImg}
                                            onChange={(ticketImg) => {
                                                const next = [...serials];
                                                next[serialIndex] = {
                                                    ...next[serialIndex],
                                                    ticketImg:
                                                        typeof ticketImg === 'string'
                                                            ? ticketImg
                                                            : undefined,
                                                };
                                                setSerials(next);
                                            }}
                                            disabled={isSaving || isDeleting}
                                            customUpload={uploadAdminImage}
                                            compact
                                        />
                                    ) : serial.ticketImg ? (
                                        <Box
                                            component="img"
                                            src={serial.ticketImg}
                                            alt={serial.serialNumber}
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                objectFit: 'cover',
                                                borderRadius: 1,
                                                border: 1,
                                                borderColor: 'divider',
                                            }}
                                        />
                                    ) : (
                                        '—'
                                    )}
                                </TableCell>
                                {canManage && (
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            aria-label="Xóa số sê-ri"
                                            disabled={
                                                isSaving || isDeleting || serials.length <= 1
                                            }
                                            onClick={() => {
                                                setSerials((prev) =>
                                                    prev.filter((_, index) => index !== serialIndex)
                                                );
                                            }}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {canManage && (
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ sm: 'center' }}
                    sx={{ mt: 1.5 }}
                >
                    <LoadingButton
                        type="button"
                        variant="text"
                        size="small"
                        label="Thêm dòng"
                        startIcon={<AddIcon />}
                        disabled={isSaving || isDeleting}
                        onClick={() =>
                            setSerials((prev) => [...prev, { serialNumber: '', ticketImg: undefined }])
                        }
                    />
                    <LoadingButton
                        type="button"
                        variant="outlined"
                        size="small"
                        label="Lưu thay đổi"
                        loading={isSaving}
                        loadingLabel="Đang lưu..."
                        disabled={!isDirty || isDeleting}
                        onClick={handleSave}
                    />
                </Stack>
            )}
        </Paper>

        <ImportedTicketDeleteConfirmDialog
            open={isDeleteDialogOpen}
            ticketNumbers={ticket.numbers}
            isPending={isDeleting}
            onClose={() => setIsDeleteDialogOpen(false)}
            onConfirm={handleConfirmDelete}
        />
        </>
    );
};
