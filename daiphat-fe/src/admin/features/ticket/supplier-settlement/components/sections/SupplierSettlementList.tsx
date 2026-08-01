import { Box, Card, Typography } from '@mui/material';

interface SupplierSettlementListProps {
    listHook?: any;
}

export const SupplierSettlementList = ({ listHook }: SupplierSettlementListProps) => {
    return (
        <Card sx={{ p: 3 }}>
            <Typography variant="body1" color="text.secondary">
                Danh sách đối soát nhà cung cấp.
            </Typography>
        </Card>
    );
};
