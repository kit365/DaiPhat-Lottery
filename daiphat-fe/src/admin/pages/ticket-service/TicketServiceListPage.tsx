import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useNavigate } from "react-router-dom";
import { TicketServiceList } from "./sections/ServiceList";
import { CanAccess } from "../../components/auth/CanAccess";
import { PERMISSIONS } from "../../constants/permission.constants";

export const TicketServiceListPage = () => {
    const navigate = useNavigate();

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách dịch vụ" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Loại vé", to: `/${prefixAdmin}/ticketService/list` },
                            { label: "Danh sách" }
                        ]}
                    />
                </div>
                <CanAccess permission={PERMISSIONS.TICKET_SERVICE.CREATE}>
                <Button
                    onClick={() => navigate(`/${prefixAdmin}/ticketService/create`)}
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
                    Thêm dịch vụ
                </Button>
                </CanAccess>
            </div>
            <TicketServiceList />
        </>
    )
}




