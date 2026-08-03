import { Box, IconButton, Stack, TextField, Typography, Paper, Button } from '@mui/material';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    CommissionTier,
    formatCommissionTiersLines,
    parseCommissionTiers,
} from '../../utils/systemConfigDisplay.util';

const DEFAULT_TIERS: CommissionTier[] = [
    { upTo: 10_000_000, rate: 0.01 },
    { upTo: 100_000_000, rate: 0.007 },
    { upTo: 1_000_000_000, rate: 0.004 },
    { upTo: null, rate: 0.002 },
];

interface TierDraft {
    id: string;
    /** Digits only for closed tiers; ignored when open-ended. */
    upToInput: string;
    /** Decimal rate as staff types, e.g. "0.01" (= 1%) or "1" (= 100%). */
    rateInput: string;
}

let tierIdSeq = 0;
const nextTierId = () => `tier-${Date.now()}-${tierIdSeq++}`;

const rateToInput = (rate: number): string => {
    if (!Number.isFinite(rate)) return '';
    // Avoid float noise: 0.01 stays "0.01", 1 stays "1"
    return String(Number(rate.toFixed(6)));
};

const toDraft = (tiers: CommissionTier[]): TierDraft[] =>
    tiers.map((tier, index) => {
        const isLast = index === tiers.length - 1;
        const isOpenEnded = tier.upTo == null || isLast;
        return {
            id: nextTierId(),
            upToInput: isOpenEnded || tier.upTo == null ? '' : String(tier.upTo),
            rateInput: rateToInput(tier.rate),
        };
    });

const parseUpToDigits = (raw: string): number | null => {
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) return null;
    const value = Number(digits);
    return Number.isFinite(value) && value > 0 ? value : null;
};

const parseRateDecimal = (raw: string): number | null => {
    const normalized = raw.trim().replace(',', '.');
    if (!normalized) return null;
    const value = Number(normalized);
    if (!Number.isFinite(value) || value < 0 || value > 1) return null;
    return value;
};

const fromDraft = (drafts: TierDraft[]): CommissionTier[] | null => {
    if (drafts.length < 2) return null;

    const tiers: CommissionTier[] = [];
    for (let index = 0; index < drafts.length; index += 1) {
        const draft = drafts[index];
        const isLast = index === drafts.length - 1;
        const rate = parseRateDecimal(draft.rateInput);
        if (rate == null) return null;

        let upTo: number | null = null;
        if (!isLast) {
            upTo = parseUpToDigits(draft.upToInput);
            if (upTo == null) return null;
        }

        tiers.push({
            upTo,
            rate: Number(rate.toFixed(6)),
        });
    }

    for (let index = 1; index < tiers.length; index += 1) {
        const prev = tiers[index - 1].upTo;
        const current = tiers[index].upTo;
        if (prev != null && current != null && current <= prev) {
            return null;
        }
    }

    tiers[tiers.length - 1] = { ...tiers[tiers.length - 1], upTo: null };
    return tiers;
};

const formatMoneyInput = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('vi-VN');
};

const suggestNextCeiling = (previousCeiling: number | null): number => {
    if (previousCeiling == null || previousCeiling <= 0) {
        return 10_000_000;
    }
    return previousCeiling * 10;
};

interface CommissionTiersEditorProps {
    value: string;
    onChange: (jsonValue: string) => void;
    error?: string;
}

export const CommissionTiersEditor = ({ value, onChange, error }: CommissionTiersEditorProps) => {
    const lastEmittedJsonRef = useRef<string | null>(null);
    const [drafts, setDrafts] = useState<TierDraft[]>(() =>
        toDraft(parseCommissionTiers(value) ?? DEFAULT_TIERS)
    );
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        const parsed = parseCommissionTiers(value);
        if (!parsed) return;

        const incomingJson = JSON.stringify(parsed);
        if (lastEmittedJsonRef.current === incomingJson) {
            return;
        }

        // External value changed (open dialog / reload) — rehydrate once.
        setDrafts(toDraft(parsed));
        setLocalError(null);
        lastEmittedJsonRef.current = incomingJson;
    }, [value]);

    const previewLines = useMemo(() => {
        const tiers = fromDraft(drafts);
        if (!tiers) return null;
        return formatCommissionTiersLines(JSON.stringify(tiers));
    }, [drafts]);

    const applyDrafts = (next: TierDraft[]) => {
        setDrafts(next);
        const tiers = fromDraft(next);
        if (!tiers) {
            setLocalError('Vui lòng nhập mức giải và tỷ lệ hoa hồng hợp lệ (0–1; mức sau phải lớn hơn mức trước).');
            return;
        }
        setLocalError(null);
        const json = JSON.stringify(tiers);
        lastEmittedJsonRef.current = json;
        onChange(json);
    };

    const updateDraft = (id: string, patch: Partial<Pick<TierDraft, 'upToInput' | 'rateInput'>>) => {
        const next = drafts.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft));
        applyDrafts(next);
    };

    const addTier = () => {
        if (drafts.length >= 6) {
            setLocalError('Tối đa 6 bậc hoa hồng.');
            return;
        }

        const closed = drafts.slice(0, -1);
        const previousOpen = drafts[drafts.length - 1];
        const lastClosedUpTo =
            closed.length > 0 ? parseUpToDigits(closed[closed.length - 1].upToInput) : null;

        // Keep every existing closed tier untouched.
        // Only convert the former open tier into a NEW closed ceiling, then append a fresh open tier.
        const convertedFormerOpen: TierDraft = {
            id: previousOpen.id,
            upToInput: String(suggestNextCeiling(lastClosedUpTo)),
            rateInput: previousOpen.rateInput,
        };

        const newOpen: TierDraft = {
            id: nextTierId(),
            upToInput: '',
            rateInput: previousOpen.rateInput,
        };

        applyDrafts([...closed, convertedFormerOpen, newOpen]);
    };

    const removeTier = (id: string) => {
        if (drafts.length <= 2) {
            setLocalError('Cần ít nhất 2 bậc hoa hồng.');
            return;
        }

        const next = drafts.filter((draft) => draft.id !== id).map((draft, index, arr) => ({
            ...draft,
            // Clear ceiling only for the new last (open-ended) row.
            upToInput: index === arr.length - 1 ? '' : draft.upToInput,
        }));

        applyDrafts(next);
    };

    return (
        <Stack spacing={2}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Bậc hoa hồng đại lý
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Nhập mức giải (VNĐ) và tỷ lệ hoa hồng dạng thập phân (0–1) cho từng khoảng.
                Bậc cuối áp dụng cho phần vượt mức cao nhất. Ví dụ: <strong>0.01 = 1%</strong>, <strong>1 = 100%</strong>.
            </Typography>

            <Stack spacing={1.5}>
                {drafts.map((draft, index) => {
                    const isLast = index === drafts.length - 1;
                    const prevUpTo = index > 0 ? drafts[index - 1].upToInput : null;
                    const rangeLabel = isLast
                        ? prevUpTo
                            ? `Trên ${formatMoneyInput(prevUpTo)}đ`
                            : 'Trên mức cao nhất'
                        : index === 0
                          ? 'Đến mức'
                          : 'Từ trên mức trước đến';

                    return (
                        <Paper
                            key={draft.id}
                            elevation={0}
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                            }}
                        >
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={1.5}
                                alignItems={{ xs: 'stretch', sm: 'flex-start' }}
                            >
                                <Box sx={{ flex: 1.4 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                        Bậc {index + 1}: {rangeLabel}
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={isLast ? 'Mức trần' : 'Mức giải đến (VNĐ)'}
                                        value={isLast ? 'Không giới hạn' : formatMoneyInput(draft.upToInput)}
                                        disabled={isLast}
                                        onChange={(event) =>
                                            updateDraft(draft.id, {
                                                upToInput: event.target.value.replace(/[^\d]/g, ''),
                                            })
                                        }
                                        margin="dense"
                                        inputProps={{ inputMode: 'numeric' }}
                                    />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                        Hoa hồng
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label="Tỷ lệ (0–1)"
                                        value={draft.rateInput}
                                        onChange={(event) =>
                                            updateDraft(draft.id, {
                                                rateInput: event.target.value.replace(/[^\d.,]/g, ''),
                                            })
                                        }
                                        margin="dense"
                                        inputProps={{ inputMode: 'decimal' }}
                                        helperText="Ví dụ: 0.01 = 1%, 1 = 100%"
                                    />
                                </Box>
                                <Box sx={{ pt: { xs: 0, sm: 3.2 } }}>
                                    <IconButton
                                        aria-label="Xóa bậc"
                                        onClick={() => removeTier(draft.id)}
                                        disabled={drafts.length <= 2}
                                        size="small"
                                    >
                                        <Trash2 size={16} />
                                    </IconButton>
                                </Box>
                            </Stack>
                        </Paper>
                    );
                })}
            </Stack>

            <Button
                type="button"
                variant="outlined"
                size="small"
                startIcon={<Plus size={16} />}
                onClick={addTier}
                disabled={drafts.length >= 6}
                sx={{ alignSelf: 'flex-start' }}
            >
                Thêm bậc
            </Button>

            {previewLines && (
                <Paper
                    elevation={0}
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(34, 197, 94, 0.06)',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                    }}
                >
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
                        Tóm tắt
                    </Typography>
                    <Stack spacing={0.35}>
                        {previewLines.map((line) => (
                            <Typography key={line} variant="body2">
                                {line}
                            </Typography>
                        ))}
                    </Stack>
                </Paper>
            )}

            {(localError || error) && (
                <Typography variant="caption" color="error">
                    {localError || error}
                </Typography>
            )}
        </Stack>
    );
};
