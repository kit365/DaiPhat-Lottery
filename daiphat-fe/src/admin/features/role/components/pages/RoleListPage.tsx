import { PageHeader } from "../../../../components/ui/PageHeader";
import { prefixAdmin } from "../../../../constants/routes";
import { RoleMatrixOverview } from "../sections/RoleMatrixOverview";

export const RoleListPage = () => {
    return (
        <>
            <PageHeader
                title="Phân quyền hệ thống (Roles)"
                breadcrumbItems={[
                    { label: "Dashboard", to: "/" },
                    { label: "Nhóm quyền (Roles)", to: `/${prefixAdmin}/role/list` },
                    { label: "Tổng quan Phân quyền" }
                ]}
            />

            <RoleMatrixOverview />
        </>
    );
};
