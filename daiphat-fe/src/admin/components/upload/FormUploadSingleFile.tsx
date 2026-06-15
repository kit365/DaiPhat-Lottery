import { Controller, Control } from "react-hook-form";
import { UploadSingleFile } from "./UploadSingleFile";

interface FormUploadSingleFileProps {
    name: string;
    control: Control<any>;
    disabled?: boolean;
    useRawFile?: boolean;
    customUpload?: (file: File) => Promise<string>;
}

export const FormUploadSingleFile = ({
    name,
    control,
    disabled,
    useRawFile,
    customUpload,
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
                />
            )}
        />
    );
};
