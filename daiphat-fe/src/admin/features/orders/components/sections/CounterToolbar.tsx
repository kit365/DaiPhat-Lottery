import { Toolbar, Box, Button, Badge, SvgIcon } from "@mui/material";
import { useMemo, useState, useRef, useEffect } from "react";
import { useStationsByDrawDate } from "../../../station/hooks/useStation";
import { Search } from "../../../../components/ui/Search";
import { JiraFilter, toolbarStyles } from "../../../../shared/data-grid";
import { SortButton } from "../../../../components/ui/SortButton";
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { toast } from "react-toastify";
import { minSellableDrawDate } from "../../../../../client/utils/sellableDrawDate.util";

const CustomViewColumnIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path
            fill="#1C252E"
            fillRule="evenodd"
            d="M15 4H9v16h6zm2 16h3a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3zM4 4h3v16H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2"
            clipRule="evenodd"
        />
    </SvgIcon>
);

const CustomExportIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <g fill="none" fillRule="evenodd">
            <path fill="#1C252E" d="M12 1.25a.75.75 0 0 0-.75.75v10.973l-1.68-1.961a.75.75 0 1 0-1.14.976l3 3.5a.75.75 0 0 0 1.14 0l3-3.5a.75.75 0 1 0-1.14-.976l-1.68 1.96V2a.75.75 0 0 0-.75-.75" />
            <path
                fill="#1C252E"
                d="M14.25 9v.378a2.249 2.249 0 0 1 2.458 3.586l-3 3.5a2.25 2.25 0 0 1-3.416 0l-3-3.5A2.25 2.25 0 0 1 9.75 9.378V9H8c-2.828 0-4.243 0-5.121.879C2 10.757 2 12.172 2 15v1c0 2.828 0 4.243.879 5.121C3.757 22 5.172 22 8 22h8c2.828 0 4.243 0 5.121-.879C22 20.243 22 18.828 22 16v-1c0-2.828 0-4.243-.879-5.121C20.243 9 18.828 9 16 9z"
            />
        </g>
    </SvgIcon>
);

const DummyColumns = () => {
    return (
        <Tooltip title="Cột">
            <Button
                variant="text"
                size="small"
                disableElevation
                startIcon={<CustomViewColumnIcon />}
                onClick={() => toast.info("Đã bật chế độ xem toàn bộ cột mặc định")}
                sx={{
                    textTransform: 'none',
                    minWidth: '64px',
                    minHeight: "30px",
                    fontSize: "0.8125rem",
                    padding: '4px',
                    fontWeight: "700",
                    borderRadius: "8px",
                    gap: "6px",
                    color: '#1C252E',
                    '& .MuiButton-startIcon': { margin: 0 },
                    '&:hover': { backgroundColor: '#919eab14' },
                    '& .MuiButton-icon': { mt: "-2px !important" }
                }}
            >
                Cột
            </Button>
        </Tooltip>
    );
};

const DummyExportButton = () => {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);

    return (
        <>
            <Tooltip title="Tải dữ liệu">
                <Button
                    ref={anchorRef}
                    variant="text"
                    size="small"
                    disableElevation
                    startIcon={<CustomExportIcon sx={{ fontSize: '1.125rem !important' }} />}
                    onClick={() => setOpen(true)}
                    sx={{
                        textTransform: 'none',
                        minWidth: '64px',
                        minHeight: '30px',
                        fontSize: '0.8125rem',
                        padding: '4px',
                        fontWeight: 700,
                        borderRadius: '8px',
                        gap: '6px',
                        color: '#1C252E',
                        '& .MuiButton-startIcon': { margin: 0 },
                        '&:hover': { backgroundColor: '#919eab14' },
                        '& .MuiButton-icon': { mt: "-2px !important" }
                    }}
                >
                    Tải về
                </Button>
            </Tooltip>
            <Menu
                anchorEl={anchorRef.current}
                open={open}
                onClose={() => setOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem onClick={() => { setOpen(false); toast.success("Đang chuẩn bị trang in..."); }}>In</MenuItem>
                <MenuItem onClick={() => { setOpen(false); toast.success("Đang xuất file CSV..."); }}>Tải xuống (CSV)</MenuItem>
            </Menu>
        </>
    );
};

interface ToolbarProps {
    settings?: any;
    onSettingsChange?: any;
    filters: any;
    onFilterChange: (fieldId: string, values: string[]) => void;
    onClearFilters: () => void;
    onSearchChange: (search: string) => void;
    sortByUI: string;
    onSortChange: (sortByUI: string) => void;
}

export const CounterToolbar = ({
    settings,
    onSettingsChange,
    filters,
    onFilterChange,
    onClearFilters,
    onSearchChange,
    sortByUI,
    onSortChange,
}: ToolbarProps) => {
    const [clockTick, setClockTick] = useState(0);
    useEffect(() => {
        const timer = window.setInterval(() => setClockTick((t) => t + 1), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    const minDrawDate = minSellableDrawDate();

    const selectedDrawDates = useMemo(() => {
        if (Array.isArray(filters.dateRange) && filters.dateRange.length > 0) {
            const valid = filters.dateRange.filter((d: string) => d >= minDrawDate);
            if (valid.length > 0) return valid;
        }
        return [minDrawDate];
    }, [filters.dateRange, minDrawDate, clockTick]);

    // Ổn định key để không refetch stations mỗi lần mảng mới cùng nội dung
    const selectedDrawDatesKey = selectedDrawDates.join(',');
    const stableDrawDates = useMemo(
        () => selectedDrawDatesKey.split(',').filter(Boolean),
        [selectedDrawDatesKey]
    );

    const { data: providersData } = useStationsByDrawDate(stableDrawDates);
    
    const sortOptions = useMemo(() => [
        { value: 'default', label: "Mặc định" },
        { value: 'numbers_asc', label: "Số vé: Thấp → Cao" },
        { value: 'numbers_desc', label: "Số vé: Cao → Thấp" }
    ], []);

    const filterFields = useMemo(() => {
        const providerList = Array.isArray(providersData) ? providersData : [];
        const providerOptions = providerList.map((p: any) => ({
            value: (p.id || p._id).toString(),
            label: p.name
        }));

        return [
            {
                id: 'region',
                label: "Nhà đài",
                options: providerOptions,
                searchable: false,
            },
        ];
    }, [providersData]);

    const totalFilterCount = (filters.region || []).length;

    return (
        <Toolbar 
            style={toolbarStyles.root} 
            sx={{ 
                justifyContent: 'space-between',
                padding: '20px !important',
                gap: 2,
                borderBottom: '1px dashed var(--palette-background-neutral)'
            }}
        >
            <Box sx={{ flex: 1 }}>
                <Search
                    maxWidth="100%"
                    placeholder="Tìm theo đài, số vé..."
                    value={filters.search || ''}
                    onChange={onSearchChange}
                />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <JiraFilter
                    fields={filterFields}
                    selectedFilters={{
                        region: filters.region || [],
                    }}
                    onFilterChange={onFilterChange}
                    onClearAll={onClearFilters}
                    trigger={({ onClick }) => (
                        <Button
                            variant="text"
                            size="small"
                            disableElevation
                            onClick={onClick}
                            startIcon={
                                <SvgIcon sx={{ fontSize: '1.125rem !important' }} viewBox="0 0 24 24">
                                    <g fill="none" fillRule="evenodd">
                                        <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                                        <path
                                            fill="#1C252E"
                                            d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v2.086A2 2 0 0 1 20.414 8L15 13.414v7.424a1.1 1.1 0 0 1-1.592.984l-3.717-1.858A1.25 1.25 0 0 1 9 18.846v-5.432L3.586 8A2 2 0 0 1 3 6.586z"
                                        />
                                    </g>
                                </SvgIcon>
                            }
                            sx={{
                                textTransform: 'none',
                                minWidth: '64px',
                                minHeight: "30px",
                                fontSize: "0.8125rem",
                                padding: '4px',
                                fontWeight: "700",
                                borderRadius: "8px",
                                gap: "6px",
                                color: '#1C252E',
                                '& .MuiButton-startIcon': { margin: 0 },
                                '&:hover': { backgroundColor: '#919eab14' },
                                '& .MuiButton-icon': { mt: "-2px !important" }
                            }}
                        >
                            Bộ lọc
                        </Button>
                    )}
                />
                <SortButton
                    options={sortOptions}
                    value={sortByUI}
                    onChange={onSortChange}
                />
            </Box>
        </Toolbar>
    );
};
