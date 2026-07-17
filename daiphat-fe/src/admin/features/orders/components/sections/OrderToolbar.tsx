import { Toolbar, Box, Button, Badge, SvgIcon } from "@mui/material";
import { useMemo, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "../../../../components/ui/Search";
import { JiraFilter, toolbarStyles, IGridSettings } from "../../../../shared/data-grid";
import { SettingsList } from "../../../../components/ui/SettingsList";
import { SortButton } from "../../../../components/ui/SortButton";
import Tooltip from '@mui/material/Tooltip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { toast } from "react-toastify";
import { useRef, useState } from "react";
import dayjs from "dayjs";
import { OrderFilterParams } from "../../../../../types/order.type";

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
    settings: IGridSettings;
    onSettingsChange: Dispatch<SetStateAction<IGridSettings>>;
    filters: OrderFilterParams;
    onFilterChange: (fieldId: string, values: string[]) => void;
    onClearFilters: () => void;
    onSearchChange: (search: string) => void;
    sortByUI: string;
    onSortChange: (sortByUI: string) => void;
}

export const OrderToolbar = ({
    settings,
    onSettingsChange,
    filters,
    onFilterChange,
    onClearFilters,
    onSearchChange,
    sortByUI,
    onSortChange,
}: ToolbarProps) => {
    const { t } = useTranslation();
    
    const sortOptions = useMemo(() => [
        { value: 'default', label: "Mặc định" },
        { value: 'newest', label: "Mới nhất" },
        { value: 'pickup_asc', label: "Giờ lấy vé gần nhất" },
        { value: 'price_desc', label: "Thành tiền: Cao → Thấp" },
        { value: 'price_asc', label: "Thành tiền: Thấp → Cao" }
    ], []);

    const filterFields = useMemo(() => {
        const today = dayjs().format('YYYY-MM-DD');
        const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        const firstDayOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
        const thisMonthValue = `month:${firstDayOfMonth}:${today}`;

        return [
            {
                id: 'orderType',
                label: "Loại đơn",
                options: [
                    { value: 'ONLINE', label: "Online" },
                    { value: 'DIRECT', label: "Tại quầy" }
                ]
            },
            {
                id: 'receiveType',
                label: "Hình thức nhận",
                options: [
                    { value: 'COUNTER_PICKUP', label: "Nhận tại quầy" }
                ]
            },
            {
                id: 'dateRange',
                label: "Ngày / Thời gian tạo",
                type: 'date' as const,
                options: [
                    { value: today, label: `Hôm nay (${dayjs(today).format('DD/MM/YYYY')})` },
                    { value: yesterday, label: `Hôm qua (${dayjs(yesterday).format('DD/MM/YYYY')})` },
                    {
                        value: thisMonthValue,
                        label: `Tháng này (${dayjs(firstDayOfMonth).format('DD/MM')} – ${dayjs(today).format('DD/MM/YYYY')})`,
                    },
                ]
            }
        ];
    }, []);

    return (
        <Toolbar 
            style={toolbarStyles.root} 
            sx={{ 
                justifyContent: 'space-between',
                padding: '20px !important',
                gap: 2
            }}
        >
            <Box sx={{ flex: 1 }}>
                <Search
                    maxWidth="100%"
                    placeholder="Tìm theo mã đơn hàng..."
                    value={filters.search || ''}
                    onChange={onSearchChange}
                />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <JiraFilter
                    fields={filterFields}
                    selectedFilters={{
                        orderType: Array.isArray(filters.orderType) ? filters.orderType : (filters.orderType ? [filters.orderType] : []),
                        receiveType: Array.isArray(filters.receiveType) ? filters.receiveType : (filters.receiveType ? [filters.receiveType] : []),
                        dateRange: (() => {
                            if (!filters.fromDate) return [];
                            const firstDayOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
                            const today = dayjs().format('YYYY-MM-DD');
                            if (
                                filters.fromDate === firstDayOfMonth &&
                                filters.toDate === today &&
                                filters.fromDate !== filters.toDate
                            ) {
                                return [`month:${firstDayOfMonth}:${today}`];
                            }
                            if (filters.toDate && filters.toDate !== filters.fromDate) {
                                return [filters.fromDate, filters.toDate];
                            }
                            return [filters.fromDate];
                        })(),
                    }}
                    onFilterChange={onFilterChange}
                    onClearAll={onClearFilters}
                    trigger={({ onClick, totalFilterCount }) => (
                        <Button
                            variant="text"
                            size="small"
                            disableElevation
                            onClick={onClick}
                            startIcon={
                                <Badge
                                    badgeContent={totalFilterCount}
                                    color="primary"
                                    variant="dot"
                                    sx={{ '& .MuiBadge-badge': { backgroundColor: "#FF5630" } }}
                                >
                                    <SvgIcon sx={{ fontSize: '1.125rem !important' }} viewBox="0 0 24 24">
                                        <g fill="none" fillRule="evenodd">
                                            <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                                            <path
                                                fill="#1C252E"
                                                d="M3 4.5A1.5 1.5 0 0 1 4.5 3h15A1.5 1.5 0 0 1 21 4.5v2.086A2 2 0 0 1 20.414 8L15 13.414v7.424a1.1 1.1 0 0 1-1.592.984l-3.717-1.858A1.25 1.25 0 0 1 9 18.846v-5.432L3.586 8A2 2 0 0 1 3 6.586z"
                                            />
                                        </g>
                                    </SvgIcon>
                                </Badge>
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
                <DummyColumns />
                <DummyExportButton />
                <SettingsList
                    settings={settings}
                    onSettingsChange={onSettingsChange}
                />
            </Box>
        </Toolbar>
    );
};
