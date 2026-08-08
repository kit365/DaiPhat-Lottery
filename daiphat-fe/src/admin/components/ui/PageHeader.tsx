import { Box, Stack } from '@mui/material';
import { ReactNode } from 'react';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';
import { Title } from './Title';

export type { BreadcrumbItem };

interface PageHeaderProps {
    title: string;
    breadcrumbItems: BreadcrumbItem[];
    action?: ReactNode;
    titleExtra?: ReactNode;
    description?: ReactNode;
}

export const PageHeader = ({
    title,
    breadcrumbItems,
    action,
    titleExtra,
    description,
}: PageHeaderProps) => {
    return (
        <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end flex-wrap">
            <div className="mr-auto min-w-0">
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ mb: '16px' }}
                >
                    <Title title={title} disableBottomMargin />
                    {titleExtra}
                </Stack>

                {description ? (
                    <Box sx={{ mb: '12px' }}>
                        {description}
                    </Box>
                ) : null}

                <Breadcrumb items={breadcrumbItems} />
            </div>

            {action ? (
                <div className="flex gap-[16px] items-center shrink-0">
                    {action}
                </div>
            ) : null}
        </div>
    );
};
