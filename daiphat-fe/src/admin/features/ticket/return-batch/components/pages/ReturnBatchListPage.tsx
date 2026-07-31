import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { useReturnBatchList } from '../../hooks/useReturnBatch';
import { ReturnBatchList } from '../sections/ReturnBatchList';

export const ReturnBatchListPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const listHook = useReturnBatchList();

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách phiếu trả vé" />
                    <Breadcrumb
                        items={[
                            { label: t('admin.dashboard.title'), to: '/' },
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Trả vé NCC', to: ROUTES.ADMIN.RETURN_BATCH.LIST },
                            { label: 'Danh sách' },
                        ]}
                    />
                </div>
                <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                    <LoadingButton
                        onClick={() => navigate(ROUTES.ADMIN.RETURN_BATCH.CREATE)}
                        label="Tạo phiếu trả vé"
                        startIcon={<AddIcon />}
                        className="btn-primary-admin"
                        sx={{
                            minHeight: '2.25rem',
                            padding: 'var(--shape-borderRadius-sm) calc(2 * var(--spacing))',
                        }}
                    />
                </CanAccess>
            </div>

            <ReturnBatchList listHook={listHook} />
        </>
    );
};
