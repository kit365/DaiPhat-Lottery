import { Alert, Button } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { getImportBatches } from '../../../api/importBatch.api';
import { QUERY_KEYS } from '../../../../constants/queryKeys';
import { usePermissions } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permission.constants';

export const ImportBatchDraftBanner = () => {
    const navigate = useNavigate();
    const { can } = usePermissions();
    const canView = can(PERMISSIONS.IMPORT_BATCH.VIEW) || can(PERMISSIONS.IMPORT_BATCH.CREATE);

    const { data, isLoading } = useQuery({
        queryKey: [QUERY_KEYS.IMPORT_BATCH_LIST, 'draft-banner'],
        queryFn: () => getImportBatches({ page: 1, size: 1, status: 'DRAFT' }),
        enabled: canView,
        staleTime: 30_000,
    });

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
                    onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.LIST)}
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
