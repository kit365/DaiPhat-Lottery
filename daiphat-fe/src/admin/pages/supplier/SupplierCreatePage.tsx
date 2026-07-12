import { Box, Stack } from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
    supplierCreateSchema,
    SupplierFormValues,
    supplierCreateDefaultValues,
} from './schemas/supplier.schema';
import {
    scrollToFirstMissingField,
    SupplierActivationField,
} from './utils/supplier-activation';

export const SupplierCreatePage = () => {
    const navigate = useNavigate();
    const { mutateAsync, isPending } = useCreateSupplier();

    const {
        control,
        handleSubmit,
        formState: { isValid },
        setError,
    } = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierCreateSchema),
        defaultValues: supplierCreateDefaultValues,
        mode: 'onChange',
        reValidateMode: 'onChange',
    });

    const onSubmit = async (data: SupplierFormValues) => {
        try {
            const res = await mutateAsync({
                name: data.name.trim(),
                code: data.code.trim(),
                type: data.type,
                contactName: data.contactName?.trim() || undefined,
                contactPhone: data.contactPhone.trim(),
                contactEmail: data.contactEmail!.trim(),
                address: data.address!.trim(),
                taxCode: data.taxCode?.trim() || undefined,
                paymentTermDays: data.paymentTermDays as number,
                defaultImportCost: data.defaultImportCost as number,
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
            if (Array.isArray(missing) && missing.length > 0) {
                requestAnimationFrame(() =>
                    scrollToFirstMissingField(missing as SupplierActivationField[])
                );
            }
            const fieldErrors = err?.response?.data?.errors;
            if (fieldErrors && typeof fieldErrors === 'object') {
                Object.entries(fieldErrors).forEach(([field, msg]) => {
                    if (typeof msg === 'string') {
                        setError(field as keyof SupplierFormValues, { message: msg });
                    }
                });
            }
            toast.error(message);
        }
    };

    const onInvalid = () => {
        toast.warning('Vui lòng hoàn tất các trường bắt buộc trước khi lưu.');
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

            <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
                <CollapsibleCard title="Thông tin nhà cung cấp" expanded onToggle={() => undefined}>
                    <Stack spacing={3} sx={{ p: 3 }}>
                        <SupplierFormFields
                            control={control}
                            showActiveToggle={false}
                            createMode
                        />
                        <LoadingButton
                            type="submit"
                            variant="contained"
                            loading={isPending}
                            disabled={!isValid || isPending}
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
