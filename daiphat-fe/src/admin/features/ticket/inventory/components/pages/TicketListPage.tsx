import AddIcon from '@mui/icons-material/Add';
import { Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { CanAccess } from '../../../../../components/auth/CanAccess';
import { PERMISSIONS } from '../../../../../constants/permission.constants';
import { prefixAdmin, ROUTES } from '../../../../../constants/routes';
import { useTicketInventory } from '../../hooks/useTicketInventory';
import { TicketList } from '../sections/TicketList';
import { IncompleteImportBatchNotification } from '../../../import-batch/components/sections/IncompleteImportBatchNotification';

export const TicketListPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const ticketHook = useTicketInventory();

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách vé số" />
                    <Breadcrumb
                        items={[
                            { label: t('admin.dashboard.title'), to: '/' },
                            { label: 'Vé số', to: `/${prefixAdmin}/ticket/list` },
                            { label: 'Danh sách' },
                        ]}
                    />
                </div>
                <CanAccess permission={PERMISSIONS.TICKET.CREATE}>
                    <LoadingButton
                        onClick={() => navigate(ROUTES.ADMIN.TICKETS.CREATE)}
                        label="Thêm vé số"
                        startIcon={<AddIcon />}
                        className="btn-primary-admin"
                        sx={{
                            minHeight: '2.25rem',
                            padding: 'var(--shape-borderRadius-sm) calc(2 * var(--spacing))',
                        }}
                    />
                </CanAccess>
            </div>

            <Stack spacing={2} sx={{ mb: 2 }}>
                <CanAccess anyOf={[PERMISSIONS.TICKET.CREATE, PERMISSIONS.IMPORT_BATCH.VIEW]}>
                    <IncompleteImportBatchNotification variant="detailed" />
                </CanAccess>
            </Stack>

            <TicketList ticketHook={ticketHook} />
        </>
    );
};
