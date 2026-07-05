import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { TicketList } from "./sections/TicketList";
import { Title } from "../../components/ui/Title";
import { prefixAdmin, ROUTES } from "../../constants/routes";
import { useTranslation } from "react-i18next";
import { useTickets } from "./hooks/useTickets";
import AddIcon from '@mui/icons-material/Add';
import { LoadingButton } from "../../components/ui/LoadingButton";
import { useNavigate } from "react-router-dom";
import { CanAccess } from "../../components/auth/CanAccess";
import { PERMISSIONS } from "../../constants/permission.constants";

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
                <CanAccess permission={PERMISSIONS.TICKET.CREATE}>
                    <LoadingButton
                        onClick={() => navigate(ROUTES.ADMIN.IMPORT_BATCH.LIST)}
                        label="Thêm vé số"
                        startIcon={<AddIcon />}
                        sx={{
                            minHeight: "2.25rem",
                            padding: "var(--shape-borderRadius-sm) calc(2 * var(--spacing))",
                        }}
                    />
                </CanAccess>
            </div>


            <TicketList
                ticketHook={ticketHook}
            />
        </>
    )
}
