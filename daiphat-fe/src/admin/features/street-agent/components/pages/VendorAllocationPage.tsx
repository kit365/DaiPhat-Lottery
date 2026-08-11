"use client";

import { useAppSearchParams } from "@/hooks/useAppSearchParams";
import Link from "@/admin/components/navigation/AdminLink";
import { useEffect, useMemo, useState } from "react";
import { useSidebar } from "../../../../context/sidebar/useSidebar";
import {
    Alert,
    Autocomplete,
    Box,
    Card,
    Checkbox,
    Chip,
    CircularProgress,
    Divider,
    Drawer,
    FormControlLabel,
    IconButton,
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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { PageHeader } from "../../../../components/ui/PageHeader";
import { Button } from '../../../../components/ui/Button';
import { ROUTES } from "../../../../constants/routes";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { usePermissions } from "../../../../hooks/usePermission";
import { useStreetAgentProfiles } from "../../hooks/useStreetAgent";
import { getStreetAgentOnboardingResumePath } from "../../services/streetAgentService";
import {
    useCancelVendorAllocation,
    useCreateVendorAllocationDraft,
    useVendorAllocationBatch,
    useVendorAllocationOpenBatch,
    useVendorAllocationSuggestion,
} from "../../hooks/useVendorAllocation";
import {
    StreetAgentProfile,
    VendorAllocationSuggestion,
    VendorAllocationTicketGroup,
    VendorAllocationStationGroup,
} from "../../types/street-agent.type";
import {
    ALLOCATION_BATCH_STATUS_LABELS,
    BLOCKED_REASON_LABELS,
    CONFIDENCE_TIER_LABELS,
} from "../configs/constants";
import { formatCountdown, formatCurrency, formatDate } from "../../utils/format";
import { useVendorSettingsDefaults } from "../../hooks/useVendorSettingsDefaults";
import { ConfirmVendorDepositDialog } from "../ConfirmVendorDepositDialog";
import { AdminTicketCard } from "../../../../components/ui/AdminTicketCard";
import { VendorAllocationStationDrawer } from "../sections/VendorAllocationStationDrawer";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

type TicketKey = string;
type AllocationSelectionMode = "SYSTEM" | "MANUAL";

const ticketKey = (stationId: number, ticketNumbers: string): TicketKey =>
    `${stationId}::${ticketNumbers}`;

const getSuggestedSerialIds = (suggestion: VendorAllocationSuggestion | undefined) =>
    suggestion?.stations?.flatMap((station) =>
        station.tickets.flatMap((ticket) =>
            ticket.serials.filter((serial) => serial.suggested).map((serial) => serial.serialId)
        )
    ) || [];

const getApiErrorMessage = (error: any, fallback: string) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;
    if (status === 409) {
        return message || "Vé vừa bị nhân viên khác giữ chỗ. Vui lòng tải lại danh sách.";
    }
    return message || fallback;
};

const SHORTAGE_REASON_LABELS: Record<string, string> = {
    DAILY_CAP_LIMIT: "Đã đạt hạn mức giao trong ngày.",
    INSUFFICIENT_STATION_CAPACITY: "Kho không đủ vé thường sau khi chừa phần bán tại quầy.",
    NO_DRAWING_STATION: "Ngày này không có đài xổ phù hợp.",
    NO_ELIGIBLE_TICKET: "Không còn vé hợp lệ để giao.",
    RETURN_CUTOFF_REACHED: "Đã qua giờ nhận trả vé của ngày kinh doanh.",
    INSUFFICIENT_INVENTORY: "Kho không đủ vé",
    VENDOR_CAP_REACHED: "Vượt hạn mức người bán vé số",
    AGENCY_RESERVE_CAP: "Không đủ vé sau khi chừa quầy",
    DRAW_TIME_PASSED: "Đã qua giờ xổ",
    INSUFFICIENT_FUNDS: "Không đủ số dư cọc",
    LUCKY_TICKET_RESERVED: "Vé số đẹp đang giữ",
    STATION_BLOCKED: "Đài bị chặn",
};

const mapShortageReasons = (reasons?: string[] | null, blockedReason?: string | null) => {
    if (blockedReason === "DRAW_TIME_PASSED" || reasons?.includes("DRAW_TIME_PASSED")) {
        return "Đã qua giờ xổ của các đài hôm nay, không còn vé có thể giao.";
    }
    if (blockedReason && SHORTAGE_REASON_LABELS[blockedReason]) {
        return SHORTAGE_REASON_LABELS[blockedReason];
    }
    if (!reasons || reasons.length === 0) {
        return "Kho hiện không đủ vé thường sau khi chừa phân bổ tại quầy.";
    }
    if (reasons.length > 1) {
        return "Kho không đủ vé do các giới hạn hệ thống (hạn mức, chừa quầy...).";
    }
    return SHORTAGE_REASON_LABELS[reasons[0]] || "Kho hiện không đủ vé phù hợp để bàn giao.";
};

export const VendorAllocationPage = () => {
    const { can } = usePermissions();
    const canCreate = can(PERMISSIONS.STREET_AGENT.CREATE);
    const canEdit = can(PERMISSIONS.STREET_AGENT.EDIT);
    const canOverrideLucky = can(PERMISSIONS.STREET_AGENT.MANAGE);
    const [searchParams, setSearchParams] = useAppSearchParams();
    const { isOpen: isSidebarOpen } = useSidebar();

    const [profile, setProfile] = useState<StreetAgentProfile | null>(null);
    const [businessDate, setBusinessDate] = useState(
        () => searchParams.get("businessDate") || dayjs().format("YYYY-MM-DD")
    );
    const [selectedSerialIds, setSelectedSerialIds] = useState<number[]>([]);
    const [requestedQuantity, setRequestedQuantity] = useState<number | null>(null);
    const [requestedQuantityDraft, setRequestedQuantityDraft] = useState<number | null>(null);
    const [selectionMode, setSelectionMode] = useState<AllocationSelectionMode>("SYSTEM");
    const [faceValue, setFaceValue] = useState<number | null>(() => {
        const raw = searchParams.get("faceValue");
        const parsed = raw ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    });
    const [acceptShortfall, setAcceptShortfall] = useState(false);
    const [luckyOverrideReason, setLuckyOverrideReason] = useState("");
    const [draftId, setDraftId] = useState<number | null>(() => {
        const raw = searchParams.get("draftId");
        const parsed = raw ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    });
    const [nowMs, setNowMs] = useState(Date.now());
    const [drawerStation, setDrawerStation] = useState<VendorAllocationStationGroup | null>(null);
    const [drawerTicketNumber, setDrawerTicketNumber] = useState<string | null>(null);
    const [hydratedProfileFromUrl, setHydratedProfileFromUrl] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const { data: profilesRes, isLoading: isLoadingProfiles } = useStreetAgentProfiles({
        page: 1,
        limit: 100,
        });
    const profiles = profilesRes?.data?.recordList || [];

    const {
        data: openBatch,
        isLoading: isLoadingOpen,
        isFetching: isFetchingOpen,
    } = useVendorAllocationOpenBatch(profile?.id);

    const blockingOpenBatch =
        openBatch && openBatch.status !== "DRAFT" ? openBatch : null;

    const {
        data: suggestion,
        isLoading: isLoadingSuggestion,
        isFetching: isFetchingSuggestion,
        error: suggestionError,
        refetch: refetchSuggestion,
    } = useVendorAllocationSuggestion(
        profile?.id,
        businessDate,
        requestedQuantity,
        faceValue,
        !blockingOpenBatch && profile?.status === "ACTIVE"
    );

    const { data: draftBatch } = useVendorAllocationBatch(draftId);
    const { mutate: createDraft, isPending: isCreatingDraft } = useCreateVendorAllocationDraft();
    const { mutate: cancelDraft, isPending: isCancelling } = useCancelVendorAllocation();
    const { defaults: vendorDefaults } = useVendorSettingsDefaults();

    useEffect(() => {
        const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        if (hydratedProfileFromUrl || isLoadingProfiles || profiles.length === 0) return;
        const raw = searchParams.get("profileId");
        const profileId = raw ? Number(raw) : NaN;
        if (Number.isFinite(profileId)) {
            const found = profiles.find((item) => item.id === profileId) || null;
            if (found) setProfile(found);
        }
        setHydratedProfileFromUrl(true);
    }, [hydratedProfileFromUrl, isLoadingProfiles, profiles, searchParams]);

    useEffect(() => {
        setSelectedSerialIds([]);
        setRequestedQuantity(null);
        setRequestedQuantityDraft(null);
        setSelectionMode("SYSTEM");
        setAcceptShortfall(false);
        setLuckyOverrideReason("");
        setDrawerStation(null);
        setDrawerTicketNumber(null);
        setDraftId(null);
    }, [profile?.id]);

    useEffect(() => {
        setRequestedQuantity(null);
        setRequestedQuantityDraft(null);
        setAcceptShortfall(false);
    }, [businessDate]);

    useEffect(() => {
        if (suggestion?.availableFaceValues && suggestion.availableFaceValues.length === 1) {
            const singleVal = suggestion.availableFaceValues[0];
            if (faceValue !== singleVal) {
                setFaceValue(singleVal);
            }
        }
    }, [suggestion?.availableFaceValues, faceValue]);

    useEffect(() => {
        setSelectedSerialIds([]);
        setRequestedQuantity(null);
        setRequestedQuantityDraft(null);
        setAcceptShortfall(false);
    }, [faceValue]);

    useEffect(() => {
        if (!profile?.id || isLoadingOpen || isFetchingOpen) return;
        if (openBatch?.status === "DRAFT") {
            setDraftId(openBatch.id);
            if (openBatch.businessDate) {
                setBusinessDate(openBatch.businessDate);
            }
            return;
        }
        if (openBatch && openBatch.status !== "DRAFT") {
            setDraftId(null);
        }
    }, [profile?.id, openBatch, isLoadingOpen, isFetchingOpen]);

    useEffect(() => {
        const next = new URLSearchParams();
        if (profile?.id) next.set("profileId", String(profile.id));
        if (businessDate) next.set("businessDate", businessDate);
        if (draftId) next.set("draftId", String(draftId));
        if (faceValue) next.set("faceValue", String(faceValue));
        setSearchParams(next, { replace: true });
    }, [profile?.id, businessDate, draftId, faceValue, setSearchParams]);

    useEffect(() => {
        if (!suggestion?.stations || draftId) return;
        if ((suggestion.availableFaceValues?.length ?? 0) > 1 && !faceValue) {
            setSelectedSerialIds([]);
            return;
        }
        if (selectionMode === "SYSTEM") {
            setSelectedSerialIds(getSuggestedSerialIds(suggestion));
        } else {
            const currentSerialIds = new Set(
                suggestion.stations.flatMap((station) =>
                    station.tickets.flatMap((ticket) => ticket.serials.map((serial) => serial.serialId))
                )
            );
            setSelectedSerialIds((current) => current.filter((serialId) => currentSerialIds.has(serialId)));
        }
        setAcceptShortfall(false);
    }, [suggestion, draftId, selectionMode, faceValue]);

    useEffect(() => {
        if (draftBatch?.status && draftBatch.status !== "DRAFT") {
            setDraftId(null);
            setSelectedSerialIds([]);
        }
    }, [draftBatch?.status]);

    const selectedQty = useMemo(() => {
        const qtyMap: Record<TicketKey, number> = {};
        if (!suggestion?.stations) return qtyMap;
        for (const station of suggestion.stations) {
            for (const ticket of station.tickets) {
                const key = ticketKey(station.stationId, ticket.ticketNumbers);
                const count = ticket.serials.filter(s => selectedSerialIds.includes(s.serialId)).length;
                if (count > 0) qtyMap[key] = count;
            }
        }
        return qtyMap;
    }, [suggestion, selectedSerialIds]);

    const selectedLuckyCount = useMemo(() => {
        if (!suggestion?.stations) return 0;
        let count = 0;
        for (const station of suggestion.stations) {
            for (const ticket of station.tickets) {
                if (!ticket.lucky) continue;
                const key = ticketKey(station.stationId, ticket.ticketNumbers);
                count += selectedQty[key] ?? 0;
            }
        }
        return count;
    }, [suggestion, selectedQty]);

    const hasLuckySelected = selectedLuckyCount > 0;
    const totalSelected = selectedSerialIds.length;
    const remainingCap =
        suggestion?.remainingDailyCap != null ? suggestion.remainingDailyCap : null;
    const allowedQuantity = suggestion?.allowedQuantity ?? 0;

    const hasSelectableInventory = useMemo(() => {
        if (!suggestion?.stations?.length) return false;
        return suggestion.stations.some((station) =>
            station.tickets.some((ticket) => ticket.selectableCount > 0 && ticket.vendorEligible)
        );
    }, [suggestion]);

    const suggestionBlockedMessage = suggestion?.blockedReason
        ? BLOCKED_REASON_LABELS[suggestion.blockedReason] ||
          SHORTAGE_REASON_LABELS[suggestion.blockedReason] ||
          "Không thể giao vé."
        : null;

    const canCreateDraft =
        canCreate &&
        !draftId &&
        !blockingOpenBatch &&
        !!profile &&
        profile.status === "ACTIVE" &&
        !suggestionBlockedMessage &&
        (remainingCap ?? 0) > 0 &&
        hasSelectableInventory &&
        !((suggestion?.availableFaceValues?.length ?? 0) > 1 && !faceValue) &&
        totalSelected > 0;

    const applyRequestedQuantity = () => {
        if (draftId || isFetchingSuggestion || requestedQuantityDraft == null) return;
        const nextQuantity = Math.floor(requestedQuantityDraft);
        if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
            toast.error("Số vé muốn giao phải lớn hơn 0.");
            return;
        }
        setRequestedQuantity(nextQuantity);
    };

    const changeSelectionMode = (nextMode: AllocationSelectionMode | null) => {
        if (!nextMode || draftId || isFetchingSuggestion) return;
        setSelectionMode(nextMode);
        setAcceptShortfall(false);
        if (nextMode === "SYSTEM") {
            setSelectedSerialIds(getSuggestedSerialIds(suggestion));
        } else {
            setSelectedSerialIds([]);
        }
    };

    const handleCreateDraft = () => {
        if (!profile?.id) {
            toast.error("Vui lòng chọn người bán vé số");
            return;
        }
        if (blockingOpenBatch) {
            toast.error(
                `Người bán vé số còn phiếu mở ${blockingOpenBatch.batchCode} (${ALLOCATION_BATCH_STATUS_LABELS[blockingOpenBatch.status] || blockingOpenBatch.status}). Không thể tạo phiếu mới.`
            );
            return;
        }
        if (selectedSerialIds.length === 0) {
            toast.error("Vui lòng chọn ít nhất một vé");
            return;
        }
        if (hasLuckySelected && !canOverrideLucky) {
            toast.error("Bạn không có quyền override số đẹp");
            return;
        }
        if (hasLuckySelected && !luckyOverrideReason.trim()) {
            toast.error("Vui lòng nhập lý do override số đẹp");
            return;
        }
        if (remainingCap != null && selectedSerialIds.length > remainingCap) {
            toast.error(`Số vé chọn vượt hạn mức còn lại (${remainingCap})`);
            return;
        }
        if (selectedSerialIds.length !== allowedQuantity) {
            toast.error(`Vui lòng chọn đúng số vé được phép giao (${allowedQuantity}).`);
            return;
        }
        if ((suggestion?.shortfallQuantity ?? 0) > 0 && !acceptShortfall) {
            toast.error(`Cần xác nhận bàn giao thiếu ${suggestion?.allowedQuantity}/${suggestion?.requestedQuantity} vé.`);
            return;
        }

        createDraft(
            {
                streetAgentProfileId: profile.id,
                businessDate,
                serialIds: selectedSerialIds,
                requestedQuantity: suggestion?.requestedQuantity ?? selectedSerialIds.length,
                acceptShortfall,
                luckyOverrideReason: hasLuckySelected ? luckyOverrideReason.trim() : undefined,
                faceValue: faceValue ?? undefined,
            },
            {
                onSuccess: (response) => {
                    toast.success(response.message || "Đã giữ vé cho phiếu nháp.");
                    if (response.data?.id) {
                        setDraftId(response.data.id);
                    }
                },
                onError: (error: any) => {
                    toast.error(getApiErrorMessage(error, "Tạo nháp thất bại"));
                    refetchSuggestion();
                },
            }
        );
    };

    const handleCancel = () => {
        if (!draftId) return;
        cancelDraft(draftId, {
            onSuccess: (response) => {
                toast.success(response.message || "Đã hủy phiếu nháp và nhả vé.");
                setDraftId(null);
                setSelectedSerialIds([]);
                refetchSuggestion();
            },
            onError: (error: any) => {
                toast.error(getApiErrorMessage(error, "Hủy nháp thất bại"));
            },
        });
    };

    const countdown = formatCountdown(draftBatch?.reservationExpiresAt, nowMs);
    const isExpired =
        !!draftBatch?.reservationExpiresAt &&
        new Date(draftBatch.reservationExpiresAt).getTime() <= nowMs;

    const suggestionErrorMessage =
        (suggestionError as any)?.response?.data?.message ||
        (suggestionError ? "Không tải được gợi ý bàn giao." : null);

    return (
        <Box sx={{ maxWidth: 1200, mx: "auto", pb: (!draftId && !blockingOpenBatch && profile) ? 12 : 5 }}>
            <PageHeader
                title="Bàn giao vé cho người bán vé số"
                breadcrumbItems={[
                    { label: "Dashboard", to: "/" },
                    { label: "Người bán vé số" },
                    { label: "Bàn giao vé" },
                ]}
            />

            <Stack spacing={3}>
                <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        Chọn đại lý & ngày kinh doanh
                    </Typography>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 2 }}>
                        <Autocomplete
                            options={profiles}
                            loading={isLoadingProfiles}
                            value={profile}
                            onChange={(_event, value) => setProfile(value)}
                            getOptionLabel={(option) =>
                                `${option.lastName || ""} ${option.firstName || ""}`.trim() +
                                (option.phone ? ` — ${option.phone}` : "")
                            }
                            isOptionEqualToValue={(a, b) => a.id === b.id}
                            renderInput={(params) => (
                                <TextField {...params} label="Người bán vé số *" sx={fieldSx} />
                            )}
                        />
                        <TextField
                            type="date"
                            label="Ngày kinh doanh"
                            value={businessDate}
                            onChange={(e) => setBusinessDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            sx={fieldSx}
                        />
                    </Box>

                    {profile && (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }} flexWrap="wrap">
                            <Chip
                                size="small"
                                label={`Tin cậy: ${CONFIDENCE_TIER_LABELS[profile.confidenceTier || ""] || profile.confidenceTier || "—"}`}
                                sx={{ fontWeight: 600 }}
                            />
                            <Chip
                                size="small"
                                label={`Hạn mức còn lại: ${remainingCap ?? profile.remainingDailyCap ?? profile.effectiveDailyCap ?? "—"}`}
                                sx={{ fontWeight: 600 }}
                            />
                            {Number(profile.depositBalance ?? 0) > 0 && (
                                <Chip
                                    size="small"
                                    label={`Cọc đang giữ: ${formatCurrency(profile.depositBalance)}`}
                                    sx={{ fontWeight: 600 }}
                                />
                            )}
                        </Stack>
                    )}
                </Card>

                {blockingOpenBatch && (
                    <Alert
                        severity="warning"
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                component={Link}
                                href={ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCHES}
                            >
                                Xem phiếu
                            </Button>
                        }
                    >
                        Vendor còn phiếu mở <strong>{blockingOpenBatch.batchCode}</strong> (
                        {ALLOCATION_BATCH_STATUS_LABELS[blockingOpenBatch.status] ||
                            blockingOpenBatch.status}
                        ). Không thể tạo phiếu nháp mới cho đến khi phiếu này được quyết toán / đóng.
                    </Alert>
                )}

                {draftBatch?.status === "DRAFT" && (
                    <Alert
                        severity={isExpired ? "error" : "warning"}
                        action={
                            canEdit ? (
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        color="inherit"
                                        size="small"
                                        disabled={isCancelling}
                                        onClick={handleCancel}
                                    >
                                        Hủy nháp
                                    </Button>
                                    {isExpired && (
                                        <Button
                                            color="inherit"
                                            size="small"
                                            disabled={isCancelling}
                                            onClick={handleCancel}
                                        >
                                            Làm mới báo giá
                                        </Button>
                                    )}
                                    <Button
                                        color="inherit"
                                        size="small"
                                        disabled={isExpired}
                                        onClick={() => setConfirmOpen(true)}
                                    >
                                        Xác nhận bàn giao
                                    </Button>
                                </Stack>
                            ) : undefined
                        }
                    >
                        Phiếu {draftBatch.batchCode} đang giữ {draftBatch.allocatedQuantity} vé.
                        {" "}
                        Còn lại theo hạn mức: {draftBatch.remainingDailyCap}.
                        {" "}
                        Hết hạn giữ chỗ sau <strong>{countdown}</strong>
                        {isExpired ? " (đã hết hạn)" : ""}.
                    </Alert>
                )}


                {profile && profile.status !== "ACTIVE" && (
                    <Alert
                        severity="warning"
                        action={
                            <Button
                                color="inherit"
                                size="small"
                                component={Link}
                                href={getStreetAgentOnboardingResumePath(profile.id)}
                            >
                                Tiếp tục Onboarding
                            </Button>
                        }
                    >
                        Người bán vé số này chưa hoàn tất hồ sơ (Trạng thái: {profile.status}). Vui lòng hoàn tất hồ sơ trước khi giao vé.
                    </Alert>
                )}
{suggestionErrorMessage && !blockingOpenBatch && (
                    <Alert
                        severity="error"
                        action={
                            <Button color="inherit" size="small" onClick={() => refetchSuggestion()}>
                                Thử lại
                            </Button>
                        }
                    >
                        {suggestionErrorMessage}
                    </Alert>
                )}

                {!blockingOpenBatch ? (
                    <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Gợi ý bàn giao {businessDate ? `— ${formatDate(businessDate)}` : ""}
                        </Typography>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }} flexWrap="wrap" useFlexGap>
                            {hasSelectableInventory && (suggestion?.allowedQuantity ?? 0) > 0 && (
                                <>
                                    <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)", fontWeight: 600, whiteSpace: "nowrap" }}>
                                        Đã chọn {totalSelected}/{suggestion?.allowedQuantity ?? 0}
                                    </Typography>
                                    <ToggleButtonGroup
                                        exclusive
                                        size="small"
                                        color="primary"
                                        value={selectionMode}
                                        onChange={(_, value: AllocationSelectionMode | null) => changeSelectionMode(value)}
                                        disabled={!!draftId || isFetchingSuggestion}
                                        aria-label="Cách chọn vé"
                                    >
                                        <ToggleButton value="SYSTEM">Chọn theo hệ thống</ToggleButton>
                                        <ToggleButton value="MANUAL">Chọn thủ công</ToggleButton>
                                    </ToggleButtonGroup>
                                </>
                            )}
                            {isFetchingSuggestion && (
                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: "text.secondary" }}>
                                    <CircularProgress size={16} />
                                    <Typography variant="caption">Đang cập nhật gợi ý…</Typography>
                                </Stack>
                            )}
                        </Stack>
                    </Stack>

                    {profile && suggestion && !draftId && hasSelectableInventory && suggestion.allowedQuantity > 0 && (
                        <Stack spacing={1.5} sx={{ mb: 3 }}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }} flexWrap="wrap" useFlexGap>
                                <TextField
                                    type="number"
                                    label="Số vé muốn giao"
                                    value={requestedQuantityDraft ?? requestedQuantity ?? suggestion.requestedQuantity ?? ""}
                                    placeholder={String(suggestion.requestedQuantity)}
                                    inputProps={{ min: 1, max: Math.max(1, suggestion.remainingDailyCap) }}
                                    onChange={(event) => {
                                        const value = Number(event.target.value);
                                        setRequestedQuantityDraft(Number.isFinite(value) && value > 0 ? value : null);
                                    }}
                                    sx={{ ...fieldSx, width: { xs: "100%", sm: 220 }, minWidth: { sm: 200 } }}
                                    disabled={isFetchingSuggestion}
                                />
                                <Button
                                    size="small"
                                    variant="contained"
                                    loading={isFetchingSuggestion}
                                    loadingLabel="Đang cập nhật…"
                                    disabled={
                                        isFetchingSuggestion ||
                                        requestedQuantityDraft == null ||
                                        requestedQuantityDraft === requestedQuantity
                                    }
                                    onClick={applyRequestedQuantity}
                                    sx={{ alignSelf: { xs: "stretch", sm: "center" }, minHeight: 40, whiteSpace: "nowrap" }}
                                >
                                    Áp dụng
                                </Button>
                                {suggestion?.availableFaceValues && suggestion.availableFaceValues.length > 1 && (
                                    <ToggleButtonGroup
                                        color="primary"
                                        value={faceValue}
                                        exclusive
                                        onChange={(_, val) => {
                                            if (val !== null) setFaceValue(val);
                                        }}
                                        size="small"
                                        sx={{ height: 40 }}
                                        disabled={isFetchingSuggestion}
                                    >
                                        {suggestion.availableFaceValues.map(fv => (
                                            <ToggleButton key={fv} value={fv} sx={{ px: 2, fontWeight: 600 }}>
                                                {fv / 1000}K
                                            </ToggleButton>
                                        ))}
                                    </ToggleButtonGroup>
                                )}
                            </Stack>
                            {suggestion.shortfallQuantity > 0 && (
                                <Alert severity="warning">
                                    Chỉ có thể bàn giao {suggestion.allowedQuantity}/{suggestion.requestedQuantity} vé. Lý do: {mapShortageReasons(suggestion.shortageReasons, suggestion.blockedReason)}.
                                    <FormControlLabel sx={{ display: "block", mt: 0.5 }} control={<Checkbox checked={acceptShortfall} onChange={(_, checked) => setAcceptShortfall(checked)} />} label={`Đồng ý bàn giao ${suggestion.allowedQuantity}/${suggestion.requestedQuantity} vé`} />
                                </Alert>
                            )}
                        </Stack>
                    )}

                    {!profile ? (
                        <Alert severity="info">
                            Chọn người bán vé số để xem gợi ý phân bổ vé theo đài và số vé.
                        </Alert>
                    ) : profile.status !== "ACTIVE" ? (
                        <Alert severity="warning">
                            Đại lý chưa kích hoạt hoặc đang onboarding. Không thể tải gợi ý bàn giao.
                        </Alert>
                    ) : isLoadingSuggestion ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : !hasSelectableInventory || suggestion?.allowedQuantity === 0 ? (
                        <Alert severity={suggestionBlockedMessage ? "warning" : "info"}>
                            {mapShortageReasons(suggestion?.shortageReasons, suggestion?.blockedReason)}
                        </Alert>
                    ) : (
                        <Stack spacing={3}>
                            {suggestion?.stations?.map((station) => {
                                const pickedTickets = station.tickets.filter((ticket) => {
                                    const key = ticketKey(station.stationId, ticket.ticketNumbers);
                                    return (selectedQty[key] ?? 0) > 0;
                                });
                                const hasPicked = pickedTickets.length > 0;

                                return (
                                    <Box key={station.stationId}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                            {station.stationName}
                                            <Typography
                                                component="span"
                                                variant="caption"
                                                sx={{ ml: 1, color: "var(--palette-text-secondary)" }}
                                            >
                                                (Có thể giao: {station.vendorCapacity} · Chừa quầy: {station.effectiveAgencyReserveQuantity})
                                            </Typography>
                                        </Typography>

                                        {station.vendorCapacity === 0 ? (
                                            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
                                                Hết vé (Đã chừa quầy)
                                            </Typography>
                                        ) : !hasPicked ? (
                                            <Box
                                                sx={{
                                                    border: "1px dashed",
                                                    borderColor: "divider",
                                                    borderRadius: 2,
                                                    p: 2,
                                                    display: "inline-flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    minWidth: 156,
                                                    bgcolor: "action.hover",
                                                    cursor: "pointer",
                                                    transition: "border-color 0.2s",
                                                    "&:hover": { borderColor: "primary.main" }
                                                }}
                                                onClick={() => {
                                                    if (!draftId) {
                                                        setSelectionMode("MANUAL");
                                                        setSelectedSerialIds([]);
                                                        setDrawerStation(station);
                                                        setDrawerTicketNumber(null);
                                                    }
                                                }}
                                            >
                                                <Typography variant="caption" color="text.secondary" mb={1}>
                                                    Chưa chọn vé
                                                </Typography>
                                                <Button size="small" variant="outlined" disabled={!!draftId}>
                                                    Chọn thủ công
                                                </Button>
                                            </Box>
                                        ) : (
                                            <Stack direction="row" flexWrap="wrap" gap={2}>
                                                {pickedTickets.map((ticket) => {
                                                    const key = ticketKey(station.stationId, ticket.ticketNumbers);
                                                    const qty = selectedQty[key] ?? 0;
                                                    const counterReserveOverride = ticket.serials.some(
                                                        (serial) => serial.blockedReason === "COUNTER_RESERVE" &&
                                                            serial.suggested && selectedSerialIds.includes(serial.serialId)
                                                    );
                                                    return (
                                                        <AdminTicketCard
                                                            key={ticket.ticketNumbers}
                                                            ticketNumbers={ticket.ticketNumbers}
                                                            stationName={station.stationName}
                                                            faceValue={ticket.faceValue}
                                                            quantity={qty}
                                                            isLucky={ticket.lucky}
                                                            luckyBadges={ticket.luckyBadges}
                                                            counterReserveOverride={counterReserveOverride}
                                                            actionLabel="Đổi vé"
                                                            disabled={!!draftId}
                                                            onClickAction={() => {
                                                                setDrawerStation(station);
                                                                setDrawerTicketNumber(ticket.ticketNumbers);
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </Stack>
                                        )}
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}

                    {hasLuckySelected && canOverrideLucky && !draftId && (
                        <TextField
                            sx={{ ...fieldSx, mt: 3 }}
                            fullWidth
                            multiline
                            minRows={2}
                            label="Lý do override số đẹp"
                            value={luckyOverrideReason}
                            onChange={(e) => setLuckyOverrideReason(e.target.value)}
                            helperText="Bắt buộc khi chọn vé số đẹp. Cần quyền streetAgent:manage."
                        />
                    )}

                    {draftBatch && draftBatch.status !== "DRAFT" && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Phiếu {draftBatch.batchCode}: {ALLOCATION_BATCH_STATUS_LABELS[draftBatch.status] || draftBatch.status}
                        </Alert>
                    )}
                    </Card>
                ) : (
                    <Card sx={{ p: 4, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)", textAlign: "center" }}>
                        <Typography variant="h6" gutterBottom>
                            Người bán vé số đang có phiếu bàn giao mở
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Không thể tạo thêm phiếu mới do đại lý này còn phiếu <strong>{blockingOpenBatch.batchCode}</strong> đang ở trạng thái {ALLOCATION_BATCH_STATUS_LABELS[blockingOpenBatch.status] || blockingOpenBatch.status}.
                            Vui lòng quyết toán hoặc nhận trả vé cho phiếu này trước.
                        </Typography>
                        <Button
                            variant="contained"
                            component={Link}
                            href={ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCHES}
                        >
                            Đến danh sách Phiếu bàn giao
                        </Button>
                    </Card>
                )}
            </Stack>

            {!draftId && !blockingOpenBatch && profile && hasSelectableInventory && suggestion && suggestion.allowedQuantity > 0 && totalSelected > 0 && (
                <Box
                    sx={{
                        position: "fixed",
                        bottom: 0,
                        left: { xs: 0, lg: isSidebarOpen ? "300px" : "88px" },
                        right: 0,
                        px: { xs: 2, lg: 6 }, // Add enough padding to match layout
                        py: 2,
                        bgcolor: "var(--palette-background-paper)",
                        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
                        borderTop: "1px solid var(--palette-divider)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        zIndex: 1100,
                        transition: 'left 120ms linear',
                    }}
                >
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                Tổng số vé
                            </Typography>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {totalSelected}
                            </Typography>
                        </Box>
                    </Stack>
                    <Button
                        variant="contained"
                        size="large"
                        loading={isCreatingDraft}
                        label={
                            totalSelected !== allowedQuantity
                                ? `Chọn đủ ${allowedQuantity} vé để tiếp tục`
                                : `Tạo nháp & giữ vé${
                                      vendorDefaults.draftReservationTtlMinutes != null
                                          ? ` ${vendorDefaults.draftReservationTtlMinutes} phút`
                                          : ""
                                  }`
                        }
                        loadingLabel="Đang giữ vé..."
                        onClick={handleCreateDraft}
                        disabled={!canCreateDraft}
                        sx={{
                            boxShadow: "0 8px 16px 0 rgba(0, 167, 111, 0.24)",
                            borderRadius: 2,
                            fontWeight: 700,
                            px: 5,
                            py: 1.5,
                            bgcolor: "var(--palette-primary-main, #00A76F)",
                            "&:hover": {
                                bgcolor: "var(--palette-primary-dark, #007867)"
                            }
                        }}
                    />
                </Box>
            )}


            <ConfirmVendorDepositDialog
                open={confirmOpen}
                batch={draftBatch?.status === "DRAFT" ? draftBatch : null}
                profile={profile}
                onClose={() => setConfirmOpen(false)}
                onSuccess={() => {
                    setDraftId(null);
                    setSelectedSerialIds([]);
                    setConfirmOpen(false);
                    // Open-batch query refresh shows the CONFIRMED blocker; do not refetch suggestions.
                }}
            />

            <VendorAllocationStationDrawer
                open={!!drawerStation}
                station={drawerStation}
                focusedTicketNumber={drawerTicketNumber}
                initialSelectedSerialIds={selectedSerialIds}
                initialLuckyReason={luckyOverrideReason}
                canOverrideLucky={canOverrideLucky}
                allowedQuantity={allowedQuantity}
                onClose={() => {
                    setDrawerStation(null);
                    setDrawerTicketNumber(null);
                }}
                onSave={(draftIds, draftReason) => {
                    setSelectedSerialIds(draftIds);
                    setLuckyOverrideReason(draftReason);
                    setDrawerStation(null);
                    setDrawerTicketNumber(null);
                }}
            />
        </Box>
    );
};
