import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { useCreateStreetAgentProfile } from "./hooks/useStreetAgent";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRef, useState } from "react";
import {
    createStreetAgentProfileSchema,
    CreateStreetAgentProfileFormValues,
} from "../../schemas/street-agent.schema";
import { ROUTES } from "../../constants/routes";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { uploadAdminImage } from "../../api/upload.api";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { StreetAgentProfileForm } from "./sections/StreetAgentProfileForm";

const defaultValues: CreateStreetAgentProfileFormValues = {
    firstName: "",
    lastName: "",
    phone: "",
    cccd: "",
    imageUrl: "",
    contactAddress: "",
    contactProvince: "",
    coverageArea: "",
    commissionRate: null,
    contractStartDate: "",
    contractEndDate: "",
    depositBalance: 0,
    status: "ACTIVE",
};

export const StreetAgentCreatePage = () => {
    const navigate = useNavigate();
    const { mutate: create, isPending } = useCreateStreetAgentProfile();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const { control, handleSubmit, setValue, watch } = useForm<CreateStreetAgentProfileFormValues>({
        resolver: zodResolver(createStreetAgentProfileSchema),
        defaultValues,
    });

    const imageUrl = watch("imageUrl");

    const handleOpenFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Định dạng file không hợp lệ. Vui lòng chọn *.jpeg, *.jpg, *.png, hoặc *.gif");
            event.target.value = "";
            return;
        }

        const maxSize = 3 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error("Dung lượng file quá lớn. Tối đa là 3 Mb");
            event.target.value = "";
            return;
        }

        try {
            setIsUploading(true);
            const url = await uploadAdminImage(file);
            setValue("imageUrl", url, { shouldValidate: true });
            toast.success("Tải ảnh lên thành công!");
        } catch {
            toast.error("Tải ảnh lên thất bại!");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const onSubmit = (data: CreateStreetAgentProfileFormValues) => {
        const payload = {
            ...data,
            imageUrl: data.imageUrl || undefined,
            contactAddress: data.contactAddress || undefined,
            contactProvince: data.contactProvince || undefined,
            coverageArea: data.coverageArea || undefined,
            commissionRate: data.commissionRate ?? undefined,
            contractStartDate: data.contractStartDate || undefined,
            contractEndDate: data.contractEndDate || undefined,
            depositBalance: data.depositBalance ?? 0,
        };

        create(payload, {
            onSuccess: (response) => {
                if (response.success) {
                    toast.success(response.message || "Tạo hồ sơ đại lý bán dạo thành công!");
                    navigate(ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST);
                } else {
                    toast.error(response.message || "Tạo hồ sơ thất bại");
                }
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || "Tạo hồ sơ thất bại");
            },
        });
    };

    return (
        <Box sx={{ maxWidth: "1200px", mx: "auto" }}>
            <Box sx={{ mb: 5 }}>
                <Title title="Tạo hồ sơ đại lý bán dạo" />
                <Breadcrumb
                    items={[
                        { label: "Dashboard", to: "/" },
                        { label: "Quản lý tài khoản", to: ROUTES.ADMIN.ACCOUNTS.ADMIN.LIST },
                        { label: "Đại lý bán dạo", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                        { label: "Tạo hồ sơ" },
                    ]}
                />
            </Box>

            <form onSubmit={handleSubmit(onSubmit)}>
                <StreetAgentProfileForm
                    control={control}
                    imageUrl={imageUrl}
                    isUploading={isUploading}
                    fileInputRef={fileInputRef}
                    onOpenFile={handleOpenFile}
                    onFileChange={handleFileChange}
                    footer={
                        <LoadingButton
                            type="submit"
                            loading={isPending}
                            label="Tạo hồ sơ"
                            loadingLabel="Đang tạo..."
                        />
                    }
                />
            </form>
        </Box>
    );
};
