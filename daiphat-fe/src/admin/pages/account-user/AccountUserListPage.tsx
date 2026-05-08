import React, { useState } from "react";
import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useNavigate } from "react-router-dom";
import { AccountUserList } from "./sections/AccountUserList";
import AccountInviteModal from "./sections/AccountInviteModal";
import { toast } from "react-toastify";

export const AccountUserListPage = () => {
    const navigate = useNavigate();
    const [openInvite, setOpenInvite] = useState(false);

    const handleInvite = (data: any) => {
        console.log('Invite customer data:', data);
        // Sau này sẽ gọi API ở đây
        toast.success(`Đã gửi lời mời đến khách hàng ${data.fullName || data.email}`);
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
                <Button
                    onClick={() => setOpenInvite(true)}
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
                    Mời khách hàng
                </Button>
            </div>
            
            <AccountUserList />

            <AccountInviteModal 
                open={openInvite}
                onClose={() => setOpenInvite(false)}
                onInvite={handleInvite}
            />
        </>
    );
};




