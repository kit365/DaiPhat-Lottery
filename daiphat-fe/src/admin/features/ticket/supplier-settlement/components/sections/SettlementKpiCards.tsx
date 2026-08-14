import { StatRibbonCard, StatRibbonCardsGrid } from '@/admin/components/ui/StatRibbonCard';
import type { SupplierSettlementKpis } from '../../types/supplierSettlement.type';

interface Props {
    kpis: SupplierSettlementKpis;
    hasHandedOver?: boolean;
    isExpired?: boolean;
}

export const SettlementKpiCards = ({ kpis, hasHandedOver, isExpired }: Props) => {
    const remainingLabel = isExpired
        ? 'Quá hạn trả'
        : hasHandedOver
          ? 'Đã trả NCC'
          : 'Còn lại trong kho';
    const remainingValue = isExpired
        ? (kpis.totalExpiredReturnTickets ?? 0)
        : kpis.totalRemainingTickets;
    const incidentTotal =
        kpis.totalDamagedTickets + kpis.totalLostTickets + kpis.totalVoidedTickets;

    return (
        <StatRibbonCardsGrid>
            <StatRibbonCard
                value={kpis.totalImportedTickets.toLocaleString('vi-VN')}
                label="Tổng vé nhập"
                icon="solar:box-bold-duotone"
                color="cyan"
            />
            <StatRibbonCard
                value={kpis.totalSoldTickets.toLocaleString('vi-VN')}
                label="Đã bán"
                icon="solar:cart-large-2-bold-duotone"
                color="orange"
            />
            <StatRibbonCard
                value={remainingValue.toLocaleString('vi-VN')}
                label={remainingLabel}
                icon="solar:home-2-bold-duotone"
                color="green"
            />
            <StatRibbonCard
                value={incidentTotal.toLocaleString('vi-VN')}
                label={`Tổng vé sự cố · ${kpis.totalDamagedTickets} hỏng · ${kpis.totalLostTickets} lạc · ${kpis.totalVoidedTickets} hủy`}
                icon="solar:danger-triangle-bold-duotone"
                color="red"
            />
        </StatRibbonCardsGrid>
    );
};
