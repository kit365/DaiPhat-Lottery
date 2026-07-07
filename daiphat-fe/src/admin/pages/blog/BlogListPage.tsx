import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useNavigate } from "react-router-dom";
import { Box, Card, Tabs, Tab, styled,  } from "@mui/material";
import { Search } from "../../components/ui/Search";
import { SelectSingle } from "../../components/ui/SelectSingle";
import { BlogList } from "./sections/BlogList";
import { BlogToolbar } from "./sections/BlogToolbar";
import { useBlogs, useBlogTypes } from "../../hooks/useBlog";
import { useNestedBlogCategories } from "../../hooks/useBlogCategory";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CanAccess } from "../../components/auth/CanAccess";
import { PERMISSIONS } from "../../constants/permission.constants";

import { getTabBadgeStyles } from "../../utils/badge";
import { BLOG_STATUS } from "../../../types/blog.type";

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

    
    const categoryOptions = useMemo(() => {
        const flatten = (nodes: any[], level = 0): any[] => {
            if (!nodes) return [];
            return nodes.filter(n => n && n.id != null).flatMap(n => {
                const prefix = '-'.repeat(level);
                return [
                    { value: String(n.id), label: `${prefix ? prefix + ' ' : ''}${n.name || n.label}` },
                    ...flatten(n.children, level + 1)
                ];
            });
        };
        return flatten(nestedCategories || []);
    }, [nestedCategories]);

    const typeOptions = useMemo(() => {
        const base = [{ value: '', label: 'Tất cả loại' }];
        if (!blogTypes) return base;
        return [...base, ...blogTypes.map(t => ({ value: t.code, label: t.name }))];
    }, [blogTypes]);

    

    const statusFromTab =
        tabStatus === 1 ? BLOG_STATUS.PUBLISHED :
        tabStatus === 2 ? BLOG_STATUS.DRAFT :
        tabStatus === 3 ? BLOG_STATUS.SCHEDULED :
        tabStatus === 4 ? BLOG_STATUS.UNPUBLISHED :
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
                    <CanAccess permission={PERMISSIONS.ARTICLE.CREATE}>
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
                    </CanAccess>
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

                <BlogToolbar
                    search={search}
                    onSearchChange={(val) => { setSearch(val); setPage(1); }}
                    filters={{ categoryId, type }}
                    onFilterChange={(fieldId, values) => {
                        const val = values.length > 0 ? values[0] : "";
                        if (fieldId === 'categoryId') setCategoryId(val);
                        if (fieldId === 'type') setType(val);
                        setPage(1);
                    }}
                    onClearFilters={() => {
                        setCategoryId("");
                        setType("");
                        setPage(1);
                    }}
                    sortByUI={sortBy}
                    onSortChange={(val) => { setSortBy(val); setPage(1); }}
                    categoryOptions={categoryOptions}
                    typeOptions={typeOptions}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />
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
