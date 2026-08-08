"use client";

import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from '@/components/router-compat';
import { PageHeader } from '../../../../../components/ui/PageHeader';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { useImportBatchList } from '../../hooks/useImportBatch';
import { ImportBatchList } from '../sections/ImportBatchList';

export const ImportBatchListPage = () => {
    const navigate = useNavigate();
    const listHook = useImportBatchList();

    return (
        <>
            <PageHeader
                title="Danh sách phiếu nhập lô"
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: '/' },
                    { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                    { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                    { label: 'Danh sách' },
                ]}
                action={
                    <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                        <LoadingButton
                            onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.CREATE)}
                            label="Khai báo phiếu nhập"
                            startIcon={<AddIcon />}
                            className="btn-primary-admin"
                            sx={{
                                minHeight: '2.25rem',
                                padding: 'var(--shape-borderRadius-sm) calc(2 * var(--spacing))',
                                alignSelf: { xs: 'stretch', sm: 'flex-start' },
                                whiteSpace: 'nowrap',
                            }}
                        />
                    </CanAccess>
                }
            />

            <ImportBatchList listHook={listHook} />
        </>
    );
};
