import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { Search } from "../../components/ui/Search";
import { SortButton } from "../../components/ui/SortButton";
import { TabList } from "../../components/ui/TabList";
import { BlogList } from "./sections/BlogList";
import { useBlogs } from "./hooks/useBlog";
import { useState } from "react";


import { useTranslation } from "react-i18next";
import DeleteIcon from '@mui/icons-material/Delete';

export const BlogListPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [sortBy, setSortBy] = useState("latest");
    const [isTrash, setIsTrash] = useState(false);
    const [tabStatus, setTabStatus] = useState(0); // 0: All, 1: Published, 2: Draft, 3: Archived
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

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

    const counts = {
        all: !isTrash ? (pagination.totalRecords || 0) : 0,
        published: blogs.filter((b: any) => b.status === 'published').length,
        draft: blogs.filter((b: any) => b.status === 'draft').length,
        archived: blogs.filter((b: any) => b.status === 'archived').length,
    };

    // Inline removeVietnameseTones if not available globally


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

            <Box sx={{ mb: "40px", display: 'flex', justifyContent: "space-between" }}>
                <Search
                    value={search}
                    onChange={(val) => { setSearch(val); setPage(1); }}
                />
                <SortButton
                    value={sortBy}
                    onChange={(val) => { setSortBy(val); setPage(1); }}
                />
            </Box>

            {!isTrash && (
                <TabList
                    value={tabStatus}
                    onChange={(_, newVal) => { setTabStatus(newVal); setPage(1); }}
                    counts={counts}
                />
            )}

            <BlogList
                blogs={blogs}
                isLoading={isLoading}
                page={page}
                onPageChange={setPage}
                pagination={pagination}
                isTrash={isTrash}
            />
        </>
    )
}




