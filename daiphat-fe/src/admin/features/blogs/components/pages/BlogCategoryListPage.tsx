"use client";

import { Button } from '@/admin/components/ui/Button';


import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from "../../../../components/ui/PageHeader";
import { prefixAdmin } from "../../../../constants/routes";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { BlogCategoryList } from "../sections/BlogCategoryList";
import { CanAccess } from "../../../../components/auth/CanAccess";
import { PERMISSIONS } from "../../../../constants/permission.constants";

export const BlogCategoryListPage = () => {
    const navigate = useNavigate();
    const [isTrash] = useState(false);

    return (
        <>
            <PageHeader
                title="Danh sách"
                breadcrumbItems={[
                            { label: "Bảng điều khiển", to: "/" },
                            { label: "Danh mục bài viết", to: `/${prefixAdmin}/blog-category/list` },
                            { label: "Danh sách" }
                        ]}
                action={
                    <div style={{ display: 'flex', gap: '16px' }}>
                    <CanAccess permission={PERMISSIONS.ARTICLE.CREATE}>
                        <Button
                            onClick={() => navigate(`/${prefixAdmin}/blog-category/create`)}
                            className="btn-primary-admin"
                            variant="contained"
                            startIcon={<AddIcon />}
                        >
                            Tạo danh mục bài viết
                        </Button>
                    </CanAccess>
                </div>
                }
            />
            <BlogCategoryList isTrash={isTrash} />
        </>
    )
}
