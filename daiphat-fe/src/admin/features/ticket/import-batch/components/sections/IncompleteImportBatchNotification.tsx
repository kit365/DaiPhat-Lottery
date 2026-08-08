"use client";

import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { Alert, Link, Typography } from '@mui/material';
import { Link as RouterLink } from '@/components/router-compat';
import { ROUTES } from '../../../../../constants/routes';
import { useIncompleteImportBatches } from '../../hooks/useImportBatch';

export const IncompleteImportBatchNotification = () => {
    const { data: batches = [], isLoading } = useIncompleteImportBatches();

    if (isLoading || batches.length === 0) {
        return null;
    }

    return (
        <Alert
            severity="warning"
            icon={<WarningAmberOutlinedIcon fontSize="inherit" />}
            sx={{ mb: 2, py: 0.75 }}
        >
            <Typography variant="body2" component="span">
                Có <strong>{batches.length}</strong> phiếu nhập lô chưa hoàn tất.{' '}
                <Link
                    component={RouterLink}
                    to={ROUTES.ADMIN.IMPORT_BATCH.LIST}
                    variant="body2"
                    fontWeight={600}
                    underline="hover"
                    sx={{ verticalAlign: 'baseline' }}
                >
                    Xem danh sách nhập lô
                </Link>
            </Typography>
        </Alert>
    );
};
