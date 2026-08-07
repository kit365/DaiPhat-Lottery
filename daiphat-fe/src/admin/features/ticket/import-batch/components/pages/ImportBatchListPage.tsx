"use client";

import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from '@/components/router-compat';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
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
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách phiếu nhập lô" />
                    <Breadcrumb
                        items={[
                            { label: 'Bảng điều khiển', to: '/' },
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Nhập lô vé', to: ROUTES.ADMIN.IMPORT_BATCH.LIST },
                            { label: 'Danh sách' },
                        ]}
                    />
                </div>
                <CanAccess permission={PERMISSIONS.IMPORT_BATCH.CREATE}>
                    <LoadingButton
                        onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.CREATE)}
                        label="Khai báo phiếu nhập"
                        startIcon={<AddIcon />}
                        className="btn-primary-admin"
                        sx={{
                            minHeight: '2.25rem',
                            padding: 'var(--shape-borderRadius-sm) calc(2 * var(--spacing))',
                        }}
                    />
                </CanAccess>
            </div>

            <ImportBatchList listHook={listHook} />
        </>
    );
};
