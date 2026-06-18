import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { ROUTES } from "../../constants/routes";
import { StreetAgentList } from "./sections/StreetAgentList";

export const StreetAgentListPage = () => {
    const navigate = useNavigate();

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách đại lý bán dạo" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Quản lý tài khoản", to: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST },
                            { label: "Đại lý bán dạo", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                            { label: "Danh sách" },
                        ]}
                    />
                </div>
                <Button
                    onClick={() => navigate(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.CREATE)}
                    sx={{
                        background: "var(--palette-text-primary)",
                        minHeight: "2.5rem",
                        px: 3,
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        borderRadius: "12px",
                        textTransform: "none",
                        boxShadow: "none",
                        "&:hover": {
                            background: "var(--palette-grey-700)",
                            boxShadow: "var(--customShadows-z8)",
                        },
                    }}
                    variant="contained"
                    startIcon={<AddIcon />}
                >
                    Tạo hồ sơ
                </Button>
            </div>

            <StreetAgentList />
        </>
    );
};
