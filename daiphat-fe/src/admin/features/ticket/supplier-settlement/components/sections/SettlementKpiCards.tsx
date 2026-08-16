import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { AdminKpiCard, AdminKpiCardsGrid } from '@/admin/components/ui/AdminKpiCard';
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
        <AdminKpiCardsGrid columns={{ xs: 1, sm: 2, md: 2, xl: 4 }}>
            <AdminKpiCard
                value={kpis.totalImportedTickets.toLocaleString('vi-VN')}
                label="Tổng vé nhập"
                icon={<Inventory2OutlinedIcon fontSize="small" />}
                tone="cyan"
            />
            <AdminKpiCard
                value={kpis.totalSoldTickets.toLocaleString('vi-VN')}
                label="Đã bán"
                icon={<ShoppingCartOutlinedIcon fontSize="small" />}
                tone="amber"
            />
            <AdminKpiCard
                value={remainingValue.toLocaleString('vi-VN')}
                label={remainingLabel}
                icon={<Inventory2OutlinedIcon fontSize="small" />}
                tone="green"
            />
            <AdminKpiCard
                value={incidentTotal.toLocaleString('vi-VN')}
                label={`Tổng vé sự cố · ${kpis.totalDamagedTickets} hỏng · ${kpis.totalLostTickets} lạc · ${kpis.totalVoidedTickets} hủy`}
                icon={<WarningAmberOutlinedIcon fontSize="small" />}
                tone="rose"
            />
        </AdminKpiCardsGrid>
    );
};
