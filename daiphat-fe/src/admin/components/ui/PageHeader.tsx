import { Box, Stack } from '@mui/material';
import { Breadcrumb } from './Breadcrumb';
import { Title } from './Title';
import { ReactNode } from 'react';

export type BreadcrumbItem = {
    label: string;
    to?: string;
};

interface PageHeaderProps {
    title: string;
    breadcrumbItems: BreadcrumbItem[];
    action?: ReactNode;
    mb?: number | string;
}

export const PageHeader = ({ title, breadcrumbItems, action, mb = 3 }: PageHeaderProps) => {
    return (
        <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb }}
        >
            <Box>
                <Breadcrumb items={breadcrumbItems} />
                <Title title={title} />
            </Box>
            {action && (
                <Box>
                    {action}
                </Box>
            )}
        </Stack>
    );
};
