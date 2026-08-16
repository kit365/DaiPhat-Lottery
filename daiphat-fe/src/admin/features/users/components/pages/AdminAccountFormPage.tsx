"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { Box, Card, Typography } from "@mui/material";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { SpinnerLoading } from "../../../../components/ui/SpinnerLoading";
import { ROUTES } from "../../../../constants/routes";
import { UserStatus } from "../../../../../types/user.type";
import { accountAdminSchema, AccountAdminFormValues } from "@/admin/features/users/schemas/account-admin.schema";
import { accountUserSchema, AccountUserFormValues } from "@/admin/features/users/schemas/account-user.schema";
import {
    useUserDetail,
    useUpdateUser,
    useDeleteUser,
    useUploadUserAvatar,
} from "../../hooks/useUsers";
import { useRoles } from "../../../role/hooks/useRole";
import { AdminAccountProfileForm } from "../sections/AdminAccountProfileForm";
import { AccountResetPasswordModal } from "../sections/AccountResetPasswordModal";
import { UserOrderHistory } from "../sections/UserOrderHistory";
import type { UpdateUserRequest } from "../../types/user.types";

type PageMode = "edit" | "detail";
type AccountKind = "staff" | "customer";

type AccountFormValues = AccountAdminFormValues | AccountUserFormValues;

const COPY: Record<AccountKind, {
    titles: Record<PageMode, string>;
    listLabel: string;
    listRoute: string;
    cardTitle: string;
    subheader: string;
    updateSuccess: string;
    deleteConfirm: string;
    deleteSuccess: string;
}> = {
    staff: {
        titles: { edit: "Chỉnh sửa nhân viên", detail: "Chi tiết nhân viên" },
        listLabel: "Quản trị viên",
        listRoute: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST,
        cardTitle: "Thông tin nhân viên",
        subheader: "Thông tin cơ bản của tài khoản quản trị.",
        updateSuccess: "Cập nhật quản trị viên thành công!",
        deleteConfirm: "Bạn có chắc chắn muốn xóa quản trị viên này?",
        deleteSuccess: "Xóa quản trị viên thành công!",
    },
    customer: {
        titles: { edit: "Chỉnh sửa khách hàng", detail: "Chi tiết khách hàng" },
        listLabel: "Khách hàng",
        listRoute: ROUTES.ADMIN.ACCOUNTS.USER.LIST,
        cardTitle: "Thông tin khách hàng",
        subheader: "Thông tin cơ bản của tài khoản khách hàng.",
        updateSuccess: "Cập nhật tài khoản khách hàng thành công!",
        deleteConfirm: "Bạn có chắc chắn muốn xóa khách hàng này?",
        deleteSuccess: "Xóa tài khoản thành công!",
    },
};

export const AdminAccountFormPage = ({
    mode,
    kind = "staff",
}: {
    mode: PageMode;
    kind?: AccountKind;
}) => {
    const copy = COPY[kind];
    const { id } = useRouteParams();
    const router = useAdminRouter();
    const { data: account, isLoading } = useUserDetail(id);
    const { mutate: update, isPending: isSaving } = useUpdateUser();
    const { mutate: removeAccount } = useDeleteUser();
    const { mutateAsync: uploadAvatar } = useUploadUserAvatar();
    const { data: roles = [] } = useRoles();
    const [isUploading, setIsUploading] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);

    const isStaff = kind === "staff";
    const schema = isStaff ? accountAdminSchema : accountUserSchema;

    const { control, handleSubmit, reset, setValue, watch } = useForm<AccountFormValues>({
        resolver: zodResolver(schema) as never,
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            ...(isStaff ? { roles: [] as string[] } : {}),
            status: UserStatus.ACTIVE,
            avatar: "",
        },
    });

    const avatar = watch("avatar") || "";

    useEffect(() => {
        if (!account) return;
        reset({
            firstName: account.firstName,
            lastName: account.lastName,
            email: account.email,
            phone: account.phone || "",
            ...(isStaff ? { roles: account.role ? [account.role.code] : [] } : {}),
            status: (account.status as AccountFormValues["status"]) || UserStatus.ACTIVE,
            avatar: account.avatarUrl || account.avatar || "",
        });
    }, [account, reset, isStaff]);

    const handleAvatarFile = async (file: File) => {
        if (!id) return;
        try {
            setIsUploading(true);
            const response = await uploadAvatar({ id, file });
            const url = response.data?.avatarUrl || response.data?.avatar || "";
            setValue("avatar", url, { shouldValidate: true });
            toast.success("Tải ảnh đại diện thành công!");
        } catch {
            toast.error("Tải ảnh đại diện thất bại!");
        } finally {
            setIsUploading(false);
        }
    };

    const onSubmit = (data: AccountFormValues) => {
        const { avatar: _avatar, ...rest } = data;
        const payload: UpdateUserRequest = { ...rest };
        if (!isStaff) {
            delete payload.roles;
        }
        update(
            { id: id!, data: payload },
            {
                onSuccess: () => {
                    toast.success(copy.updateSuccess);
                    if (mode === "edit") {
                        router.push(copy.listRoute);
                    }
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || "Cập nhật thất bại");
                },
            }
        );
    };

    const handleDelete = () => {
        if (!window.confirm(copy.deleteConfirm)) return;
        removeAccount(id!, {
            onSuccess: () => {
                toast.success(copy.deleteSuccess);
                router.push(copy.listRoute);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Xóa thất bại");
            },
        });
    };

    const breadcrumbItems = [
        { label: "Dashboard", to: ROUTES.ADMIN.ROOT },
        { label: copy.listLabel, to: copy.listRoute },
        { label: mode === "edit" ? "Cập nhật" : account ? `${account.lastName} ${account.firstName}` : "Chi tiết" },
    ];

    if (isLoading) {
        return (
            <>
                <PageHeader title={copy.titles[mode]} breadcrumbItems={breadcrumbItems} />
                <SpinnerLoading />
            </>
        );
    }

    return (
        <>
            <PageHeader title={copy.titles[mode]} breadcrumbItems={breadcrumbItems} />

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <AdminAccountProfileForm
                    control={control}
                    avatarUrl={avatar}
                    isUploading={isUploading}
                    isSaving={isSaving}
                    roles={roles}
                    showRoles={isStaff}
                    title={copy.cardTitle}
                    subheader={copy.subheader}
                    onAvatarFile={handleAvatarFile}
                    onResetPassword={() => setResetOpen(true)}
                    onDelete={handleDelete}
                />
            </form>

            {kind === "customer" && mode === "detail" && id ? (
                <Card sx={{ mt: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", overflow: "hidden" }}>
                    <Box sx={{ p: 3, borderBottom: "1px dashed var(--palette-divider)" }}>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>Lịch sử đơn hàng</Typography>
                    </Box>
                    <UserOrderHistory userId={id} />
                </Card>
            ) : null}

            <AccountResetPasswordModal
                open={resetOpen}
                onClose={() => setResetOpen(false)}
                user={
                    account
                        ? {
                              id: String(account.id),
                              fullName: account.fullName || `${account.lastName} ${account.firstName}`,
                              email: account.email,
                          }
                        : null
                }
            />
        </>
    );
};
