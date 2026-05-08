import React, { useState } from "react";
import Button from "@mui/material/Button";
import AddIcon from '@mui/icons-material/Add';
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { prefixAdmin } from "../../constants/routes";
import { useNavigate } from "react-router-dom";
import { AccountAdminList } from "./sections/AccountAdminList";
import AccountInviteModal from "./sections/AccountInviteModal";
import { toast } from "react-toastify";

export const AccountAdminListPage = () => {
    const navigate = useNavigate();
    const [openInvite, setOpenInvite] = useState(false);

    const handleInvite = (data: any) => {
        console.log('Invite data:', data);
        // Sau này sẽ gọi API ở đây
        toast.success(`Đã gửi lời mời đến ${data.email}`);
    };

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
                    Mời nhân viên
                </Button>
            </div>
            
            <AccountAdminList />

            <AccountInviteModal 
                open={openInvite}
                onClose={() => setOpenInvite(false)}
                onInvite={handleInvite}
            />
        </>
    );
};




