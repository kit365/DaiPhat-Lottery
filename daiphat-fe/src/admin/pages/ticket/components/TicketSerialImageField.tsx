import { Box, Typography } from "@mui/material";
import { Control } from "react-hook-form";
import { useCallback } from "react";
import { FormUploadSingleFile } from "../../../components/upload/FormUploadSingleFile";
import { uploadAdminImage } from "../../../api/upload.api";
import { CreateTicketFormValues } from "../../../schemas/ticket.schema";

interface TicketSerialImageFieldProps {
    control: Control<CreateTicketFormValues>;
    index: number;
    disabled?: boolean;
}

export const TicketSerialImageField = ({ control, index, disabled }: TicketSerialImageFieldProps) => {
    const uploadImage = useCallback(async (file: File) => uploadAdminImage(file), []);

    return (
        <Box sx={{ gridColumn: { xs: "span 12", md: "span 12" }, mt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: "text.primary" }}>
                Ảnh vé số (Tùy chọn)
            </Typography>
            <FormUploadSingleFile
                name={`serials.${index}.ticketImg`}
                control={control}
                disabled={disabled}
                customUpload={uploadImage}
            />
        </Box>
    );
};
