import { Tabs, Tab, styled } from '@mui/material';

// Styled component cho con số (Badge nhãn)
const TabBadge = styled('span')(() => ({
    height: "24px",
    minWidth: "24px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: '8px',
    padding: '0px 6px',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
    transition: 'all 0.2s',
}));

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
                    <TabBadge sx={{ backgroundColor: '#1C252E', color: '#fff' }}>
                        {counts.all}
                    </TabBadge>
                }
                iconPosition="end"
                sx={tabStyle}
            />

            <Tab
                disableRipple
                label="Xuất bản"
                icon={
                    <TabBadge
                        className="badge-status"
                        sx={{
                            backgroundColor: value === 1 ? '#00B8D9' : 'rgba(0, 184, 217, 0.16)',
                            color: value === 1 ? '#fff' : '#006C9C'
                        }}
                    >
                        {counts.published}
                    </TabBadge>
                }
                iconPosition="end"
                sx={tabStyle}
            />

            <Tab
                disableRipple
                label="Bản nháp"
                icon={
                    <TabBadge
                        className="badge-status"
                        sx={{
                            backgroundColor: value === 2 ? '#454F5B' : 'rgba(145, 158, 171, 0.16)',
                            color: value === 2 ? '#fff' : '#637381'
                        }}
                    >
                        {counts.draft}
                    </TabBadge>
                }
                iconPosition="end"
                sx={tabStyle}
            />

            <Tab
                disableRipple
                label="Đã lưu trữ"
                icon={
                    <TabBadge
                        className="badge-status"
                        sx={{
                            backgroundColor: value === 3 ? '#FF5630' : 'rgba(255, 86, 48, 0.16)',
                            color: value === 3 ? '#fff' : '#B71D18'
                        }}
                    >
                        {counts.archived}
                    </TabBadge>
                }
                iconPosition="end"
                sx={tabStyle}
            />
        </Tabs>
    );
};

const tabStyle = {
    textTransform: 'none',
    minWidth: 0,
    minHeight: 48,
    padding: '9px 0',
    fontSize: '0.875rem',
    fontWeight: "500",
    color: '#637381',
    flexDirection: 'row',
    '&.Mui-selected': {
        color: '#1C252E',
        fontWeight: 600,
    },
};
