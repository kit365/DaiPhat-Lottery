import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { TicketList } from "./sections/TicketList";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { useTickets } from "./hooks/useTickets";
import { CanAccess } from "../../components/auth/CanAccess";
import { PERMISSIONS } from "../../constants/permission.constants";
import { useState } from "react";
import Button from "@mui/material/Button";

export const TicketListPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const ticketHook = useTickets();

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={"Danh sách vé số"} />
                    <Breadcrumb
                        items={[
                            { label: t("admin.dashboard.title"), to: "/" },
                            { label: "Vé số", to: `/${prefixAdmin}/ticket/list` },
                            { label: "Danh sách" }
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <CanAccess permission={PERMISSIONS.TICKET.CREATE}>
                        <LoadingButton
                            onClick={() => navigate(`/${prefixAdmin}/ticket/create`)}
                            label="Tạo vé số mới"
                            startIcon={<AddIcon />}
                            sx={{
                                minHeight: "2.25rem",
                                padding: "var(--shape-borderRadius-sm) calc(2 * var(--spacing))",
                            }}
                        />
                    </CanAccess>
                </div>
            </div>


            <TicketList
                ticketHook={ticketHook}
            />
        </>
    )
}
