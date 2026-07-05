import { Box } from '@mui/material';
import { Control } from 'react-hook-form';
import { useCallback } from 'react';
import { FormUploadSingleFile } from '../../../components/upload/FormUploadSingleFile';
import { uploadAdminImage } from '../../../api/upload.api';
import { CreateTicketFormValues } from '../../../schemas/ticket.schema';

interface TicketSerialImageFieldProps {
    control: Control<CreateTicketFormValues>;
    index: number;
    disabled?: boolean;
    compact?: boolean;
}

export const TicketSerialImageField = ({
    control,
    index,
    disabled,
    compact,
}: TicketSerialImageFieldProps) => {
    const uploadImage = useCallback(async (file: File) => uploadAdminImage(file), []);

    return (
        <Box sx={{ width: '100%' }}>
            <FormUploadSingleFile
                name={`serials.${index}.ticketImg`}
                control={control}
                disabled={disabled}
                customUpload={uploadImage}
                compact={compact}
            />
        </Box>
    );
};
