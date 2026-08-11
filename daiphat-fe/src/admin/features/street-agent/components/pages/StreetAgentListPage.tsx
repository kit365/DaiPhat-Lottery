"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { Button } from '@/admin/components/ui/Button';


import AddIcon from "@mui/icons-material/Add";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { ROUTES } from "../../../../constants/routes";
import { StreetAgentList } from "../sections/StreetAgentList";

export const StreetAgentListPage = () => {
    const router = useAdminRouter();

    return (
        <>
            <PageHeader
                title="Danh sách người bán vé số"
                breadcrumbItems={[
                            { label: "Dashboard", to: "/" },
                            { label: "Người bán vé số" },
                            { label: "Hồ sơ người bán vé số" },
                        ]}
                action={
                    <Button
                    onClick={() => router.push(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.CREATE)}
                    className="btn-primary-admin"
                    variant="contained"
                    startIcon={<AddIcon />}
                >
                    Tạo hồ sơ
                </Button>
                }
            />

            <StreetAgentList />
        </>
    );
};
