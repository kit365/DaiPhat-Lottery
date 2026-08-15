"use client";

import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import {
    Box,
    Grid,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { ROUTES } from '../../../../constants/routes';
import { useCreateSupplier } from '../../hooks/useSupplier';
import { SupplierFormFields } from '../sections/SupplierFormFields';
import { SupplierSidebarPanel } from '../sections/SupplierSidebarPanel';
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

/** Helper to generate code slug from Vietnamese supplier name */
const generateSupplierCode = (name: string): string => {
    const slug = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    return slug.startsWith('NCC_') ? slug : slug ? `NCC_${slug}` : '';
};

export const SupplierCreatePage = () => {
    const router = useAdminRouter();
    const { mutateAsync, isPending } = useCreateSupplier();
    const [activationErrorsVisible, setActivationErrorsVisible] = useState(false);
    const [userEditedCode, setUserEditedCode] = useState(false);

    const { control, handleSubmit, watch, setValue } = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierFormSchema),
        defaultValues: supplierFormDefaultValues,
    });

    const watchedValues = watch();
    const watchedName = watch('name');

    // Auto generate code from name if user hasn't manually edited it
    useEffect(() => {
        if (!userEditedCode && watchedName) {
            const autoCode = generateSupplierCode(watchedName);
            if (autoCode) {
                setValue('code', autoCode, { shouldValidate: true });
            }
        }
    }, [watchedName, userEditedCode, setValue]);

    const missingFields = useMemo(() => {
        if (!activationErrorsVisible) {
            return [];
        }
        return getMissingSupplierFields(watchedValues);
    }, [watchedValues, activationErrorsVisible]);

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
        let isActive = data.isActive;
        if (isActive) {
            const missing = getMissingSupplierFields(data);
            if (missing.length > 0) {
                setActivationErrorsVisible(true);
                isActive = false;
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
                ...data,
                isActive,
                contactName: data.contactName?.trim() || undefined,
                contactEmail: data.contactEmail?.trim() || undefined,
                address: data.address?.trim() || undefined,
                taxCode: data.taxCode?.trim() || undefined,
                paymentTermDays: data.paymentTermDays ?? null,
                defaultImportCost: data.defaultImportCost ?? null,
            });
            if (res.success) {
                toast.success(res.message || 'Tạo nhà cung cấp thành công.');
                router.push(ROUTES.ADMIN.SUPPLIER.LIST);
            } else {
                toast.error(res.message || 'Tạo nhà cung cấp thất bại.');
            }
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Tạo nhà cung cấp thất bại.';
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

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 8 }}>
            <PageHeader
                title="Thêm nhà cung cấp mới"
                breadcrumbItems={[
                    { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                    { label: 'Nhà cung cấp', to: ROUTES.ADMIN.SUPPLIER.LIST },
                    { label: 'Thêm mới' },
                ]}
            />

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Grid container spacing={3}>
                    {/* Left Column: Form Detail Sections */}
                    <Grid size={{ xs: 12, lg: 8 }}>
                        <SupplierFormFields
                            control={control}
                            missingFields={missingFields}
                            isEdit={false}
                            onUserEditedCode={() => setUserEditedCode(true)}
                        />
                    </Grid>

                    {/* Right Column: Sticky Sidebar Panel */}
                    <Grid size={{ xs: 12, lg: 4 }}>
                        <SupplierSidebarPanel
                            values={watchedValues}
                            onActiveToggle={handleActiveToggle}
                            onSubmit={handleSubmit(onSubmit)}
                            onCancel={() => router.push(ROUTES.ADMIN.SUPPLIER.LIST)}
                            isPending={isPending}
                            isEdit={false}
                        />
                    </Grid>
                </Grid>
            </form>
        </Box>
    );
};
