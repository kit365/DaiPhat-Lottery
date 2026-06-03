import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { ROUTES } from "../../constants/routes";
import { AccountUserList } from "../account-user/sections/AccountUserList";
import { RoleEnum } from "../account-user/configs/constants";

const STREET_AGENT_ROLE_IDS = [RoleEnum.STREET_AGENT];

export const StreetAgentListPage = () => {
    const navigate = useNavigate();

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách Street Agent" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Street Agent", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
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
                    Tạo Street Agent
                </Button>
            </div>

            <AccountUserList
                roleIds={STREET_AGENT_ROLE_IDS}
                searchPlaceholder="Tìm kiếm Street Agent..."
                deleteMessage="Bạn có chắc chắn muốn xóa hồ sơ Street Agent này?"
                showInviteStaffAction={false}
            />
        </>
    );
};
