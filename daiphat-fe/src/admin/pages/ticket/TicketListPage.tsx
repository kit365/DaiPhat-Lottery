import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { TicketList } from "./sections/TicketList";
import { Title } from "../../components/ui/Title";
import { prefixAdmin, ROUTES } from "../../constants/routes";
import { useTranslation } from "react-i18next";
import { useTickets } from "./hooks/useTickets";
import AddIcon from '@mui/icons-material/Add';
import { LoadingButton } from "../../components/ui/LoadingButton";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { CanAccess } from "../../components/auth/CanAccess";
import { PERMISSIONS } from "../../constants/permission.constants";
import { getActiveImportBatchDraft } from "../../api/importBatch.api";

export const TicketListPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const ticketHook = useTickets();
    const [isNavigating, setIsNavigating] = useState(false);

    const handleAddTicket = async () => {
        setIsNavigating(true);
        try {
            const draft = await getActiveImportBatchDraft();
            if (draft?.lines?.length === 1 && draft.lines[0].id) {
                navigate(ROUTES.ADMIN.TICKETS.CREATE_FOR_BATCH_LINE(draft.lines[0].id));
            } else if (draft?.id) {
                navigate(ROUTES.ADMIN.TICKETS.CREATE_FOR_BATCH(draft.id));
            } else {
                navigate(`${ROUTES.ADMIN.IMPORT_BATCH.CREATE}?intent=add-ticket`);
            }
        } finally {
            setIsNavigating(false);
        }
    };

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
                        onClick={handleAddTicket}
                        loading={isNavigating}
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
