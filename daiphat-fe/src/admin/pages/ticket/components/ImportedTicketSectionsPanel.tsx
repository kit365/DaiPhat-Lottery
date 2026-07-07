import { Box, Chip, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import type { ImportedTicketForLine, UpdateImportedTicketPayload } from '../../../api/ticket.api';
import {
    useHardDeleteImportedTicketDuringBatch,
    useUpdateImportedTicketDuringBatch,
} from '../hooks/useTicket';
import { TicketNumberLengthRules } from '../utils/ticketNumberValidation';
import { ImportedTicketSectionCard } from './ImportedTicketSectionCard';

type ImportedTicketSectionsPanelProps = {
    tickets: ImportedTicketForLine[];
    importBatchLineId?: string;
    canManage?: boolean;
    isLoading?: boolean;
    numberLengthRules: TicketNumberLengthRules;
};

export const ImportedTicketSectionsPanel = ({
    tickets,
    importBatchLineId,
    canManage = false,
    isLoading = false,
    numberLengthRules,
}: ImportedTicketSectionsPanelProps) => {
    const { mutateAsync: updateImportedTicket, isPending: isUpdating } =
        useUpdateImportedTicketDuringBatch();
    const { mutateAsync: deleteImportedTicket, isPending: isDeleting } =
        useHardDeleteImportedTicketDuringBatch();

    const handleSave = async (ticketId: number, payload: UpdateImportedTicketPayload) => {
        if (!importBatchLineId) {
            return;
        }
        try {
            const response = await updateImportedTicket({
                ticketId,
                importBatchLineId,
                data: payload,
            });
            if (response.success) {
                toast.success('Đã cập nhật vé đã nhập.');
            } else {
                toast.error(response.message || 'Không thể cập nhật vé đã nhập.');
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Không thể cập nhật vé đã nhập.');
        }
    };

    const handleDelete = async (ticketId: number) => {
        if (!importBatchLineId) {
            return;
        }
        try {
            const response = await deleteImportedTicket({ ticketId, importBatchLineId });
            if (!response.success) {
                toast.error(response.message || 'Không thể xóa vé đã nhập.');
                throw new Error('delete-failed');
            }
            toast.success('Đã xóa vé đã nhập.');
        } catch (error: any) {
            if (error?.message !== 'delete-failed') {
                toast.error(error?.response?.data?.message || 'Không thể xóa vé đã nhập.');
            }
            throw error;
        }
    };

    if (isLoading) {
        return (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Đang tải vé đã nhập...
            </Typography>
        );
    }

    if (!tickets.length) {
        return null;
    }

    return (
        <Box sx={{ mb: 3 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                    Đã nhập vào kho
                </Typography>
                <Chip
                    size="small"
                    label={`${tickets.reduce((sum, ticket) => sum + (ticket.serials?.length ?? 0), 0)} vé`}
                    color="success"
                    variant="outlined"
                />
            </Stack>

            <Stack spacing={1.5}>
                {tickets.map((ticket, index) => (
                    <ImportedTicketSectionCard
                        key={ticket.id}
                        ticket={ticket}
                        sectionIndex={index}
                        canManage={canManage}
                        numberLengthRules={numberLengthRules}
                        isSaving={isUpdating}
                        isDeleting={isDeleting}
                        onSave={handleSave}
                        onDelete={handleDelete}
                    />
                ))}
            </Stack>
        </Box>
    );
};
