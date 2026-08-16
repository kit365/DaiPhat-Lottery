"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { Button } from '../../../../components/ui/Button';
import {
    getImportBatchFileConfig,
    updateImportBatchFileConfig,
} from '../../../ticket/import-batch/services/importBatchService';
import type {
    ImportBatchFileConfig,
    ImportBatchFileFieldRule,
} from '../../../ticket/import-batch/types/importBatch.type';

type SupplierImportFileFieldsPanelProps = {
    /** When true, scroll this panel into view (from import-file empty-state CTA). */
    autoFocus?: boolean;
};

/**
 * Shared auto-detect header aliases (N suppliers → 1 config).
 * Shown on supplier edit so operators can extend recognition without opening system settings.
 */
export const SupplierImportFileFieldsPanel = ({
    autoFocus = false,
}: SupplierImportFileFieldsPanelProps) => {
    const [config, setConfig] = useState<ImportBatchFileConfig | null>(null);
    const [draftAliases, setDraftAliases] = useState<Record<string, string[]>>({});
    const [draftInputs, setDraftInputs] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        getImportBatchFileConfig()
            .then((result) => {
                setConfig(result ?? null);
                const next: Record<string, string[]> = {};
                (result?.fields ?? []).forEach((field) => {
                    next[field.field] = [...(field.aliases ?? [])];
                });
                setDraftAliases(next);
            })
            .catch(() => {
                setConfig(null);
                toast.error('Không tải được cấu hình nhận diện cột.');
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (!autoFocus || loading) {
            return;
        }
        const el = document.getElementById('supplier-import-file-fields');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [autoFocus, loading]);

    const fields = useMemo(() => config?.fields ?? [], [config]);

    const dirty = useMemo(() => {
        if (!config) return false;
        return fields.some((field) => {
            const original = [...(field.aliases ?? [])].sort().join('|');
            const draft = [...(draftAliases[field.field] ?? [])].sort().join('|');
            return original !== draft;
        });
    }, [config, fields, draftAliases]);

    const addAlias = (field: ImportBatchFileFieldRule) => {
        const raw = (draftInputs[field.field] ?? '').trim();
        if (!raw) return;
        const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normalized) {
            toast.warning('Tên cột chỉ nên gồm chữ/số (không dấu).');
            return;
        }
        setDraftAliases((prev) => {
            const current = prev[field.field] ?? [];
            if (current.includes(normalized)) {
                return prev;
            }
            return { ...prev, [field.field]: [...current, normalized] };
        });
        setDraftInputs((prev) => ({ ...prev, [field.field]: '' }));
    };

    const removeAlias = (fieldKey: string, alias: string) => {
        setDraftAliases((prev) => ({
            ...prev,
            [fieldKey]: (prev[fieldKey] ?? []).filter((item) => item !== alias),
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updated = await updateImportBatchFileConfig({
                fieldAliases: draftAliases,
            });
            setConfig(updated);
            const next: Record<string, string[]> = {};
            (updated?.fields ?? []).forEach((field) => {
                next[field.field] = [...(field.aliases ?? [])];
            });
            setDraftAliases(next);
            toast.success('Đã lưu cấu hình nhận diện cột (áp dụng mọi nhà cung cấp).');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không lưu được cấu hình nhận diện cột.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Stack alignItems="center" py={4}>
                <CircularProgress size={28} />
            </Stack>
        );
    }

    if (!config) {
        return (
            <Alert severity="warning">
                Không tải được bảng trường hệ thống. Thử tải lại trang.
            </Alert>
        );
    }

    return (
        <Box id="supplier-import-file-fields">
            <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 2 }}>
                Bảng này dùng <strong>chung cho mọi nhà cung cấp</strong>. Thêm tên cột (không dấu)
                để hệ thống tự nhận diện khi nhập tệp.
            </Alert>

            <Stack spacing={2}>
                {fields.map((field) => (
                    <Box
                        key={field.field}
                        sx={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            p: 2,
                            bgcolor: '#f8fafc',
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight={800}>
                            {field.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            {field.note}
                        </Typography>

                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
                            {(draftAliases[field.field] ?? []).map((alias) => (
                                <Chip
                                    key={alias}
                                    size="small"
                                    label={alias}
                                    onDelete={() => removeAlias(field.field, alias)}
                                    sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                                />
                            ))}
                        </Stack>

                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                            <TextField
                                size="small"
                                placeholder="Thêm tên cột (vd: nhacungcap)"
                                value={draftInputs[field.field] ?? ''}
                                onChange={(e) =>
                                    setDraftInputs((prev) => ({
                                        ...prev,
                                        [field.field]: e.target.value,
                                    }))
                                }
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addAlias(field);
                                    }
                                }}
                                sx={{ flex: 1, bgcolor: '#fff' }}
                            />
                            <IconButton
                                color="primary"
                                onClick={() => addAlias(field)}
                                aria-label={`Thêm alias cho ${field.label}`}
                            >
                                <AddIcon />
                            </IconButton>
                        </Stack>
                    </Box>
                ))}
            </Stack>

            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                <Button
                    variant="contained"
                    disabled={!dirty || saving}
                    loading={saving}
                    label="Lưu cấu hình nhận diện"
                    loadingLabel="Đang lưu..."
                    onClick={handleSave}
                />
            </Stack>
        </Box>
    );
};
