import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { RoleMatrixOverview } from "./sections/RoleMatrixOverview";

export const RoleListPage = () => {
    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Phân quyền hệ thống (Roles)" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Nhóm quyền (Roles)", to: `/${prefixAdmin}/role/list` },
                            { label: "Tổng quan Phân quyền" }
                        ]}
                    />
                </div>
            </div>
            
            <RoleMatrixOverview />
        </>
    );
};
