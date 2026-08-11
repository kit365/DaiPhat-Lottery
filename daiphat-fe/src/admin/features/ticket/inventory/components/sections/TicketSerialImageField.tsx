"use client";

import { Box } from '@mui/material';
import { Control, FieldPath } from 'react-hook-form';
import { useCallback } from 'react';
import { FormUploadSingleFile } from '../../../../../components/upload/FormUploadSingleFile';
import { uploadAdminImage } from '@/admin/shared/services/upload.service';

interface TicketSerialImageFieldProps {
    control: Control<any>;
    sectionIndex?: number;
    serialIndex?: number;
    /** Legacy edit form: flat serials array */
    index?: number;
    disabled?: boolean;
    compact?: boolean;
    compactThumbSize?: number;
}

export const TicketSerialImageField = ({
    control,
    sectionIndex,
    serialIndex,
    index,
    disabled,
    compact,
    compactThumbSize,
}: TicketSerialImageFieldProps) => {
    const uploadImage = useCallback(async (file: File) => uploadAdminImage(file), []);

    const fieldName = (
        sectionIndex !== undefined && serialIndex !== undefined
            ? `ticketSections.${sectionIndex}.serials.${serialIndex}.ticketImg`
            : `serials.${index}.ticketImg`
    ) as FieldPath<any>;

    return (
        <Box
            id={
                sectionIndex !== undefined && serialIndex !== undefined
                    ? `ticket-serial-image-field-${sectionIndex}-${serialIndex}`
                    : undefined
            }
            sx={{ width: compact ? 'auto' : '100%' }}
        >
            <FormUploadSingleFile
                name={fieldName}
                control={control}
                disabled={disabled}
                customUpload={uploadImage}
                compact={compact}
                compactThumbSize={compactThumbSize ?? (compact ? 32 : undefined)}
                autoUpload
            />
        </Box>
    );
};
