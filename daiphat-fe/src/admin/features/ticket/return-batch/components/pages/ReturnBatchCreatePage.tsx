import {
    Alert,
    Box,
    Checkbox,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Breadcrumb } from '../../../../../components/ui/Breadcrumb';
import { Title } from '../../../../../components/ui/Title';
import { CollapsibleCard } from '../../../../../components/ui/CollapsibleCard';
import { LoadingButton } from '../../../../../components/ui/LoadingButton';
import { ROUTES } from '../../../../../constants/routes';
import { useActiveSuppliers } from '../../../../supplier/hooks/useSupplier';
import { useStationsByDrawDate } from '../../../../station/hooks/useStation';
import { useCreateReturnBatch } from '../../hooks/useReturnBatch';

export const ReturnBatchCreatePage = () => {
    const navigate = useNavigate();
    const { data: suppliers = [], isLoading: loadingSuppliers } = useActiveSuppliers();
    const createMutation = useCreateReturnBatch();

    const [supplierId, setSupplierId] = useState<number | ''>('');
    const [drawDate, setDrawDate] = useState<Dayjs | null>(dayjs());
    const [note, setNote] = useState('');
    const [selectedStationIds, setSelectedStationIds] = useState<number[]>([]);

    const drawDateStr = drawDate?.format('YYYY-MM-DD');
    const { data: stations = [], isLoading: loadingStations } = useStationsByDrawDate(drawDateStr);

    const stationOptions = useMemo(
        () => (Array.isArray(stations) ? stations : []),
        [stations]
    );

    const toggleStation = (stationId: number) => {
        setSelectedStationIds((prev) =>
            prev.includes(stationId)
                ? prev.filter((id) => id !== stationId)
                : [...prev, stationId]
        );
    };

    const handleSubmit = async () => {
        if (!supplierId) {
            toast.error('Vui lòng chọn nhà cung cấp.');
            return;
        }
        if (!drawDateStr) {
            toast.error('Vui lòng chọn ngày quay.');
            return;
        }
        if (selectedStationIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất một nhà đài.');
            return;
        }

        try {
            const res = await createMutation.mutateAsync({
                supplierId: Number(supplierId),
                drawDate: drawDateStr,
                note: note.trim() || null,
                lines: selectedStationIds.map((lotteryStationId) => ({ lotteryStationId })),
            });
            toast.success('Tạo phiếu trả vé thành công.');
            navigate(ROUTES.ADMIN.RETURN_BATCH.DETAIL(res.data!.id));
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể tạo phiếu trả vé.');
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
            <Box sx={{ maxWidth: 900, mx: 'auto' }}>
                <div className="mb-[calc(3*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))]">
                    <div className="mr-auto">
                        <Title title="Tạo phiếu trả vé" />
                        <Breadcrumb
                            items={[
                                { label: 'Vé số', to: ROUTES.ADMIN.TICKETS.LIST },
                                { label: 'Trả vé NCC', to: ROUTES.ADMIN.RETURN_BATCH.LIST },
                                { label: 'Tạo mới' },
                            ]}
                        />
                    </div>
                    <Stack direction="row" spacing={1}>
                        <LoadingButton
                            label="Hủy"
                            onClick={() => navigate(ROUTES.ADMIN.RETURN_BATCH.LIST)}
                        />
                        <LoadingButton
                            label="Tạo phiếu"
                            className="btn-primary-admin"
                            loading={createMutation.isPending}
                            onClick={handleSubmit}
                        />
                    </Stack>
                </div>

                <Alert severity="info" sx={{ mb: 2 }}>
                    Phiếu trả theo nhà cung cấp + ngày quay. Mỗi nhà đài là một dòng; gắn sê-ri thủ công ở màn chỉnh sửa.
                </Alert>

                <CollapsibleCard title="Thông tin phiếu" expanded onToggle={() => undefined}>
                    <Stack spacing={3} sx={{ p: 3 }}>
                        <FormControl fullWidth size="small" disabled={loadingSuppliers}>
                            <InputLabel>Nhà cung cấp</InputLabel>
                            <Select
                                label="Nhà cung cấp"
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value as number)}
                            >
                                {suppliers.map((s) => (
                                    <MenuItem key={s.id} value={s.id}>
                                        {s.name} ({s.code})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <DatePicker
                            label="Ngày quay"
                            value={drawDate}
                            onChange={(value) => {
                                setDrawDate(value);
                                setSelectedStationIds([]);
                            }}
                            slotProps={{ textField: { size: 'small', fullWidth: true } }}
                        />

                        <TextField
                            label="Ghi chú"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            multiline
                            minRows={2}
                            fullWidth
                            size="small"
                        />

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Nhà đài trong ngày quay {loadingStations ? '(đang tải…)' : ''}
                            </Typography>
                            {stationOptions.length === 0 ? (
                                <Typography color="text.secondary">
                                    Không có nhà đài cho ngày quay đã chọn.
                                </Typography>
                            ) : (
                                <Stack>
                                    {stationOptions.map((station: any) => (
                                        <FormControlLabel
                                            key={station.id}
                                            control={
                                                <Checkbox
                                                    checked={selectedStationIds.includes(station.id)}
                                                    onChange={() => toggleStation(station.id)}
                                                />
                                            }
                                            label={station.name || `Nhà đài #${station.id}`}
                                        />
                                    ))}
                                </Stack>
                            )}
                        </Box>
                    </Stack>
                </CollapsibleCard>
            </Box>
        </LocalizationProvider>
    );
};
