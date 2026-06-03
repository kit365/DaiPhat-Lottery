import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useNavigate } from "react-router-dom";
import { Box, Card, Tabs, Tab, styled, ToggleButtonGroup, ToggleButton } from "@mui/material";
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { Search } from "../../components/ui/Search";
import { SelectSingle } from "../../components/ui/SelectSingle";
import { BlogList } from "./sections/BlogList";
import { useBlogs } from "./hooks/useBlog";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import DeleteIcon from '@mui/icons-material/Delete';
import { getTabBadgeStyles } from "../../utils/badge";

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

const tabStyle = {
    textTransform: 'none',
    minWidth: 0,
    minHeight: 48,
    padding: '0',
    fontSize: '0.875rem',
    fontWeight: "500",
    color: 'var(--palette-text-secondary)',
    flexDirection: 'row',
    '&.Mui-selected': {
        color: 'var(--palette-text-primary)',
        fontWeight: 600,
    },
};

export const BlogListPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [sortBy, setSortBy] = useState("latest");
    const [isTrash, setIsTrash] = useState(false);
    const [tabStatus, setTabStatus] = useState(0); // 0: All, 1: Published, 2: Draft, 3: Archived
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const filters = {
        page,
        limit: 10,
        keyword: search,
        status: tabStatus === 1 ? 'published' : (tabStatus === 2 ? 'draft' : (tabStatus === 3 ? 'archived' : undefined)),
        is_trash: isTrash || undefined,
        sort: sortBy
    };

    const { data, isLoading } = useBlogs(filters);
    const blogs = data?.recordList || [];
    const pagination = data?.pagination || { totalRecords: 0 };

    const counts = useMemo(() => {
        return data?.statusCounts || {
            all: 0,
            published: 0,
            draft: 0,
            archived: 0,
        };
    }, [data]);

    const sortOptions = [
        { value: 'latest', label: 'Mới nhất' },
        { value: 'oldest', label: 'Cũ nhất' },
        { value: 'popular', label: 'Xem nhiều nhất' },
    ];

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={isTrash ? "Thùng rác bài viết" : t("admin.blog.title.list")} />
                    <Breadcrumb
                        items={[
                            { label: t("admin.dashboard.title"), to: "/" },
                            { label: t("admin.blog.title.list"), to: `/${prefixAdmin}/blog/list` },
                            { label: isTrash ? "Thùng rác" : t("admin.common.list") }
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <Button
                        onClick={() => {
                            setIsTrash(!isTrash);
                            setTabStatus(0);
                            setPage(1);
                        }}
                        sx={{
                            background: isTrash ? 'var(--palette-error-main)' : 'rgba(255, 86, 48, 0.16)',
                            color: isTrash ? '#fff' : 'var(--palette-error-main)',
                            minHeight: "2.25rem",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            padding: "6px 12px",
                            borderRadius: "var(--shape-borderRadius)",
                            textTransform: "none",
                            boxShadow: "none",
                            "&:hover": {
                                background: isTrash ? 'var(--palette-error-dark)' : 'rgba(255, 86, 48, 0.24)',
                            }
                        }}
                        variant="contained"
                        startIcon={<DeleteIcon />}
                    >
                        {isTrash ? "Quay lại" : `Thùng rác (${(pagination as any).deletedCount || 0})`}
                    </Button>
                    <Button
                        onClick={() => navigate(`/${prefixAdmin}/blog/create`)}
                        sx={{
                            background: 'var(--palette-text-primary)',
                            minHeight: "2.25rem",
                            minWidth: "4rem",
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            padding: "6px 12px",
                            borderRadius: "var(--shape-borderRadius)",
                            textTransform: "none",
                            boxShadow: "none",
                            "&:hover": {
                                background: "var(--palette-grey-700)",
                                boxShadow: "var(--customShadows-z8)"
                            }
                        }}
                        variant="contained"
                        startIcon={<AddIcon />}
                    >
                        {t("admin.blog.title.create")}
                    </Button>
                </div>
            </div>

            <Card elevation={0} sx={{
                borderRadius: 'var(--shape-borderRadius-lg)',
                bgcolor: 'var(--palette-background-paper)',
                boxShadow: 'var(--customShadows-card)',
                overflow: 'visible',
                mb: "32px"
            }}>
                {!isTrash && (
                    <Tabs
                        value={tabStatus}
                        onChange={(_, newVal) => { setTabStatus(newVal); setPage(1); }}
                        variant="scrollable"
                        scrollButtons={false}
                        sx={{
                            px: '20px',
                            minHeight: "48px",
                            borderBottom: '1px solid var(--palette-background-neutral)',
                            '& .MuiTabs-flexContainer': { gap: "calc(5 * var(--spacing))" },
                            '& .MuiTabs-indicator': { backgroundColor: 'var(--palette-text-primary)', height: 2 },
                        }}
                    >
                        <Tab
                            disableRipple
                            label="Tất cả"
                            icon={
                                <TabBadge sx={getTabBadgeStyles('all', tabStatus === 0)}>
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
                                <TabBadge sx={getTabBadgeStyles('info', tabStatus === 1)}>
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
                                <TabBadge sx={getTabBadgeStyles('neutral', tabStatus === 2)}>
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
                                <TabBadge sx={getTabBadgeStyles('error', tabStatus === 3)}>
                                    {counts.archived}
                                </TabBadge>
                            }
                            iconPosition="end"
                            sx={tabStyle}
                        />
                    </Tabs>
                )}

                <Box sx={{ p: "calc(2 * var(--spacing))", display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1, minWidth: 240 }}>
                        <Search
                            placeholder="Tìm kiếm bài viết..."
                            value={search}
                            onChange={(val) => { setSearch(val); setPage(1); }}
                            maxWidth="100%"
                        />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <SelectSingle
                            label="Sắp xếp"
                            options={sortOptions}
                            value={sortBy}
                            onChange={(val) => { setSortBy(val); setPage(1); }}
                            sx={{ minWidth: 140 }}
                        />
                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            onChange={(_, value) => { if (value !== null) setViewMode(value); }}
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
                            <ToggleButton value="grid" aria-label="Xem lưới">
                                <GridViewIcon fontSize="small" />
                            </ToggleButton>
                            <ToggleButton value="list" aria-label="Xem danh sách">
                                <ViewListIcon fontSize="small" />
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Box>
            </Card>

            <BlogList
                blogs={blogs}
                isLoading={isLoading}
                page={page}
                onPageChange={setPage}
                pagination={pagination}
                isTrash={isTrash}
                viewMode={viewMode}
            />
        </>
    );
};
