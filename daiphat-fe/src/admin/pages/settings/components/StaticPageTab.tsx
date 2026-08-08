"use client";

import { Box, Card, TextField, Button, Typography, Stack } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingPageSchema, SettingPageFormValues } from "../../../schemas/setting.schema";
import { useSettingPage, useUpdateSettingPage } from "../hooks/useSettings";
import { useEffect } from "react";
import { Tiptap } from "../../../components/layouts/titap/Tiptap";
import { SpinnerLoading } from "../../../components/ui/SpinnerLoading";
import { StaticPageConfigKey } from "../services/staticPageService";

interface StaticPageTabProps {
    configKey: StaticPageConfigKey;
    label: string;
}

export const StaticPageTab = ({ configKey, label }: StaticPageTabProps) => {
    const { data: pageData, isLoading, isError, error } = useSettingPage(configKey);
    const { mutate: updatePage, isPending } = useUpdateSettingPage(configKey);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SettingPageFormValues>({
        resolver: zodResolver(settingPageSchema),
        defaultValues: {
            title: "",
            content: "",
        },
    });

    useEffect(() => {
        if (pageData) {
            reset({
                title: pageData.title || "",
                content: pageData.content || "",
            });
        }
    }, [pageData, reset]);

    const onSubmit = (data: SettingPageFormValues) => {
        updatePage(data);
    };

    if (isLoading) return <SpinnerLoading compact />;
    if (isError) {
        return (
            <Typography color="error">
                {error instanceof Error ? error.message : "Không tải được nội dung trang."}
            </Typography>
        );
    }

    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Card sx={{ p: 3, borderRadius: "16px", boxShadow: "var(--customShadows-card)" }}>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
                    {label}
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
                    Lưu vào system_config (<code>{configKey}</code> · STATIC_PAGE).
                </Typography>

                <Stack spacing={3}>
                    <Controller
                        name="title"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                fullWidth
                                label="Tiêu đề trang"
                                error={!!errors.title}
                                helperText={errors.title?.message}
                            />
                        )}
                    />

                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                            Nội dung trang
                        </Typography>
                        <Controller
                            name="content"
                            control={control}
                            render={({ field }) => (
                                <Tiptap value={field.value} onChange={field.onChange} />
                            )}
                        />
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        <Button
                            className="btn-primary-admin"
                            type="submit"
                            variant="contained"
                            disabled={isPending}
                            sx={{
                                background: "#1C252E",
                                px: 4,
                                py: 1,
                                borderRadius: "10px",
                                fontWeight: 600,
                                textTransform: "none",
                                "&:hover": {
                                    background: "#454F5B",
                                },
                            }}
                        >
                            {isPending ? "Đang lưu..." : "Cập nhật"}
                        </Button>
                    </Box>
                </Stack>
            </Card>
        </Box>
    );
};
