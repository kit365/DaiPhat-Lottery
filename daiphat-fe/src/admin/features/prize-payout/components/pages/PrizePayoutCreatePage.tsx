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
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { Icon } from '@/admin/components/ui/AdminIcon';
import dayjs from 'dayjs';
import { useCreateStaffPrizePayoutBatch, usePrizePayoutCustomerBankAccounts, usePrizePayoutLookupStations } from '@/admin/features/prize-payout/hooks/usePrizePayoutManagement';
import { useSearchPayoutCustomers } from '@/admin/features/prize-payout/hooks/useSearchPayoutCustomers';
import { PageHeader } from '@/admin/components/ui/PageHeader';
import { AdminDatePicker } from '@/admin/components/ui/AdminDatePicker';
import { AdminStatusBadge } from '@/admin/components/ui/AdminStatusBadge';
import { getMetricChipSx } from '@/admin/utils/badge';
import { prefixAdmin } from '@/admin/constants/routes';
import { prizePayoutAdminApi } from "@/admin/features/prize-payout/services/prizePayoutService";
import { useAuthStore } from '@/stores/useAuthStore';
import {
    buildStationOfficeRedemptionMessage,
    formatPrizePayoutCurrency,
    PrizePayoutCustomerSuggestion,
    PrizePayoutLookupItem,
    PrizePayoutPaymentMethod,
    PrizeRedemptionZone,
    PRIZE_PAYOUT_PAYMENT_METHOD_LABELS,
    PRIZE_PAYOUT_TICKET_ORIGIN_LABELS,
    PRIZE_PAYOUT_VERIFICATION_LABELS,
    SERIAL_PAYOUT_STATE_LABELS,
    SerialPayoutState,
} from '@/types/prize-payout.type';
import { VietQrBankResponse } from '@/types/refund.type';
import { useGetBanks } from '@/client/hooks/useBankAccount';
import {
    BANK_ACCOUNT_NO_INVALID_MESSAGE,
    BANK_ACCOUNT_NO_MAX_LENGTH,
    sanitizeBankAccountNoInput,
    validateBankAccountNo,
} from '@/shared/bank-account/bankAccountNoValidation';
import { Station } from '@/admin/features/station/types/station.type';
import { TransferEvidencePreview } from '@/admin/features/refund/components/TransferEvidencePreview';
import { UploadSingleFile } from '@/admin/components/upload/UploadSingleFile';
import { AppToast as toast } from '@/utils/toast.util';
import { AdminConfirmDialog } from '@/admin/components/ui/AdminConfirmDialog';
import {
    ContractDocumentViewerDialog,
    mapContractPdfErrorMessage,
    SignedContractSaveDialog,
    SignedContractUploadDialog,
} from '@/admin/shared/contracts';
import {
    clearPrizePayoutCreateDraft,
    writePrizePayoutCreateDraft,
} from '../../utils/prizePayoutCreateDraftStorage';
import {
    CASH_DENOMINATION_INVALID_MESSAGE,
    isValidCashDenominationAmount,
} from '../../utils/cashDenomination';
import {
    MoneySummary,
    SectionCard,
    renderHighlightedNumber,
} from '../PrizePayoutCreateSections';

type LookupMode = 'PHONE' | 'EMAIL';

const SIGNED_CONTRACT_ACCEPT = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/pdf': ['.pdf'],
} as const;

const SIGNED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const SIGNED_DOC_MAX_SIZE = 10 * 1024 * 1024;

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

const getUrgencyBadge = (item: PrizePayoutLookupItem) => {
    if (item.prizeStatus !== 'WON') {
        return null;
    }
    const state = resolveLookupPayoutState(item);
    if (state === 'PAID_OUT' || state === 'PAYOUT_PENDING') {
        return null;
    }
    if (item.redemptionZone === 'PAST_CUSTOMER_URGENT') {
        return {
            label: item.daysRemainingToIssuer != null
                ? `Hết hạn online - Còn ${item.daysRemainingToIssuer} ngày`
                : 'Hết hạn online - KHẨN',
            color: 'error' as const,
        };
    }
    if (item.daysRemainingToIssuer != null && item.daysRemainingToIssuer <= 3) {
        return {
            label: `Còn ${item.daysRemainingToIssuer} ngày - KHẨN`,
            color: 'error' as const,
        };
    }
    if (item.daysRemainingToIssuer != null && item.daysRemainingToIssuer <= 7) {
        return {
            label: `Còn ${item.daysRemainingToIssuer} ngày`,
            color: 'warning' as const,
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
    const [lookupMode, setLookupMode] = useState<LookupMode>('PHONE');
    const [searchInput, setSearchInput] = useState('');
    const [searchMode, setSearchMode] = useState<'PHONE' | 'EMAIL'>('PHONE');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedSuggestion, setSelectedSuggestion] = useState<PrizePayoutCustomerSuggestion | null>(null);

    // Debounce search input for autocomplete
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchInput), 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // Customer suggestions for autocomplete
    const { data: suggestions = [], isLoading: isLoadingSuggestions } = useSearchPayoutCustomers(
        { q: debouncedSearch, limit: 20 },
        { enabled: debouncedSearch.length >= 2 }
    );

    const [lookupItems, setLookupItems] = useState<PrizePayoutLookupItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [loadingLookup, setLoadingLookup] = useState(false);

    const [selectedBank, setSelectedBank] = useState<VietQrBankResponse | null>(null);
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountNumberError, setBankAccountNumberError] = useState<string | null>(null);
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
    const [previewSignedFile, setPreviewSignedFile] = useState<File | null>(null);
    const [pendingSignedFile, setPendingSignedFile] = useState<File | null>(null);
    const [saveSignedConfirmOpen, setSaveSignedConfirmOpen] = useState(false);
    const [viewSignedOpen, setViewSignedOpen] = useState(false);
    const [manualConfirmed, setManualConfirmed] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PrizePayoutPaymentMethod>('CASH');
    const [cashAmount, setCashAmount] = useState('');
    const [cashHandedConfirmed, setCashHandedConfirmed] = useState(false);
    const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
    const [lateRedemptionAck, setLateRedemptionAck] = useState(false);

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
            toast.error(
                mapContractPdfErrorMessage(
                    error instanceof Error ? error.message : undefined,
                ),
            );
        } finally {
            setPrintingContract(false);
        }
    };

    const handlePendingSignedFileChange = (value: File | string | null) => {
        if (!value || typeof value === 'string') {
            setPreviewSignedFile(null);
            if (!value) {
                setPendingSignedFile(null);
                setConfirmationContractUrl('');
            }
            return;
        }

        if (!SIGNED_DOC_TYPES.includes(value.type)) {
            toast.error('Chỉ chấp nhận PDF, JPG hoặc PNG.');
            setPreviewSignedFile(null);
            return;
        }
        if (value.size > SIGNED_DOC_MAX_SIZE) {
            toast.error('File quá lớn. Tối đa 10MB.');
            setPreviewSignedFile(null);
            return;
        }

        setPreviewSignedFile(value);
    };

    const handleStageSignedFile = (file: File) => {
        setPendingSignedFile(file);
        setPreviewSignedFile(null);
        setConfirmationContractUrl('');
    };

    const handleConfirmSignedUpload = async (file: File) => {
        try {
            setUploadingContract(true);
            const url = await prizePayoutAdminApi.uploadConfirmationContract(file);
            setConfirmationContractUrl(url);
            setPendingSignedFile(null);
            setSaveSignedConfirmOpen(false);
            toast.success('Đã tải bản hợp đồng đã ký.');
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Upload bản ký thất bại',
            );
        } finally {
            setUploadingContract(false);
        }
    };

    const transferReady =
        !!selectedBank
        && !!bankAccountNumber.trim()
        && !validateBankAccountNo(bankAccountNumber)
        && !!accountHolderName.trim();

    const parsedCashAmount = parseInt(cashAmount.replace(/\D/g, ''), 10) || 0;
    const remainingTransferAmount = Math.max(0, totalNet - parsedCashAmount);
    const isCashExceeds = paymentMethod === 'COMBINED' && parsedCashAmount > totalNet;
    const isPartialZeroCash = paymentMethod === 'COMBINED' && (!cashAmount || parsedCashAmount <= 0);
    const isCashDenominationInvalid = paymentMethod === 'COMBINED'
        && !isPartialZeroCash
        && !isCashExceeds
        && !isValidCashDenominationAmount(parsedCashAmount);
    const needsBankFields = paymentMethod === 'TRANSFER'
        || (paymentMethod === 'COMBINED' && remainingTransferAmount > 0 && !isCashExceeds && !isPartialZeroCash);

    const selectedRedemptionZone = useMemo((): PrizeRedemptionZone | null => {
        if (selectedItems.length === 0) return null;
        const zones = selectedItems.map((item) => item.redemptionZone).filter(Boolean) as PrizeRedemptionZone[];
        if (zones.includes('PAST_ISSUER_LOCKED')) return 'PAST_ISSUER_LOCKED';
        if (zones.includes('PAST_CUSTOMER_URGENT')) return 'PAST_CUSTOMER_URGENT';
        if (zones.includes('WITHIN_CUSTOMER') || zones.length === 0) return 'WITHIN_CUSTOMER';
        return null;
    }, [selectedItems]);

    const hasLockedRedemption = selectedRedemptionZone === 'PAST_ISSUER_LOCKED';
    const hasUrgentRedemption = selectedRedemptionZone === 'PAST_CUSTOMER_URGENT';

    const applySuggestedBankAccount = (acc: (typeof suggestedBankAccounts)[0]) => {
        setBankAccountNumber(acc.bankAccountNo || '');
        setBankAccountNumberError(null);
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
        if (!draftPersistReadyRef.current) return;
        // Keep a short-lived autosave only while staying on this page (refresh mid-flow).
        writePrizePayoutCreateDraft({
            lookupMode,
            searchInput,
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
        searchInput,
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
        setLookupMode('PHONE');
        setSearchInput('');
        setSelectedSuggestion(null);
        setDebouncedSearch('');
        setLookupItems([]);
        setSelectedIds([]);
        resetFormSideEffects();
        clearPrizePayoutCreateDraft();
    };

    const leaveCreatePage = () => {
        clearPrizePayoutCreateDraft();
        router.push(`/${prefixAdmin}/prize-payouts/list`);
    };

    const applyCustomerNameFromLookup = (items: PrizePayoutLookupItem[]) => {
        const first = items.find((i) => i.customerName || i.orderGuestName);
        if (first?.customerName || first?.orderGuestName) {
            const name = first.customerName || first.orderGuestName || '';
            setRecipientFullName(name);
            setAccountHolderName(name.toUpperCase());
        }
        // If no customer name found, do NOT touch recipientFullName —
        // staff may have already typed it manually for walk-in customers.
    };

    const handleLookup = async () => {
        // Use selected suggestion if available, otherwise use searchInput
        const lookupValue = selectedSuggestion
            ? (searchMode === 'PHONE' ? selectedSuggestion.phone : selectedSuggestion.email)
            : searchInput.trim();

        if (!lookupValue) {
            toast.error(searchMode === 'PHONE' ? 'Nhập số điện thoại để tra cứu' : 'Nhập email để tra cứu');
            return;
        }

        setLoadingLookup(true);
        resetFormSideEffects();
        setSelectedIds([]);
        try {
            const res = searchMode === 'PHONE'
                ? await prizePayoutAdminApi.lookup({ phone: lookupValue })
                : await prizePayoutAdminApi.lookup({ email: lookupValue });
            if (res.success && res.data?.items) {
                setLookupItems(res.data.items);
                const autoSelect = res.data.items
                    .filter((i) => {
                        const state = resolveLookupPayoutState(i);
                        return i.prizeStatus === 'WON'
                            && state === 'NONE'
                            && !i.requiresStationOfficeRedemption;
                    })
                    .map((i) => i.orderDetailId);
                setSelectedIds(autoSelect);
                applyCustomerNameFromLookup(res.data.items);
                // Keep search input visible after successful lookup
                setSelectedSuggestion(null);
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
        if (item.prizeStatus !== 'WON' || lockedByPayout || item.requiresStationOfficeRedemption) return;
        setSelectedIds((prev) =>
            prev.includes(item.orderDetailId)
                ? prev.filter((id) => id !== item.orderDetailId)
                : [...prev, item.orderDetailId]
        );
    };

    const selectableItems = useMemo(
        () => lookupItems.filter((item) => {
            const payoutState = resolveLookupPayoutState(item);
            const lockedByPayout = payoutState === 'PAYOUT_PENDING' || payoutState === 'PAID_OUT';
            return item.prizeStatus === 'WON' && !lockedByPayout && !item.requiresStationOfficeRedemption;
        }),
        [lookupItems]
    );

    const hasStationOfficeOnlySelection = selectedItems.some((item) => item.requiresStationOfficeRedemption);

    const allSelected = selectableItems.length > 0 && selectableItems.every((item) => selectedIds.includes(item.orderDetailId));

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(selectableItems.map((item) => item.orderDetailId));
        }
    };

    const validateCreateInputs = (): boolean => {
        if (selectedItems.length === 0) {
            toast.error('Chọn ít nhất một vé trúng thưởng');
            return false;
        }
        if (!hasMatchProof) {
            toast.error('Thiếu bằng chứng đối chiếu số trên vé / KQXS');
            return false;
        }
        if (needsManualConfirm && !manualConfirmed) {
            toast.error('Cần đánh dấu xác nhận đã đối chiếu giấy tờ + vé gốc');
            return false;
        }
        if (!recipientFullName.trim() || !recipientIdNumber.trim()) {
            toast.error('Vui lòng nhập họ tên người nhận và số CCCD');
            return false;
        }
        if (!/^\d{9,12}$/.test(recipientIdNumber.trim())) {
            toast.error('Số CCCD/CMND phải có từ 9 đến 12 chữ số');
            return false;
        }
        if (needsIdImage && (!recipientIdImageUrl.trim() || !recipientIdImageBackUrl.trim())) {
            toast.error('Cần ảnh CCCD mặt trước và mặt sau');
            return false;
        }
        if (!confirmationContractUrl.trim()) {
            toast.error('Cần tải lên hợp đồng xác nhận trả thưởng');
            return false;
        }
        if (paymentMethod === 'COMBINED') {
            if (isPartialZeroCash) {
                toast.error('Thanh toán kết hợp cần có phần tiền mặt lớn hơn 0đ');
                return false;
            }
            if (isCashExceeds) {
                toast.error('Tiền mặt không được vượt quá tổng thực nhận');
                return false;
            }
            if (isCashDenominationInvalid) {
                toast.error(CASH_DENOMINATION_INVALID_MESSAGE);
                return false;
            }
            if (!cashHandedConfirmed) {
                toast.error(`Cần xác nhận đã đưa ${parsedCashAmount.toLocaleString('vi-VN')}đ tiền mặt cho khách`);
                return false;
            }
        }
        if (needsBankFields && !transferReady) {
            const accountNoError = validateBankAccountNo(bankAccountNumber);
            setBankAccountNumberError(accountNoError);
            toast.error(accountNoError || 'Nhập đầy đủ thông tin chuyển khoản');
            return false;
        }
        if (needsBankFields && !transferEvidenceUrl.trim()) {
            toast.error('Cần tải ảnh biên lai chuyển khoản');
            return false;
        }
        return true;
    };

    const submitCreate = () => {
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
                acknowledgeLateRedemption: hasUrgentRedemption ? lateRedemptionAck : undefined,
            },
            {
                onSuccess: (response) => {
                    if (response.success && response.data?.claims?.length) {
                        const firstId = response.data.claims[0].id;
                        setCompleteConfirmOpen(false);
                        setLateRedemptionAck(false);
                        clearPrizePayoutCreateDraft();
                        toast.success('Đã hoàn tất trả thưởng tại quầy');
                        router.push(`/${prefixAdmin}/prize-payouts/detail/${firstId}`);
                    }
                },
            }
        );
    };

    const handleCreate = () => {
        if (!validateCreateInputs()) return;
        if (hasLockedRedemption) {
            toast.error('Đã quá hạn lĩnh thưởng với nhà đài — không thể trả thưởng cho vé này.');
            return;
        }
        setLateRedemptionAck(false);
        setCompleteConfirmOpen(true);
    };

    const lookupReady = !!selectedSuggestion || !!searchInput.trim();

    const anyUploading = uploadingTransferEvidence || uploadingIdFront || uploadingIdBack || uploadingContract;

    const submitDisabled =
        selectedItems.length === 0
        || hasStationOfficeOnlySelection
        || !hasMatchProof
        || createMutation.isPending
        || !identityDocsReady
        || hasLockedRedemption
        || (paymentMethod === 'COMBINED' && (
            !cashHandedConfirmed
            || isPartialZeroCash
            || isCashExceeds
            || isCashDenominationInvalid
        ))
        || (needsBankFields && (!transferReady || !transferEvidenceUrl.trim()));

    const submitBlockerHint = (() => {
        if (selectedItems.length === 0) return 'Chọn ít nhất một vé trúng thưởng.';
        if (hasStationOfficeOnlySelection) {
            const stationItem = selectedItems.find((item) => item.requiresStationOfficeRedemption);
            return buildStationOfficeRedemptionMessage(stationItem?.stationName);
        }
        if (!hasMatchProof) return 'Thiếu đối chiếu số trên vé / KQXS.';
        if (hasLockedRedemption) return 'Vé đã quá hạn lĩnh nhà đài — không thể trả thưởng.';
        if (!identityDocsReady) {
            if (!recipientFullName.trim() || !isRecipientIdValid) return 'Nhập họ tên và CCCD (9–12 số).';
            if (needsIdImage && (!recipientIdImageUrl.trim() || !recipientIdImageBackUrl.trim())) {
                return 'Tải đủ ảnh CCCD mặt trước và mặt sau.';
            }
            if (!confirmationContractUrl.trim()) return 'Tải hợp đồng xác nhận trả thưởng.';
            if (needsManualConfirm && !manualConfirmed) return 'Xác nhận đã đối chiếu giấy tờ & vé gốc.';
            return 'Hoàn tất định danh trước khi thanh toán.';
        }
        if (hasUrgentRedemption) {
            return 'Vé quá hạn khách — cần xác nhận ưu tiên lĩnh khi hoàn tất.';
        }
        if (paymentMethod === 'COMBINED' && (isPartialZeroCash || isCashExceeds || isCashDenominationInvalid || !cashHandedConfirmed)) {
            return isCashDenominationInvalid
                ? CASH_DENOMINATION_INVALID_MESSAGE
                : 'Xác nhận phần tiền mặt kết hợp.';
        }
        if (needsBankFields && !transferReady) return 'Nhập đầy đủ ngân hàng / STK / chủ TK chính chủ.';
        if (needsBankFields && !transferEvidenceUrl.trim()) return 'Tải ảnh biên lai chuyển khoản.';
        return '';
    })();

    return (
        <div className="admin-list-page">
            {/* Header Section */}
            <PageHeader
                disableBottomMargin
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

            {/* Section 1: Search Card */}
            <SectionCard title="1. Tra cứu vé số" icon="solar:magnifer-bold-duotone">
                            <Alert severity="info" sx={{ mb: 2, borderRadius: '10px' }}>
                                Chỉ hỗ trợ vé đã bán qua hệ thống. Tra cứu bằng số điện thoại hoặc email của khách hàng.
                            </Alert>

                            <ToggleButtonGroup
                                value={searchMode}
                                exclusive
                                onChange={(_, value) => {
                                    if (value) {
                                        setSearchMode(value);
                                        setSearchInput('');
                                        setSelectedSuggestion(null);
                                        setDebouncedSearch('');
                                        setLookupItems([]);
                                        setSelectedIds([]);
                                    }
                                }}
                                size="small"
                                sx={{ mb: 2 }}
                            >
                                <ToggleButton value="PHONE">Điện thoại</ToggleButton>
                                <ToggleButton value="EMAIL">Email</ToggleButton>
                            </ToggleButtonGroup>

                            <Autocomplete
                                freeSolo
                                options={suggestions}
                                loading={isLoadingSuggestions}
                                value={selectedSuggestion}
                                inputValue={searchInput}
                                onInputChange={(_, value, reason) => {
                                    setSearchInput(value);
                                    if (reason === 'input') {
                                        setSelectedSuggestion(null);
                                    }
                                }}
                                onChange={(_, value) => {
                                    if (!value || typeof value === 'string') {
                                        setSelectedSuggestion(null);
                                        return;
                                    }
                                    setSelectedSuggestion(value);
                                    const searchValue = searchMode === 'PHONE' ? value.phone : value.email;
                                    if (searchValue) {
                                        setSearchInput(searchValue);
                                        setDebouncedSearch(searchValue);
                                    }
                                }}
                                getOptionLabel={(o) => {
                                    if (typeof o === 'string') return o;
                                    if (searchMode === 'EMAIL') {
                                        return `${o.displayName} - ${o.email || ''}`;
                                    }
                                    return `${o.displayName} - ${o.phone || ''}`;
                                }}
                                noOptionsText={
                                    debouncedSearch.length < 2
                                        ? 'Nhập từ 2 ký tự để tìm...'
                                        : 'Không tìm thấy'
                                }
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label={searchMode === 'PHONE' ? 'Số điện thoại' : 'Email'}
                                        placeholder={
                                            searchMode === 'PHONE'
                                                ? 'Nhập số điện thoại khách hàng...'
                                                : 'Nhập email khách hàng...'
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                void handleLookup();
                                            }
                                        }}
                                        size="small"
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {isLoadingSuggestions ? <CircularProgress size={16} /> : null}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                            />

                            <Button
                                variant="contained"
                                onClick={handleLookup}
                                disabled={loadingLookup || !lookupReady}
                                startIcon={loadingLookup ? <CircularProgress size={16} color="inherit" /> : <Icon icon="solar:magnifer-bold-duotone" />}
                                sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '8px', boxShadow: 'none', mt: 2 }}
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
                                                <TableCell padding="checkbox">
                                                    <Checkbox
                                                        checked={allSelected}
                                                        indeterminate={!allSelected && selectedIds.length > 0}
                                                        onChange={toggleSelectAll}
                                                        disabled={selectableItems.length === 0}
                                                        size="small"
                                                    />
                                                </TableCell>
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
                                            {lookupItems.filter((item) => item.prizeStatus === 'WON').map((item) => {
                                                const payoutState = resolveLookupPayoutState(item);
                                                const lockedByPayout = payoutState === 'PAYOUT_PENDING' || payoutState === 'PAID_OUT';
                                                const stationOfficeOnly = Boolean(item.requiresStationOfficeRedemption);
                                                const selectable = item.prizeStatus === 'WON' && !lockedByPayout && !stationOfficeOnly;
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
                                                            {stationOfficeOnly ? (
                                                                <Chip
                                                                    label="VPĐĐ"
                                                                    size="small"
                                                                    color="warning"
                                                                    sx={{ fontWeight: 700 }}
                                                                />
                                                            ) : payoutBadge ? (
                                                                <AdminStatusBadge
                                                                    label={payoutBadge.label}
                                                                    modifier={payoutBadge.modifier}
                                                                    className="admin-status-badge--compact"
                                                                />
                                                            ) : (
                                                                <Typography variant="caption" color="text.disabled">—</Typography>
                                                            )}
                                                            {stationOfficeOnly && (
                                                                <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                                                                    {buildStationOfficeRedemptionMessage(item.stationName)}
                                                                </Typography>
                                                            )}
                                                            {!stationOfficeOnly && (() => {
                                                                const urgency = getUrgencyBadge(item);
                                                                return urgency ? (
                                                                    <Box sx={{ mt: 0.5 }}>
                                                                        <Chip
                                                                            label={urgency.label}
                                                                            color={urgency.color}
                                                                            size="small"
                                                                            sx={{ fontSize: '0.7rem', height: 20 }}
                                                                        />
                                                                    </Box>
                                                                ) : null;
                                                            })()}
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

            {/* Section 4: Hợp đồng xác nhận trả thưởng */}
            {selectedItems.length > 0 && (
                <SectionCard title="4. Hợp đồng xác nhận trả thưởng" icon="solar:document-bold-duotone">
                                <Stack spacing={1.5}>
                                    <Button
                                        variant="outlined"
                                        startIcon={
                                            printingContract
                                                ? <CircularProgress size={16} color="inherit" />
                                                : <Icon icon="solar:printer-bold-duotone" />
                                        }
                                        disabled={!canPrintContract || printingContract || createMutation.isPending}
                                        onClick={() => void handlePrintContract()}
                                        sx={{
                                            alignSelf: 'flex-start',
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            borderRadius: '8px',
                                        }}
                                    >
                                        {printingContract ? 'Đang tạo hợp đồng...' : 'Xem / In hợp đồng'}
                                    </Button>
                                    {!canPrintContract && (
                                        <Typography variant="caption" color="text.secondary">
                                            Nhập họ tên và số CCCD người nhận để mở in hợp đồng.
                                        </Typography>
                                    )}
                                    <UploadSingleFile
                                        label="Bản hợp đồng đã ký"
                                        value={pendingSignedFile}
                                        onChange={handlePendingSignedFileChange}
                                        useRawFile
                                        disabled={uploadingContract || createMutation.isPending}
                                        maxFileSizeMb={10}
                                        required={!confirmationContractUrl.trim()}
                                        accept={SIGNED_CONTRACT_ACCEPT}
                                        onPreview={() => {
                                            if (pendingSignedFile) setPreviewSignedFile(pendingSignedFile);
                                        }}
                                    />
                                    {pendingSignedFile ? (
                                        <Stack direction="row" justifyContent="flex-end" sx={{ width: '100%' }}>
                                            <Button
                                                variant="contained"
                                                onClick={() => setSaveSignedConfirmOpen(true)}
                                                disabled={uploadingContract || createMutation.isPending}
                                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                                            >
                                                Lưu bản ký vào phiếu trả thưởng
                                            </Button>
                                        </Stack>
                                    ) : null}
                                    {confirmationContractUrl ? (
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                            <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                                                Đã gắn bản hợp đồng đã ký
                                            </Typography>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<Icon icon="solar:document-bold-duotone" />}
                                                onClick={() => setViewSignedOpen(true)}
                                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                                            >
                                                Xem bản đã ký
                                            </Button>
                                            <Button
                                                variant="text"
                                                size="small"
                                                color="inherit"
                                                onClick={() => {
                                                    setConfirmationContractUrl('');
                                                    setPendingSignedFile(null);
                                                }}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                Gỡ bản ký
                                            </Button>
                                        </Stack>
                                    ) : null}
                                </Stack>
                </SectionCard>
            )}

            {/* Money Summary */}
            {selectedItems.length > 0 ? (
                <>
                    <MoneySummary
                                    gross={totalGross}
                                    commission={totalCommission}
                                    tax={totalTax}
                                    net={totalNet}
                                    ticketCount={selectedItems.length}
                                />
                                {hasLockedRedemption && (
                                    <Alert severity="error" sx={{ borderRadius: '10px' }}>
                                        Vé đã <strong>quá hạn lĩnh nhà đài</strong> — không thể hoàn tất trả thưởng.
                                    </Alert>
                                )}
                                {hasUrgentRedemption && (
                                    <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                                        Vé đã <strong>quá hạn đổi thưởng của khách</strong> nhưng còn trong hạn nhà đài.
                                        Cần xác nhận ưu tiên mang đi lĩnh khi hoàn tất.
                                    </Alert>
                    )}
                </>
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
                                                placeholder="VD: 1.000.000"
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
                                                error={isCashExceeds || isPartialZeroCash || isCashDenominationInvalid}
                                                helperText={
                                                    isCashExceeds
                                                        ? 'Tiền mặt không được vượt quá tổng thực nhận'
                                                        : (isPartialZeroCash
                                                            ? 'Thanh toán kết hợp cần có phần tiền mặt lớn hơn 0đ'
                                                            : (isCashDenominationInvalid
                                                                ? CASH_DENOMINATION_INVALID_MESSAGE
                                                                : 'Chỉ nhập số tiền theo mệnh giá 1.000đ (vd: 1.000, 5.000, 10.000…)'))
                                                }
                                            />
                                            {!cashHandedConfirmed ? (
                                                <Button
                                                    variant="contained"
                                                    color="warning"
                                                    fullWidth
                                                    disabled={isPartialZeroCash || isCashExceeds || isCashDenominationInvalid}
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
                                                onChange={(e) => {
                                                    setBankAccountNumber(sanitizeBankAccountNoInput(e.target.value));
                                                    if (bankAccountNumberError) {
                                                        setBankAccountNumberError(null);
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (bankAccountNumber.trim()) {
                                                        setBankAccountNumberError(validateBankAccountNo(bankAccountNumber));
                                                    }
                                                }}
                                                fullWidth
                                                size="small"
                                                error={!!bankAccountNumberError}
                                                inputProps={{
                                                    inputMode: 'numeric',
                                                    pattern: '[0-9]*',
                                                    maxLength: BANK_ACCOUNT_NO_MAX_LENGTH,
                                                }}
                                                helperText={bankAccountNumberError || BANK_ACCOUNT_NO_INVALID_MESSAGE}
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
                                        startIcon={
                                            createMutation.isPending
                                                ? <CircularProgress size={16} color="inherit" />
                                                : undefined
                                        }
                                        sx={{ height: 40, fontWeight: 700, textTransform: 'none', borderRadius: '8px', boxShadow: 'none' }}
                                    >
                                        {createMutation.isPending ? 'Đang hoàn tất…' : 'Hoàn tất trả thưởng tại quầy'}
                                    </Button>
                                </Stack>
                </SectionCard>
            )}

            <ContractDocumentViewerDialog
                open={viewSignedOpen}
                url={confirmationContractUrl}
                title="Bản hợp đồng đã ký"
                fileName="hop-dong-xac-nhan-tra-thuong-da-ky"
                onClose={() => setViewSignedOpen(false)}
            />

            <SignedContractUploadDialog
                open={!!previewSignedFile}
                file={previewSignedFile}
                uploading={false}
                onClose={() => setPreviewSignedFile(null)}
                onConfirm={handleStageSignedFile}
                hint="File mới chỉ được giữ tạm trên trang. Bạn sẽ xác nhận tải lên hệ thống ở bước tiếp theo."
            />

            <SignedContractSaveDialog
                open={saveSignedConfirmOpen}
                file={pendingSignedFile}
                saving={uploadingContract}
                onClose={() => setSaveSignedConfirmOpen(false)}
                onConfirm={() => {
                    if (pendingSignedFile) void handleConfirmSignedUpload(pendingSignedFile);
                }}
                description="Chỉ sau khi xác nhận, bản ký mới được tải lên và gắn vào phiếu trả thưởng tại quầy."
                confirmLabel="Tải bản ký lên"
            />

            <AdminConfirmDialog
                open={completeConfirmOpen}
                title="Xác nhận hoàn tất trả thưởng?"
                maxWidth="sm"
                loading={createMutation.isPending}
                cancelLabel="Quay lại kiểm tra"
                confirmLabel="Xác nhận hoàn tất"
                confirmLoadingLabel="Đang hoàn tất…"
                confirmDisabled={hasUrgentRedemption && !lateRedemptionAck}
                onClose={() => {
                    if (!createMutation.isPending) {
                        setCompleteConfirmOpen(false);
                        setLateRedemptionAck(false);
                    }
                }}
                onConfirm={submitCreate}
            >
                <Stack spacing={1.5}>
                    <Typography variant="body2" color="text.secondary">
                        Vui lòng kiểm tra lại thông tin đã nhập trước khi hoàn tất. Thao tác này không thể hoàn tác trên quầy.
                    </Typography>
                    {hasUrgentRedemption && (
                        <Alert severity="warning" sx={{ borderRadius: '10px' }}>
                            Vé đã quá hạn đổi thưởng của khách. Chỉ tiếp tục nếu sẽ ưu tiên mang đi lĩnh trước hạn nhà đài.
                        </Alert>
                    )}
                    <Box
                        sx={{
                            p: 1.75,
                            borderRadius: '12px',
                            bgcolor: 'var(--palette-background-neutral)',
                            border: '1px solid var(--palette-divider)',
                        }}
                    >
                        <Stack spacing={1}>
                            <Typography variant="body2">
                                <strong>Người nhận:</strong> {recipientFullName.trim() || '-'}
                            </Typography>
                            <Typography variant="body2">
                                <strong>CCCD/CMND:</strong> {recipientIdNumber.trim() || '-'}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Số vé:</strong> {selectedItems.length}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Thực nhận:</strong> {formatPrizePayoutCurrency(totalNet)}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Thanh toán:</strong>{' '}
                                {PRIZE_PAYOUT_PAYMENT_METHOD_LABELS[
                                    paymentMethod === 'COMBINED' && remainingTransferAmount === 0
                                        ? 'CASH'
                                        : paymentMethod
                                ]}
                                {paymentMethod === 'COMBINED' && remainingTransferAmount > 0
                                    ? ` (tiền mặt ${formatPrizePayoutCurrency(parsedCashAmount)} + CK ${formatPrizePayoutCurrency(remainingTransferAmount)})`
                                    : ''}
                            </Typography>
                            {needsBankFields && (
                                <Typography variant="body2">
                                    <strong>Chuyển khoản:</strong>{' '}
                                    {(selectedBank?.shortName || selectedBank?.name || '-')}
                                    {' · '}
                                    {bankAccountNumber.trim() || '-'}
                                    {' · '}
                                    {accountHolderName.trim().toUpperCase() || '-'}
                                </Typography>
                            )}
                        </Stack>
                    </Box>
                    {hasUrgentRedemption && (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={lateRedemptionAck}
                                    onChange={(e) => setLateRedemptionAck(e.target.checked)}
                                    color="warning"
                                />
                            }
                            label={
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Đã hiểu vé sát/hết hạn khách — ưu tiên mang đi lĩnh trước hạn nhà đài
                                </Typography>
                            }
                        />
                    )}
                </Stack>
            </AdminConfirmDialog>
        </div>
    );
};
