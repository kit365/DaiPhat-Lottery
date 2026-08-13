import { AdminMetricCard, type AdminMetricCardRecentSource } from './AdminMetricCard';

interface SummaryWidgetProps {
    title: string;
    total: string;
    percent: number;
    color?: string;
    chartData: number[];
    subtitle?: string;
    recentSources?: AdminMetricCardRecentSource[];
    hideTrend?: boolean;
}

const SummaryWidget = ({
    title,
    total,
    percent,
    color = '#FF3030',
    chartData,
    subtitle,
    recentSources,
    hideTrend = false,
}: SummaryWidgetProps) => (
    <AdminMetricCard
        title={title}
        value={total}
        color={color}
        subtitle={subtitle}
        trend={hideTrend ? undefined : { percent, chartData }}
        recentSources={recentSources}
    />
);

export default SummaryWidget;
