import { Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { useActiveImportBatchDraft } from '../hooks/useImportBatch';
import { usePermissions } from '../../../hooks/usePermission';
import { PERMISSIONS } from '../../../constants/permission.constants';

export const ImportBatchDraftBanner = () => {
    const navigate = useNavigate();
    const { can } = usePermissions();
    const canView = can(PERMISSIONS.IMPORT_BATCH.VIEW) || can(PERMISSIONS.IMPORT_BATCH.CREATE);
    const { data: draft, isLoading } = useActiveImportBatchDraft(canView);

    if (!canView || isLoading || !draft) {
        return null;
    }

    return (
        <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
                <Button
                    color="inherit"
                    size="small"
                    onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.DETAIL(draft.id))}
                >
                    Tiếp tục phiếu
                </Button>
            }
        >
            Bạn đang có phiếu nhập lô chưa hoàn thành. Vui lòng tiếp tục phiếu hiện tại trước khi tạo phiếu mới.
        </Alert>
    );
};
