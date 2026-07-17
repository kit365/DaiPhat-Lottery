/**
 * Ticket domain — subfolders are separate concerns:
 * - inventory/     kho vé số
 * - import-batch/  nhập lô vé
 * - variant/       (chưa có trên FE)
 */
export {
    TicketListPage,
    TicketCreatePage,
    TicketEditPage,
    TicketDetailPage,
    ExpiredTicketListPage,
} from './inventory';

export {
    ImportBatchListPage,
    ImportBatchCreatePage,
    ImportBatchEditPage,
    ImportBatchDetailPage,
} from './import-batch';
