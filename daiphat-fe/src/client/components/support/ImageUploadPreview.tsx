import React, { useEffect, useRef, useState } from 'react';
import { AppToast } from '../../utils/toast.util';

interface ImageUploadPreviewProps {
    value?: File | null;
    existingUrl?: string;
    onChange: (file: File | null) => void;
    required?: boolean;
    label?: string;
    helperText?: string;
}

export const ImageUploadPreview: React.FC<ImageUploadPreviewProps> = ({
    value,
    existingUrl,
    onChange,
    required = false,
    label = 'Hình ảnh đính kèm',
    helperText = 'Hỗ trợ các định dạng hình ảnh (JPG, PNG, ...)',
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!value) {
            setPreviewUrl(existingUrl || null);
            return;
        }

        const objectUrl = URL.createObjectURL(value);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [value, existingUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            AppToast.error('Chỉ hỗ trợ tải lên các tệp định dạng hình ảnh');
            e.target.value = '';
            return;
        }

        onChange(file);
    };

    const handleRemove = () => {
        onChange(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
        setPreviewUrl(existingUrl || null);
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-[#454F5B]">
                {label} {required && <span className="text-[#ee1314]">*</span>}
            </label>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />

            {previewUrl ? (
                <div className="relative rounded-xl border border-[#E5E8EB] overflow-hidden bg-[#F9FAFB]">
                    <img
                        src={previewUrl}
                        alt="Xem trước"
                        className="w-full max-h-[240px] object-contain"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-[#E5E8EB] rounded-lg text-[12px] font-bold text-[#454F5B] hover:bg-white cursor-pointer"
                        >
                            Đổi ảnh
                        </button>
                        {value && (
                            <button
                                type="button"
                                onClick={handleRemove}
                                className="px-3 py-1.5 bg-[#FFF4F4] border border-[#ee1314]/30 rounded-lg text-[12px] font-bold text-[#ee1314] hover:bg-[#ffe8e8] cursor-pointer"
                            >
                                Xóa
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-[#E5E8EB] rounded-xl bg-[#FAFBFC] hover:border-[#ee1314]/50 hover:bg-[#FFF4F4]/30 transition-colors cursor-pointer flex flex-col items-center gap-2"
                >
                    <div className="w-12 h-12 rounded-full bg-[#FFF4F4] text-[#ee1314] flex items-center justify-center text-xl">
                        <i className="fa-solid fa-image"></i>
                    </div>
                    <span className="text-[14px] font-bold text-[#454F5B]">Chọn hình ảnh</span>
                    <span className="text-[12px] text-[#919EAB]">{helperText}</span>
                </button>
            )}
        </div>
    );
};
