import { Button } from '@mui/material';
import { Icon } from '@iconify/react';
import { Title } from '../../../../components/ui/Title';
import { Breadcrumb } from '../../../../components/ui/Breadcrumb';
import { prefixAdmin } from '../../../../constants/routes';
import { confirmAction } from '../../../../utils/swal';
import {
    useDeleteAllNotifications,
    useMarkAllAsRead,
} from '../../hooks/useNotification';
import { NotificationList } from '../sections/NotificationList';

export const NotificationListPage = () => {
    const { mutate: markAllAsRead } = useMarkAllAsRead();
    const { mutate: deleteAllNotifications } = useDeleteAllNotifications();

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Thông báo" />
                    <Breadcrumb
                        items={[
                            { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                            { label: 'Thông báo' },
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <Button
                        onClick={() => {
                            confirmAction(
                                'Xóa tất cả thông báo đã đọc?',
                                'Hành động này sẽ xóa các thông báo đã đọc khỏi danh sách.',
                                () => {
                                    deleteAllNotifications();
                                },
                                'warning'
                            );
                        }}
                        sx={{
                            background: 'rgba(255, 86, 48, 0.12)',
                            color: 'var(--palette-error-main)',
                            minHeight: '2.25rem',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            px: 2,
                            borderRadius: 'var(--shape-borderRadius)',
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': {
                                background: 'rgba(255, 86, 48, 0.24)',
                            },
                        }}
                        variant="contained"
                        startIcon={<Icon icon="solar:trash-bin-trash-bold" />}
                    >
                        Xóa đã đọc
                    </Button>
                    <Button
                        onClick={() => markAllAsRead()}
                        sx={{
                            background: 'rgba(0, 184, 217, 0.16)',
                            color: 'var(--palette-info-main)',
                            minHeight: '2.25rem',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            px: 2,
                            borderRadius: 'var(--shape-borderRadius)',
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': {
                                background: 'rgba(0, 184, 217, 0.24)',
                            },
                        }}
                        variant="contained"
                        startIcon={<Icon icon="eva:done-all-fill" />}
                    >
                        Đánh dấu đã đọc tất cả
                    </Button>
                </div>
            </div>

            <NotificationList />
        </>
    );
};
