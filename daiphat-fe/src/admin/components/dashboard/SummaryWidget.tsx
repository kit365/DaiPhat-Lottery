import { AdminMetricCard, type AdminMetricCardRecentSource } from './AdminMetricCard';

interface SummaryWidgetProps {
    title: string;
    total: string;
    percent: number;
    color?: string;
    chartData: number[];
    recentSources?: AdminMetricCardRecentSource[];
}

const SummaryWidget = ({
    title,
    total,
    percent,
    color = '#FF3030',
    chartData,
    recentSources,
}: SummaryWidgetProps) => (
    <AdminMetricCard
        title={title}
        value={total}
        color={color}
        trend={{ percent, chartData }}
        recentSources={recentSources}
    />
);

export default SummaryWidget;
