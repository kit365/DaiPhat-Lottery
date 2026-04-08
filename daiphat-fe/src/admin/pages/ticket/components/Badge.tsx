import { Box, LinearProgress } from '@mui/material';
import { ReactNode } from 'react';

interface BadgeProps {
    label: string;
    backgroundColor: string;
    textColor: string;
    icon?: ReactNode;
}

export const Badge = ({ label, backgroundColor, textColor, icon }: BadgeProps) => {
    return (
        <span
            className="inline-flex items-center justify-center leading-1.5 min-w-[1.5rem] h-[1.5rem] text-[0.75rem] px-[6px] font-[700] rounded-[6px]"
            style={{
                backgroundColor,
                color: textColor,
                gap: icon ? '4px' : '0',
            }}
        >
            {icon}
            {label}
        </span>
    );
};

interface StockProgressProps {
    stock: number;
    maxStock?: number;
}

export const StockProgress = ({ stock, maxStock = 20 }: StockProgressProps) => {
    const getStockStatus = () => {
        if (stock === 0) {
            return {
                label: 'hết hàng',
                color: undefined,
                bgColor: 'rgba(255, 86, 48, 0.24)',
                percentage: 0,
            };
        }

        if (stock > 0 && stock <= maxStock) {
            return {
                label: `${stock} sắp hết hàng`,
                color: '#FFAB00',
                bgColor: 'rgba(255 171 0 / 24%)',
                percentage: (stock / maxStock) * 100,
            };
        }

        return {
            label: `${stock} còn hàng`,
            color: '#22C55E',
            bgColor: 'rgba(34, 197, 94, 0.24)',
            percentage: 90,
        };
    };

    const status = getStockStatus();

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: '100%',
                width: '100%',
                fontSize: '0.75rem',
                color: 'var(--palette-text-secondary)',
            }}
        >
            <LinearProgress
                variant="determinate"
                value={status.percentage}
                sx={{
                    width: '80px',
                    height: '6px',
                    borderRadius: "var(--shape-borderRadius-lg)",
                    marginBottom: '8px',
                    backgroundColor: status.bgColor,
                    '& .MuiLinearProgress-bar': {
                        backgroundColor: status.color,
                        borderRadius: "var(--shape-borderRadius-lg)",
                    },
                }}
            />
            {status.label}
        </Box>
    );
};




