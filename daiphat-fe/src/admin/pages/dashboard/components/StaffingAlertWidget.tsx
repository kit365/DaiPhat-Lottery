"use client";

import { Card, Typography, Stack, Box, alpha, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from "@mui/material";
import { Icon } from '@/admin/components/ui/AdminIcon';
import { useQuery } from "@tanstack/react-query";
import { getStaffingStatus } from "@/admin/features/dashboard/services/dashboardService";
import dayjs from "dayjs";

export const StaffingAlertWidget = () => {
    const { data: statusRes, isLoading } = useQuery({
        queryKey: ["staffing-status-today"],
        queryFn: () => getStaffingStatus(dayjs().format("YYYY-MM-DD")),
        refetchInterval: 300000 
    });

    const staffingData = Array.isArray(statusRes?.data) ? statusRes.data : [];

    const understaffedShifts = staffingData.filter((s: { requirements?: Array<{ status?: string }> }) =>
        s.requirements?.some((r) => r.status === 'thiếu'),
    );

    if (isLoading) return null;
    if (!staffingData || staffingData.length === 0) return null;

    return (
        <Card sx={{
            p: 3,
            borderRadius: '20px',
            boxShadow: "var(--customShadows-card)",
            border: `1px solid ${alpha('#919EAB', 0.12)}`,
            height: '100%'
        }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Icon icon="solar:shield-warning-bold-duotone" width={24} color={understaffedShifts.length > 0 ? '#ef4444' : '#10b981'} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>�?nh m?c nh�n s? h�m nay</Typography>
                </Stack>
                {understaffedShifts.length > 0 && (
                    <Chip 
                        label={`${understaffedShifts.length} ca thi?u ngu?i`} 
                        color="error" 
                        size="small" 
                        sx={{ fontWeight: 700 }}
                    />
                )}
            </Stack>

            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>T�nh tr?ng thi?u h?t theo ca</TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>C?nh b�o</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {staffingData.map((shift: { shiftId: string; requirements: Array<{ roleId: string; status: string; diff: number }> }) =>
                            shift.requirements.filter((r) => r.status === 'thiếu').map((req) => (
                                <TableRow key={`${shift.shiftId}-${req.roleId}`}>
                                    <TableCell sx={{ fontWeight: 600 }}>
                                        Ca tr?c: {shift.shiftId.substring(shift.shiftId.length - 4)} (Thi?u vai tr�)
                                    </TableCell>
                                    <TableCell align="right">
                                        <Chip 
                                            label={`Thi?u ${Math.abs(req.diff)} ngu?i`} 
                                            size="small"
                                            color="error"
                                            variant={"soft" as any}
                                            sx={{ fontWeight: 700, borderRadius: '6px' }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ mt: 2, textAlign: 'right' }}>
                <Button 
                    size="small" 
                    color="primary" 
                    endIcon={<Icon icon="solar:arrow-right-bold" />}
                    onClick={() => window.location.href = "/admin/schedules"}
                >
                    �i?u ch?nh l?ch
                </Button>
            </Box>
        </Card>
    );
};
