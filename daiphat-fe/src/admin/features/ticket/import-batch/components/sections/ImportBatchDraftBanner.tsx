"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Alert, Button } from '@mui/material';
import { ROUTES } from '../../../../../constants/routes';
import { useImportBatchDraftBanner } from '../../hooks/useImportBatch';
import { usePermissions } from '../../../../../hooks/usePermission';
import { PERMISSIONS } from '../../../../../constants/permission.constants';

export const ImportBatchDraftBanner = () => {
    const router = useAdminRouter();
    const { can } = usePermissions();
    const canView = can(PERMISSIONS.IMPORT_BATCH.VIEW) || can(PERMISSIONS.IMPORT_BATCH.CREATE);

    const { data, isLoading } = useImportBatchDraftBanner(canView);

    const hasDraft = (data?.data?.recordList?.length ?? 0) > 0;

    if (!canView || isLoading || !hasDraft) {
        return null;
    }

    return (
        <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
                <Button
                    color="inherit"
                    size="small"
                    onClick={() => router.push(ROUTES.ADMIN.IMPORT_BATCH.LIST)}
                >
                    Xem danh sách
                </Button>
            }
        >
            Bạn có phiếu nhập lô ở trạng thái nháp. Có thể tiếp tục nhập vé bất kỳ lúc nào từ danh sách
            phiếu nhập.
        </Alert>
    );
};
