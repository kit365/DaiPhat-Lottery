import { Card, CardProps } from "@mui/material";

interface DashboardCardProps extends CardProps {
    children: React.ReactNode;
}

const DashboardCard = ({ children, sx, ...props }: DashboardCardProps) => (
    <Card
        sx={{
            bgcolor: 'var(--palette-background-paper)',
            color: 'var(--palette-text-primary)',
            position: 'relative',
            boxShadow: 'var(--card-shadow, var(--customShadows-card))',
            borderRadius: '16px',
            transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            ...sx,
        }}
        {...props}
    >
        {children}
    </Card>
);

export default DashboardCard;
