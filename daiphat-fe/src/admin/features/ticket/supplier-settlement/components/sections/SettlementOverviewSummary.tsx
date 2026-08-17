import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { formatVnd } from '../../../import-batch/utils/importCostCalculator';
import type { SupplierSettlement } from '../../types/supplierSettlement.type';

interface Props {
    settlement: SupplierSettlement;
}

type MetricTone = 'default' | 'danger' | 'success';

interface MetricItemProps {
    label: string;
    value: string;
    tone?: MetricTone;
    hint?: string;
}

const gridSx: SxProps<Theme> = {
    display: 'grid',
    gridTemplateColumns: {
        xs: 'repeat(2, minmax(0, 1fr))',
        sm: 'repeat(4, minmax(0, 1fr))',
    },
    gap: 1.5,
    width: '100%',
};

const MetricItem = ({ label, value, tone = 'default', hint }: MetricItemProps) => {
    const isDanger = tone === 'danger';
    const isSuccess = tone === 'success';

    return (
        <Box
            sx={{
                px: 2,
                py: 1.5,
                borderRadius: '12px',
                bgcolor: isDanger
                    ? 'rgba(var(--palette-error-mainChannel) / 0.08)'
                    : isSuccess
                      ? 'rgba(var(--palette-success-mainChannel) / 0.08)'
                      : 'var(--palette-background-neutral)',
                border: '1px solid',
                borderColor: isDanger
                    ? 'rgba(var(--palette-error-mainChannel) / 0.16)'
                    : isSuccess
                      ? 'rgba(var(--palette-success-mainChannel) / 0.16)'
                      : 'transparent',
                minWidth: 0,
                textAlign: 'center',
            }}
        >
            <Typography
                variant="caption"
                sx={{
                    display: 'block',
                    color: 'var(--palette-text-secondary)',
                    fontWeight: 600,
                    lineHeight: 1.4,
                }}
            >
                {label}
            </Typography>
            <Typography
                sx={{
                    mt: 0.5,
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    fontWeight: 800,
                    lineHeight: 1.3,
                    color: isDanger
                        ? 'var(--palette-error-dark)'
                        : isSuccess
                          ? 'var(--palette-success-dark)'
                          : 'var(--palette-text-primary)',
                    wordBreak: 'break-word',
                }}
            >
                {value}
            </Typography>
            {hint ? (
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        mt: 0.25,
                        color: isDanger ? 'var(--palette-error-dark)' : 'var(--palette-text-secondary)',
                        fontSize: '0.68rem',
                        lineHeight: 1.4,
                    }}
                >
                    {hint}
                </Typography>
            ) : null}
        </Box>
    );
};

export const SettlementOverviewSummary = ({ settlement }: Props) => {
    const isExpired = settlement.isReturnExpired;

    return (
        <Box sx={{ pt: 0.5 }}>
            <Box
                sx={{
                    ...gridSx,
                    gridTemplateColumns: {
                        xs: 'repeat(2, minmax(0, 1fr))',
                        sm: isExpired ? 'repeat(3, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
                    },
                }}
            >
                <MetricItem label="Tổng giá trị nhập" value={formatVnd(settlement.totalImportValue)} />
                {isExpired ? (
                    <MetricItem
                        label="Giá trị quá hạn trả"
                        value={formatVnd(settlement.expiredReturnValue ?? 0)}
                        tone="danger"
                        hint="Vé chưa kịp bàn giao NCC"
                    />
                ) : (
                    <MetricItem label="Tổng giá trị trả" value={formatVnd(settlement.totalReturnValue)} />
                )}
                <MetricItem label="Đã thanh toán" value={formatVnd(settlement.totalPaidAmount)} />
                {!isExpired && (
                    <MetricItem
                        label="Còn phải trả"
                        value={formatVnd(settlement.remainingAmount)}
                        tone="success"
                        hint={
                            !settlement.totalReturnValue
                                ? 'Sẽ tính sau khi hoàn tất kiểm tra phiếu trả'
                                : undefined
                        }
                    />
                )}
            </Box>
        </Box>
    );
};
