"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useRouteParams } from "@/hooks/useRouteParams";
import { useSearchParams } from 'next/navigation';
import {
    Box,
    Grid,
    Stack,
    Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { SpinnerLoading } from '../../../../components/ui/SpinnerLoading';
import { CollapsibleCard } from '../../../../components/ui/CollapsibleCard';
import { ROUTES } from '../../../../constants/routes';
import { useSupplierDetail, useUpdateSupplier } from '../../hooks/useSupplier';
import { SupplierFormFields } from '../sections/SupplierFormFields';
import { SupplierSidebarPanel } from '../sections/SupplierSidebarPanel';
import { SupplierImportFileFieldsPanel } from '../sections/SupplierImportFileFieldsPanel';
import {
    supplierFormSchema,
    SupplierFormValues,
    supplierFormDefaultValues,
} from '../../schemas/supplier.schema';
import {
    getMissingSupplierFields,
    scrollToFirstMissingField,
    SupplierActivationField,
} from '../../utils/supplier-activation';

export const SupplierEditPage = () => {
    const { id } = useRouteParams();
    const searchParams = useSearchParams();
    const focusImportFields = searchParams.get('focus') === 'import-file-fields';
    const router = useAdminRouter();
    const { data: supplier, isLoading } = useSupplierDetail(id);
    const { mutateAsync, isPending } = useUpdateSupplier();
    const [activationErrorsVisible, setActivationErrorsVisible] = useState(false);
    const [importFieldsExpanded, setImportFieldsExpanded] = useState(focusImportFields);

    const { control, handleSubmit, reset, watch, setValue } = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierFormSchema),
        defaultValues: supplierFormDefaultValues,
    });

    const watchedValues = watch();
    const missingFields = useMemo(() => {
        if (!activationErrorsVisible) {
            return [];
        }
        return getMissingSupplierFields(watchedValues);
    }, [watchedValues, activationErrorsVisible]);

    useEffect(() => {
        if (!supplier) return;
        reset({
            name: supplier.name ?? '',
            code: supplier.code ?? '',
            type: supplier.type ?? 'DISTRIBUTOR',
            contactName: supplier.contactName ?? '',
            contactPhone: supplier.contactPhone ?? '',
            contactEmail: supplier.contactEmail ?? '',
            address: supplier.address ?? '',
            taxCode: supplier.taxCode ?? '',
            paymentTermDays: supplier.paymentTermDays ?? supplierFormDefaultValues.paymentTermDays,
            defaultImportCost: supplier.defaultImportCost ?? supplierFormDefaultValues.defaultImportCost,
            importAllowFrom:
                supplier.importAllowFrom?.slice(0, 5) ?? supplierFormDefaultValues.importAllowFrom,
            returnCutOffTime:
                supplier.returnCutOffTime?.slice(0, 5) ?? supplierFormDefaultValues.returnCutOffTime,
            paymentCutOffTime:
                supplier.paymentCutOffTime?.slice(0, 5) ?? supplierFormDefaultValues.paymentCutOffTime,
            isActive: supplier.isActive,
        });
        const missing = supplier.missingActivationFields ?? getMissingSupplierFields(supplier);
        setActivationErrorsVisible(missing.length > 0);
        if (missing.length > 0) {
            requestAnimationFrame(() =>
                scrollToFirstMissingField(missing as SupplierActivationField[])
            );
        }
    }, [supplier, reset]);

    const handleActiveToggle = (nextActive: boolean) => {
        if (!nextActive) {
            setActivationErrorsVisible(false);
            setValue('isActive', false);
            return;
        }

        const missing = getMissingSupplierFields(watchedValues);
        if (missing.length > 0) {
            setActivationErrorsVisible(true);
            requestAnimationFrame(() => scrollToFirstMissingField(missing));
            toast.warning('Vui lòng hoàn tất thông tin bắt buộc trước khi kích hoạt nhà cung cấp.');
            return;
        }

        setActivationErrorsVisible(false);
        setValue('isActive', true);
    };

    const onSubmit = async (data: SupplierFormValues) => {
        if (!id) return;

        if (data.isActive) {
            const missing = getMissingSupplierFields(data);
            if (missing.length > 0) {
                setActivationErrorsVisible(true);
                setValue('isActive', false, { shouldDirty: true });
                requestAnimationFrame(() => scrollToFirstMissingField(missing));
                toast.warning(
                    'Nhà cung cấp chưa đủ thông tin để kích hoạt. Vui lòng bổ sung các trường bắt buộc hoặc tắt trạng thái Hoạt động trước khi lưu.'
                );
                return;
            }
        }

        try {
            const res = await mutateAsync({
                id,
                payload: {
                    ...data,
                    contactName: data.contactName?.trim() || undefined,
                    contactEmail: data.contactEmail?.trim() || undefined,
                    address: data.address?.trim() || undefined,
                    taxCode: data.taxCode?.trim() || undefined,
                    paymentTermDays: data.paymentTermDays ?? null,
                    defaultImportCost: data.defaultImportCost ?? null,
                    isActive: data.isActive,
                },
            });
            if (res.success) {
                toast.success(res.message || 'Cập nhật nhà cung cấp thành công.');
                router.push(ROUTES.ADMIN.SUPPLIER.LIST);
            } else {
                toast.error(res.message || 'Cập nhật nhà cung cấp thất bại.');
            }
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Cập nhật nhà cung cấp thất bại.';
            const missing = err?.response?.data?.data?.missingFields;
            if (Array.isArray(missing)) {
                setActivationErrorsVisible(true);
                setValue('isActive', false, { shouldDirty: true });
                requestAnimationFrame(() =>
                    scrollToFirstMissingField(missing as SupplierActivationField[])
                );
            }
            toast.error(message);
        }
    };

    if (isLoading) {
        return <SpinnerLoading />;
    }

    if (!supplier) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <Typography color="text.secondary">Không tìm thấy thông tin nhà cung cấp.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 8 }}>
            <PageHeader
                title={`Chỉnh sửa: ${supplier.name}`}
                breadcrumbItems={[
                    { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                    { label: 'Nhà cung cấp', to: ROUTES.ADMIN.SUPPLIER.LIST },
                    { label: supplier.name, to: ROUTES.ADMIN.SUPPLIER.DETAIL(supplier.id) },
                    { label: 'Chỉnh sửa' },
                ]}
            />

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Grid container spacing={3}>
                    {/* Left Column: Form Sections + Excel Mapping Config */}
                    <Grid size={{ xs: 12, lg: 8 }}>
                        <Stack spacing={3}>
                            <SupplierFormFields
                                control={control}
                                missingFields={missingFields}
                                isEdit={true}
                            />

                            {/* Collapsible Card: Excel Header Recognition Aliases */}
                            <CollapsibleCard
                                title="Cấu hình nhận diện cột File Excel (Dùng chung)"
                                subheader="Tùy chỉnh từ khóa nhận diện cột tự động khi tải lên file nhập vé"
                                expanded={importFieldsExpanded}
                                onToggle={() => setImportFieldsExpanded(!importFieldsExpanded)}
                            >
                                <Box sx={{ p: 2.5 }}>
                                    <SupplierImportFileFieldsPanel autoFocus={focusImportFields} />
                                </Box>
                            </CollapsibleCard>
                        </Stack>
                    </Grid>

                    {/* Right Column: Sticky Sidebar Panel */}
                    <Grid size={{ xs: 12, lg: 4 }}>
                        <SupplierSidebarPanel
                            values={watchedValues}
                            onActiveToggle={handleActiveToggle}
                            onSubmit={handleSubmit(onSubmit)}
                            onCancel={() => router.push(ROUTES.ADMIN.SUPPLIER.LIST)}
                            isPending={isPending}
                            isEdit={true}
                        />
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};
