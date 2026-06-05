import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useNavigate } from "react-router-dom";
import { Box, Card, Tabs, Tab, styled, ToggleButtonGroup, ToggleButton, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import FolderIcon from '@mui/icons-material/Folder';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import { Search } from "../../components/ui/Search";
import { SelectSingle } from "../../components/ui/SelectSingle";
import { BlogList } from "./sections/BlogList";
import { useBlogs, useBlogTypes } from "./hooks/useBlog";
import { useNestedBlogCategories } from "../blog-category/hooks/useBlogCategory";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

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

    const [tabStatus, setTabStatus] = useState(0); // 0: All, 1: Published, 2: Draft, 3: Scheduled, 4: Unpublished
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [categoryId, setCategoryId] = useState<string>("");
    const [type, setType] = useState<string>("");

    // Data for filter dropdowns
    const { data: nestedCategories } = useNestedBlogCategories();
    const { data: blogTypes } = useBlogTypes();

    const typeOptions = useMemo(() => {
        const base = [{ value: '', label: 'Tất cả loại' }];
        if (!blogTypes) return base;
        return [...base, ...blogTypes.map(t => ({ value: t.code, label: t.name }))];
    }, [blogTypes]);

    /** Render đệ quy MenuItem dạng cây cho dropdown danh mục */
    const renderCategoryTree = (nodes: any[], level = 0): React.ReactNode[] => {
        if (!nodes) return [];
        return nodes.filter(n => n && n.id != null).flatMap(node => [
            <MenuItem
                key={node.id}
                value={String(node.id)}
                sx={{
                    pl: 2 + level * 2,
                    py: '6px',
                    fontSize: '0.875rem',
                    fontWeight: level === 0 ? 600 : 400,
                    gap: '6px',
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                {level === 0
                    ? <FolderIcon sx={{ fontSize: 16, color: 'var(--palette-text-disabled)', flexShrink: 0 }} />
                    : <SubdirectoryArrowRightIcon sx={{ fontSize: 14, color: 'var(--palette-text-disabled)', flexShrink: 0 }} />
                }
                {node.name || node.label}
            </MenuItem>,
            ...renderCategoryTree(node.children || [], level + 1),
        ]);
    };

    const statusFromTab =
        tabStatus === 1 ? 'published' :
        tabStatus === 2 ? 'draft' :
        tabStatus === 3 ? 'scheduled' :
        tabStatus === 4 ? 'unpublished' :
        undefined;

    const filters = {
        page,
        limit: 10,
        keyword: search || undefined,
        status: statusFromTab,
        categoryId: categoryId ? Number(categoryId) : undefined,
        type: type || undefined,

        sort: sortBy,
    };

    const { data, isLoading } = useBlogs(filters);

    const blogs = data?.recordList || [];
    const pagination = data?.pagination || { totalRecords: 0 };

    const counts = useMemo(() => ({
        all: data?.statusCounts?.all ?? pagination.totalRecords ?? 0,
        published: data?.statusCounts?.published ?? 0,
        draft: data?.statusCounts?.draft ?? 0,
        scheduled: data?.statusCounts?.scheduled ?? 0,
        unpublished: data?.statusCounts?.unpublished ?? 0,
    }), [data, pagination.totalRecords]);

    const sortOptions = [
        { value: 'latest', label: 'Mới nhất' },
        { value: 'oldest', label: 'Cũ nhất' },
        { value: 'popular', label: 'Xem nhiều nhất' },
    ];

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={t("admin.blog.title.list")} />
                    <Breadcrumb
                        items={[
                            { label: t("admin.dashboard.title"), to: "/" },
                            { label: t("admin.blog.title.list"), to: `/${prefixAdmin}/blog/list` },
                            { label: t("admin.common.list") }
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
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
                            label="Lên lịch"
                            icon={
                                <TabBadge sx={getTabBadgeStyles('scheduled', tabStatus === 3)}>
                                    {counts.scheduled}
                                </TabBadge>
                            }
                            iconPosition="end"
                            sx={tabStyle}
                        />
                        <Tab
                            disableRipple
                            label="Gỡ xuống"
                            icon={
                                <TabBadge sx={getTabBadgeStyles('error', tabStatus === 4)}>
                                    {counts.unpublished}
                                </TabBadge>
                            }
                            iconPosition="end"
                            sx={tabStyle}
                        />
                    </Tabs>

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
                        {/* Filter danh mục – dạng cây */}
                        <FormControl sx={{ minWidth: 180 }}>
                            {!!categoryId && (
                                <InputLabel
                                    sx={{
                                        fontSize: '0.9375rem',
                                        color: '#637381',
                                        "&.MuiInputLabel-shrink": {
                                            color: '#919eab',
                                            fontWeight: 600,
                                        },
                                    }}
                                    shrink
                                >
                                    Danh mục
                                </InputLabel>
                            )}
                            <Select
                                value={categoryId}
                                label={categoryId ? "Danh mục" : undefined}
                                onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
                                displayEmpty
                                notched={!!categoryId}
                                MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
                                renderValue={(selected) => {
                                    if (!selected) {
                                        return (
                                            <span style={{
                                                color: '#637381',
                                                fontSize: '0.9375rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                height: '100%',
                                            }}>
                                                Danh mục
                                            </span>
                                        );
                                    }
                                    const findCategoryName = (nodes: any[], id: string): string => {
                                        if (!nodes) return "";
                                        for (const node of nodes) {
                                            if (node && String(node.id) === id) return node.name || node.label;
                                            if (node && node.children) {
                                                const found = findCategoryName(node.children, id);
                                                if (found) return found;
                                            }
                                        }
                                        return "";
                                    };
                                    return findCategoryName(nestedCategories || [], selected) || selected;
                                }}
                                sx={{
                                    fontSize: '0.9375rem',
                                    borderRadius: '8px',
                                    '& .MuiSelect-select': { display: 'flex', alignItems: 'center' },
                                }}
                            >
                                <MenuItem value="" sx={{ fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--palette-text-secondary)' }}>
                                    Tất cả danh mục
                                </MenuItem>
                                {renderCategoryTree(nestedCategories || [])}
                            </Select>
                        </FormControl>
                        {/* Filter loại bài */}
                        <SelectSingle
                            label="Loại bài"
                            options={typeOptions}
                            value={type}
                            onChange={(val) => { setType(val); setPage(1); }}
                            sx={{ minWidth: 140 }}
                        />
                        {/* Sort */}
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
                viewMode={viewMode}
            />
        </>
    );
};
