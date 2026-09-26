'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
    createOcrFieldValidationRule,
    deleteOcrFieldValidationRule,
    listOcrFieldValidationRules,
    updateOcrFieldValidationRule,
    type OcrFieldValidationRule,
    type OcrTemplateFieldName,
    type OcrValidationRuleSeverity,
    type OcrValidationRuleType,
} from '../../services/ocrTemplateService';
import { OCR_TEMPLATE_FIELD_OPTIONS } from './OcrFieldLayoutAnnotator';

type Props = {
    templateId: number;
};

const RULE_TYPE_OPTIONS: { value: OcrValidationRuleType; label: string }[] = [
    { value: 'REGEX', label: 'Regex (định dạng)' },
    { value: 'VALUE_LIST', label: 'Danh sách giá trị' },
    { value: 'DATE_RANGE', label: 'Khoảng ngày' },
    { value: 'NUMBER_RANGE', label: 'Khoảng số' },
    { value: 'REFERENCE_LOOKUP', label: 'Đối chiếu (lịch quay)' },
];

const defaultConfigForType = (ruleType: OcrValidationRuleType): Record<string, unknown> => {
    switch (ruleType) {
        case 'REGEX':
            return { pattern: '^[0-9]{6}[A-Z]$' };
        case 'VALUE_LIST':
            return { allowedValues: [10000, 20000] };
        case 'DATE_RANGE':
            return { minOffsetDays: -30, maxOffsetDays: 7 };
        case 'NUMBER_RANGE':
            return { min: 1, max: 999 };
        case 'REFERENCE_LOOKUP':
            return { lookup: 'draw_schedule' };
        default:
            return {};
    }
};

const fieldLabel = (name: OcrTemplateFieldName) =>
    OCR_TEMPLATE_FIELD_OPTIONS.find((f) => f.value === name)?.label ?? name;

export const OcrFieldValidationRulesPanel = ({ templateId }: Props) => {
    const [rules, setRules] = useState<OcrFieldValidationRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fieldName, setFieldName] = useState<OcrTemplateFieldName>('serialNumber');
    const [ruleType, setRuleType] = useState<OcrValidationRuleType>('REGEX');
    const [severity, setSeverity] = useState<OcrValidationRuleSeverity>('HARD_FAIL');
    const [isActive, setIsActive] = useState(true);
    const [configText, setConfigText] = useState(
        JSON.stringify(defaultConfigForType('REGEX'), null, 2)
    );

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const list = await listOcrFieldValidationRules(templateId);
            setRules(list);
        } catch {
            toast.error('Không tải được luật kiểm tra OCR.');
            setRules([]);
        } finally {
            setLoading(false);
        }
    }, [templateId]);

    useEffect(() => {
        void reload();
    }, [reload]);

    useEffect(() => {
        setConfigText(JSON.stringify(defaultConfigForType(ruleType), null, 2));
    }, [ruleType]);

    const sortedRules = useMemo(
        () =>
            [...rules].sort((a, b) => {
                const byField = a.fieldName.localeCompare(b.fieldName);
                if (byField !== 0) return byField;
                return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
            }),
        [rules]
    );

    const handleCreate = async () => {
        let ruleConfig: Record<string, unknown>;
        try {
            ruleConfig = JSON.parse(configText) as Record<string, unknown>;
        } catch {
            toast.error('ruleConfig phải là JSON hợp lệ.');
            return;
        }
        setSaving(true);
        try {
            const res = await createOcrFieldValidationRule(templateId, {
                fieldName,
                ruleType,
                ruleConfig,
                severity,
                isActive,
            });
            if (!res.success) {
                toast.error(res.message || 'Tạo luật thất bại.');
                return;
            }
            toast.success(res.message || 'Đã tạo luật kiểm tra.');
            await reload();
        } catch (err: unknown) {
            const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'Tạo luật thất bại.';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (rule: OcrFieldValidationRule) => {
        try {
            await updateOcrFieldValidationRule(templateId, rule.id, {
                isActive: !rule.isActive,
            });
            await reload();
        } catch {
            toast.error('Không cập nhật được trạng thái luật.');
        }
    };

    const handleDelete = async (ruleId: number) => {
        if (!window.confirm('Xóa luật kiểm tra này?')) {
            return;
        }
        try {
            await deleteOcrFieldValidationRule(templateId, ruleId);
            toast.success('Đã xóa luật.');
            await reload();
        } catch {
            toast.error('Không xóa được luật.');
        }
    };

    return (
        <Stack gap={1.5} sx={{ mt: 1 }}>
            <Typography variant="subtitle1" fontWeight={800}>
                Luật kiểm tra trường (validation rules)
            </Typography>
            <Alert severity="info">
                Luật theo mẫu vé OCR: regex / danh sách giá trị / khoảng ngày / đối chiếu lịch quay.
                HARD_FAIL buộc review; SOFT_WARNING chỉ cảnh báo.
            </Alert>

            <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems="flex-start">
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Trường</InputLabel>
                    <Select
                        label="Trường"
                        value={fieldName}
                        onChange={(e) => setFieldName(e.target.value as OcrTemplateFieldName)}
                    >
                        {OCR_TEMPLATE_FIELD_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Loại luật</InputLabel>
                    <Select
                        label="Loại luật"
                        value={ruleType}
                        onChange={(e) => setRuleType(e.target.value as OcrValidationRuleType)}
                    >
                        {RULE_TYPE_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Mức độ</InputLabel>
                    <Select
                        label="Mức độ"
                        value={severity}
                        onChange={(e) =>
                            setSeverity(e.target.value as OcrValidationRuleSeverity)
                        }
                    >
                        <MenuItem value="HARD_FAIL">HARD_FAIL</MenuItem>
                        <MenuItem value="SOFT_WARNING">SOFT_WARNING</MenuItem>
                    </Select>
                </FormControl>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                        />
                    }
                    label="Active"
                />
            </Stack>

            <TextField
                label="ruleConfig (JSON)"
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                size="small"
                sx={{ fontFamily: 'monospace' }}
            />

            <Button
                variant="contained"
                onClick={() => void handleCreate()}
                disabled={saving || loading}
                sx={{ alignSelf: 'flex-start' }}
            >
                {saving ? 'Đang lưu…' : 'Thêm luật'}
            </Button>

            <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Luật hiện có ({sortedRules.length})
                </Typography>
                {loading && (
                    <Typography variant="body2" color="text.secondary">
                        Đang tải…
                    </Typography>
                )}
                {!loading && sortedRules.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        Chưa có luật. Thêm regex serial hoặc VALUE_LIST giá vé để bắt đầu.
                    </Typography>
                )}
                <Stack gap={0.75}>
                    {sortedRules.map((rule) => (
                        <Stack
                            key={rule.id}
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'flex-start', sm: 'center' }}
                            gap={1}
                            sx={{
                                p: 1,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                opacity: rule.isActive ? 1 : 0.55,
                            }}
                        >
                            <Box>
                                <Typography variant="body2" fontWeight={700}>
                                    {fieldLabel(rule.fieldName)} · {rule.ruleType} · {rule.severity}
                                    {!rule.isActive ? ' (tắt)' : ''}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                                >
                                    {JSON.stringify(rule.ruleConfig ?? {})}
                                </Typography>
                            </Box>
                            <Stack direction="row" gap={1}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => void handleToggleActive(rule)}
                                >
                                    {rule.isActive ? 'Tắt' : 'Bật'}
                                </Button>
                                <Button
                                    size="small"
                                    color="error"
                                    onClick={() => void handleDelete(rule.id)}
                                >
                                    Xóa
                                </Button>
                            </Stack>
                        </Stack>
                    ))}
                </Stack>
            </Box>
        </Stack>
    );
};
