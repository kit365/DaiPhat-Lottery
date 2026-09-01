import type { ReactNode } from 'react';
import { Avatar, Box, Card, CardContent, CardHeader, Stack, Typography } from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import { formatPrizePayoutCurrency } from '@/types/prize-payout.type';
import { splitLastMatchHighlight } from '../utils/prizePayoutMatchHighlight';

export const SectionCard = ({
    title,
    icon,
    children,
    action,
}: {
    title: string;
    icon: string;
    children: ReactNode;
    action?: ReactNode;
}) => (
    <Card
        elevation={0}
        sx={{
            borderRadius: 'var(--shape-borderRadius-lg)',
            border: '1px solid var(--palette-divider)',
            boxShadow: 'var(--customShadows-card)',
            overflow: 'hidden',
        }}
    >
        <CardHeader
            avatar={
                <Avatar
                    sx={{
                        width: 36,
                        height: 36,
                        bgcolor: 'var(--palette-primary-lighter)',
                        color: 'var(--palette-primary-dark)',
                    }}
                >
                    <Icon icon={icon} width={20} />
                </Avatar>
            }
            title={<Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{title}</Typography>}
            action={action}
            sx={{
                px: 2.5,
                py: 1.75,
                bgcolor: 'var(--palette-background-neutral)',
                borderBottom: '1px solid var(--palette-divider)',
                '& .MuiCardHeader-action': { m: 0, alignSelf: 'center' },
            }}
        />
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>{children}</CardContent>
    </Card>
);

export const MoneySummary = ({
    gross,
    commission,
    tax,
    net,
    ticketCount,
}: {
    gross: number;
    commission: number;
    tax: number;
    net: number;
    ticketCount?: number;
}) => (
    <Box
        sx={{
            p: 2.5,
            borderRadius: '12px',
            bgcolor: 'var(--palette-warning-lighter)',
            border: '1px dashed var(--palette-warning-main)',
        }}
    >
        <Typography
            variant="caption"
            sx={{ color: 'var(--palette-warning-dark)', fontWeight: 700, display: 'block', mb: 1.25 }}
        >
            Tổng tiền thưởng{ticketCount != null ? ` (${ticketCount} vé)` : ''}
        </Typography>
        <Stack spacing={0.75}>
            <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2" color="text.secondary">
                    Trúng (giá trị giải)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatPrizePayoutCurrency(gross)}
                </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2" color="text.secondary">
                    Hoa hồng (−)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--palette-warning-dark)' }}>
                    {formatPrizePayoutCurrency(commission)}
                </Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2" color="text.secondary">
                    Thuế TNCN (−)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatPrizePayoutCurrency(tax)}
                </Typography>
            </Stack>
            <Box sx={{ borderTop: '1px dashed', borderColor: 'divider', pt: 1, mt: 0.25 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                    Tổng thực nhận / cần chuyển
                </Typography>
                <Typography
                    sx={{
                        fontWeight: 800,
                        fontSize: '1.5rem',
                        lineHeight: 1.2,
                        color: 'var(--palette-error-main)',
                        letterSpacing: '-0.02em',
                    }}
                >
                    {formatPrizePayoutCurrency(net)}
                </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
                Thuế/hoa hồng tính riêng từng vé — không gộp gross rồi mới trừ.
            </Typography>
        </Stack>
    </Box>
);

const highlightSx = {
    bgcolor: 'var(--palette-warning-lighter)',
    color: 'var(--palette-warning-dark)',
    px: 0.75,
    py: 0.25,
    borderRadius: 1,
    fontWeight: 700,
} as const;

export function renderHighlightedNumber(
    value: string | undefined,
    matchFrom?: string,
    matchDigits?: number,
    role: 'ticket' | 'winning' = 'ticket'
) {
    if (!value) return '—';
    if (matchFrom === 'EXACT') {
        return (
            <Box component="span" sx={highlightSx}>
                {value}
            </Box>
        );
    }
    if (matchFrom === 'LAST') {
        const segments = splitLastMatchHighlight(value, matchDigits);
        return (
            <>
                {segments.map((segment, index) =>
                    segment.highlighted ? (
                        <Box key={index} component="span" sx={highlightSx}>
                            {segment.text}
                        </Box>
                    ) : (
                        <span key={index}>{segment.text}</span>
                    )
                )}
            </>
        );
    }
    return value;
}
