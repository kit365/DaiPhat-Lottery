'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Checkbox,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { Button } from '../../../../components/ui/Button';
import {
    createOcrFieldLayout,
    createOcrTemplate,
    deleteOcrFieldLayout,
    listOcrFieldLayouts,
    listOcrTemplatesByStation,
    setOcrTemplateDefault,
    updateOcrFieldLayout,
    uploadOcrTemplateSampleImage,
    type OcrFieldLayout,
    type OcrNormalizedBoundingBox,
    type OcrTemplateFieldName,
    type OcrTicketTemplate,
} from '../../services/ocrTemplateService';
import {
    OCR_TEMPLATE_FIELD_OPTIONS,
    OcrFieldLayoutAnnotator,
} from './OcrFieldLayoutAnnotator';

/** Match BE multipart limit (50MB). */
const OCR_SAMPLE_MAX_BYTES = 50 * 1024 * 1024;

type StationOcrTemplateSectionProps = {
    stationId: number;
    defaultOcrTemplateId?: number | null;
};

const fieldLabel = (name: OcrTemplateFieldName) =>
    OCR_TEMPLATE_FIELD_OPTIONS.find((f) => f.value === name)?.label ?? name;

export const StationOcrTemplateSection = ({
    stationId,
    defaultOcrTemplateId,
}: StationOcrTemplateSectionProps) => {
    const [templates, setTemplates] = useState<OcrTicketTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingLayout, setSavingLayout] = useState(false);
    const [uploadingSample, setUploadingSample] = useState(false);
    const [newName, setNewName] = useState('');
    const [makeDefault, setMakeDefault] = useState(true);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [layouts, setLayouts] = useState<OcrFieldLayout[]>([]);
    const [selectedField, setSelectedField] = useState<OcrTemplateFieldName>('serialNumber');
    const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const selectedTemplate =
        templates.find((t) => String(t.id) === selectedTemplateId) ?? null;

    const reloadLayouts = useCallback(async (templateId: number) => {
        try {
            const list = await listOcrFieldLayouts(templateId);
            setLayouts(
                [...list].sort((a, b) => {
                    const byField = a.fieldName.localeCompare(b.fieldName);
                    if (byField !== 0) return byField;
                    return (a.priority ?? 1) - (b.priority ?? 1);
                })
            );
        } catch {
            setLayouts([]);
        }
    }, []);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const list = await listOcrTemplatesByStation(stationId);
            setTemplates(list);
            const currentDefault =
                list.find((t) => t.isDefault)?.id
                ?? defaultOcrTemplateId
                ?? null;
            setSelectedTemplateId((prev) => {
                if (prev && list.some((t) => String(t.id) === prev)) {
                    return prev;
                }
                return currentDefault != null ? String(currentDefault) : '';
            });
        } catch {
            toast.error('Không tải được danh sách mẫu vé OCR.');
        } finally {
            setLoading(false);
        }
    }, [stationId, defaultOcrTemplateId]);

    useEffect(() => {
        void reload();
    }, [reload]);

    useEffect(() => {
        if (!selectedTemplateId) {
            setLayouts([]);
            setSelectedLayoutId(null);
            return;
        }
        void reloadLayouts(Number(selectedTemplateId));
    }, [selectedTemplateId, reloadLayouts]);

    const handleCreateTemplate = async () => {
        if (!newName.trim()) {
            toast.error('Nhập tên mẫu vé OCR.');
            return;
        }
        try {
            const res = await createOcrTemplate({
                stationId,
                templateName: newName.trim(),
                isDefault: makeDefault,
                isActive: true,
            });
            if (!res.success) {
                toast.error(res.message || 'Tạo mẫu vé OCR thất bại.');
                return;
            }
            toast.success(res.message || 'Đã tạo mẫu vé OCR.');
            setNewName('');
            await reload();
            if (res.data?.id) {
                setSelectedTemplateId(String(res.data.id));
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Tạo mẫu vé OCR thất bại.');
        }
    };

    const handleSetDefault = async () => {
        if (!selectedTemplateId) {
            toast.error('Chọn mẫu vé OCR trước.');
            return;
        }
        try {
            const res = await setOcrTemplateDefault(Number(selectedTemplateId));
            if (!res.success) {
                toast.error(res.message || 'Không đặt được mặc định.');
                return;
            }
            toast.success(res.message || 'Đã đặt mẫu mặc định.');
            await reload();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không đặt được mặc định.');
        }
    };

    const handleUploadSample = async (file: File | null) => {
        if (!file || !selectedTemplateId) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Chỉ chấp nhận file ảnh.');
            return;
        }
        if (file.size > OCR_SAMPLE_MAX_BYTES) {
            toast.error('Ảnh mẫu vượt quá 50MB. Vui lòng chọn ảnh nhỏ hơn hoặc nén trước khi tải lên.');
            return;
        }
        if (file.size < 2_048) {
            toast.error('Ảnh quá nhỏ để làm mẫu OCR. Vui lòng tải ảnh vé thật.');
            return;
        }
        const dimensionsOk = await new Promise<boolean>((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img.naturalWidth >= 200 && img.naturalHeight >= 200);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(false);
            };
            img.src = url;
        });
        if (!dimensionsOk) {
            toast.error('Ảnh quá nhỏ để làm mẫu OCR (tối thiểu 200×200 px).');
            return;
        }
        setUploadingSample(true);
        try {
            const res = await uploadOcrTemplateSampleImage(Number(selectedTemplateId), file);
            if (!res.success || !res.data) {
                toast.error(res.message || 'Tải ảnh mẫu thất bại.');
                return;
            }
            toast.success(res.message || 'Đã tải ảnh mẫu vé.');
            setTemplates((prev) =>
                prev.map((t) => (t.id === res.data!.id ? res.data! : t))
            );
        } catch (err: any) {
            const status = err?.response?.status;
            const apiMessage = err?.response?.data?.message;
            if (status === 401 || status === 403) {
                toast.error(apiMessage || 'Phiên đăng nhập hết hạn hoặc không đủ quyền tải ảnh mẫu.');
            } else if (err?.code === 'ECONNABORTED') {
                toast.error('Tải ảnh mẫu quá lâu (timeout). Thử ảnh nhỏ hơn hoặc kiểm tra Cloudinary.');
            } else if (status === 400 || status === 413) {
                toast.error(apiMessage || 'Ảnh mẫu không hợp lệ hoặc vượt quá dung lượng cho phép (50MB).');
            } else if (!err?.response) {
                toast.error('Không kết nối được máy chủ khi tải ảnh mẫu. Kiểm tra backend đang chạy.');
            } else {
                toast.error(apiMessage || 'Tải ảnh mẫu thất bại.');
            }
        } finally {
            setUploadingSample(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleBoxDrawn = async (
        fieldName: OcrTemplateFieldName,
        boundingBox: OcrNormalizedBoundingBox
    ) => {
        if (!selectedTemplateId) return;
        setSavingLayout(true);
        const templateId = Number(selectedTemplateId);
        // Update selected layout if it matches the field; otherwise create a new
        // priority slot so the same field can be tagged multiple times.
        const existing =
            selectedLayoutId != null
                ? layouts.find((l) => l.id === selectedLayoutId && l.fieldName === fieldName)
                : undefined;
        try {
            if (existing) {
                const res = await updateOcrFieldLayout(templateId, existing.id, {
                    boundingBox,
                });
                if (!res.success) {
                    toast.error(res.message || 'Cập nhật vùng thất bại.');
                    return;
                }
                toast.success(
                    `Đã cập nhật vùng: ${fieldLabel(fieldName)} (ưu tiên #${existing.priority})`
                );
                setSelectedLayoutId(existing.id);
            } else {
                const res = await createOcrFieldLayout(templateId, {
                    fieldName,
                    boundingBox,
                    dataType:
                        fieldName === 'drawDate'
                            ? 'DATE'
                            : fieldName === 'price'
                              ? 'DECIMAL'
                              : 'STRING',
                    isRequired: true,
                });
                if (!res.success) {
                    toast.error(res.message || 'Lưu vùng thất bại.');
                    return;
                }
                const priority = res.data?.priority ?? '?';
                toast.success(`Đã thêm vùng: ${fieldLabel(fieldName)} (ưu tiên #${priority})`);
                if (res.data?.id) {
                    setSelectedLayoutId(res.data.id);
                }
            }
            await reloadLayouts(templateId);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Lưu vùng thất bại.');
        } finally {
            setSavingLayout(false);
        }
    };

    const handleDeleteLayout = async (layoutId: number) => {
        if (!selectedTemplateId) return;
        try {
            await deleteOcrFieldLayout(Number(selectedTemplateId), layoutId);
            if (selectedLayoutId === layoutId) {
                setSelectedLayoutId(null);
            }
            await reloadLayouts(Number(selectedTemplateId));
            toast.success('Đã xóa vùng trường.');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Xóa bố cục thất bại.');
        }
    };

    return (
        <Stack gap={2}>
            <Alert severity="info">
                Mỗi nhà đài có tối đa một mẫu OCR mặc định. Tải ảnh mẫu vé, rồi kéo đánh dấu
                vị trí các trường. Cùng một trường có thể gắn nhiều vùng (ưu tiên #1 thử trước,
                #2/#3… dùng khi đọc không đủ tin cậy). Hệ thống chặn quét vé nếu chưa có mẫu
                mặc định nào trong toàn hệ thống.
            </Alert>

            <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems="flex-start">
                <TextField
                    label="Tên mẫu vé OCR mới"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    fullWidth
                    disabled={loading}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={makeDefault}
                            onChange={(e) => setMakeDefault(e.target.checked)}
                        />
                    }
                    label="Đặt làm mặc định"
                />
                <Button variant="contained" onClick={() => void handleCreateTemplate()} disabled={loading}>
                    Tạo mẫu
                </Button>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems="center">
                <FormControl fullWidth>
                    <InputLabel id="ocr-template-select-label">Mẫu vé OCR</InputLabel>
                    <Select
                        labelId="ocr-template-select-label"
                        label="Mẫu vé OCR"
                        value={selectedTemplateId}
                        onChange={(e) => {
                            setSelectedTemplateId(String(e.target.value));
                            setSelectedLayoutId(null);
                        }}
                    >
                        <MenuItem value="">
                            <em>— Chưa chọn —</em>
                        </MenuItem>
                        {templates.map((t) => (
                            <MenuItem key={t.id} value={String(t.id)}>
                                {t.templateName}
                                {t.isDefault ? ' (mặc định)' : ''}
                                {!t.isActive ? ' [inactive]' : ''}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    variant="outlined"
                    onClick={() => void handleSetDefault()}
                    disabled={loading || !selectedTemplateId}
                >
                    Đặt mặc định
                </Button>
            </Stack>

            {!!selectedTemplateId && (
                <Stack gap={2}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems="center">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) =>
                                void handleUploadSample(e.target.files?.[0] ?? null)
                            }
                        />
                        <Button
                            variant="contained"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingSample}
                        >
                            {uploadingSample ? 'Đang tải…' : 'Tải ảnh mẫu vé'}
                        </Button>
                        <Typography variant="body2" color="text.secondary">
                            {selectedTemplate?.sampleImageUrl
                                ? 'Đã có ảnh mẫu — có thể thay bằng ảnh mới.'
                                : 'Chưa có ảnh mẫu. Cần ảnh để gắn vùng trường.'}
                        </Typography>
                    </Stack>

                    {selectedTemplate?.sampleImageUrl ? (
                        <OcrFieldLayoutAnnotator
                            sampleImageUrl={selectedTemplate.sampleImageUrl}
                            layouts={layouts}
                            selectedField={selectedField}
                            onSelectField={setSelectedField}
                            onBoxDrawn={(field, box) => void handleBoxDrawn(field, box)}
                            onSelectLayout={(layout) =>
                                setSelectedLayoutId(layout?.id ?? null)
                            }
                            selectedLayoutId={selectedLayoutId}
                            disabled={savingLayout}
                        />
                    ) : (
                        <Alert severity="warning">
                            Tải ảnh mẫu vé trước khi gắn vị trí các trường OCR.
                        </Alert>
                    )}

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Vùng đã gắn ({layouts.length})
                        </Typography>
                        <Stack gap={0.5}>
                            {layouts.length === 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    Chưa có bố cục trường. Kéo trên ảnh để thêm.
                                </Typography>
                            )}
                            {layouts.map((layout) => (
                                <Stack
                                    key={layout.id}
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    sx={{
                                        py: 0.5,
                                        px: 1,
                                        borderRadius: 1,
                                        bgcolor:
                                            selectedLayoutId === layout.id
                                                ? 'action.selected'
                                                : 'transparent',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => {
                                        setSelectedLayoutId(layout.id);
                                        setSelectedField(layout.fieldName);
                                    }}
                                >
                                    <Typography variant="body2">
                                        {fieldLabel(layout.fieldName)} #{layout.priority ?? 1} — x=
                                        {layout.boundingBox.x}, y={layout.boundingBox.y}, w=
                                        {layout.boundingBox.width}, h=
                                        {layout.boundingBox.height}
                                    </Typography>
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void handleDeleteLayout(layout.id);
                                        }}
                                    >
                                        Xóa
                                    </Button>
                                </Stack>
                            ))}
                        </Stack>
                    </Box>
                </Stack>
            )}
        </Stack>
    );
};
