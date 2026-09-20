'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Button } from '../../../../components/ui/Button';

export type OcrTemplateFieldName =
    | 'stationName'
    | 'numbers'
    | 'serialNumber'
    | 'drawDate'
    | 'ticketType'
    | 'batchCode'
    | 'price';

export type OcrValidationRuleType =
    | 'REGEX'
    | 'VALUE_LIST'
    | 'DATE_RANGE'
    | 'NUMBER_RANGE'
    | 'REFERENCE_LOOKUP';

export type OcrValidationRuleSeverity = 'HARD_FAIL' | 'SOFT_WARNING';

export type OcrValidationRuleDraft = {
    fieldName: OcrTemplateFieldName;
    ruleType: OcrValidationRuleType;
    ruleConfig: Record<string, unknown>;
    severity: OcrValidationRuleSeverity;
    isActive: boolean;
    sortOrder: number;
};

const FIELD_OPTIONS: { value: OcrTemplateFieldName; label: string }[] = [
    { value: 'stationName', label: 'Nhà đài' },
    { value: 'numbers', label: 'Dãy số' },
    { value: 'serialNumber', label: 'Số serial' },
    { value: 'drawDate', label: 'Ngày xổ' },
    { value: 'ticketType', label: 'Loại vé' },
    { value: 'batchCode', label: 'Mã lô' },
    { value: 'price', label: 'Giá vé' },
];

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
    FIELD_OPTIONS.find((f) => f.value === name)?.label ?? name;

export const parseOcrValidationRules = (raw: string): OcrValidationRuleDraft[] => {
    try {
        const parsed = JSON.parse(raw || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((item) => item && typeof item === 'object')
            .map((item, index) => ({
                fieldName: (item.fieldName as OcrTemplateFieldName) || 'serialNumber',
                ruleType: (item.ruleType as OcrValidationRuleType) || 'REGEX',
                ruleConfig:
                    item.ruleConfig && typeof item.ruleConfig === 'object'
                        ? (item.ruleConfig as Record<string, unknown>)
                        : {},
                severity: (item.severity as OcrValidationRuleSeverity) || 'HARD_FAIL',
                isActive: item.isActive !== false,
                sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
            }));
    } catch {
        return [];
    }
};

const serializeRules = (rules: OcrValidationRuleDraft[]): string =>
    JSON.stringify(rules, null, 0);

interface OcrValidationRulesEditorProps {
    value: string;
    onChange: (next: string) => void;
    error?: string;
}

export const OcrValidationRulesEditor = ({
    value,
    onChange,
    error,
}: OcrValidationRulesEditorProps) => {
    const [rules, setRules] = useState<OcrValidationRuleDraft[]>(() => parseOcrValidationRules(value));
    const [fieldName, setFieldName] = useState<OcrTemplateFieldName>('serialNumber');
    const [ruleType, setRuleType] = useState<OcrValidationRuleType>('REGEX');
    const [severity, setSeverity] = useState<OcrValidationRuleSeverity>('HARD_FAIL');
    const [isActive, setIsActive] = useState(true);
    const [configText, setConfigText] = useState(
        JSON.stringify(defaultConfigForType('REGEX'), null, 2)
    );
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        setRules(parseOcrValidationRules(value));
    }, [value]);

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

    const commit = (next: OcrValidationRuleDraft[]) => {
        setRules(next);
        onChange(serializeRules(next));
    };

    const handleCreate = () => {
        let ruleConfig: Record<string, unknown>;
        try {
            ruleConfig = JSON.parse(configText) as Record<string, unknown>;
        } catch {
            setLocalError('ruleConfig phải là JSON hợp lệ.');
            return;
        }
        setLocalError(null);
        const next: OcrValidationRuleDraft[] = [
            ...rules,
            {
                fieldName,
                ruleType,
                ruleConfig,
                severity,
                isActive,
                sortOrder: rules.length,
            },
        ];
        commit(next);
    };

    const handleToggleActive = (index: number) => {
        const next = rules.map((rule, i) =>
            i === index ? { ...rule, isActive: !rule.isActive } : rule
        );
        commit(next);
    };

    const handleDelete = (index: number) => {
        if (!window.confirm('Xóa luật kiểm tra này?')) return;
        commit(rules.filter((_, i) => i !== index));
    };

    return (
        <Stack gap={1.5}>
            <Alert severity="info">
                Luật áp dụng chung khi OCR quét vé (regex, danh sách giá trị, khoảng ngày/số, đối chiếu
                lịch quay). HARD_FAIL buộc review; SOFT_WARNING chỉ cảnh báo.
            </Alert>

            <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems="flex-start">
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Trường</InputLabel>
                    <Select
                        label="Trường"
                        value={fieldName}
                        onChange={(e) => setFieldName(e.target.value as OcrTemplateFieldName)}
                    >
                        {FIELD_OPTIONS.map((opt) => (
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
                error={Boolean(localError || error)}
                helperText={localError || error}
            />

            <Button variant="contained" onClick={handleCreate} sx={{ alignSelf: 'flex-start' }}>
                Thêm luật
            </Button>

            <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Luật hiện có ({sortedRules.length})
                </Typography>
                {sortedRules.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        Chưa có luật. Thêm regex serial hoặc VALUE_LIST giá vé để bắt đầu.
                    </Typography>
                )}
                <Stack gap={0.75}>
                    {sortedRules.map((rule) => {
                        const originalIndex = rules.indexOf(rule);
                        return (
                            <Stack
                                key={`${rule.fieldName}-${rule.ruleType}-${originalIndex}`}
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
                                        {fieldLabel(rule.fieldName)} · {rule.ruleType} ·{' '}
                                        {rule.severity}
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
                                        onClick={() => handleToggleActive(originalIndex)}
                                    >
                                        {rule.isActive ? 'Tắt' : 'Bật'}
                                    </Button>
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={() => handleDelete(originalIndex)}
                                    >
                                        Xóa
                                    </Button>
                                </Stack>
                            </Stack>
                        );
                    })}
                </Stack>
            </Box>
        </Stack>
    );
};

export const isOcrTicketScanValidationRulesConfig = (configKey: string) =>
    configKey === 'OCR_TICKET_SCAN_VALIDATION_RULES';
