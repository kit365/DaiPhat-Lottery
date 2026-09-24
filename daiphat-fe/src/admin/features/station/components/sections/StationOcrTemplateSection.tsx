'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Box,
    Checkbox,
    Chip,
    CircularProgress,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Button } from '../../../../components/ui/Button';
import { CollapsibleCard } from '../../../../components/ui/CollapsibleCard';
import {
    clearOcrTemplateSampleImage,
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
import { OcrTaggedRegionsList } from './OcrTaggedRegionsList';

/** Match BE multipart limit (50MB). */
const OCR_SAMPLE_MAX_BYTES = 50 * 1024 * 1024;

type StationOcrTemplateSectionProps = {
    stationId: number;
    defaultOcrTemplateId?: number | null;
    expanded: boolean;
    onToggle: () => void;
};

const fieldLabel = (name: OcrTemplateFieldName) =>
    OCR_TEMPLATE_FIELD_OPTIONS.find((f) => f.value === name)?.label ??
    (name === 'ticketType' ? 'Loại vé' : name);

export const StationOcrTemplateSection = ({
    stationId,
    defaultOcrTemplateId,
    expanded,
    onToggle,
}: StationOcrTemplateSectionProps) => {
    const queryClient = useQueryClient();
    const [templates, setTemplates] = useState<OcrTicketTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [savingLayout, setSavingLayout] = useState(false);
    const [uploadingSample, setUploadingSample] = useState(false);
    const [clearingSample, setClearingSample] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [makeDefault, setMakeDefault] = useState(true);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [layouts, setLayouts] = useState<OcrFieldLayout[]>([]);
    const [selectedField, setSelectedField] = useState<OcrTemplateFieldName>('serialNumber');
    const [selectedLayoutId, setSelectedLayoutId] = useState<number | null>(null);
    const [hoveredLayoutId, setHoveredLayoutId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const replaceFileInputRef = useRef<HTMLInputElement | null>(null);

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
                return currentDefault != null ? String(currentDefault) : (list[0]?.id ? String(list[0].id) : '');
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
            toast.error('Vui lòng nhập tên mẫu vé OCR.');
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
            toast.success(res.message || 'Đã tạo mẫu vé OCR thành công.');
            setNewName('');
            setIsCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: ['ocr-template-default-ready'] });
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
            toast.error('Vui lòng chọn mẫu vé OCR trước.');
            return;
        }
        try {
            const res = await setOcrTemplateDefault(Number(selectedTemplateId));
            if (!res.success) {
                toast.error(res.message || 'Không đặt được mẫu mặc định.');
                return;
            }
            toast.success(res.message || 'Đã thiết lập mẫu vé mặc định.');
            queryClient.invalidateQueries({ queryKey: ['ocr-template-default-ready'] });
            await reload();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không đặt được mẫu mặc định.');
        }
    };

    const handleUploadSample = async (file: File | null, mode: 'upload' | 'replace' = 'upload') => {
        if (!file || !selectedTemplateId) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Chỉ chấp nhận file ảnh (JPG, PNG, WebP).');
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
            toast.error('Ảnh quá nhỏ để làm mẫu OCR (kích thước tối thiểu 200×200 px).');
            return;
        }
        if (mode === 'replace') {
            const ok = window.confirm(
                'Tải ảnh thay thế sẽ xóa cứng ảnh cũ và toàn bộ vùng đã gắn tag trên mẫu này. Bạn có chắc chắn muốn tiếp tục?'
            );
            if (!ok) {
                if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
                return;
            }
        }
        setUploadingSample(true);
        try {
            const res = await uploadOcrTemplateSampleImage(Number(selectedTemplateId), file);
            if (!res.success || !res.data) {
                toast.error(res.message || 'Tải ảnh mẫu thất bại.');
                return;
            }
            toast.success(
                res.message ||
                    (mode === 'replace'
                        ? 'Đã thay ảnh mẫu và xóa các vùng gắn cũ.'
                        : 'Đã tải ảnh mẫu vé thành công.')
            );
            setTemplates((prev) =>
                prev.map((t) => (t.id === res.data!.id ? res.data! : t))
            );
            setLayouts([]);
            setSelectedLayoutId(null);
            setHoveredLayoutId(null);
            await reloadLayouts(Number(selectedTemplateId));
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
            if (replaceFileInputRef.current) {
                replaceFileInputRef.current.value = '';
            }
        }
    };

    const handleClearSample = async () => {
        if (!selectedTemplateId || !selectedTemplate?.sampleImageUrl) return;
        const ok = window.confirm(
            'Xóa ảnh mẫu sẽ xóa cứng ảnh và toàn bộ vùng đã gắn tag trên mẫu này. Bạn có chắc chắn muốn tiếp tục?'
        );
        if (!ok) return;
        setClearingSample(true);
        try {
            const res = await clearOcrTemplateSampleImage(Number(selectedTemplateId));
            if (!res.success || !res.data) {
                toast.error(res.message || 'Xóa ảnh mẫu thất bại.');
                return;
            }
            toast.success(res.message || 'Đã xóa ảnh mẫu và các vùng gắn tag.');
            setTemplates((prev) =>
                prev.map((t) => (t.id === res.data!.id ? res.data! : t))
            );
            setLayouts([]);
            setSelectedLayoutId(null);
            setHoveredLayoutId(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Xóa ảnh mẫu thất bại.');
        } finally {
            setClearingSample(false);
        }
    };

    const handleBoxDrawn = async (
        fieldName: OcrTemplateFieldName,
        boundingBox: OcrNormalizedBoundingBox
    ) => {
        if (!selectedTemplateId) return;
        setSavingLayout(true);
        const templateId = Number(selectedTemplateId);
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
                toast.success(
                    `Đã thêm vùng: ${fieldLabel(fieldName)} (ưu tiên #${priority}). Kéo tiếp để thêm vùng dự phòng.`
                );
                setSelectedLayoutId(null);
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
        >
            <Stack spacing={2.5}>
                {/* 1. Modern Guide & Policy Info Banner */}
                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 1.75, sm: 2 },
                        borderRadius: '12px',
                        border: '1px solid #bae6fd',
                        bgcolor: '#f0f9ff',
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    }}
                >
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                            sx={{
                                width: 34,
                                height: 34,
                                borderRadius: '8px',
                                bgcolor: '#bae6fd',
                                color: '#0284c7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                mt: 0.25,
                            }}
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
                                    <InputLabel id="ocr-template-select-label" sx={{ fontSize: '0.875rem' }}>
                                        Danh sách mẫu vé
                                    </InputLabel>
                                    <Select
                                        labelId="ocr-template-select-label"
                                        label="Danh sách mẫu vé"
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
                                                        — Chưa chọn mẫu vé —
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
                                                — Chưa chọn mẫu vé —
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
                                {selectedTemplate?.isDefault ? (
                                    <Chip
                                        icon={<StarRoundedIcon sx={{ '&&': { color: '#16a34a', fontSize: '1.1rem' } }} />}
                                        label="Đang là mặc định"
                                        sx={{
                                            bgcolor: '#dcfce7',
                                            color: '#15803d',
                                            fontWeight: 700,
                                            height: 40,
                                            px: 1.5,
                                            borderRadius: '10px',
                                            border: '1px solid #bbf7d0',
                                            fontSize: '0.85rem',
                                        }}
                                    />
                                ) : (
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
                        {(isCreateOpen || templates.length === 0) && (
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
                                        {templates.length > 0 && (
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
                                        )}
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
                                            {templates.length > 0 && (
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
                                            )}
                                        </Stack>
                                    </Stack>
                                </Stack>
                            </Paper>
                        )}
                    </Stack>
                </Paper>

                {/* 4. Selected Template Workspace: Sample Image & Region Tagging */}
                {selectedTemplate ? (
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 2, sm: 2.5 },
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            bgcolor: '#ffffff',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                        }}
                    >
                        <Stack spacing={2.5}>
                            {/* Hidden file inputs */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) =>
                                    void handleUploadSample(e.target.files?.[0] ?? null, 'upload')
                                }
                            />
                            <input
                                ref={replaceFileInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) =>
                                    void handleUploadSample(e.target.files?.[0] ?? null, 'replace')
                                }
                            />

                            {/* Template Header & Actions Bar */}
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                                justifyContent="space-between"
                                sx={{
                                    pb: 2,
                                    borderBottom: '1px solid #f1f5f9',
                                }}
                            >
                                <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                                    <Box
                                        sx={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: '10px',
                                            bgcolor: '#eff6ff',
                                            color: '#2563eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <LayersOutlinedIcon sx={{ fontSize: '1.3rem' }} />
                                    </Box>
                                    <Box>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                                {selectedTemplate.templateName}
                                            </Typography>
                                            {selectedTemplate.isDefault && (
                                                <Chip
                                                    size="small"
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
                                        </Stack>
                                        <Typography variant="caption" color="text.secondary">
                                            {selectedTemplate.sampleImageUrl
                                                ? `Đã tải ảnh mẫu • ${layouts.length} vùng trường đã đánh dấu`
                                                : 'Chưa có ảnh mẫu'}
                                        </Typography>
                                    </Box>
                                </Stack>

                                {/* Action Buttons when image exists */}
                                {selectedTemplate.sampleImageUrl && (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Button
                                            variant="outlined"
                                            startIcon={
                                                uploadingSample ? (
                                                    <CircularProgress size={16} color="inherit" />
                                                ) : (
                                                    <AddPhotoAlternateOutlinedIcon sx={{ fontSize: '1.1rem' }} />
                                                )
                                            }
                                            onClick={() => replaceFileInputRef.current?.click()}
                                            disabled={uploadingSample || clearingSample}
                                            sx={{
                                                borderRadius: '9px',
                                                fontWeight: 700,
                                                textTransform: 'none',
                                                fontSize: '0.825rem',
                                                height: 36,
                                                borderColor: '#cbd5e1',
                                                color: '#334155',
                                                bgcolor: '#ffffff',
                                                '&:hover': {
                                                    borderColor: '#94a3b8',
                                                    bgcolor: '#f8fafc',
                                                },
                                            }}
                                        >
                                            {uploadingSample ? 'Đang tải…' : 'Thay ảnh khác'}
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            startIcon={
                                                clearingSample ? (
                                                    <CircularProgress size={16} color="inherit" />
                                                ) : (
                                                    <DeleteOutlineRoundedIcon sx={{ fontSize: '1.1rem' }} />
                                                )
                                            }
                                            onClick={() => void handleClearSample()}
                                            disabled={uploadingSample || clearingSample}
                                            sx={{
                                                borderRadius: '9px',
                                                fontWeight: 700,
                                                textTransform: 'none',
                                                fontSize: '0.825rem',
                                                height: 36,
                                                borderColor: '#fca5a5',
                                                color: '#dc2626',
                                                bgcolor: '#fff5f5',
                                                '&:hover': {
                                                    borderColor: '#f87171',
                                                    bgcolor: '#fee2e2',
                                                    color: '#b91c1c',
                                                },
                                            }}
                                        >
                                            {clearingSample ? 'Đang xóa…' : 'Xóa ảnh'}
                                        </Button>
                                    </Stack>
                                )}
                            </Stack>

                            {/* Dropzone when NO sample image */}
                            {!selectedTemplate.sampleImageUrl ? (
                                <Box
                                    onClick={() => {
                                        if (!uploadingSample && !clearingSample) {
                                            fileInputRef.current?.click();
                                        }
                                    }}
                                    sx={{
                                        p: { xs: 3, sm: 5 },
                                        textAlign: 'center',
                                        borderRadius: '14px',
                                        border: '2px dashed #94a3b8',
                                        bgcolor: '#f8fafc',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: '#f1f5f9',
                                            borderColor: '#2563eb',
                                        },
                                    }}
                                >
                                    <Stack spacing={1.75} alignItems="center">
                                        <Box
                                            sx={{
                                                width: 58,
                                                height: 58,
                                                borderRadius: '50%',
                                                bgcolor: '#eff6ff',
                                                color: '#2563eb',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)',
                                            }}
                                        >
                                            {uploadingSample ? (
                                                <CircularProgress size={28} color="primary" />
                                            ) : (
                                                <CloudUploadOutlinedIcon sx={{ fontSize: '2rem' }} />
                                            )}
                                        </Box>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                                {uploadingSample ? 'Đang tải ảnh lên máy chủ...' : 'Tải lên ảnh mẫu vé của nhà đài'}
                                            </Typography>
                                            <Typography variant="body2" color="#64748b" sx={{ mt: 0.5, maxWidth: 500, mx: 'auto' }}>
                                                Kéo thả file ảnh hoặc bấm vào đây để chọn ảnh chụp vé thật của nhà đài để bắt đầu cấu hình các vùng nhận diện OCR.
                                            </Typography>
                                        </Box>

                                        <Typography variant="caption" color="#94a3b8" sx={{ fontSize: '0.75rem' }}>
                                            Định dạng hỗ trợ: JPG, PNG, WebP • Dung lượng tối đa: 50MB • Kích thước tối thiểu: 200×200 px
                                        </Typography>

                                        <Button
                                            variant="contained"
                                            startIcon={<CloudUploadOutlinedIcon />}
                                            disabled={uploadingSample || clearingSample}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fileInputRef.current?.click();
                                            }}
                                            sx={{
                                                mt: 1,
                                                borderRadius: '10px',
                                                fontWeight: 800,
                                                textTransform: 'none',
                                                px: 3,
                                                py: 1,
                                                bgcolor: '#2563eb',
                                                color: '#ffffff',
                                                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                                '&:hover': {
                                                    bgcolor: '#1d4ed8',
                                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                                                    transform: 'translateY(-1px)',
                                                },
                                            }}
                                        >
                                            {uploadingSample ? 'Đang tải…' : 'Chọn ảnh mẫu vé'}
                                        </Button>
                                    </Stack>
                                </Box>
                            ) : (
                                /* When sample image exists: Annotator + Tagged Regions */
                                <Stack spacing={3}>
                                    <Box sx={{ width: '100%' }}>
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
                                            hoveredLayoutId={hoveredLayoutId}
                                            onHoverLayout={setHoveredLayoutId}
                                            disabled={savingLayout}
                                        />
                                    </Box>

                                    <Box sx={{ width: '100%' }}>
                                        <OcrTaggedRegionsList
                                            layouts={layouts}
                                            selectedLayoutId={selectedLayoutId}
                                            hoveredLayoutId={hoveredLayoutId}
                                            selectedField={selectedField}
                                            onSelectLayout={(layout) => {
                                                setSelectedLayoutId(layout?.id ?? null);
                                                if (layout) {
                                                    setSelectedField(layout.fieldName);
                                                }
                                            }}
                                            onSelectField={setSelectedField}
                                            onDeleteLayout={(layoutId) =>
                                                void handleDeleteLayout(layoutId)
                                            }
                                            onHoverLayout={setHoveredLayoutId}
                                            disabled={savingLayout}
                                        />
                                    </Box>
                                </Stack>
                            )}
                        </Stack>
                    </Paper>
                ) : (
                    /* When NO template is selected or created */
                    <Paper
                        elevation={0}
                        sx={{
                            p: 4,
                            textAlign: 'center',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            bgcolor: '#f8fafc',
                        }}
                    >
                        <Stack spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: '50%',
                                    bgcolor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.12)',
                                }}
                            >
                                <LayersOutlinedIcon sx={{ fontSize: '1.75rem' }} />
                            </Box>
                            <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                                Chưa chọn mẫu vé OCR
                            </Typography>
                            <Typography variant="body2" color="#64748b" sx={{ maxWidth: 460 }}>
                                Vui lòng chọn một mẫu vé từ danh sách ở trên hoặc bấm &quot;Tạo mẫu mới&quot; để thiết lập mẫu vé OCR cho nhà đài này.
                            </Typography>
                            {!isCreateOpen && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddRoundedIcon />}
                                    onClick={() => setIsCreateOpen(true)}
                                    sx={{
                                        mt: 1,
                                        bgcolor: '#2563eb',
                                        color: '#ffffff',
                                        fontWeight: 800,
                                        textTransform: 'none',
                                        borderRadius: '10px',
                                        px: 2.75,
                                        py: 1,
                                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                        '&:hover': {
                                            bgcolor: '#1d4ed8',
                                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                                            transform: 'translateY(-1px)',
                                        },
                                    }}
                                >
                                    Tạo mẫu vé mới ngay
                                </Button>
                            )}
                        </Stack>
                    </Paper>
                )}
            </Stack>
        </CollapsibleCard>
    );
};
