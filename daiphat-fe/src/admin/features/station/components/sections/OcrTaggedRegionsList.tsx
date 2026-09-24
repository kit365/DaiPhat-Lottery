'use client';

import { useMemo, useState } from 'react';
import {
    Box,
    Chip,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
    Divider,
} from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { OCR_TEMPLATE_FIELD_OPTIONS } from './OcrFieldLayoutAnnotator';
import type {
    OcrFieldLayout,
    OcrTemplateFieldName,
} from '../../services/ocrTemplateService';

type Props = {
    layouts: OcrFieldLayout[];
    selectedLayoutId: number | null;
    hoveredLayoutId?: number | null;
    selectedField: OcrTemplateFieldName;
    onSelectLayout: (layout: OcrFieldLayout | null) => void;
    onSelectField: (fieldName: OcrTemplateFieldName) => void;
    onDeleteLayout: (layoutId: number) => void;
    onHoverLayout?: (layoutId: number | null) => void;
    disabled?: boolean;
};

const formatPercent = (val: number): string => `${(val * 100).toFixed(1)}%`;

export const OcrTaggedRegionsList = ({
    layouts,
    selectedLayoutId,
    hoveredLayoutId,
    selectedField,
    onSelectLayout,
    onSelectField,
    onDeleteLayout,
    onHoverLayout,
    disabled = false,
}: Props) => {
    const [filterField, setFilterField] = useState<string>('ALL');

    const groupedLayouts = useMemo(() => {
        const map = new Map<OcrTemplateFieldName, OcrFieldLayout[]>();
        OCR_TEMPLATE_FIELD_OPTIONS.forEach((opt) => {
            map.set(opt.value, []);
        });
        layouts.forEach((layout) => {
            const list = map.get(layout.fieldName) ?? [];
            list.push(layout);
            map.set(layout.fieldName, list);
        });
        map.forEach((list) => {
            list.sort((a, b) => (a.priority ?? 1) - (b.priority ?? 1));
        });
        return map;
    }, [layouts]);

    const stats = useMemo(() => {
        const totalFields = OCR_TEMPLATE_FIELD_OPTIONS.length;
        const coveredFields = OCR_TEMPLATE_FIELD_OPTIONS.filter(
            (opt) => (groupedLayouts.get(opt.value)?.length ?? 0) > 0
        ).length;
        return {
            totalFields,
            coveredFields,
            totalRegions: layouts.length,
            isComplete: coveredFields === totalFields,
        };
    }, [groupedLayouts, layouts.length]);

    const visibleGroups = useMemo(() => {
        if (filterField === 'ALL') {
            return OCR_TEMPLATE_FIELD_OPTIONS;
        }
        return OCR_TEMPLATE_FIELD_OPTIONS.filter((opt) => opt.value === filterField);
    }, [filterField]);

    return (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 2, sm: 2.5 },
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px',
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="subtitle2" fontWeight={700}>
                    Vùng đã gắn ({stats.totalRegions})
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {stats.coveredFields}/{stats.totalFields} trường
                    {stats.isComplete ? ' — đủ trường bắt buộc' : ''}
                </Typography>
            </Stack>

            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1.25 }}>
                <Chip
                    size="small"
                    label="Tất cả"
                    variant={filterField === 'ALL' ? 'filled' : 'outlined'}
                    onClick={() => setFilterField('ALL')}
                />
                {OCR_TEMPLATE_FIELD_OPTIONS.map((opt) => {
                    const count = groupedLayouts.get(opt.value)?.length ?? 0;
                    return (
                        <Chip
                            key={opt.value}
                            size="small"
                            label={count > 0 ? `${opt.label} (${count})` : opt.label}
                            variant={filterField === opt.value ? 'filled' : 'outlined'}
                            onClick={() => {
                                setFilterField(opt.value);
                                onSelectField(opt.value);
                            }}
                            sx={{
                                ...(filterField === opt.value
                                    ? { bgcolor: opt.color, color: '#fff' }
                                    : { borderColor: opt.color, color: opt.color }),
                            }}
                        />
                    );
                })}
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Stack gap={1.25}>
                {visibleGroups.map((opt) => {
                    const group = groupedLayouts.get(opt.value) ?? [];
                    if (filterField !== 'ALL' && group.length === 0) {
                        return (
                            <Typography key={opt.value} variant="body2" color="text.secondary">
                                Chưa gắn vùng cho {opt.label}.
                            </Typography>
                        );
                    }
                    if (group.length === 0) return null;
                    return (
                        <Box key={opt.value}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: opt.color }}>
                                {opt.label}
                            </Typography>
                            <Stack gap={0.75} sx={{ mt: 0.5 }}>
                                {group.map((layout) => {
                                    const selected = selectedLayoutId === layout.id;
                                    const hovered = hoveredLayoutId === layout.id;
                                    return (
                                        <Stack
                                            key={layout.id}
                                            direction="row"
                                            alignItems="center"
                                            gap={1}
                                            onMouseEnter={() => onHoverLayout?.(layout.id)}
                                            onMouseLeave={() => onHoverLayout?.(null)}
                                            onClick={() => {
                                                onSelectLayout(layout);
                                                onSelectField(layout.fieldName);
                                            }}
                                            sx={{
                                                px: 1,
                                                py: 0.75,
                                                borderRadius: 1,
                                                cursor: disabled ? 'default' : 'pointer',
                                                border: '1px solid',
                                                borderColor: selected || hovered ? opt.color : 'divider',
                                                bgcolor:
                                                    selected || hovered
                                                        ? `${opt.color}14`
                                                        : 'transparent',
                                                outline:
                                                    layout.fieldName === selectedField && selected
                                                        ? `2px solid ${opt.color}`
                                                        : 'none',
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                                                Ưu tiên #{layout.priority ?? 1} · x {formatPercent(layout.boundingBox.x)} · y{' '}
                                                {formatPercent(layout.boundingBox.y)} · {formatPercent(layout.boundingBox.width)} ×{' '}
                                                {formatPercent(layout.boundingBox.height)}
                                            </Typography>
                                            <Tooltip title="Xóa vùng">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        disabled={disabled}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteLayout(layout.id);
                                                        }}
                                                    >
                                                        <DeleteOutlineRoundedIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        </Box>
                    );
                })}
            </Stack>
        </Paper>
    );
};
