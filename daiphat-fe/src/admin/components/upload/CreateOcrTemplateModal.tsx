import React, { useState, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Checkbox,
    Stack,
    IconButton,
    Typography,
    Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ImageCropModal } from './ImageCropModal';
import { toast } from 'react-toastify';

export interface CreateOcrTemplateModalProps {
    open: boolean;
    onClose: () => void;
    onCreate: (data: { templateName: string; isDefault: boolean; sampleImage: File | null }) => Promise<void>;
}

export const CreateOcrTemplateModal: React.FC<CreateOcrTemplateModalProps> = ({ open, onClose, onCreate }) => {
    const [templateName, setTemplateName] = useState('');
    const [isDefault, setIsDefault] = useState(true);
    const [rawImage, setRawImage] = useState<File | null>(null);
    const [croppedImage, setCroppedImage] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSelectFile = (file: File | null) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Chỉ chấp nhận file ảnh.');
            return;
        }
        setRawImage(file);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!templateName.trim()) {
            toast.error('Vui lòng nhập tên mẫu vé.');
            return;
        }
        setLoading(true);
        try {
            await onCreate({
                templateName: templateName.trim(),
                isDefault,
                sampleImage: croppedImage
            });
            // Reset state on successful creation
            setTemplateName('');
            setIsDefault(true);
            setCroppedImage(null);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleCropSave = async (croppedFile: File) => {
        if (!templateName.trim()) {
            toast.error('Vui lòng nhập tên mẫu vé trước khi tải ảnh.');
            return;
        }
        setLoading(true);
        try {
            await onCreate({
                templateName: templateName.trim(),
                isDefault,
                sampleImage: croppedFile
            });
            // Reset state on successful creation
            setTemplateName('');
            setIsDefault(true);
            setCroppedImage(null);
            setRawImage(null);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" component="span">Tạo mẫu vé OCR mới</Typography>
                <IconButton onClick={onClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        label="Tên mẫu vé"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        fullWidth
                        disabled={loading}
                    />
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                    sx={{
                                        color: '#FF3030',
                                        '&.Mui-checked': {
                                            color: '#FF3030',
                                        },
                                    }}
                                />
                            }
                            label="Đặt làm mặc định"
                        />

                        <Stack direction="row" alignItems="center" spacing={1.5}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => handleSelectFile(e.target.files?.[0] ?? null)}
                            />
                            {croppedImage && (
                                <Typography variant="body2" color="text.secondary">
                                    Đã chọn: {croppedImage.name}
                                </Typography>
                            )}
                            <Button
                                variant="outlined"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
                            >
                                {croppedImage ? 'Đổi ảnh khác' : 'Chọn ảnh mẫu vé'}
                            </Button>
                        </Stack>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button
                    variant="outlined"
                    className="btn-outlined-admin"
                    onClick={onClose}
                    disabled={loading}
                >
                    Hủy
                </Button>
                <Button
                    variant="contained"
                    className="btn-primary-admin"
                    onClick={() => void handleSave()}
                    disabled={!templateName.trim() || loading}
                    sx={{ 
                        bgcolor: '#212b36 !important', 
                        color: '#ffffff !important',
                        minWidth: 100,
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: '8px',
                        '&:hover': {
                            bgcolor: '#454f5b !important'
                        },
                        '&.Mui-disabled': {
                            bgcolor: 'rgba(145, 158, 171, 0.24) !important',
                            color: 'rgba(145, 158, 171, 0.8) !important',
                        }
                    }}
                >
                    {loading ? "Đang tạo..." : "Tạo mẫu"}
                </Button>
            </DialogActions>

            {rawImage && (
                <ImageCropModal
                    open={Boolean(rawImage)}
                    imageFile={rawImage}
                    onClose={() => setRawImage(null)}
                    onSave={handleCropSave}
                />
            )}
        </Dialog>
    );
};
