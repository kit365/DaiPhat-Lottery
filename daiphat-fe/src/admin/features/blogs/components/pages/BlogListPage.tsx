"use client";

import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from "../../../../components/ui/PageHeader";
import { prefixAdmin } from "../../../../constants/routes";
import { useNavigate } from "react-router-dom";
import { Card, Tabs, Tab } from "@mui/material";
import { BlogList } from "../sections/BlogList";
import { BlogToolbar } from "../sections/BlogToolbar";
import { useBlogs, useBlogTypes } from "../../hooks/useBlog";
import { useNestedBlogCategories } from "../../hooks/useBlogCategory";
import { useState, useMemo } from "react";
import { CanAccess } from "../../../../components/auth/CanAccess";
import { PERMISSIONS } from "../../../../constants/permission.constants";

import { getTabBadgeStyles } from "../../../../utils/badge";
import { BLOG_STATUS } from '../../types/blog.type';

export const BlogListPage = () => {
    const navigate = useNavigate();
    const [sortBy, setSortBy] = useState("latest");

    const [tabStatus, setTabStatus] = useState(0); // 0: All, 1: Published, 2: Draft, 3: Scheduled, 4: Unpublished
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [categoryId, setCategoryId] = useState<string[]>([]);
    const [type, setType] = useState<string[]>([]);

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
        categoryId: categoryId.length > 0 ? categoryId : undefined,
        type: type.length > 0 ? type : undefined,

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

    return (
        <>
            <PageHeader
                title="Danh sách bài viết"
                breadcrumbItems={[
                            { label: "Bảng điều khiển", to: "/" },
                            { label: "Danh sách bài viết", to: `/${prefixAdmin}/blog/list` },
                            { label: "Danh sách" }
                        ]}
                action={
                    <div style={{ display: 'flex', gap: '16px' }}>
                    <CanAccess permission={PERMISSIONS.ARTICLE.CREATE}>
                        <Button
                            onClick={() => navigate(`/${prefixAdmin}/blog/create`)}
                            className="btn-primary-admin"
                            variant="contained"
                            startIcon={<AddIcon />}
                        >
                            Tạo mới bài viết
                        </Button>
                    </CanAccess>
                </div>
                }
            />

            <Card elevation={0} sx={{
                borderRadius: 'var(--shape-borderRadius-lg)',
                bgcolor: 'var(--palette-background-paper)',
                boxShadow: 'var(--customShadows-card)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <Tabs
                    value={tabStatus}
                    onChange={(_, newVal) => { setTabStatus(newVal); setPage(1); }}
                    variant="scrollable"
                    scrollButtons={false}
                    className="admin-tabs"
                >
                    <Tab
                        disableRipple
                        label="Tất cả"
                        icon={
                            <span className="admin-tab-badge" style={getTabBadgeStyles('all', tabStatus === 0)}>
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
                            <span className="admin-tab-badge" style={getTabBadgeStyles('info', tabStatus === 1)}>
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
                            <span className="admin-tab-badge" style={getTabBadgeStyles('neutral', tabStatus === 2)}>
                                {counts.draft}
                            </span>
                        }
                        iconPosition="end"
                        className="admin-tab"
                    />
                    <Tab
                        disableRipple
                        label="Lên lịch"
                        icon={
                            <span className="admin-tab-badge" style={getTabBadgeStyles('warning', tabStatus === 3)}>
                                {counts.scheduled}
                            </span>
                        }
                        iconPosition="end"
                        className="admin-tab"
                    />
                    <Tab
                        disableRipple
                        label="Gỡ xuống"
                        icon={
                            <span className="admin-tab-badge" style={getTabBadgeStyles('error', tabStatus === 4)}>
                                {counts.unpublished}
                            </span>
                        }
                        iconPosition="end"
                        className="admin-tab"
                    />
                </Tabs>

                <BlogToolbar
                    search={search}
                    onSearchChange={(val) => { setSearch(val); setPage(1); }}
                    filters={{ categoryId, type }}
                    onFilterChange={(fieldId, values) => {
                        if (fieldId === 'categoryId') setCategoryId(values);
                        if (fieldId === 'type') setType(values);
                        setPage(1);
                    }}
                    onClearFilters={() => {
                        setCategoryId([]);
                        setType([]);
                        setPage(1);
                    }}
                    sortByUI={sortBy}
                    onSortChange={(val) => { setSortBy(val); setPage(1); }}
                    categoryOptions={categoryOptions}
                    typeOptions={typeOptions}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />

                <BlogList
                    blogs={blogs}
                    isLoading={isLoading}
                    page={page}
                    onPageChange={setPage}
                    pagination={pagination}
                    viewMode={viewMode}
                />
            </Card>
        </>
    );
};
