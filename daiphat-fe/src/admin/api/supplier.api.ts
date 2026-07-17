/** @deprecated Import from `admin/features/supplier` / `admin/features/supplier/services/supplierService` */
export type {
    LotterySupplierType,
    LotterySupplier,
    CreateLotterySupplierPayload,
    UpdateLotterySupplierPayload,
    SupplierListParams,
} from '../features/supplier/types/supplier.type';
export {
    getSuppliers,
    getActiveSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
} from '../features/supplier/services/supplierService';
