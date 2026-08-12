import { Controller, Control } from "react-hook-form";
import { UploadSingleFile } from "./UploadSingleFile";

interface FormUploadSingleFileProps {
    name: string;
    control: Control<any>;
    disabled?: boolean;
    useRawFile?: boolean;
    customUpload?: (file: File) => Promise<string>;
    compact?: boolean;
    compactThumbSize?: number;
    /** When true, upload starts immediately after file selection. */
    autoUpload?: boolean;
}

export const FormUploadSingleFile = ({
    name,
    control,
    disabled,
    useRawFile,
    customUpload,
    compact,
    compactThumbSize,
    autoUpload,
}: FormUploadSingleFileProps) => {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => (
                <UploadSingleFile
                    value={field.value}
                    onChange={field.onChange}
                    disabled={disabled}
                    error={fieldState.error?.message}
                    useRawFile={useRawFile}
                    customUpload={customUpload}
                    compact={compact}
                    compactThumbSize={compactThumbSize}
                    autoUpload={autoUpload}
                />
            )}
        />
    );
};
