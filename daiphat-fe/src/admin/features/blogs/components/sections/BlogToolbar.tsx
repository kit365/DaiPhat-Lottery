import { Toolbar, Box, Button, Badge, SvgIcon, Tooltip, Menu, MenuItem, ToggleButtonGroup, ToggleButton } from "@mui/material";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewListIcon from "@mui/icons-material/ViewList";
import { useMemo, useRef, useState } from "react";
import { AppToast as toast } from "../../../../../utils/toast.util";
import { Search } from "../../../../components/ui/Search";
import { JiraFilter } from "../../../../shared/data-grid";
import { SortButton } from "../../../../components/ui/SortButton";

const CustomViewColumnIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path fill="#1C252E" fillRule="evenodd" d="M15 4H9v16h6zm2 16h3a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3zM4 4h3v16H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2" clipRule="evenodd" />
    </SvgIcon>
);

const CustomExportIcon = (props: any) => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <g fill="none" fillRule="evenodd">
            <path fill="#1C252E" d="M12 1.25a.75.75 0 0 0-.75.75v10.973l-1.68-1.961a.75.75 0 1 0-1.14.976l3 3.5a.75.75 0 0 0 1.14 0l3-3.5a.75.75 0 1 0-1.14-.976l-1.68 1.96V2a.75.75 0 0 0-.75-.75" />
            <path fill="#1C252E" d="M14.25 9v.378a2.249 2.249 0 0 1 2.458 3.586l-3 3.5a2.25 2.25 0 0 1-3.416 0l-3-3.5A2.25 2.25 0 0 1 9.75 9.378V9H8c-2.828 0-4.243 0-5.121.879C2 10.757 2 12.172 2 15v1c0 2.828 0 4.243.879 5.121C3.757 22 5.172 22 8 22h8c2.828 0 4.243 0 5.121-.879C22 20.243 22 18.828 22 16v-1c0-2.828 0-4.243-.879-5.121C20.243 9 18.828 9 16 9z" />
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
            <Tooltip title="Xuất dữ liệu">
                <Button
                    ref={anchorRef}
                    variant="text"
                    size="small"
                    disableElevation
                    startIcon={<CustomExportIcon />}
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
    filters: {
        categoryId: string[];
        type: string[];
    };
    onFilterChange: (fieldId: string, values: string[]) => void;
    onClearFilters: () => void;
    search: string;
    onSearchChange: (search: string) => void;
    sortByUI: string;
    onSortChange: (sortByUI: string) => void;
    categoryOptions: { value: string, label: string }[];
    typeOptions: { value: string, label: string }[];
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
}

export const BlogToolbar = ({
    filters,
    onFilterChange,
    onClearFilters,
    search,
    onSearchChange,
    sortByUI,
    onSortChange,
    categoryOptions,
    typeOptions,
    viewMode,
    onViewModeChange
}: ToolbarProps) => {
    const sortOptions = useMemo(() => [
        { value: 'latest', label: 'Mới nhất' },
        { value: 'oldest', label: 'Cũ nhất' },
        { value: 'popular', label: 'Xem nhiều nhất' },
    ], []);

    const filterFields = useMemo(() => [
        {
            id: 'categoryId',
            label: "Danh mục",
            options: categoryOptions
        },
        {
            id: 'type',
            label: "Loại bài viết",
            options: typeOptions
        }
    ], [categoryOptions, typeOptions]);

    return (
        <Toolbar className="admin-list-toolbar">
            <Box className="admin-list-toolbar__search">
                <Search
                    maxWidth="100%"
                    placeholder="Tìm kiếm bài viết..."
                    value={search || ''}
                    onChange={onSearchChange}
                />
            </Box>
            <Box className="admin-list-toolbar__actions">
                <JiraFilter
                    fields={filterFields}
                    selectedFilters={{
                        categoryId: filters.categoryId || [],
                        type: filters.type || []
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
                            className="admin-list-action-button"
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
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_, value) => { if (value !== null) onViewModeChange(value); }}
                    size="small"
                    sx={{
                        border: 'none',
                        '& .MuiToggleButton-root': {
                            border: 'none',
                            borderRadius: '8px !important',
                            color: 'var(--palette-text-disabled)',
                            p: '6px',
                            mx: '2px',
                            '&.Mui-selected': {
                                color: 'var(--palette-text-primary)',
                                bgcolor: 'rgba(145, 158, 171, 0.16)',
                                '&:hover': {
                                    bgcolor: 'rgba(145, 158, 171, 0.24)',
                                }
                            }
                        }
                    }}
                >
                    <Tooltip title="Xem lưới">
                        <ToggleButton value="grid" aria-label="Xem lưới">
                            <GridViewIcon fontSize="small" />
                        </ToggleButton>
                    </Tooltip>
                    <Tooltip title="Xem danh sách">
                        <ToggleButton value="list" aria-label="Xem danh sách">
                            <ViewListIcon fontSize="small" />
                        </ToggleButton>
                    </Tooltip>
                </ToggleButtonGroup>
            </Box>
        </Toolbar>
    );
};
