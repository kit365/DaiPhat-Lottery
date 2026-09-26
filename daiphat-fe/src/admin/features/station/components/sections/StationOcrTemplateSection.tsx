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
import { AdminStatusBadge } from '../../../../components/ui/AdminStatusBadge';
import { CollapsibleCard } from '../../../../components/ui/CollapsibleCard';
import { CreateOcrTemplateModal } from '../../../../components/upload/CreateOcrTemplateModal';
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
    getOcrFieldBadgeModifier,
} from './OcrFieldLayoutAnnotator';
import { ImageCropModal } from '../../../../components/upload/ImageCropModal';

/** Match BE multipart limit (50MB). */
const OCR_SAMPLE_MAX_BYTES = 50 * 1024 * 1024;

type StationOcrTemplateSectionProps = {
    stationId: number;
    defaultOcrTemplateId?: number | null;
    expanded: boolean;
    onToggle: () => void;
};

const fieldLabel = (name: OcrTemplateFieldName) =>
    OCR_TEMPLATE_FIELD_OPTIONS.find((f) => f.value === name)?.label ?? name;

export const StationOcrTemplateSection = ({
    stationId,
    defaultOcrTemplateId,
    expanded,
    onToggle,
}: StationOcrTemplateSectionProps) => {
    const [templates, setTemplates] = useState<OcrTicketTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingLayout, setSavingLayout] = useState(false);
    const [uploadingSample, setUploadingSample] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [layouts, setLayouts] = useState<OcrFieldLayout[]>([]);
    const [selectedField, setSelectedField] = useState<OcrTemplateFieldName>('serialNumber');
    const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
    const [rawSampleImage, setRawSampleImage] = useState<File | null>(null);
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

    const handleCreateTemplate = async (data: { templateName: string; isDefault: boolean; sampleImage: File | null }) => {
        try {
            const res = await createOcrTemplate({
                stationId,
                templateName: data.templateName,
                isDefault: data.isDefault,
                isActive: true,
            });
            if (!res.success) {
                toast.error(res.message || 'Tạo mẫu vé OCR thất bại.');
                return;
            }
            toast.success(res.message || 'Đã tạo mẫu vé OCR.');
            
            let finalTemplateId = res.data?.id;

            // If user provided a cropped image in the modal, upload it immediately
            if (finalTemplateId && data.sampleImage) {
                try {
                    const uploadRes = await uploadOcrTemplateSampleImage(finalTemplateId, data.sampleImage);
                    if (!uploadRes.success) {
                        toast.error(uploadRes.message || 'Tải ảnh mẫu thất bại.');
                    } else {
                        toast.success('Đã tải ảnh mẫu vé thành công.');
                    }
                } catch (err) {
                    toast.error('Tải ảnh mẫu thất bại.');
                }
            }

            await reload();
            if (finalTemplateId) {
                setSelectedTemplateId(String(finalTemplateId));
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
        setRawSampleImage(file);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUploadCroppedSample = async (file: File) => {
        if (!selectedTemplateId) return;
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
            setRawSampleImage(null);
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
        <CollapsibleCard
            title="Mẫu vé OCR"
            subheader="Ảnh mẫu vé, template mặc định và gắn vùng trường trên ảnh"
            expanded={expanded}
            onToggle={onToggle}
            extraAction={
                <Button variant="contained" onClick={() => setIsCreateModalOpen(true)}>
                    Tạo mẫu
                </Button>
            }
        >
            <Stack p="calc(3 * var(--spacing))" gap={2}>

            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems="center" flexWrap="nowrap">
                <FormControl sx={{ flex: 1, minWidth: 150 }}>
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
                    className="btn-outlined-admin"
                    onClick={() => void handleSetDefault()}
                    disabled={loading || !selectedTemplateId}
                    sx={{ whiteSpace: 'nowrap', minWidth: 'max-content' }}
                >
                    Đặt mặc định
                </Button>

                {!!selectedTemplateId && (
                    <>
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
                            className="btn-primary-admin"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingSample}
                            sx={{ whiteSpace: 'nowrap', minWidth: 'max-content' }}
                        >
                            <InfoOutlinedIcon sx={{ fontSize: '1.25rem' }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <Typography
                                variant="subtitle2"
                                fontWeight={700}
                                color="#0369a1"
                                sx={{ mb: 0.5, fontSize: '0.875rem' }}
                            >
                                Hướng dẫn cấu hình mẫu vé OCR cho nhà đài
                            </Typography>
                            <Stack spacing={0.5} sx={{ color: '#334155', fontSize: '0.825rem', lineHeight: 1.5 }}>
                                <Typography variant="inherit">
                                    • <strong>Mẫu mặc định:</strong> Mỗi nhà đài có 1 mẫu OCR mặc định được ưu tiên dùng khi quét vé tự động. Hệ thống chặn quét vé nếu toàn hệ thống chưa có mẫu mặc định nào.
                                </Typography>
                                <Typography variant="inherit">
                                    • <strong>Gắn vùng nhận diện:</strong> Tải ảnh mẫu vé lên, sau đó kéo chọn các vùng dữ liệu (Mã đài, Số serial, Ngày xổ, Giá vé...).
                                </Typography>
                                <Typography variant="inherit">
                                    • <strong>Đa vùng dự phòng:</strong> Cùng một trường có thể gán nhiều vùng (ưu tiên #1 thử trước, #2/#3... dùng khi chất lượng ảnh kém).
                                </Typography>
                            </Stack>
                        </Box>
                    </Stack>
                </Paper>

                {/* 2. Template Selector & Control Toolbar */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2, sm: 2.25 },
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        bgcolor: '#ffffff',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                >
                    <Stack spacing={2}>
                        <Box>
                            <Typography
                                variant="caption"
                                fontWeight={700}
                                color="#475569"
                                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', mb: 1 }}
                            >
                                Chọn mẫu vé OCR đang thao tác
                            </Typography>

                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="stretch">
                                {/* Select Dropdown */}
                                <FormControl
                                    fullWidth
                                    size="small"
                                    sx={{
                                        flex: 1,
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            bgcolor: '#f8fafc',
                                            '&:hover': {
                                                bgcolor: '#ffffff',
                                            },
                                        },
                                    }}
                                >
                                    <InputLabel
                                        id="ocr-template-select-label"
                                        shrink
                                        sx={{
                                            fontSize: '0.875rem',
                                            bgcolor: '#ffffff',
                                            px: 0.75,
                                            borderRadius: '4px',
                                        }}
                                    >
                                        Danh sách mẫu vé
                                    </InputLabel>
                                    <Select
                                        labelId="ocr-template-select-label"
                                        label="Danh sách mẫu vé"
                                        notched
                                        value={selectedTemplateId}
                                        displayEmpty
                                        onChange={(e) => {
                                            setSelectedTemplateId(String(e.target.value));
                                            setSelectedLayoutId(null);
                                        }}
                                        renderValue={(value) => {
                                            if (!value) {
                                                return (
                                                    <Typography color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.875rem' }}>
                                                        {templates.length === 0 ? '— Chưa có mẫu vé nào —' : '— Chưa chọn mẫu vé —'}
                                                    </Typography>
                                                );
                                            }
                                            const t = templates.find((item) => String(item.id) === value);
                                            if (!t) return value;
                                            return (
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                                                        {t.templateName}
                                                    </Typography>
                                                    {t.isDefault && (
                                                        <Chip
                                                            size="small"
                                                            icon={<StarRoundedIcon sx={{ '&&': { color: '#d97706', fontSize: '0.95rem' } }} />}
                                                            label="Mặc định"
                                                            sx={{
                                                                bgcolor: '#fef3c7',
                                                                color: '#92400e',
                                                                fontWeight: 700,
                                                                fontSize: '0.725rem',
                                                                height: 22,
                                                                border: '1px solid #fde68a',
                                                            }}
                                                        />
                                                    )}
                                                    {!t.isActive && (
                                                        <Chip
                                                            size="small"
                                                            label="Tạm ngưng"
                                                            sx={{
                                                                bgcolor: '#fee2e2',
                                                                color: '#b91c1c',
                                                                fontWeight: 600,
                                                                fontSize: '0.725rem',
                                                                height: 22,
                                                            }}
                                                        />
                                                    )}
                                                </Stack>
                                            );
                                        }}
                                    >
                                        <MenuItem value="">
                                            <Typography color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.875rem' }}>
                                                {templates.length === 0 ? '— Chưa có mẫu vé nào —' : '— Chưa chọn mẫu vé —'}
                                            </Typography>
                                        </MenuItem>
                                        {templates.map((t) => (
                                            <MenuItem
                                                key={t.id}
                                                value={String(t.id)}
                                                sx={{
                                                    py: 1.25,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    gap: 2,
                                                }}
                                            >
                                                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>
                                                    {t.templateName}
                                                </Typography>
                                                <Stack direction="row" spacing={0.75} alignItems="center">
                                                    {t.isDefault && (
                                                        <Chip
                                                            size="small"
                                                            icon={<StarRoundedIcon sx={{ '&&': { color: '#d97706', fontSize: '0.95rem' } }} />}
                                                            label="Mặc định"
                                                            sx={{
                                                                bgcolor: '#fef3c7',
                                                                color: '#92400e',
                                                                fontWeight: 700,
                                                                fontSize: '0.7rem',
                                                                height: 22,
                                                                border: '1px solid #fde68a',
                                                            }}
                                                        />
                                                    )}
                                                    {!t.isActive && (
                                                        <Chip
                                                            size="small"
                                                            label="Tạm ngưng"
                                                            sx={{
                                                                bgcolor: '#fee2e2',
                                                                color: '#b91c1c',
                                                                fontWeight: 600,
                                                                fontSize: '0.7rem',
                                                                height: 22,
                                                            }}
                                                        />
                                                    )}
                                                </Stack>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {/* Set as Default Action */}
                                {selectedTemplate?.isDefault ? null : (
                                    <Button
                                        variant="outlined"
                                        startIcon={<StarBorderRoundedIcon sx={{ fontSize: '1.15rem' }} />}
                                        onClick={() => void handleSetDefault()}
                                        disabled={loading || !selectedTemplateId}
                                        sx={{
                                            height: 40,
                                            whiteSpace: 'nowrap',
                                            borderRadius: '10px',
                                            fontWeight: 700,
                                            textTransform: 'none',
                                            px: 2,
                                            fontSize: '0.875rem',
                                            borderColor: !selectedTemplateId ? '#e2e8f0' : '#fcd34d',
                                            color: !selectedTemplateId ? '#94a3b8' : '#b45309',
                                            bgcolor: !selectedTemplateId ? '#f8fafc' : '#fffbeb',
                                            transition: 'all 0.15s ease-in-out',
                                            '&:hover': {
                                                borderColor: '#f59e0b',
                                                bgcolor: '#fef3c7',
                                                color: '#92400e',
                                            },
                                        }}
                                    >
                                        Đặt làm mặc định
                                    </Button>
                                )}

                                {/* Toggle Create Template Form */}
                                <Button
                                    variant={isCreateOpen ? 'outlined' : 'contained'}
                                    startIcon={isCreateOpen ? <CloseRoundedIcon sx={{ fontSize: '1.15rem' }} /> : <AddRoundedIcon sx={{ fontSize: '1.15rem' }} />}
                                    onClick={() => setIsCreateOpen((prev) => !prev)}
                                    sx={{
                                        height: 40,
                                        whiteSpace: 'nowrap',
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        px: 2.25,
                                        fontSize: '0.875rem',
                                        ...(isCreateOpen
                                            ? {
                                                  borderColor: '#cbd5e1',
                                                  color: '#475569',
                                                  bgcolor: '#ffffff',
                                                  '&:hover': {
                                                      borderColor: '#94a3b8',
                                                      bgcolor: '#f8fafc',
                                                      color: '#1e293b',
                                                  },
                                              }
                                            : {
                                                  bgcolor: '#2563eb',
                                                  color: '#ffffff',
                                                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                                                  '&:hover': {
                                                      bgcolor: '#1d4ed8',
                                                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                                                      transform: 'translateY(-1px)',
                                                  },
                                                  '&:active': {
                                                      transform: 'translateY(0)',
                                                  },
                                              }),
                                    }}
                                >
                                    {isCreateOpen ? 'Đóng form tạo' : 'Tạo mẫu mới'}
                                </Button>
                            </Stack>
                        </Box>

                        {/* 3. Inline Creation Box */}
                        {isCreateOpen && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: '14px',
                                    border: '1.5px solid #bfdbfe',
                                    bgcolor: '#f0f7ff',
                                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)',
                                }}
                            >
                                <Stack spacing={2}>
                                    <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between">
                                        <Stack direction="row" spacing={1.25} alignItems="center">
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '8px',
                                                    bgcolor: '#dbeafe',
                                                    color: '#2563eb',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <AddCircleOutlineRoundedIcon sx={{ fontSize: '1.25rem' }} />
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={800} color="#1e40af">
                                                    Tạo mẫu vé OCR mới
                                                </Typography>
                                                <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.75rem' }}>
                                                    Nhập tên mẫu vé để gán các vùng nhận diện cho nhà đài
                                                </Typography>
                                            </Box>
                                        </Stack>
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setIsCreateOpen(false);
                                                setNewName('');
                                            }}
                                            sx={{ color: '#64748b', '&:hover': { color: '#1e293b', bgcolor: '#e0e7ff' } }}
                                            title="Đóng form"
                                        >
                                            <CloseRoundedIcon sx={{ fontSize: '1.15rem' }} />
                                        </IconButton>
                                    </Stack>

                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={1.5}
                                        alignItems={{ xs: 'stretch', sm: 'center' }}
                                    >
                                        <TextField
                                            size="small"
                                            label="Tên mẫu vé OCR mới"
                                            placeholder="VD: Mẫu vé truyền thống 2026, Vé cào..."
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            fullWidth
                                            disabled={loading}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    void handleCreateTemplate();
                                                }
                                            }}
                                            sx={{
                                                bgcolor: '#ffffff',
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: '10px',
                                                    bgcolor: '#ffffff',
                                                },
                                            }}
                                        />

                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={makeDefault}
                                                    onChange={(e) => setMakeDefault(e.target.checked)}
                                                    color="primary"
                                                    size="small"
                                                    sx={{
                                                        color: '#2563eb',
                                                        '&.Mui-checked': {
                                                            color: '#2563eb',
                                                        },
                                                    }}
                                                />
                                            }
                                            label={
                                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', whiteSpace: 'nowrap' }}>
                                                    Đặt làm mặc định
                                                </Typography>
                                            }
                                            sx={{ mr: 0, px: 0.5 }}
                                        />

                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Button
                                                variant="contained"
                                                startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AddRoundedIcon />}
                                                onClick={() => void handleCreateTemplate()}
                                                disabled={loading || !newName.trim()}
                                                sx={{
                                                    height: 40,
                                                    whiteSpace: 'nowrap',
                                                    borderRadius: '10px',
                                                    fontWeight: 800,
                                                    textTransform: 'none',
                                                    px: 2.5,
                                                    bgcolor: '#2563eb',
                                                    color: '#ffffff',
                                                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                                                    '&:hover': {
                                                        bgcolor: '#1d4ed8',
                                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                                                    },
                                                }}
                                            >
                                                Tạo mẫu
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                onClick={() => {
                                                    setIsCreateOpen(false);
                                                    setNewName('');
                                                }}
                                                disabled={loading}
                                                sx={{
                                                    height: 40,
                                                    whiteSpace: 'nowrap',
                                                    borderRadius: '10px',
                                                    fontWeight: 700,
                                                    textTransform: 'none',
                                                    px: 2,
                                                    borderColor: '#cbd5e1',
                                                    color: '#64748b',
                                                    bgcolor: '#ffffff',
                                                    '&:hover': {
                                                        borderColor: '#94a3b8',
                                                        bgcolor: '#f8fafc',
                                                        color: '#334155',
                                                    },
                                                }}
                                            >
                                                Hủy
                                            </Button>
                                        </Stack>
                                    </Stack>
                                </Stack>
                            </Paper>
                        )}
                    </Stack>
                </Paper>

            {!!selectedTemplateId && (
                <Stack gap={2}>
                    <Box sx={{ width: '100%' }}>
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
                    </Box>

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
                                    <Stack direction="row" alignItems="center" gap={1}>
                                        <AdminStatusBadge
                                            label={`${fieldLabel(layout.fieldName)} #${layout.priority ?? 1}`}
                                            modifier={getOcrFieldBadgeModifier(layout.fieldName)}
                                        />
                                        <Typography variant="body2" color="text.secondary">
                                            x={layout.boundingBox.x}, y={layout.boundingBox.y}, w={layout.boundingBox.width}, h={layout.boundingBox.height}
                                        </Typography>
                                    </Stack>
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

                    {rawSampleImage && (
                        <ImageCropModal
                            open={Boolean(rawSampleImage)}
                            imageFile={rawSampleImage}
                            onClose={() => setRawSampleImage(null)}
                            onSave={async (croppedFile) => {
                                await handleUploadCroppedSample(croppedFile);
                            }}
                        />
                    )}
                </Stack>
            )}

            <CreateOcrTemplateModal 
                open={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreateTemplate}
            />
            </Stack>
        </CollapsibleCard>
    );
};
