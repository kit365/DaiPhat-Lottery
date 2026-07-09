import { Box, Stack } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Title } from '../../components/ui/Title';
import { CollapsibleCard } from '../../components/ui/CollapsibleCard';
import { LoadingButton } from '../../components/ui/LoadingButton';
import { ROUTES } from '../../constants/routes';
import { useCreateSupplier } from './hooks/useSupplier';
import { SupplierFormFields } from './SupplierFormFields';
import { supplierFormSchema, SupplierFormValues, supplierFormDefaultValues } from './schemas/supplier.schema';
import {
    getMissingSupplierFields,
    scrollToFirstMissingField,
    SupplierActivationField,
} from './utils/supplier-activation';

export const SupplierCreatePage = () => {
    const navigate = useNavigate();
    const { mutateAsync, isPending } = useCreateSupplier();
    const [activationErrorsVisible, setActivationErrorsVisible] = useState(false);

    const { control, handleSubmit, watch, setValue } = useForm<SupplierFormValues>({
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
                navigate(ROUTES.ADMIN.SUPPLIER.LIST);
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
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Breadcrumb
                items={[
                    { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                    { label: 'Nhà cung cấp', to: ROUTES.ADMIN.SUPPLIER.LIST },
                    { label: 'Thêm mới' },
                ]}
            />
            <Title title="Thêm nhà cung cấp" />

            <form onSubmit={handleSubmit(onSubmit)}>
                <CollapsibleCard title="Thông tin nhà cung cấp" expanded onToggle={() => undefined}>
                    <Stack spacing={3} sx={{ p: 3 }}>
                        <SupplierFormFields
                            control={control}
                            missingFields={missingFields}
                            onActiveToggle={handleActiveToggle}
                        />
                        <LoadingButton
                            type="submit"
                            variant="contained"
                            loading={isPending}
                            label="Lưu"
                            loadingLabel="Đang lưu..."
                            sx={{ alignSelf: 'flex-start' }}
                        />
                    </Stack>
                </CollapsibleCard>
            </form>
        </Box>
    );
};
