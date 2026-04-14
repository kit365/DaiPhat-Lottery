import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { useTranslation } from "react-i18next";
import { Title } from "../../components/ui/Title";
import { useCreateRole } from "./hooks/useRole";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { roleSchema } from "../../schemas/role.schema";
import { prefixAdmin } from "../../constants/routes";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { PERMISSIONS_GROUPED } from "../../constants/roles";
import { useTicketServices } from "../ticket-service/hooks/useTicketService";
import { useDepartments } from "../hr/hooks/useDepartments";
import { useState, useMemo, Dispatch, SetStateAction } from "react";
import { CollapsibleCard } from "../../components/ui/CollapsibleCard";
import { PermissionMatrix } from "./sections/PermissionMatrix";
import { SwitchButton } from "../../components/ui/SwitchButton";
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LoadingButton } from "../../components/ui/LoadingButton";
import {
    Box,
    TextField,
    MenuItem,
    FormControl,
    Select,
    Checkbox,
    FormControlLabel,
    Typography,
    Chip,
    Switch,
    Stack,
    ThemeProvider,
    createTheme,
    useTheme
} from "@mui/material";
const DEFAULT_STAFF_PERMISSIONS = [
    "booking_view",
    "booking_create",
    "booking_edit",
    "calendar_view",
    "schedule_view",
    "account_user_view",
    "account_user_create",
    "account_user_edit",
    "service_view",
    "breed_view"
];

export const RoleCreatePage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { mutate: create, isPending } = useCreateRole();
    const servicesRes = useTicketServices({ limit: 1000 });
    const services = useMemo(() => {
        if (!servicesRes.data) return [];
        const data = servicesRes.data;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data)) return data;
        return [];
    }, [servicesRes.data]);

    const departmentsRes = useDepartments();
    const departments = useMemo(() => {
        if (!departmentsRes.data) return [];
        const data = departmentsRes.data;
        if (Array.isArray(data.data?.recordList)) return data.data.recordList;
        if (Array.isArray(data.recordList)) return data.recordList;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data)) return data;
        return [];
    }, [departmentsRes.data]);

    const [expandedInfo, setExpandedInfo] = useState(true);
    const [expandedPermissions, setExpandedPermissions] = useState(true);

    const toggle = (setter: Dispatch<SetStateAction<boolean>>) =>
        () => setter(prev => !prev);

    const outerTheme = useTheme();
    const localTheme = useMemo(() => createTheme(outerTheme, {
        components: {
            MuiCard: {
                styleOverrides: {
                    root: {
                        backgroundImage: "none !important",
                        backdropFilter: "none !important",
                        backgroundColor: "var(--palette-background-paper) !important",
                        boxShadow: "var(--customShadows-card)",
                        borderRadius: "var(--shape-borderRadius-lg)",
                        color: "var(--palette-text-primary)",
                    },
                }
            },
        }
    }), [outerTheme]);

    const {
        control,
        handleSubmit,
        watch,
        setValue,
    } = useForm<any>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
            name: "",
            description: "",
            isStaff: false,
            serviceIds: [],
            permissions: [],
            departmentId: "",
            status: "active",
        },
    });

    const isStaff = watch("isStaff");
    const currentPermissions = watch("permissions") || [];

    const handleSelectGroup = (groupPermissions: string[], isChecked: boolean) => {
        let newPermissions = [...currentPermissions];
        if (isChecked) {
            groupPermissions.forEach(id => {
                if (!newPermissions.includes(id)) newPermissions.push(id);
            });
        } else {
            newPermissions = newPermissions.filter(id => !groupPermissions.includes(id));
        }
        setValue("permissions", newPermissions, { shouldValidate: true });
    };

    const handleSwitchStaff = (checked: boolean) => {
        setValue("isStaff", checked);
        if (checked) {
            // Tự động thêm các quyền mặc định nếu chưa có
            let newPermissions = [...currentPermissions];
            DEFAULT_STAFF_PERMISSIONS.forEach(id => {
                if (!newPermissions.includes(id)) newPermissions.push(id);
            });
            setValue("permissions", newPermissions, { shouldValidate: true });
        }
    };

    const onSubmit = (data: any) => {
        create(data, {
            onSuccess: () => {
                toast.success(t("admin.common.create_success"));
                navigate(`/${prefixAdmin}/role/list`);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || t("admin.common.create_failed"));
            }
        });
    };

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title={t("admin.sidebar.role_create")} />
                    <Breadcrumb
                        items={[
                            { label: t("admin.common.dashboard"), to: "/" },
                            { label: t("admin.sidebar.roles"), to: `/${prefixAdmin}/role/list` },
                            { label: t("admin.common.create") }
                        ]}
                    />
                </div>
            </div>

            <ThemeProvider theme={localTheme}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack sx={{ margin: "0px calc(15 * var(--spacing))", gap: "calc(5 * var(--spacing))" }}>
                        <CollapsibleCard
                            title={t("admin.common.general_info")}
                            subheader={t("admin.common.general_info_desc")}
                            expanded={expandedInfo}
                            onToggle={toggle(setExpandedInfo)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "calc(3 * var(--spacing)) calc(2 * var(--spacing))" }}>
                                    <Controller
                                        name="name"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                label={t("admin.role.name")}
                                                placeholder={t("admin.role.name_placeholder")}
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="description"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                label={t("admin.role.description")}
                                                placeholder={t("admin.role.description_placeholder")}
                                            />
                                        )}
                                    />
                                    <Controller
                                        name="departmentId"
                                        control={control}
                                        render={({ field }) => (
                                            <TextField
                                                {...field}
                                                select
                                                label={t("admin.role.department")}
                                                error={!!control.getFieldState("departmentId").error}
                                                helperText={control.getFieldState("departmentId").error?.message}
                                            >
                                                <MenuItem value="">-- {t("admin.common.select")} --</MenuItem>
                                                {departments.map((dept: any) => (
                                                    <MenuItem key={dept._id} value={dept._id}>
                                                        {dept.name}
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        )}
                                    />
                                </Box>
                            </Stack>
                        </CollapsibleCard>

                        <CollapsibleCard
                            title={t("admin.role.permissions")}
                            subheader={t("admin.role.permissions_desc")}
                            expanded={expandedPermissions}
                            onToggle={toggle(setExpandedPermissions)}
                        >
                            <Stack p="calc(3 * var(--spacing))" gap="calc(3 * var(--spacing))">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    <Box sx={{ p: 2, bgcolor: 'var(--palette-background-neutral)', borderRadius: 2, border: '1px solid var(--palette-divider)' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: isStaff ? 3 : 0 }}>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.primary' }}>{t("admin.role.type")}</Typography>
                                                <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.5 }}>
                                                    Bật tùy chọn này để đánh dấu đây là Nhóm quyền của hệ thống Nhân sự / Kỹ thuật viên (cho phép gán Kỹ năng chuyên môn).
                                                </Typography>
                                            </Box>
                                            <Controller
                                                name="isStaff"
                                                control={control}
                                                render={({ field }) => (
                                                    <FormControlLabel
                                                        sx={{ m: 0 }}
                                                        control={
                                                            <Switch
                                                                {...field}
                                                                checked={field.value}
                                                                onChange={(e) => handleSwitchStaff(e.target.checked)}
                                                                sx={{
                                                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                                                        color: 'var(--palette-primary-main)',
                                                                        '& + .MuiSwitch-track': {
                                                                            backgroundColor: 'var(--palette-primary-main)',
                                                                            opacity: 1,
                                                                        },
                                                                    },
                                                                }}
                                                            />
                                                        }
                                                        label={<Typography sx={{ fontSize: '0.875rem', fontWeight: 600, ml: 1 }}>{t("admin.role.is_staff")}</Typography>}
                                                    />
                                                )}
                                            />
                                        </Box>

                                        {isStaff && (
                                            <Box sx={{ borderTop: '1px dashed var(--palette-divider)', pt: 3 }}>
                                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1.5 }}>{t("admin.role.skills")}</Typography>
                                                <Controller
                                                    name="serviceIds"
                                                    control={control}
                                                    render={({ field }) => (
                                                        <FormControl fullWidth>
                                                            <Select
                                                                {...field}
                                                                multiple
                                                                displayEmpty
                                                                renderValue={(selected: any) => {
                                                                    if (selected.length === 0) {
                                                                        return <Typography color="text.disabled" sx={{ fontSize: '0.875rem' }}>Chọn kỹ năng chuyên môn hỗ trợ...</Typography>;
                                                                    }
                                                                    return (
                                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                            {selected.map((serviceId: string) => {
                                                                                const service = services.find((s: any) => s._id === serviceId);
                                                                                return (
                                                                                    <Chip
                                                                                        key={serviceId}
                                                                                        label={service?.name || `ID: ${serviceId}`}
                                                                                        size="small"
                                                                                        onDelete={(e) => {
                                                                                            e.stopPropagation();
                                                                                            const newValue = field.value.filter((id: string) => id !== serviceId);
                                                                                            field.onChange(newValue);
                                                                                        }}
                                                                                        onMouseDown={(e) => {
                                                                                            e.stopPropagation();
                                                                                        }}
                                                                                        sx={{
                                                                                            height: 24,
                                                                                            fontSize: '0.75rem',
                                                                                            bgcolor: 'rgba(0, 167, 111, 0.16)',
                                                                                            color: 'rgb(0, 120, 103)',
                                                                                            borderRadius: "var(--shape-borderRadius-sm)",
                                                                                            fontWeight: 700,
                                                                                            '& .MuiChip-deleteIcon': {
                                                                                                color: 'rgb(0, 120, 103)',
                                                                                                fontSize: 16,
                                                                                                '&:hover': {
                                                                                                    color: 'rgb(183, 29, 24)',
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                    />
                                                                                );
                                                                            })}
                                                                        </Box>
                                                                    );
                                                                }}
                                                                sx={{ fontSize: '0.875rem', bgcolor: 'background.paper' }}
                                                            >
                                                                {services.map((service: any) => (
                                                                    <MenuItem key={service._id} value={service._id} sx={{ fontSize: '0.875rem' }}>
                                                                        <Checkbox checked={field.value.indexOf(service._id) > -1} />
                                                                        {service.name}
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    )}
                                                />
                                            </Box>
                                        )}
                                    </Box>

                                    <Box>
                                        <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, mb: 3 }}>
                                            {t("admin.role.permission_list")}
                                        </Typography>
                                        <PermissionMatrix control={control} name="permissions" />
                                    </Box>
                                </Box>
                            </Stack>
                        </CollapsibleCard>

                        <Box gap="calc(3 * var(--spacing))" sx={{ display: "flex", alignItems: "center" }}>
                            <SwitchButton
                                control={control}
                                name="status"
                                checkedValue="active"
                                uncheckedValue="inactive"
                            />
                            <LoadingButton
                                type="submit"
                                loading={isPending}
                                label={t("admin.common.create")}
                                loadingLabel={t("admin.common.processing")}
                                sx={{ minHeight: "3rem", minWidth: "7.5rem" }}
                            />
                        </Box>
                    </Stack>
                </form>
            </ThemeProvider>
        </>
    );
};




