"use client";

import { Box, Card, TextField, Typography, Stack } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingPageSchema, SettingPageFormValues } from "@/admin/features/settings/schemas/setting.schema";
import { useSettingPage, useUpdateSettingPage } from "../hooks/useSettings";
import { useEffect } from "react";
import { LazyTiptap } from "@/admin/components/layouts/titap/LazyTiptap";
import { SpinnerLoading } from "@/admin/components/ui/SpinnerLoading";
import { Button } from "@/admin/components/ui/Button";
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

    return (
        <Box component="form" onSubmit={handleSubmit((data) => updatePage(data))}>
            <Card
                sx={{
                    p: 3,
                    borderRadius: "16px",
                    boxShadow: "var(--customShadows-card)",
                    minHeight: 420,
                    position: "relative",
                }}
            >
                {isLoading && (
                    <Box
                        sx={{
                            position: "absolute",
                            inset: 0,
                            zIndex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "background.paper",
                            borderRadius: "16px",
                        }}
                    >
                        <SpinnerLoading compact />
                    </Box>
                )}
                {isError ? (
                    <Typography color="error">
                        {error instanceof Error ? error.message : "Không tải được nội dung trang."}
                    </Typography>
                ) : (
                    <>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
                            {label}
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
                                    Nội dung
                                </Typography>
                                <Controller
                                    name="content"
                                    control={control}
                                    render={({ field }) => (
                                        <LazyTiptap value={field.value} onChange={field.onChange} />
                                    )}
                                />
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    loading={isPending}
                                    label="Cập nhật"
                                    loadingLabel="Đang lưu..."
                                />
                            </Box>
                        </Stack>
                    </>
                )}
            </Card>
        </Box>
    );
};
