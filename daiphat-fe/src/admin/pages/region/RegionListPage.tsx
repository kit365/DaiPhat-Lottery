import { useState } from "react";
import { Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Stack, ThemeProvider, useTheme, createTheme, useMediaQuery } from "@mui/material";
import { Breadcrumb } from "../../components/ui/Breadcrumb";
import { Title } from "../../components/ui/Title";
import { useRegions, useUpdateRegion } from "./hooks/useRegion";
import { Edit2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateRegionSchema, UpdateRegionFormValues } from "../../schemas/region.schema";
import { toast } from "react-toastify";
import { LoadingButton } from "../../components/ui/LoadingButton";
import { LotteryRegionResponse } from "./types/region";

export const RegionListPage = () => {
    const { data: regionsRes, isLoading } = useRegions();
    const regions = regionsRes?.data || [];
    const { mutate: updateRegion, isPending } = useUpdateRegion();
    
    const [selectedRegion, setSelectedRegion] = useState<LotteryRegionResponse | null>(null);

    const outerTheme = useTheme();
    const isMobile = useMediaQuery(outerTheme.breakpoints.down('sm'));
    const localTheme = createTheme(outerTheme, {
        components: {
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: "16px",
                        padding: "16px",
                        width: "100%",
                        maxWidth: "500px",
                        margin: isMobile ? "16px" : "32px",
                        backgroundImage: "none",
                        backgroundColor: outerTheme.palette.background.paper,
                        boxShadow: "var(--customShadows-dialog)",
                    }
                }
            }
        }
    });

    const { control, handleSubmit, reset } = useForm<UpdateRegionFormValues>({
        resolver: zodResolver(updateRegionSchema),
        defaultValues: {
            minNumber: 0,
            maxNumber: 999999,
        }
    });

    const handleEditClick = (region: LotteryRegionResponse) => {
        setSelectedRegion(region);
        reset({
            minNumber: region.minNumber,
            maxNumber: region.maxNumber
        });
    };

    const handleCloseModal = () => {
        setSelectedRegion(null);
    };

    const onSubmit = (data: UpdateRegionFormValues) => {
        if (!selectedRegion) return;
        updateRegion(
            { code: selectedRegion.code, data },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        toast.success("Cập nhật cấu hình miền thành công!");
                        handleCloseModal();
                    } else {
                        toast.error(res.message || "Cập nhật cấu hình miền thất bại!");
                    }
                },
                onError: (err: any) => {
                    toast.error(err?.response?.data?.message || err.message || "Cập nhật thất bại!");
                }
            }
        );
    };

    return (
        <>
            <div className="mb-[calc(5*var(--spacing))] gap-[calc(2*var(--spacing))] flex items-start justify-end">
                <div className="mr-auto">
                    <Title title="Quản lý Vùng Miền" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/admin" },
                            { label: "Vùng Miền" }
                        ]}
                    />
                </div>
            </div>

            <Card sx={{ borderRadius: "16px", boxShadow: "var(--customShadows-card)", backgroundColor: "var(--palette-background-paper)" }}>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ '& th': { color: 'var(--palette-text-secondary)', fontWeight: 600, borderBottom: '1px dashed var(--palette-divider)' } }}>
                                <TableCell>Mã</TableCell>
                                <TableCell>Tên Miền</TableCell>
                                <TableCell>Loại vé</TableCell>
                                <TableCell>Độ dài số</TableCell>
                                <TableCell>Dải số (Min - Max)</TableCell>
                                <TableCell align="center">Số đài dự kiến</TableCell>
                                <TableCell align="right">Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>Đang tải dữ liệu...</TableCell>
                                </TableRow>
                            ) : regions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>Không có dữ liệu</TableCell>
                                </TableRow>
                            ) : (
                                regions.map((region) => (
                                    <TableRow key={region.id} sx={{ '& td': { borderBottom: '1px dashed var(--palette-divider)' } }}>
                                        <TableCell>{region.code}</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>{region.name}</TableCell>
                                        <TableCell>{region.type}</TableCell>
                                        <TableCell>{region.numberLength}</TableCell>
                                        <TableCell>{region.minNumber} - {region.maxNumber}</TableCell>
                                        <TableCell align="center">{region.stationCount}</TableCell>
                                        <TableCell align="right">
                                            <IconButton onClick={() => handleEditClick(region)} size="small" color="primary">
                                                <Edit2 size={18} />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            <ThemeProvider theme={localTheme}>
                <Dialog open={!!selectedRegion} onClose={handleCloseModal} maxWidth="sm" fullWidth>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <DialogTitle sx={{ pb: 2, fontWeight: 700, fontSize: "1.25rem" }}>
                            Cấu hình số vé - {selectedRegion?.name}
                        </DialogTitle>
                        <DialogContent sx={{ py: "24px !important" }}>
                            <Stack spacing={3}>
                                <Box>
                                    <Controller
                                        name="minNumber"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                type="number"
                                                label="Số nhỏ nhất"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Box>
                                <Box>
                                    <Controller
                                        name="maxNumber"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <TextField
                                                {...field}
                                                type="number"
                                                label="Số lớn nhất"
                                                error={!!fieldState.error}
                                                helperText={fieldState.error?.message}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                                fullWidth
                                            />
                                        )}
                                    />
                                </Box>
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ pt: 2, px: 3, pb: 2 }}>
                            <Button onClick={handleCloseModal} variant="outlined" color="inherit" disabled={isPending}>
                                Hủy
                            </Button>
                            <LoadingButton
                                type="submit"
                                loading={isPending}
                                label="Lưu thay đổi"
                                loadingLabel="Đang lưu..."
                                variant="contained"
                            />
                        </DialogActions>
                    </form>
                </Dialog>
            </ThemeProvider>
        </>
    );
};
