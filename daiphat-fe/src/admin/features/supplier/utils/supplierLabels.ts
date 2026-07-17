export const SUPPLIER_TYPE_LABELS: Record<string, string> = {
    LOTTERY_COMPANY: 'Nhà đài (nhập thẳng từ công ty XS)',
    DISTRIBUTOR: 'Tổng đại lý / Đại lý phân phối',
};

export const getSupplierTypeLabel = (type?: string) =>
    (type && SUPPLIER_TYPE_LABELS[type]) || type || '—';

export const getSupplierStatusLabel = (isActive?: boolean) =>
    isActive ? 'Hoạt động' : 'Ngừng hoạt động';
