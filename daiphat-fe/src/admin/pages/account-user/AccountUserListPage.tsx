import React, { useState } from "react";
import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin, ROUTES } from "../../constants/routes";
import { useNavigate } from "react-router-dom";
import { AccountUserList } from "./sections/AccountUserList";
import AccountInviteModal from "./sections/AccountInviteModal";
import { toast } from "react-toastify";
import { PermissionGuard } from "../../components/auth/PermissionGuard";
import { PERMISSIONS } from "../../constants/permission.constants";

export const AccountUserListPage = () => {
    const navigate = useNavigate();
    const [openInvite, setOpenInvite] = useState(false);

    const handleInvite = (data: any) => {
        console.log('Invite customer data:', data);
        // Sau này sẽ gọi API ở đây
        const fullName = `${data.lastName || ''} ${data.firstName || ''}`.trim();
        toast.success(`Đã gửi lời mời đến khách hàng ${fullName || data.email}`);
    };

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Danh sách tài khoản khách hàng" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Tài khoản khách hàng", to: `/${prefixAdmin}/account-user/list` },
                            { label: "Danh sách" }
                        ]}
                    />
                </div>
                <PermissionGuard permission={PERMISSIONS.USER.CREATE}>
                    <Button
                        onClick={() => navigate(ROUTES.ADMIN.ACCOUNTS.USER.CREATE)}
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
            
            <AccountUserList onInvite={() => setOpenInvite(true)} />

            <AccountInviteModal 
                open={openInvite}
                onClose={() => setOpenInvite(false)}
                onInvite={handleInvite}
            />
        </>
    );
};




