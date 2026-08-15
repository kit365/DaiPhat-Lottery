import { useAdminRouter } from "@/admin/hooks/useAdminRouter";
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    InputAdornment,
    Radio,
    RadioGroup,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import dayjs from 'dayjs';
import { useCreateStaffPrizePayoutBatch, usePrizePayoutCustomerBankAccounts, usePrizePayoutLookupStations } from '@/admin/features/prize-payout/hooks/usePrizePayoutManagement';
import { PageHeader } from '@/admin/components/ui/PageHeader';
import { AdminDatePicker } from '@/admin/components/ui/AdminDatePicker';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import { getMetricChipSx } from '@/admin/utils/badge';
import { prefixAdmin } from '@/admin/constants/routes';
import { prizePayoutAdminApi } from "@/admin/features/prize-payout/services/prizePayoutService";
import { useAuthStore } from '@/stores/useAuthStore';
import {
    formatPrizePayoutCurrency,
    PrizePayoutLookupItem,
    PrizePayoutPaymentMethod,
    PRIZE_PAYOUT_TICKET_ORIGIN_LABELS,
    PRIZE_PAYOUT_VERIFICATION_LABELS,
    SERIAL_PAYOUT_STATE_LABELS,
    SerialPayoutState,
} from '@/types/prize-payout.type';
import { VietQrBankResponse } from '@/types/refund.type';
import { useGetBanks } from '@/client/hooks/useBankAccount';
import { Station } from '@/admin/features/station/types/station.type';
import { TransferEvidencePreview } from '@/admin/features/refund/components/TransferEvidencePreview';
import { UploadSingleFile } from '@/admin/components/upload/UploadSingleFile';
import { AppToast as toast } from '@/utils/toast.util';
import {
    clearPrizePayoutCreateDraft,
    writePrizePayoutCreateDraft,
} from '../../utils/prizePayoutCreateDraftStorage';
import {
    MoneySummary,
    SectionCard,
    renderHighlightedNumber,
} from '../PrizePayoutCreateSections';

type LookupMode = 'ORDER' | 'TRIPLE';

const SIGNED_CONTRACT_ACCEPT = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/pdf': ['.pdf'],
} as const;

const headerButtonSx = {
    height: 36,
    px: 2,
    borderRadius: '8px',
    fontWeight: 700,
    textTransform: 'none' as const,
    boxShadow: 'none',
};

const prizeStatusLabel = (status: string) => {
    if (status === 'WON') return 'Trúng';
    if (status === 'LOST') return 'Trượt';
    return 'Chờ KQ';
};

const resolveLookupPayoutState = (item: PrizePayoutLookupItem): SerialPayoutState => {
    if (item.payoutState) return item.payoutState;
    if (item.alreadyRequested) return 'PAYOUT_PENDING';
    return 'NONE';
};

const lookupPayoutStatusBadge = (item: PrizePayoutLookupItem) => {
    if (item.prizeStatus !== 'WON') {
        return null;
    }
    const payoutState = resolveLookupPayoutState(item);
    if (payoutState === 'PAID_OUT') {
        return {
            label: SERIAL_PAYOUT_STATE_LABELS.PAID_OUT,
            modifier: 'admin-status-badge--success',
        };
    }
    if (payoutState === 'PAYOUT_PENDING') {
        return {
            label: 'Đã yêu cầu',
            modifier: 'admin-status-badge--pending',
        };
    }
    return null;
};

export const PrizePayoutCreatePage = () => {
    const router = useAdminRouter();
    const createMutation = useCreateStaffPrizePayoutBatch();
    const user = useAuthStore((s) => s.user);
    const draftPersistReadyRef = useRef(false);
    const { data: banksData, isLoading: isLoadingBanks } = useGetBanks();
    const banks = banksData?.data || [];

    // Always open a blank create form when entering this page.
    const [lookupMode, setLookupMode] = useState<LookupMode>('ORDER');
    const [orderCode, setOrderCode] = useState('');
    const [selectedStation, setSelectedStation] = useState<Station | null>(null);
    const [drawDate, setDrawDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [serialNumber, setSerialNumber] = useState('');

    const {
        data: stationsForDrawDate = [],
        isLoading: isLoadingStationsForDate,
        isFetching: isFetchingStationsForDate,
    } = usePrizePayoutLookupStations(drawDate, lookupMode === 'TRIPLE');
    const stations = stationsForDrawDate;

    const [lookupItems, setLookupItems] = useState<PrizePayoutLookupItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [loadingLookup, setLoadingLookup] = useState(false);

    const [selectedBank, setSelectedBank] = useState<VietQrBankResponse | null>(null);
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [accountHolderName, setAccountHolderName] = useState('');
    const [transferEvidenceUrl, setTransferEvidenceUrl] = useState('');
    const [confirmationContractUrl, setConfirmationContractUrl] = useState('');
    const [recipientFullName, setRecipientFullName] = useState('');
    const [recipientIdNumber, setRecipientIdNumber] = useState('');
    const [recipientIdImageUrl, setRecipientIdImageUrl] = useState('');
    const [recipientIdImageBackUrl, setRecipientIdImageBackUrl] = useState('');
    const [uploadingIdFront, setUploadingIdFront] = useState(false);
    const [uploadingIdBack, setUploadingIdBack] = useState(false);
    const [uploadingTransferEvidence, setUploadingTransferEvidence] = useState(false);
    const [uploadingContract, setUploadingContract] = useState(false);
    const [printingContract, setPrintingContract] = useState(false);
    const [manualConfirmed, setManualConfirmed] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PrizePayoutPaymentMethod>('CASH');
    const [cashAmount, setCashAmount] = useState('');
    const [cashHandedConfirmed, setCashHandedConfirmed] = useState(false);

    const selectedItems = useMemo(
        () => lookupItems.filter((item) => selectedIds.includes(item.orderDetailId)),
        [lookupItems, selectedIds]
    );

    const linkedCustomerId = useMemo(() => {
        for (const item of selectedItems) {
            if (item.customerId) return item.customerId;
        }
        return null;
    }, [selectedItems]);

    const { data: userAccountsRes } = usePrizePayoutCustomerBankAccounts(linkedCustomerId);

    /** Offline/in-person: show all saved accounts — any holder name is allowed. */
    const suggestedBankAccounts = userAccountsRes?.data || [];

    const totalGross = selectedItems.reduce((sum, item) => sum + (Number(item.grossAmount) || 0), 0);
    const totalTax = selectedItems.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0);
    const totalCommission = selectedItems.reduce((sum, item) => sum + (Number(item.commissionAmount) || 0), 0);
    const totalNet = selectedItems.reduce((sum, item) => sum + (Number(item.netAmount) || 0), 0);

    // Counter payout now always captures both CCCD sides for audit.
    const needsIdImage = selectedItems.length > 0;
    const needsManualConfirm = selectedItems.some((item) => item.requiresManualOwnershipConfirm);
    const hasMatchProof = selectedItems.every(
        (item) => item.prizeStatus === 'WON' && item.ticketNumbers?.trim() && item.winningNumber?.trim()
    );
    const primary = selectedItems[0];

    const isRecipientIdValid = useMemo(
        () => /^\d{9,12}$/.test(recipientIdNumber.trim()),
        [recipientIdNumber]
    );

    const recipientIdError = useMemo(() => {
        const raw = recipientIdNumber.trim();
        if (!raw) return '';
        if (!/^\d+$/.test(raw)) return 'Số CCCD/CMND chỉ được chứa chữ số';
        if (raw.length < 9 || raw.length > 12) return 'Số CCCD/CMND phải đủ 9 đến 12 chữ số';
        return '';
    }, [recipientIdNumber]);

    const identityDocsReady = useMemo(() => {
        if (!recipientFullName.trim() || !isRecipientIdValid) return false;
        if (needsIdImage && (!recipientIdImageUrl.trim() || !recipientIdImageBackUrl.trim())) return false;
        if (!confirmationContractUrl.trim()) return false;
        if (needsManualConfirm && !manualConfirmed) return false;
        return true;
    }, [
        recipientFullName,
        isRecipientIdValid,
        needsIdImage,
        recipientIdImageUrl,
        recipientIdImageBackUrl,
        confirmationContractUrl,
        needsManualConfirm,
        manualConfirmed,
    ]);

    const canPrintContract = selectedItems.length > 0 && Boolean(recipientFullName.trim()) && isRecipientIdValid;

    const handlePrintContract = async () => {
        if (!canPrintContract) {
            toast.error('Nhập họ tên và số CCCD người nhận trước khi in hợp đồng.');
            return;
        }
        try {
            setPrintingContract(true);
            await prizePayoutAdminApi.openConfirmationContractPreview({
                orderDetailIds: selectedItems.map((item) => item.orderDetailId),
                recipientFullName: recipientFullName.trim(),
                recipientIdNumber: recipientIdNumber.trim(),
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Không mở được hợp đồng PDF');
        } finally {
            setPrintingContract(false);
        }
    };

    const transferReady =
        !!selectedBank
        && !!bankAccountNumber.trim()
        && !!accountHolderName.trim();

    const parsedCashAmount = parseInt(cashAmount.replace(/\D/g, ''), 10) || 0;
    const remainingTransferAmount = Math.max(0, totalNet - parsedCashAmount);
    const isCashExceeds = paymentMethod === 'COMBINED' && parsedCashAmount > totalNet;
    const isPartialZeroCash = paymentMethod === 'COMBINED' && (!cashAmount || parsedCashAmount <= 0);
    const needsBankFields = paymentMethod === 'TRANSFER'
        || (paymentMethod === 'COMBINED' && remainingTransferAmount > 0 && !isCashExceeds && !isPartialZeroCash);

    const applySuggestedBankAccount = (acc: (typeof suggestedBankAccounts)[0]) => {
        setBankAccountNumber(acc.bankAccountNo || '');
        setAccountHolderName((acc.bankAccountName || '').toUpperCase());
        if (acc.bankName) {
            const found = banks.find((b) =>
                (acc.bankBin && b.bin === acc.bankBin)
                || (b.shortName && b.shortName.toLowerCase() === acc.bankName?.toLowerCase())
                || b.name.toLowerCase().includes((acc.bankName || '').toLowerCase())
            );
            if (found) setSelectedBank(found);
        }
        toast.success('Đã điền gợi ý tài khoản ngân hàng');
    };

    useEffect(() => {
        // Entering create: wipe any leftover draft so the form is blank.
        clearPrizePayoutCreateDraft();
        draftPersistReadyRef.current = true;
        return () => {
            // Leaving create (Quay lại / navigate away): discard in-progress draft.
            clearPrizePayoutCreateDraft();
        };
    }, []);

    useEffect(() => {
        if (lookupMode !== 'TRIPLE' || !selectedStation) return;
        const stillEligible = stationsForDrawDate.some((s) => s.id === selectedStation.id);
        if (!stillEligible) {
            setSelectedStation(null);
        }
    }, [lookupMode, selectedStation, stationsForDrawDate]);

    useEffect(() => {
        if (!draftPersistReadyRef.current) return;
        // Keep a short-lived autosave only while staying on this page (refresh mid-flow).
        writePrizePayoutCreateDraft({
            lookupMode,
            orderCode,
            stationId: selectedStation?.id,
            drawDate,
            serialNumber,
            lookupItems,
            selectedIds,
            bankBin: selectedBank?.bin,
            bankAccountNumber,
            accountHolderName,
            transferEvidenceUrl,
            confirmationContractUrl,
            recipientFullName,
            recipientIdNumber,
            recipientIdImageUrl,
            recipientIdImageBackUrl,
            manualConfirmed,
            paymentMethod,
            cashAmount,
            cashHandedConfirmed,
        });
    }, [
        lookupMode,
        orderCode,
        selectedStation,
        drawDate,
        serialNumber,
        lookupItems,
        selectedIds,
        selectedBank,
        bankAccountNumber,
        accountHolderName,
        transferEvidenceUrl,
        confirmationContractUrl,
        recipientFullName,
        recipientIdNumber,
        recipientIdImageUrl,
        recipientIdImageBackUrl,
        manualConfirmed,
        paymentMethod,
        cashAmount,
        cashHandedConfirmed,
    ]);

    const resetFormSideEffects = () => {
        setManualConfirmed(false);
        setRecipientFullName('');
        setRecipientIdNumber('');
        setRecipientIdImageUrl('');
        setRecipientIdImageBackUrl('');
        setConfirmationContractUrl('');
        setSelectedBank(null);
        setBankAccountNumber('');
        setAccountHolderName('');
        setCashAmount('');
        setCashHandedConfirmed(false);
        setTransferEvidenceUrl('');
        setPaymentMethod('CASH');
    };

    const resetEntireForm = () => {
        setLookupMode('ORDER');
        setOrderCode('');
        setSelectedStation(null);
        setDrawDate(dayjs().format('YYYY-MM-DD'));
        setSerialNumber('');
        setLookupItems([]);
        setSelectedIds([]);
        resetFormSideEffects();
        clearPrizePayoutCreateDraft();
    };

    const leaveCreatePage = () => {
        clearPrizePayoutCreateDraft();
        router.push(`/${prefixAdmin}/prize-payouts/list`);
    };

    const handleLookup = async () => {
        setLoadingLookup(true);
        resetFormSideEffects();
        setSelectedIds([]);
        try {
            const res = lookupMode === 'ORDER'
                ? await prizePayoutAdminApi.lookup({ orderCode: orderCode.trim() || undefined })
                : await prizePayoutAdminApi.lookup({
                    stationId: selectedStation?.id,
                    drawDate: drawDate || undefined,
                    serialNumber: serialNumber.trim() || undefined,
                });
            if (res.success && res.data?.items) {
                setLookupItems(res.data.items);
                const autoSelect = res.data.items
                    .filter((i) => {
                        const state = resolveLookupPayoutState(i);
                        return i.prizeStatus === 'WON' && state === 'NONE';
                    })
                    .map((i) => i.orderDetailId);
                if (lookupMode === 'TRIPLE') {
                    setSelectedIds(autoSelect);
                }
                const first = res.data.items.find((i) => i.customerName || i.orderGuestName);
                if (first?.customerName || first?.orderGuestName) {
                    const name = first.customerName || first.orderGuestName || '';
                    setRecipientFullName(name);
                    setAccountHolderName(name.toUpperCase());
                }
            } else {
                toast.error(res.message || 'Không tìm thấy vé');
                setLookupItems([]);
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Không tìm thấy vé trong hệ thống DaiPhat — vé ngoài phạm vi hỗ trợ');
            setLookupItems([]);
        } finally {
            setLoadingLookup(false);
        }
    };

    const toggleSelect = (item: PrizePayoutLookupItem) => {
        const lockedByPayout = item.payoutState === 'PAID_OUT'
            || item.payoutState === 'PAYOUT_PENDING'
            || Boolean(item.alreadyRequested);
        if (item.prizeStatus !== 'WON' || lockedByPayout) return;
        setSelectedIds((prev) =>
            prev.includes(item.orderDetailId)
                ? prev.filter((id) => id !== item.orderDetailId)
                : [...prev, item.orderDetailId]
        );
    };

    const handleCreate = () => {
        if (selectedItems.length === 0) {
            toast.error('Chọn ít nhất một vé trúng thưởng');
            return;
        }
        if (!hasMatchProof) {
            toast.error('Thiếu bằng chứng đối chiếu số trên vé / KQXS');
            return;
        }
        if (needsManualConfirm && !manualConfirmed) {
            toast.error('Cần đánh dấu xác nhận đã đối chiếu giấy tờ + vé gốc');
            return;
        }
        if (!recipientFullName.trim() || !recipientIdNumber.trim()) {
            toast.error('Vui lòng nhập họ tên người nhận và số CCCD');
            return;
        }
        if (!/^\d{9,12}$/.test(recipientIdNumber.trim())) {
            toast.error('Số CCCD/CMND phải có từ 9 đến 12 chữ số');
            return;
        }
        if (needsIdImage && (!recipientIdImageUrl.trim() || !recipientIdImageBackUrl.trim())) {
            toast.error('Cần ảnh CCCD mặt trước và mặt sau');
            return;
        }
        if (!confirmationContractUrl.trim()) {
            toast.error('Cần tải lên hợp đồng xác nhận trả thưởng');
            return;
        }
        if (paymentMethod === 'COMBINED') {
            if (isPartialZeroCash) {
                toast.error('Thanh toán kết hợp cần có phần tiền mặt lớn hơn 0đ');
                return;
            }
            if (isCashExceeds) {
                toast.error('Tiền mặt không được vượt quá tổng thực nhận');
                return;
            }
            if (!cashHandedConfirmed) {
                toast.error(`Cần xác nhận đã đưa ${parsedCashAmount.toLocaleString('vi-VN')}đ tiền mặt cho khách`);
                return;
            }
        }
        if (needsBankFields && !transferReady) {
            toast.error('Nhập đầy đủ thông tin chuyển khoản');
            return;
        }
        if (needsBankFields && !transferEvidenceUrl.trim()) {
            toast.error('Cần tải ảnh biên lai chuyển khoản');
            return;
        }

        const normalizedMethod: PrizePayoutPaymentMethod =
            paymentMethod === 'COMBINED' && remainingTransferAmount === 0 ? 'CASH' : paymentMethod;

        createMutation.mutate(
            {
                items: selectedItems.map((item) => ({ orderDetailId: item.orderDetailId })),
                bankName: needsBankFields
                    ? (selectedBank?.shortName || selectedBank?.name || undefined)
                    : undefined,
                bankAccountNumber: needsBankFields ? bankAccountNumber.trim() : undefined,
                accountHolderName: needsBankFields
                    ? accountHolderName.trim().toUpperCase()
                    : undefined,
                recipientFullName: recipientFullName.trim(),
                recipientIdNumber: recipientIdNumber.trim(),
                recipientIdImageUrl: recipientIdImageUrl.trim() || undefined,
                recipientIdImageBackUrl: recipientIdImageBackUrl.trim() || undefined,
                paymentMethod: normalizedMethod,
                cashAmount: normalizedMethod === 'COMBINED' ? parsedCashAmount : undefined,
                manualOwnershipConfirmed: manualConfirmed || needsManualConfirm,
                transferEvidenceUrl: needsBankFields ? transferEvidenceUrl.trim() : undefined,
                confirmationContractUrl: confirmationContractUrl.trim(),
            },
            {
                onSuccess: (response) => {
                    if (response.success && response.data?.claims?.length) {
                        const firstId = response.data.claims[0].id;
                        clearPrizePayoutCreateDraft();
                        toast.success('Đã hoàn tất trả thưởng tại quầy');
                        router.push(`/${prefixAdmin}/prize-payouts/detail/${firstId}`);
                    }
                },
            }
        );
    };

    const lookupReady = lookupMode === 'ORDER'
        ? !!orderCode.trim()
        : !!(selectedStation && drawDate && serialNumber.trim());

    const anyUploading = uploadingTransferEvidence || uploadingIdFront || uploadingIdBack || uploadingContract;

    const submitDisabled =
        selectedItems.length === 0
        || !hasMatchProof
        || createMutation.isPending
        || !identityDocsReady
        || (paymentMethod === 'COMBINED' && (!cashHandedConfirmed || isPartialZeroCash || isCashExceeds))
        || (needsBankFields && (!transferReady || !transferEvidenceUrl.trim()));

    const submitBlockerHint = (() => {
        if (selectedItems.length === 0) return 'Chọn ít nhất một vé trúng thưởng.';
        if (!hasMatchProof) return 'Thiếu đối chiếu số trên vé / KQXS.';
        if (!identityDocsReady) {
            if (!recipientFullName.trim() || !isRecipientIdValid) return 'Nhập họ tên và CCCD (9–12 số).';
            if (needsIdImage && (!recipientIdImageUrl.trim() || !recipientIdImageBackUrl.trim())) {
                return 'Tải đủ ảnh CCCD mặt trước và mặt sau.';
            }
            if (!confirmationContractUrl.trim()) return 'Tải hợp đồng xác nhận trả thưởng.';
            if (needsManualConfirm && !manualConfirmed) return 'Xác nhận đã đối chiếu giấy tờ & vé gốc.';
            return 'Hoàn tất định danh trước khi thanh toán.';
        }
        if (paymentMethod === 'COMBINED' && (isPartialZeroCash || isCashExceeds || !cashHandedConfirmed)) {
            return 'Xác nhận phần tiền mặt kết hợp.';
        }
        if (needsBankFields && !transferReady) return 'Nhập đầy đủ ngân hàng / STK / chủ TK chính chủ.';
        if (needsBankFields && !transferEvidenceUrl.trim()) return 'Tải ảnh biên lai chuyển khoản.';
        return '';
    })();

    return (
        <Box sx={{ width: '100%', mx: 'auto', pt: 1, pb: 5 }}>
            {/* Header Section */}
            <PageHeader
                title="Tạo trả thưởng tại quầy"
                breadcrumbItems={[
                    { label: 'Bảng điều khiển', to: `/${prefixAdmin}` },
                    { label: 'Trả thưởng', to: `/${prefixAdmin}/prize-payouts/list` },
                    { label: 'Tạo tại quầy' },
                ]}
                action={
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            resetEntireForm();
                            toast.success('Đã làm mới form');
                        }}
                        startIcon={<Icon icon="solar:restart-bold" />}
                        sx={{
                            ...headerButtonSx,
                            color: 'var(--palette-text-primary)',
                            borderColor: 'var(--palette-divider)',
                        }}
                    >
                        Làm mới
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={leaveCreatePage}
                        startIcon={<Icon icon="eva:arrow-back-fill" />}
                        sx={{
                            ...headerButtonSx,
                            color: 'var(--palette-text-primary)',
                            borderColor: 'var(--palette-divider)',
                        }}
                    >
                        Quay lại
                    </Button>
                </Box>
                }
            />
            <Grid container spacing={2.5} alignItems="stretch">
                
                {/* LEFT COLUMN: Tra cứu, Kết quả vé, Định danh & Hợp đồng (50%) */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Stack spacing={2.5} sx={{ width: '100%' }}>
                        {/* Section 1: Search Card */}
                        <SectionCard title="1. Tra cứu vé số" icon="solar:magnifer-bold-duotone">
                            <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                                Chỉ hỗ trợ vé đã bán qua hệ thống. Tra theo mã đơn (nhiều vé) hoặc theo ngày → đài → serial.
                            </Alert>

                            <RadioGroup
                                row
                                value={lookupMode}
                                onChange={(e) => {
                                    setLookupMode(e.target.value as LookupMode);
                                    setLookupItems([]);
                                    setSelectedIds([]);
                                }}
                                sx={{ mb: 2 }}
                            >
                                <FormControlLabel value="ORDER" control={<Radio size="small" />} label="Theo mã đơn hàng" />
                                <FormControlLabel value="TRIPLE" control={<Radio size="small" />} label="Theo ngày / đài / serial" />
                            </RadioGroup>

                            {lookupMode === 'ORDER' ? (
                                <TextField
                                    label="Mã đơn hàng *"
                                    placeholder="Nhập mã đơn hàng..."
                                    value={orderCode}
                                    onChange={(e) => setOrderCode(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            void handleLookup();
                                        }
                                    }}
                                    fullWidth
                                    size="small"
                                    sx={{ mb: 2 }}
                                />
                            ) : (
                                <Stack spacing={2} sx={{ mb: 2 }}>
                                    <AdminDatePicker
                                        label="Ngày mở thưởng *"
                                        value={drawDate}
                                        onChange={(value) => {
                                            setDrawDate(value);
                                            setSelectedStation(null);
                                            setLookupItems([]);
                                            setSelectedIds([]);
                                        }}
                                    />
                                    <Autocomplete
                                        options={stations}
                                        value={selectedStation}
                                        onChange={(_, value) => setSelectedStation(value)}
                                        getOptionLabel={(o) => o.name}
                                        isOptionEqualToValue={(a, b) => a.id === b.id}
                                        loading={isLoadingStationsForDate || isFetchingStationsForDate}
                                        disabled={!drawDate || isLoadingStationsForDate}
                                        noOptionsText={
                                            !drawDate
                                                ? 'Chọn ngày mở thưởng trước'
                                                : isLoadingStationsForDate || isFetchingStationsForDate
                                                    ? 'Đang tải đài…'
                                                    : 'Không có đài mở thưởng ngày này'
                                        }
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Đài phát hành *"
                                                size="small"
                                                helperText={
                                                    drawDate && !isLoadingStationsForDate && stations.length === 0
                                                        ? 'Không có đài nào mở thưởng trong ngày này'
                                                        : 'Chỉ hiện đài có lịch mở thưởng đúng ngày đã chọn'
                                                }
                                            />
                                        )}
                                    />
                                    <TextField
                                        label="Số serial trên vé *"
                                        value={serialNumber}
                                        onChange={(e) => setSerialNumber(e.target.value)}
                                        fullWidth
                                        size="small"
                                    />
                                </Stack>
                            )}

                            <Button
                                variant="contained"
                                onClick={handleLookup}
                                disabled={loadingLookup || !lookupReady}
                                startIcon={loadingLookup ? <CircularProgress size={16} color="inherit" /> : <Icon icon="solar:magnifer-bold-duotone" />}
                                sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '8px', boxShadow: 'none' }}
                            >
                                {loadingLookup ? 'Đang tra cứu…' : 'Tra cứu vé số'}
                            </Button>
                        </SectionCard>

                        {/* Section 2: Ticket Selection & Match Proof */}
                        {lookupItems.length > 0 && (
                            <SectionCard title="2. Chọn vé trúng & Đối chiếu KQXS" icon="solar:ticket-bold-duotone">
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow
                                                sx={{
                                                    bgcolor: 'var(--palette-background-neutral)',
                                                    '& .MuiTableCell-root': { fontWeight: 600 },
                                                }}
                                            >
                                                <TableCell padding="checkbox" />
                                                <TableCell>Serial</TableCell>
                                                <TableCell>Số vé</TableCell>
                                                <TableCell>KQ</TableCell>
                                                <TableCell>Giải</TableCell>
                                                <TableCell>Trạng thái</TableCell>
                                                <TableCell align="right">Trúng</TableCell>
                                                <TableCell align="right">HH</TableCell>
                                                <TableCell align="right">Thuế</TableCell>
                                                <TableCell align="right">Thực nhận</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {lookupItems.map((item) => {
                                                const payoutState = resolveLookupPayoutState(item);
                                                const lockedByPayout = payoutState === 'PAYOUT_PENDING' || payoutState === 'PAID_OUT';
                                                const selectable = item.prizeStatus === 'WON' && !lockedByPayout;
                                                const checked = selectedIds.includes(item.orderDetailId);
                                                const payoutBadge = lookupPayoutStatusBadge(item);
                                                const isWon = item.prizeStatus === 'WON';
                                                return (
                                                    <TableRow
                                                        key={item.orderDetailId}
                                                        hover={selectable}
                                                        selected={checked}
                                                        onClick={() => toggleSelect(item)}
                                                        sx={{
                                                            cursor: selectable ? 'pointer' : 'default',
                                                            // Keep WON+paid rows readable so staff don't mistake them for "no win".
                                                            opacity: isWon || selectable ? 1 : 0.55,
                                                            bgcolor: isWon && payoutState === 'PAID_OUT'
                                                                ? 'rgba(34, 197, 94, 0.06)'
                                                                : isWon && payoutState === 'PAYOUT_PENDING'
                                                                    ? 'rgba(245, 158, 11, 0.06)'
                                                                    : undefined,
                                                            '& td': { borderBottomStyle: 'dashed' },
                                                        }}
                                                    >
                                                        <TableCell padding="checkbox">
                                                            <Checkbox
                                                                checked={checked}
                                                                disabled={!selectable}
                                                                onChange={() => toggleSelect(item)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                                {item.serialNumber || '—'}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {item.stationName || '—'}
                                                                {item.drawDate ? ` · ${dayjs(item.drawDate).format('DD/MM/YYYY')}` : ''}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                                            {renderHighlightedNumber(item.ticketNumbers, item.matchFrom, item.matchDigits, 'ticket')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                                                {prizeStatusLabel(item.prizeStatus)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.prizeDisplayName ? (
                                                                <AdminStatusBadge
                                                                    label={item.prizeDisplayName}
                                                                    modifier={isWon ? 'admin-status-badge--pending' : 'admin-status-badge--draft'}
                                                                    className="admin-status-badge--compact"
                                                                />
                                                            ) : (
                                                                <Typography variant="caption" color="text.disabled">—</Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {payoutBadge ? (
                                                                <AdminStatusBadge
                                                                    label={payoutBadge.label}
                                                                    modifier={payoutBadge.modifier}
                                                                    className="admin-status-badge--compact"
                                                                />
                                                            ) : (
                                                                <Typography variant="caption" color="text.disabled">—</Typography>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                            {formatPrizePayoutCurrency(item.grossAmount)}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--palette-warning-dark)', whiteSpace: 'nowrap' }}>
                                                            {formatPrizePayoutCurrency(item.commissionAmount)}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                                                            {formatPrizePayoutCurrency(item.taxAmount)}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--palette-error-main)', whiteSpace: 'nowrap' }}>
                                                            {formatPrizePayoutCurrency(item.netAmount)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {selectedItems.length > 0 && (
                                    <Box
                                        sx={{
                                            mt: 2,
                                            p: 2,
                                            borderRadius: '12px',
                                            bgcolor: 'var(--palette-background-neutral)',
                                            border: '1px solid var(--palette-divider)',
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                                            Đối chiếu số trúng ({selectedItems.length} vé)
                                        </Typography>
                                        {selectedItems.map((item) => (
                                            <Grid container spacing={1} key={item.orderDetailId} sx={{ mb: 1 }}>
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Vé {item.serialNumber}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                                        {renderHighlightedNumber(item.ticketNumbers, item.matchFrom, item.matchDigits, 'ticket')}
                                                    </Typography>
                                                </Grid>
                                                <Grid size={{ xs: 12, sm: 6 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        KQXS
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                                        {renderHighlightedNumber(item.winningNumber, item.matchFrom, item.matchDigits, 'winning')}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        ))}
                                    </Box>
                                )}

                                {primary && (
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                                        <Chip
                                            size="small"
                                            label={PRIZE_PAYOUT_TICKET_ORIGIN_LABELS[primary.ticketOrigin]}
                                            sx={getMetricChipSx('info')}
                                        />
                                        <AdminStatusBadge
                                            label={PRIZE_PAYOUT_VERIFICATION_LABELS[primary.ownershipVerificationLevel]}
                                            modifier="admin-status-badge--pending"
                                            className="admin-status-badge--compact"
                                        />
                                    </Stack>
                                )}
                            </SectionCard>
                        )}

                        {/* Section 3: Identity & CCCD Images */}
                        {selectedItems.length > 0 && (
                            <SectionCard title="3. Định danh người nhận thưởng" icon="solar:user-id-bold-duotone">
                                <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                                    Cần họ tên, CCCD và ảnh mặt trước + mặt sau.
                                </Alert>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Họ tên người nhận *"
                                        value={recipientFullName}
                                        onChange={(e) => setRecipientFullName(e.target.value)}
                                        fullWidth
                                        size="small"
                                    />
                                    <TextField
                                        label="Số CCCD / CMND *"
                                        value={recipientIdNumber}
                                        onChange={(e) => setRecipientIdNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                        fullWidth
                                        size="small"
                                        error={!!recipientIdError}
                                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 12 }}
                                        helperText={recipientIdError || 'Chỉ nhập số (9–12 chữ số)'}
                                    />

                                    <Stack spacing={1.5}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                            Ảnh CCCD * (mặt trước và mặt sau)
                                        </Typography>
                                        <Grid container spacing={1.5}>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <UploadSingleFile
                                                    value={recipientIdImageUrl}
                                                    onChange={setRecipientIdImageUrl}
                                                    customUpload={prizePayoutAdminApi.uploadRecipientIdImage}
                                                    autoUpload
                                                    onUploadingChange={setUploadingIdFront}
                                                    disabled={uploadingIdFront || createMutation.isPending}
                                                    label="CCCD mặt trước"
                                                    required
                                                    compact
                                                />
                                                {recipientIdImageUrl && (
                                                    <Box sx={{ mt: 1, maxHeight: 150, overflow: 'hidden', borderRadius: 1 }}>
                                                        <TransferEvidencePreview imageUrl={recipientIdImageUrl} title="Mặt trước" showCaption />
                                                    </Box>
                                                )}
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6 }}>
                                                <UploadSingleFile
                                                    value={recipientIdImageBackUrl}
                                                    onChange={setRecipientIdImageBackUrl}
                                                    customUpload={prizePayoutAdminApi.uploadRecipientIdImage}
                                                    autoUpload
                                                    onUploadingChange={setUploadingIdBack}
                                                    disabled={uploadingIdBack || createMutation.isPending}
                                                    label="CCCD mặt sau"
                                                    required
                                                    compact
                                                />
                                                {recipientIdImageBackUrl && (
                                                    <Box sx={{ mt: 1, maxHeight: 150, overflow: 'hidden', borderRadius: 1 }}>
                                                        <TransferEvidencePreview imageUrl={recipientIdImageBackUrl} title="Mặt sau" showCaption />
                                                    </Box>
                                                )}
                                            </Grid>
                                        </Grid>
                                    </Stack>

                                    {needsManualConfirm && (
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={manualConfirmed}
                                                    onChange={(e) => setManualConfirmed(e.target.checked)}
                                                    color="warning"
                                                />
                                            }
                                            label={
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    Đã đối chiếu giấy tờ tùy thân & vé gốc tại quầy
                                                </Typography>
                                            }
                                        />
                                    )}
                                </Stack>
                            </SectionCard>
                        )}

                        {/* Section 4: Hợp đồng xác nhận trả thưởng (Placed in Left Column to perfectly equalize height) */}
                        {selectedItems.length > 0 && (
                            <SectionCard title="4. Hợp đồng xác nhận trả thưởng" icon="solar:document-bold-duotone">
                                <Stack spacing={1.5}>
                                    <Alert severity="info" sx={{ borderRadius: '10px' }}>
                                        In hợp đồng từ hệ thống (cùng thông tin pháp lý Bên A với hợp đồng cộng tác bán vé số),
                                        đưa khách ký, rồi tải bản đã ký (PDF/ảnh).
                                    </Alert>
                                    <Button
                                        variant="outlined"
                                        startIcon={
                                            printingContract
                                                ? <CircularProgress size={16} color="inherit" />
                                                : <Icon icon="solar:printer-bold-duotone" />
                                        }
                                        disabled={!canPrintContract || printingContract || createMutation.isPending}
                                        onClick={() => void handlePrintContract()}
                                        sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', alignSelf: 'flex-start' }}
                                    >
                                        {printingContract ? 'Đang tạo hợp đồng...' : 'Xem / In hợp đồng'}
                                    </Button>
                                    <UploadSingleFile
                                        value={confirmationContractUrl}
                                        onChange={setConfirmationContractUrl}
                                        customUpload={prizePayoutAdminApi.uploadConfirmationContract}
                                        autoUpload
                                        onUploadingChange={setUploadingContract}
                                        disabled={uploadingContract || createMutation.isPending}
                                        label="Bản hợp đồng đã ký"
                                        required
                                        compact
                                        accept={SIGNED_CONTRACT_ACCEPT}
                                    />
                                    {confirmationContractUrl && (
                                        <Box sx={{ mt: 0.5, maxHeight: 160, overflow: 'hidden', borderRadius: 1 }}>
                                            <TransferEvidencePreview imageUrl={confirmationContractUrl} title="Hợp đồng" showCaption />
                                        </Box>
                                    )}
                                </Stack>
                            </SectionCard>
                        )}
                    </Stack>
                </Grid>

                {/* RIGHT COLUMN: Tổng tiền & Thanh toán (50%) */}
                <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Stack spacing={2.5} sx={{ width: '100%' }}>
                        {/* Money Summary Card */}
                        {selectedItems.length > 0 ? (
                            <MoneySummary
                                gross={totalGross}
                                commission={totalCommission}
                                tax={totalTax}
                                net={totalNet}
                                ticketCount={selectedItems.length}
                            />
                        ) : (
                            <SectionCard title="Tổng tiền thưởng" icon="solar:wallet-money-bold-duotone">
                                <Box sx={{ py: 4, textCenter: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                    <Box className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-1">
                                        <Icon icon="solar:wallet-money-bold-duotone" width={28} />
                                    </Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                        Chưa chọn vé số trúng thưởng
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 300, textAlign: 'center' }}>
                                        Vui lòng tra cứu và tích chọn vé trúng thưởng ở cột bên trái để xem bảng phân bổ số tiền.
                                    </Typography>
                                </Box>
                            </SectionCard>
                        )}

                        {/* Section 5: Payment & Finalize */}
                        {selectedItems.length > 0 && (
                            <SectionCard title="5. Thanh toán & Hoàn tất" icon="solar:wallet-money-bold-duotone">
                                <Stack spacing={2}>
                                    {!identityDocsReady && (
                                        <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                                            Hoàn tất định danh & hợp đồng ở mục bên trái để mở hình thức thanh toán.
                                        </Alert>
                                    )}

                                    <FormControl disabled={!identityDocsReady}>
                                        <RadioGroup
                                            row
                                            value={paymentMethod}
                                            onChange={(e) => {
                                                const next = e.target.value as PrizePayoutPaymentMethod;
                                                setPaymentMethod(next);
                                                setCashHandedConfirmed(false);
                                                if (next !== 'COMBINED') {
                                                    setCashAmount('');
                                                }
                                                if (next === 'CASH') {
                                                    setTransferEvidenceUrl('');
                                                }
                                            }}
                                        >
                                            <FormControlLabel value="CASH" control={<Radio size="small" />} label="Tiền mặt" />
                                            <FormControlLabel value="TRANSFER" control={<Radio size="small" />} label="Chuyển khoản" />
                                            <FormControlLabel value="COMBINED" control={<Radio size="small" />} label="Kết hợp" />
                                        </RadioGroup>
                                    </FormControl>

                                    {identityDocsReady && paymentMethod === 'COMBINED' && (
                                        <Box
                                            sx={{
                                                p: 2,
                                                bgcolor: 'var(--palette-background-neutral)',
                                                borderRadius: '12px',
                                                border: '1px solid var(--palette-divider)',
                                            }}
                                        >
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Chi tiền mặt tại quầy"
                                                placeholder="VD: 10000000"
                                                value={cashAmount}
                                                onChange={(e) => {
                                                    const rawValue = e.target.value.replace(/\D/g, '');
                                                    setCashHandedConfirmed(false);
                                                    if (!rawValue) {
                                                        setCashAmount('');
                                                    } else {
                                                        setCashAmount(parseInt(rawValue, 10).toLocaleString('vi-VN'));
                                                    }
                                                }}
                                                InputProps={{
                                                    endAdornment: <InputAdornment position="end">đ</InputAdornment>,
                                                }}
                                                sx={{ mb: 1.5, bgcolor: 'background.paper' }}
                                                error={isCashExceeds || isPartialZeroCash}
                                                helperText={
                                                    isCashExceeds
                                                        ? 'Tiền mặt không được vượt quá tổng thực nhận'
                                                        : (isPartialZeroCash
                                                            ? 'Thanh toán kết hợp cần có phần tiền mặt lớn hơn 0đ'
                                                            : '')
                                                }
                                            />
                                            {!cashHandedConfirmed ? (
                                                <Button
                                                    variant="contained"
                                                    color="warning"
                                                    fullWidth
                                                    disabled={isPartialZeroCash || isCashExceeds}
                                                    onClick={() => setCashHandedConfirmed(true)}
                                                    sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '8px', boxShadow: 'none' }}
                                                >
                                                    {`Xác nhận đưa ${parsedCashAmount.toLocaleString('vi-VN')}đ tiền mặt cho khách`}
                                                </Button>
                                            ) : (
                                                <Alert
                                                    severity="success"
                                                    sx={{ borderRadius: '10px' }}
                                                    action={
                                                        <Button
                                                            color="inherit"
                                                            size="small"
                                                            onClick={() => setCashHandedConfirmed(false)}
                                                            sx={{ fontWeight: 700, textTransform: 'none' }}
                                                        >
                                                            Đổi số tiền
                                                        </Button>
                                                    }
                                                >
                                                    Đã xác nhận đưa {parsedCashAmount.toLocaleString('vi-VN')}đ tiền mặt cho khách.
                                                </Alert>
                                            )}
                                        </Box>
                                    )}

                                    {needsBankFields && (
                                        <Stack
                                            spacing={2}
                                            sx={{
                                                p: 2,
                                                borderRadius: '12px',
                                                bgcolor: 'var(--palette-background-neutral)',
                                                border: '1px solid var(--palette-divider)',
                                            }}
                                        >
                                            {paymentMethod === 'COMBINED' && (
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                                        Cần chuyển khoản thêm
                                                    </Typography>
                                                    <Typography variant="subtitle1" sx={{ color: 'var(--palette-error-main)', fontWeight: 700 }}>
                                                        {remainingTransferAmount.toLocaleString('vi-VN')}đ
                                                    </Typography>
                                                </Box>
                                            )}
                                            <Typography variant="caption" color="text.secondary">
                                                Trả thưởng tại quầy — có thể nhập STK / chủ TK bất kỳ (không bắt buộc khớp tên KH).
                                                {linkedCustomerId ? ' Gợi ý bên dưới là TK đã lưu của KH (ấn để điền).' : ''}
                                            </Typography>

                                            {linkedCustomerId && suggestedBankAccounts.length > 0 && (
                                                <Box>
                                                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 1, color: 'text.secondary' }}>
                                                        Gợi ý TK đã lưu — ấn để điền
                                                    </Typography>
                                                    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                                                        {suggestedBankAccounts.map((account) => (
                                                            <Chip
                                                                key={account.id}
                                                                clickable
                                                                size="small"
                                                                color={account.isDefault ? 'primary' : 'default'}
                                                                variant={account.isDefault ? 'filled' : 'outlined'}
                                                                onClick={() => applySuggestedBankAccount(account)}
                                                                icon={<Icon icon="mdi:bank" width={14} />}
                                                                label={`${account.isDefault ? 'Mặc định · ' : ''}${account.bankName || 'NH'} · ****${(account.bankAccountNo || '').slice(-4)} · ${account.bankAccountName || '—'}`}
                                                                sx={{
                                                                    height: 'auto',
                                                                    py: 0.5,
                                                                    fontWeight: 600,
                                                                    '& .MuiChip-label': { whiteSpace: 'normal' },
                                                                }}
                                                            />
                                                        ))}
                                                    </Stack>
                                                </Box>
                                            )}

                                            <Autocomplete
                                                options={banks}
                                                loading={isLoadingBanks}
                                                value={selectedBank}
                                                onChange={(_, value) => setSelectedBank(value)}
                                                getOptionLabel={(option) => option.shortName ? `${option.shortName} — ${option.name}` : option.name}
                                                isOptionEqualToValue={(a, b) => a.bin === b.bin}
                                                renderInput={(params) => <TextField {...params} label="Ngân hàng *" size="small" />}
                                            />
                                            <TextField
                                                label="Số tài khoản *"
                                                value={bankAccountNumber}
                                                onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 20))}
                                                fullWidth
                                                size="small"
                                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 20 }}
                                                helperText="Chỉ nhập số"
                                            />
                                            <TextField
                                                label="Chủ tài khoản *"
                                                value={accountHolderName}
                                                onChange={(e) => setAccountHolderName(e.target.value.toUpperCase())}
                                                fullWidth
                                                size="small"
                                            />
                                            <UploadSingleFile
                                                value={transferEvidenceUrl}
                                                onChange={setTransferEvidenceUrl}
                                                customUpload={prizePayoutAdminApi.uploadTransferEvidence}
                                                autoUpload
                                                onUploadingChange={setUploadingTransferEvidence}
                                                disabled={uploadingTransferEvidence || createMutation.isPending}
                                                label="Ảnh biên lai chuyển khoản"
                                                required
                                                compact
                                            />
                                            {transferEvidenceUrl && (
                                                <Box sx={{ maxHeight: 160, overflow: 'hidden', borderRadius: 1 }}>
                                                    <TransferEvidencePreview imageUrl={transferEvidenceUrl} />
                                                </Box>
                                            )}
                                        </Stack>
                                    )}

                                    <Divider sx={{ borderStyle: 'dashed' }} />
                                    <Typography variant="caption" color="text.secondary">
                                        Người thực hiện: <strong>{user?.fullName || user?.username || '—'}</strong>
                                    </Typography>

                                    {submitDisabled && submitBlockerHint && (
                                        <Typography variant="caption" sx={{ color: 'var(--palette-warning-dark)', fontWeight: 600 }}>
                                            {submitBlockerHint}
                                        </Typography>
                                    )}

                                    <Button
                                        variant="contained"
                                        color="success"
                                        fullWidth
                                        onClick={handleCreate}
                                        disabled={submitDisabled || anyUploading}
                                        startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <Icon icon="solar:check-read-bold-duotone" />}
                                        sx={{ height: 40, fontWeight: 700, textTransform: 'none', borderRadius: '8px', boxShadow: 'none' }}
                                    >
                                        {createMutation.isPending ? 'Đang hoàn tất…' : 'Hoàn tất trả thưởng tại quầy'}
                                    </Button>
                                </Stack>
                            </SectionCard>
                        )}
                    </Stack>
                </Grid>

            </Grid>
        </Box>
    );
};
