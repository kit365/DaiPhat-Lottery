import { Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { useReturnBatchList } from '../../hooks/useReturnBatch';
import { ReturnBatchList } from '../sections/ReturnBatchList';

export const ReturnBatchListPage = () => {
    const { t } = useTranslation();
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
            </div>

            <Alert severity="info" sx={{ mb: 2 }}>
                Phiếu trả vé được hệ thống tự động tạo theo lịch trả của từng NCC
                (giờ cắt trả − thời gian đệm RETURN_BUFFER_TIME), gom theo nhà cung cấp trong ngày quay.
            </Alert>

            <ReturnBatchList listHook={listHook} />
        </>
    );
};
