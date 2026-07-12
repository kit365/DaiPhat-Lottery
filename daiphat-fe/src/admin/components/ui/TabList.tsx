import { Tabs, Tab } from '@mui/material';
import { getTabBadgeStyles } from '../../utils/badge';

interface TabListProps {
    value: number;
    onChange: (event: React.SyntheticEvent, newValue: number) => void;
    counts?: {
        all: number;
        published: number;
        draft: number;
        archived: number;
        deleted?: number;
    }
}

export const TabList = ({ value, onChange, counts = { all: 0, published: 0, draft: 0, archived: 0, deleted: 0 } }: TabListProps) => {


    return (
        <Tabs
            value={value}
            onChange={onChange}
            variant="scrollable"
            scrollButtons={false}
            sx={{
                mb: "40px",
                minHeight: "48px",
                '& .MuiTabs-flexContainer': {
                    gap: "40px"
                },
                '& .MuiTabs-indicator': {
                    backgroundColor: '#1C252E',
                    height: 2,
                },
            }}
        >
            <Tab
                disableRipple
                label="Tất cả"
                icon={
                    <span className="admin-tab-badge" style={getTabBadgeStyles('all', value === 0)}>
                        {counts.all}
                    </span>
                }
                iconPosition="end"
                className="admin-tab"
            />

            <Tab
                disableRipple
                label="Xuất bản"
                icon={
                    <span className="admin-tab-badge badge-status" style={getTabBadgeStyles('info', value === 1)}>
                        {counts.published}
                    </span>
                }
                iconPosition="end"
                className="admin-tab"
            />

            <Tab
                disableRipple
                label="Bản nháp"
                icon={
                    <span className="admin-tab-badge badge-status" style={getTabBadgeStyles('neutral', value === 2)}>
                        {counts.draft}
                    </span>
                }
                iconPosition="end"
                className="admin-tab"
            />

            <Tab
                disableRipple
                label="Đã lưu trữ"
                icon={
                    <span className="admin-tab-badge badge-status" style={getTabBadgeStyles('error', value === 3)}>
                        {counts.archived}
                    </span>
                }
                iconPosition="end"
                className="admin-tab"
            />

            <Tab
                disableRipple
                label="Đã xoá"
                icon={
                    <span className="admin-tab-badge badge-status" style={getTabBadgeStyles('error', value === 4)}>
                        {counts.deleted}
                    </span>
                }
                iconPosition="end"
                className="admin-tab"
            />
        </Tabs>
    );
};
