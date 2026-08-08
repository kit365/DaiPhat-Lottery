"use client";

import { Box, Stack, Typography, FormControlLabel, Switch } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from '@/components/router-compat';
import { toast } from 'react-toastify';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { CollapsibleCard } from '../../../../components/ui/CollapsibleCard';
import { LoadingButton } from '../../../../components/ui/LoadingButton';
import { ROUTES } from '../../../../constants/routes';
import { useSupplierDetail, useUpdateSupplier } from '../../hooks/useSupplier';
import { SupplierFormFields } from '../sections/SupplierFormFields';
import { supplierFormSchema, SupplierFormValues, supplierFormDefaultValues } from '../../schemas/supplier.schema';
import {
    getMissingSupplierFields,
    scrollToFirstMissingField,
    SupplierActivationField,
} from '../../utils/supplier-activation';

export const SupplierEditPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: supplier, isLoading } = useSupplierDetail(id);
    const { mutateAsync, isPending } = useUpdateSupplier();
    const [activationErrorsVisible, setActivationErrorsVisible] = useState(false);

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
            return true;
        }

        const missing = getMissingSupplierFields(watchedValues);
        if (missing.length > 0) {
            setActivationErrorsVisible(true);
            requestAnimationFrame(() => scrollToFirstMissingField(missing));
            toast.warning('Vui lòng hoàn tất thông tin bắt buộc trước khi kích hoạt nhà cung cấp.');
            return false;
        }

        setActivationErrorsVisible(false);
        return true;
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
                navigate(ROUTES.ADMIN.SUPPLIER.LIST);
            } else {
                toast.error(res.message || 'Cập nhật nhà cung cấp thất bại.');
            }
        } catch (err: any) {
            const message =
                err?.response?.data?.message || err?.message || 'Cập nhật nhà cung cấp thất bại.';
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
        return null;
    }

    if (!supplier) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Không tìm thấy nhà cung cấp.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <PageHeader
                title={`Sửa nhà cung cấp #${supplier.id}`}
                breadcrumbItems={[
                    { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                    { label: 'Nhà cung cấp', to: ROUTES.ADMIN.SUPPLIER.LIST },
                    { label: `Sửa #${supplier.id}` },
                ]}
            />

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <CollapsibleCard title="Thông tin nhà cung cấp" expanded onToggle={() => undefined}>
                    <Stack spacing={3} sx={{ p: 3 }}>
                        <SupplierFormFields
                            control={control}
                            missingFields={missingFields}
                            onActiveToggle={handleActiveToggle}
                            hideIsActive={true}
                        />
                    </Stack>
                </CollapsibleCard>
                
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 3 }}>
                    <Controller
                        name="isActive"
                        control={control}
                        render={({ field }) => (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={field.value}
                                        onChange={(e) => {
                                            const nextActive = e.target.checked;
                                            if (nextActive && !handleActiveToggle(true)) {
                                                return;
                                            }
                                            if (!nextActive) {
                                                handleActiveToggle(false);
                                            }
                                            field.onChange(nextActive);
                                        }}
                                    />
                                }
                                label={field.value ? 'Hoạt động' : 'Ngừng hoạt động'}
                            />
                        )}
                    />
                    <LoadingButton
                        type="submit"
                        variant="contained"
                        loading={isPending}
                        label="Lưu thay đổi"
                        loadingLabel="Đang lưu..."
                    />
                </Stack>
            </form>
        </Box>
    );
};
