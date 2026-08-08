"use client";

import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { ROUTES } from "../../../../constants/routes";
import { StreetAgentList } from "../sections/StreetAgentList";

export const StreetAgentListPage = () => {
    const navigate = useNavigate();

    return (
        <>
            <PageHeader
                title="Danh sách đại lý bán dạo"
                breadcrumbItems={[
                            { label: "Dashboard", to: "/" },
                            { label: "Quản lý tài khoản", to: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST },
                            { label: "Đại lý bán dạo", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                            { label: "Danh sách" },
                        ]}
                action={
                    <Button
                    onClick={() => navigate(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.CREATE)}
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
