import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Checkbox,
    Card,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    styled,
    alpha,
    CheckboxProps,
    Collapse,
    IconButton
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { PERMISSIONS_GROUPED } from '../../../constants/roles';
import { Controller, Control } from 'react-hook-form';

// --- Styled Components --- //
const MatrixCard = styled(Card)(({ theme }) => ({
    borderRadius: '12px',
    boxShadow: '0 0 2px 0 rgba(145, 158, 171, 0.2), 0 12px 24px -4px rgba(145, 158, 171, 0.12)',
    border: `1px solid ${theme.palette.divider}`,
    overflow: 'hidden',
    backgroundColor: '#fff',
}));

const StickyHeaderCell = styled(TableCell)(({ theme }) => ({
    backgroundColor: 'var(--palette-background-paper)',
    fontWeight: 600,
    color: theme.palette.text.secondary,
    borderBottom: `2px solid ${theme.palette.divider}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    padding: theme.spacing(1.5, 2),
    fontSize: '0.875rem',
}));

const ModuleRow = styled(TableRow)(({ theme }) => ({
    cursor: 'pointer',
    backgroundColor: 'var(--palette-background-neutral)',
    '&:hover': {
        backgroundColor: 'var(--palette-action-hover)',
    },
    '& > td': {
        borderBottom: `1px solid ${theme.palette.divider}`,
    }
}));

const ResourceRow = styled(TableRow)(({ theme }) => ({
    '& > td': {
        borderBottom: `1px solid ${theme.palette.divider}`,
        padding: theme.spacing(1.5, 2),
    },
    '&:last-child td': {
        borderBottom: 0,
    }
}));

const StyledCheckbox = styled((props: CheckboxProps) => (
    <Checkbox disableRipple size="small" {...props} />
))(({ theme }) => ({
    padding: '4px',
    color: theme.palette.text.disabled,
    '&.Mui-checked': {
        color: 'var(--palette-primary-main)',
    },
    '&.MuiCheckbox-indeterminate': {
        color: 'var(--palette-primary-main)',
    }
}));

// --- Constants & Parsers --- //
const RESOURCE_LABELS: Record<string, string> = {
    dashboard: "Bảng điều khiển",
    article: "Bài viết",
    ticket: "Vé số",
    provider: "Nhà đài",
    region: "Miền quay",
    prizeStructure: "Cơ cấu giải",
    lotteryResult: "Kết quả xổ số",
    ticketService: "Tiện ích / Tra vé",
    ticketServiceOrder: "Đơn mua hộ",
    order: "Đơn hàng",
    coupon: "Mã giảm giá",
    member: "Khách hàng",
    admin: "Nhân viên",
    streetAgent: "Người bán vé số dạo",
    role: "Nhóm quyền",
    chat: "Chat",
    notification: "Thông báo",
    review: "Đánh giá",
    calendar: "Lịch",
    settings: "Cài đặt",
    stats: "Thống kê",
};

const ACTION_COLUMNS = ['view', 'create', 'edit', 'delete'];
const ACTION_LABELS: Record<string, string> = {
    view: "Xem",
    create: "Khởi tạo",
    edit: "Chỉnh sửa",
    delete: "Xóa bỏ",
};

interface PermissionMatrixProps {
    control: Control<any>;
    name: string;
}

export const PermissionMatrix = ({ control, name }: PermissionMatrixProps) => {
    // State to toggle modules
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

    const matrixData = useMemo(() => {
        return PERMISSIONS_GROUPED.map(group => {
            const resources: Record<string, Record<string, string | null>> = {};
            const otherActions: Record<string, { id: string, name: string }[]> = {};
            const allPermsInModule: string[] = [];

            group.permissions.forEach(perm => {
                allPermsInModule.push(perm.id);
                let resource = '';
                let action = '';
                
                const [resourcePart, actionPart] = perm.id.split(':');
                resource = resourcePart || '';
                action = actionPart || '';

                if (!resources[resource]) {
                    resources[resource] = { view: null, create: null, edit: null, delete: null };
                    otherActions[resource] = [];
                }

                if (ACTION_COLUMNS.includes(action)) {
                    resources[resource][action] = perm.id;
                } else {
                    otherActions[resource].push({ id: perm.id, name: perm.name });
                }
            });

            return {
                moduleName: group.module,
                allPerms: allPermsInModule,
                resources: Object.keys(resources).map(key => ({
                    key,
                    label: RESOURCE_LABELS[key] || key,
                    actions: resources[key],
                    others: otherActions[key]
                }))
            };
        });
    }, []);

    const toggleModule = (moduleName: string) => {
        setExpandedModules(prev => ({
            ...prev,
            [moduleName]: !prev[moduleName]
        }));
    };

    const handleChange = (checked: boolean, permId: string, currentValues: string[], onChange: (val: string[]) => void) => {
        if (checked) {
            onChange([...currentValues, permId]);
        } else {
            onChange(currentValues.filter(id => id !== permId));
        }
    };

    const handleBulkChange = (checked: boolean, perms: string[], currentValues: string[], onChange: (val: string[]) => void) => {
        if (checked) {
            const newValues = [...currentValues];
            perms.forEach(p => {
                if (!newValues.includes(p)) newValues.push(p);
            });
            onChange(newValues);
        } else {
            onChange(currentValues.filter(id => !perms.includes(id)));
        }
    };

    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => {
                const currentValues = field.value || [];
                
                return (
                    <MatrixCard>
                        <Box sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
                            <Table stickyHeader size="small" sx={{ minWidth: 800, borderCollapse: 'separate' }}>
                                <TableHead>
                                    <TableRow>
                                        <StickyHeaderCell sx={{ width: '28%', minWidth: 200, zIndex: 11, left: 0 }}>
                                            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                                Tài nguyên hệ thống
                                            </Typography>
                                        </StickyHeaderCell>
                                        {ACTION_COLUMNS.map(col => (
                                            <StickyHeaderCell key={col} align="center" sx={{ width: '10%' }}>
                                                {ACTION_LABELS[col]}
                                            </StickyHeaderCell>
                                        ))}
                                        <StickyHeaderCell align="left" sx={{ width: '32%' }}>
                                            Quyền mở rộng
                                        </StickyHeaderCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {matrixData.map((group) => {
                                        const isExpanded = !!expandedModules[group.moduleName];
                                        const isAllChecked = group.allPerms.every(p => currentValues.includes(p));
                                        const isSomeChecked = group.allPerms.some(p => currentValues.includes(p)) && !isAllChecked;

                                        return (
                                            <React.Fragment key={group.moduleName}>
                                                {/* Module Group Row (Collapsible) */}
                                                <ModuleRow onClick={() => toggleModule(group.moduleName)}>
                                                    <TableCell colSpan={6} sx={{ pl: 2, position: 'sticky', left: 0, bgcolor: 'inherit', zIndex: 5 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <IconButton size="small" sx={{ mr: 1 }}>
                                                                {isExpanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                                                            </IconButton>
                                                            <StyledCheckbox 
                                                                checked={isAllChecked}
                                                                indeterminate={isSomeChecked}
                                                                onClick={(e) => e.stopPropagation()}
                                                                onChange={(e) => handleBulkChange(e.target.checked, group.allPerms, currentValues, field.onChange)}
                                                                sx={{ mr: 1 }}
                                                            />
                                                            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--palette-primary-dark)' }}>
                                                                {group.moduleName}
                                                            </Typography>
                                                        </Box>
                                                    </TableCell>
                                                </ModuleRow>

                                                {/* Resource Rows (Hidden when collapsed) */}
                                                {isExpanded && group.resources.map(row => {
                                                    const rowPerms = [
                                                        ...Object.values(row.actions).filter(Boolean) as string[],
                                                        ...row.others.map(o => o.id)
                                                    ];
                                                    const isRowAllChecked = rowPerms.every(p => currentValues.includes(p));
                                                    const isRowSomeChecked = rowPerms.some(p => currentValues.includes(p)) && !isRowAllChecked;

                                                    return (
                                                        <ResourceRow key={row.key} hover>
                                                            <TableCell sx={{ position: 'sticky', left: 0, bgcolor: '#fff', zIndex: 5 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', pl: 7 }}>
                                                                    <StyledCheckbox 
                                                                        checked={isRowAllChecked}
                                                                        indeterminate={isRowSomeChecked}
                                                                        onChange={(e) => handleBulkChange(e.target.checked, rowPerms, currentValues, field.onChange)}
                                                                        sx={{ mr: 1 }}
                                                                    />
                                                                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--palette-text-primary)' }}>
                                                                        {row.label}
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                            
                                                            {ACTION_COLUMNS.map(col => (
                                                                <TableCell key={col} align="center">
                                                                    {row.actions[col] && (
                                                                        <StyledCheckbox
                                                                            checked={currentValues.includes(row.actions[col]!)}
                                                                            onChange={(e) => handleChange(e.target.checked, row.actions[col]!, currentValues, field.onChange)}
                                                                        />
                                                                    )}
                                                                </TableCell>
                                                            ))}

                                                            <TableCell>
                                                                {row.others.length > 0 ? (
                                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                                                                        {row.others.map(other => (
                                                                            <Box key={other.id} sx={{ display: 'flex', alignItems: 'center' }}>
                                                                                <StyledCheckbox
                                                                                    checked={currentValues.includes(other.id)}
                                                                                    onChange={(e) => handleChange(e.target.checked, other.id, currentValues, field.onChange)}
                                                                                    sx={{ mr: 0.5 }}
                                                                                />
                                                                                <Typography sx={{ fontSize: '0.8125rem', color: 'var(--palette-text-secondary)', userSelect: 'none' }}>
                                                                                    {other.name}
                                                                                </Typography>
                                                                            </Box>
                                                                        ))}
                                                                    </Box>
                                                                ) : (
                                                                    <Typography sx={{ fontSize: '0.8125rem', color: 'var(--palette-text-disabled)', fontStyle: 'italic' }}>
                                                                        -
                                                                    </Typography>
                                                                )}
                                                            </TableCell>
                                                        </ResourceRow>
                                                    );
                                                })}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Box>
                    </MatrixCard>
                );
            }}
        />
    );
};
