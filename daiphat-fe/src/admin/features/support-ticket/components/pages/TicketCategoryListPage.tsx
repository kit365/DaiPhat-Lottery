"use client";

import { useState, useMemo } from 'react';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { prefixAdmin } from '../../../../constants/routes';
import { useGetAdminTicketCategories } from '../../hooks/useSupportTicket';
import { TicketCategoryList } from '../sections/TicketCategoryList';
import { Tabs, Tab, Box } from '@mui/material';
import { 
    Apps as AppsIcon,
    ShoppingCart as ShoppingCartIcon,
    AccountBalanceWallet as PaymentIcon,
    SupportAgent as SupportAgentIcon,
    Category as CategoryIcon
} from '@mui/icons-material';

const getTabConfig = (code: string | 'ALL') => {
    switch (code) {
        case 'ALL':
            return { icon: <AppsIcon fontSize="small" />, color: 'primary.main' };
        case 'GROUP_ORDER':
        case 'ORDER_ISSUE':
            return { icon: <ShoppingCartIcon fontSize="small" />, color: 'info.main' };
        case 'GROUP_PAYMENT':
        case 'PAYMENT_ISSUE':
            return { icon: <PaymentIcon fontSize="small" />, color: 'success.main' };
        case 'GENERAL':
            return { icon: <SupportAgentIcon fontSize="small" />, color: 'warning.main' };
        default:
            return { icon: <CategoryIcon fontSize="small" />, color: 'text.secondary' };
    }
};

export const TicketCategoryListPage = () => {
    const { data, isLoading } = useGetAdminTicketCategories();
    const categories = data?.data || [];
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTab, setSelectedTab] = useState<string>('ALL');

    const parentCategories = useMemo(() => {
        const roots = categories.filter(c => !c.parentId);
        roots.sort((a, b) => a.priority - b.priority);
        return roots;
    }, [categories]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        setSelectedTab(newValue);
    };

    const getSelectedColor = () => {
        if (selectedTab === 'ALL') return getTabConfig('ALL').color;
        const parent = parentCategories.find(p => p.id.toString() === selectedTab);
        if (!parent) return 'primary.main';
        return getTabConfig(parent.code).color;
    };

    const indicatorColor = getSelectedColor();

    return (
        <>
            <PageHeader
                title="Danh mục khiếu nại"
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                    { label: 'Khiếu nại', to: `/${prefixAdmin}/support-tickets/list` },
                    { label: 'Danh mục' },
                ]}
            />

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs 
                    value={selectedTab} 
                    onChange={handleTabChange} 
                    variant="scrollable" 
                    scrollButtons="auto"
                    TabIndicatorProps={{
                        sx: { backgroundColor: indicatorColor, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 }
                    }}
                >
                    <Tab 
                        label="Tất cả" 
                        value="ALL" 
                        icon={getTabConfig('ALL').icon}
                        iconPosition="start"
                        sx={{ 
                            minHeight: 48, 
                            fontWeight: selectedTab === 'ALL' ? 600 : 400,
                            color: selectedTab === 'ALL' ? getTabConfig('ALL').color : 'text.secondary',
                            '&.Mui-selected': {
                                color: getTabConfig('ALL').color
                            }
                        }}
                    />
                    {parentCategories.map(parent => {
                        const config = getTabConfig(parent.code);
                        return (
                            <Tab 
                                key={parent.id} 
                                label={parent.name} 
                                value={parent.id.toString()} 
                                icon={config.icon}
                                iconPosition="start"
                                sx={{ 
                                    minHeight: 48, 
                                    fontWeight: selectedTab === parent.id.toString() ? 600 : 400,
                                    color: selectedTab === parent.id.toString() ? config.color : 'text.secondary',
                                    '&.Mui-selected': {
                                        color: config.color
                                    }
                                }}
                            />
                        );
                    })}
                </Tabs>
            </Box>

            <TicketCategoryList 
                categories={categories}
                isLoading={isLoading}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedTab={selectedTab}
            />
        </>
    );
};

