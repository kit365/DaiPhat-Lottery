import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin, ROUTES } from "../../constants/routes";
import { useNavigate } from "react-router-dom";
import { AccountAdminList } from "./sections/AccountAdminList";
import { PermissionGuard } from "../../components/auth/PermissionGuard";
import { PERMISSIONS } from "../../constants/permission.constants";

export const AccountAdminListPage = () => {
    const navigate = useNavigate();

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách quản trị viên" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Quản trị viên", to: `/${prefixAdmin}/account-admin/list` },
                            { label: "Danh sách" }
                        ]}
                    />
                </div>
                <PermissionGuard permission={PERMISSIONS.ACCOUNT.CREATE}>
                    <Button
                        onClick={() => navigate(ROUTES.ADMIN.ACCOUNTS.ADMIN.CREATE)}
                        sx={{
                            background: 'var(--palette-text-primary)',
                            minHeight: "2.5rem",
                            px: 3,
                            fontWeight: 700,
                            fontSize: "0.875rem",
                            borderRadius: "12px",
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
                        Tạo tài khoản
                    </Button>
                </PermissionGuard>
            </div>
            
            <AccountAdminList />
        </>
    );
};




