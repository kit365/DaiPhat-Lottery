"use client";

import { useEffect, useMemo, useState } from "react";
import { useSidebar } from "../../../../context/sidebar/useSidebar";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    Chip,
    CircularProgress,
    Divider,
    Drawer,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CloseIcon from "@mui/icons-material/Close";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { Link as RouterLink, useSearchParams } from "@/components/router-compat";
import { Breadcrumb } from "../../../../components/ui/Breadcrumb";
import { Title } from "../../../../components/ui/Title";
import { LoadingButton } from "../../../../components/ui/LoadingButton";
import { ROUTES } from "../../../../constants/routes";
import { PERMISSIONS } from "../../../../constants/permission.constants";
import { usePermissions } from "../../../../hooks/usePermission";
import { useStreetAgentProfiles } from "../../hooks/useStreetAgent";
import {
    useCancelVendorAllocation,
    useCreateVendorAllocationDraft,
    useVendorAllocationBatch,
    useVendorAllocationOpenBatch,
    useVendorAllocationSuggestion,
} from "../../hooks/useVendorAllocation";
import {
    StreetAgentProfile,
    VendorAllocationSerialItem,
    VendorAllocationTicketGroup,
} from "../../types/street-agent.type";
import {
    ALLOCATION_BATCH_STATUS_LABELS,
    BLOCKED_REASON_LABELS,
    CONFIDENCE_TIER_CAP_PERCENT,
    CONFIDENCE_TIER_LABELS,
} from "../configs/constants";
import { formatCountdown, formatCurrency, formatDate } from "../../utils/format";
import {
    useVendorSettingsDefaults,
    VENDOR_LATE_RETURN_POLICY_LABELS,
} from "../../hooks/useVendorSettingsDefaults";
import { ConfirmVendorDepositDialog } from "../ConfirmVendorDepositDialog";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

type TicketKey = string;

const ticketKey = (stationId: number, ticketNumbers: string): TicketKey =>
    `${stationId}::${ticketNumbers}`;

const getApiErrorMessage = (error: any, fallback: string) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;
    if (status === 409) {
        return message || "Vé vừa bị nhân viên khác giữ chỗ. Vui lòng tải lại danh sách.";
    }
    return message || fallback;
};

const maxSelectableForTicket = (
    ticket: VendorAllocationTicketGroup,
    canOverrideLucky: boolean
) => {
    if (ticket.vendorEligible) return ticket.selectableCount;
    if (ticket.lucky && canOverrideLucky) return ticket.availableCount;
    return 0;
};

const pickSerialIds = (
    ticket: VendorAllocationTicketGroup,
    qty: number,
    canOverrideLucky: boolean
): number[] => {
    if (qty <= 0) return [];
    const pool: VendorAllocationSerialItem[] = ticket.vendorEligible
        ? ticket.serials.filter((s) => s.vendorEligible)
        : ticket.lucky && canOverrideLucky
          ? ticket.serials
          : [];
    return pool.slice(0, qty).map((s) => s.serialId);
};

export const VendorAllocationPage = () => {
    const { can } = usePermissions();
    const canOverrideLucky = can(PERMISSIONS.STREET_AGENT.MANAGE);
    const [searchParams, setSearchParams] = useSearchParams();
    const { isOpen: isSidebarOpen } = useSidebar();

    const [profile, setProfile] = useState<StreetAgentProfile | null>(null);
    const [businessDate, setBusinessDate] = useState(
        () => searchParams.get("businessDate") || dayjs().format("YYYY-MM-DD")
    );
    const [selectedQty, setSelectedQty] = useState<Record<TicketKey, number>>({});
    const [luckyOverrideReason, setLuckyOverrideReason] = useState("");
    const [draftId, setDraftId] = useState<number | null>(() => {
        const raw = searchParams.get("draftId");
        const parsed = raw ? Number(raw) : NaN;
        return Number.isFinite(parsed) ? parsed : null;
    });
    const [nowMs, setNowMs] = useState(Date.now());
    const [serialDrawer, setSerialDrawer] = useState<{
        stationName: string;
        ticket: VendorAllocationTicketGroup;
    } | null>(null);
    const [hydratedProfileFromUrl, setHydratedProfileFromUrl] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const { data: profilesRes, isLoading: isLoadingProfiles } = useStreetAgentProfiles({
        page: 1,
        limit: 100,
        status: "ACTIVE",
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
        !blockingOpenBatch
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
        setSelectedQty({});
        setLuckyOverrideReason("");
        setSerialDrawer(null);
        setDraftId(null);
    }, [profile?.id]);

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
        setSearchParams(next, { replace: true });
    }, [profile?.id, businessDate, draftId, setSearchParams]);

    useEffect(() => {
        if (!suggestion?.stations || draftId) return;
        const next: Record<TicketKey, number> = {};
        for (const station of suggestion.stations) {
            for (const ticket of station.tickets) {
                next[ticketKey(station.stationId, ticket.ticketNumbers)] = ticket.suggestedCount;
            }
        }
        setSelectedQty(next);
    }, [suggestion, draftId]);

    useEffect(() => {
        if (draftBatch?.status && draftBatch.status !== "DRAFT") {
            setDraftId(null);
            setSelectedQty({});
        }
    }, [draftBatch?.status]);

    const theoreticalCap = useMemo(() => {
        if (!profile?.dailyTicketCap) return null;
        const ratio = CONFIDENCE_TIER_CAP_PERCENT[profile.confidenceTier || "NEW"] ?? 0.25;
        return Math.floor(profile.dailyTicketCap * ratio);
    }, [profile]);

    const selectedSerialIds = useMemo(() => {
        if (!suggestion?.stations) return [] as number[];
        const ids: number[] = [];
        for (const station of suggestion.stations) {
            for (const ticket of station.tickets) {
                const key = ticketKey(station.stationId, ticket.ticketNumbers);
                const qty = selectedQty[key] ?? 0;
                ids.push(...pickSerialIds(ticket, qty, canOverrideLucky));
            }
        }
        return ids;
    }, [suggestion, selectedQty, canOverrideLucky]);

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
    const remainingCap = suggestion?.remainingDailyCap ?? theoreticalCap;

    const hasSelectableInventory = useMemo(() => {
        if (!suggestion?.stations?.length) return false;
        return suggestion.stations.some((station) =>
            station.tickets.some((ticket) => ticket.selectableCount > 0 && ticket.vendorEligible)
        );
    }, [suggestion]);

    const suggestionBlockedMessage = suggestion?.blockedReason
        ? BLOCKED_REASON_LABELS[suggestion.blockedReason] || suggestion.blockedReason
        : null;

    const canCreateDraft =
        !draftId &&
        !blockingOpenBatch &&
        !!profile &&
        !suggestionBlockedMessage &&
        (remainingCap ?? 0) > 0 &&
        hasSelectableInventory &&
        totalSelected > 0;

    const adjustQty = (stationId: number, ticket: VendorAllocationTicketGroup, delta: number) => {
        if (draftId) return;
        const key = ticketKey(stationId, ticket.ticketNumbers);
        const max = maxSelectableForTicket(ticket, canOverrideLucky);
        setSelectedQty((prev) => {
            const current = prev[key] ?? 0;
            const next = Math.max(0, Math.min(max, current + delta));
            return { ...prev, [key]: next };
        });
    };

    const selectAllSelectable = () => {
        if (draftId || !suggestion?.stations?.length) return;
        let remaining = remainingCap == null ? Number.POSITIVE_INFINITY : Math.max(0, remainingCap);
        const next: Record<TicketKey, number> = {};
        for (const station of suggestion.stations) {
            for (const ticket of station.tickets) {
                const key = ticketKey(station.stationId, ticket.ticketNumbers);
                const max = maxSelectableForTicket(ticket, canOverrideLucky);
                const take = Math.min(max, remaining);
                next[key] = take;
                remaining -= take;
            }
        }
        setSelectedQty(next);
    };

    const clearSelection = () => {
        if (draftId) return;
        setSelectedQty({});
    };

    const handleCreateDraft = () => {
        if (!profile?.id) {
            toast.error("Vui lòng chọn đại lý bán dạo");
            return;
        }
        if (blockingOpenBatch) {
            toast.error(
                `Vendor còn phiếu mở ${blockingOpenBatch.batchCode} (${ALLOCATION_BATCH_STATUS_LABELS[blockingOpenBatch.status] || blockingOpenBatch.status}). Không thể tạo phiếu mới.`
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

        createDraft(
            {
                streetAgentProfileId: profile.id,
                businessDate,
                serialIds: selectedSerialIds,
                luckyOverrideReason: hasLuckySelected ? luckyOverrideReason.trim() : undefined,
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
                setSelectedQty({});
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
            <div className="mb-[calc(3*var(--spacing))] flex items-start justify-end gap-[calc(2*var(--spacing))] flex-wrap">
                <div className="mr-auto">
                    <Title title="Bàn giao vé cho đại lý bán dạo" />
                    <Breadcrumb
                        items={[
                            { label: "Dashboard", to: "/" },
                            { label: "Đại lý bán dạo", to: ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.LIST },
                            { label: "Bàn giao vé" },
                        ]}
                    />
                </div>
            </div>

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
                                <TextField {...params} label="Đại lý bán dạo *" sx={fieldSx} />
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
                            <Chip size="small" label={`Hạn mức ngày: ${profile.dailyTicketCap ?? "—"}`} sx={{ fontWeight: 600 }} />
                            <Chip
                                size="small"
                                label={`Tin cậy: ${CONFIDENCE_TIER_LABELS[profile.confidenceTier || ""] || profile.confidenceTier || "—"}`}
                                sx={{ fontWeight: 600 }}
                            />
                            <Chip
                                size="small"
                                label={`Cap theo confidence: ${theoreticalCap ?? "—"}`}
                                sx={{ fontWeight: 600 }}
                            />
                            <Chip
                                size="small"
                                label={`Cọc đang giữ: ${formatCurrency(profile.depositBalance)}`}
                                sx={{ fontWeight: 600 }}
                            />
                            <Chip
                                size="small"
                                label={`Giá vendor: ${formatCurrency(vendorDefaults.defaultUnitPrice)}`}
                                sx={{ fontWeight: 600 }}
                            />
                            <Chip
                                size="small"
                                label={`Tỷ lệ cọc: ${
                                    vendorDefaults.depositRate == null
                                        ? "—"
                                        : `${(vendorDefaults.depositRate * 100).toLocaleString("vi-VN", {
                                              maximumFractionDigits: 2,
                                          })}%`
                                }`}
                                sx={{ fontWeight: 600 }}
                            />
                            <Chip
                                size="small"
                                label={`TTL nháp: ${
                                    vendorDefaults.draftReservationTtlMinutes == null
                                        ? "—"
                                        : `${vendorDefaults.draftReservationTtlMinutes} phút`
                                }`}
                                sx={{ fontWeight: 600 }}
                            />
                            <Chip
                                size="small"
                                label={`Giờ chốt: ${vendorDefaults.returnCutoff || "—"}`}
                                sx={{ fontWeight: 600 }}
                            />
                            <Chip
                                size="small"
                                label={`Trả trễ: ${
                                    vendorDefaults.lateReturnPolicy
                                        ? VENDOR_LATE_RETURN_POLICY_LABELS[vendorDefaults.lateReturnPolicy]
                                        : "—"
                                }`}
                                sx={{ fontWeight: 600 }}
                            />
                            {suggestion?.counterReservePerStation != null && (
                                <Chip
                                    size="small"
                                    label={`Chừa quầy/đài: ${suggestion.counterReservePerStation}`}
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
                                component={RouterLink}
                                to={ROUTES.ADMIN.ACCOUNTS.STREET_AGENT.ALLOCATION_BATCHES}
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
                            <Stack direction="row" spacing={1}>
                                <Button color="inherit" size="small" disabled={isCancelling} onClick={handleCancel}>
                                    Hủy nháp
                                </Button>
                                <Button
                                    color="inherit"
                                    size="small"
                                    disabled={isExpired}
                                    onClick={() => setConfirmOpen(true)}
                                >
                                    Xác nhận bàn giao
                                </Button>
                            </Stack>
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

                {suggestionErrorMessage && (
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

                <Card sx={{ p: 3, borderRadius: "var(--shape-borderRadius-lg)", boxShadow: "var(--customShadows-card)" }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Gợi ý bàn giao {businessDate ? `— ${formatDate(businessDate)}` : ""}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                                Đã chọn: {totalSelected}
                                {remainingCap != null ? ` · Cap còn lại: ${remainingCap}` : ""}
                                {suggestion?.suggestedQuantity != null
                                    ? ` · Gợi ý: ${suggestion.suggestedQuantity}`
                                    : ""}
                            </Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={selectAllSelectable}
                                disabled={
                                    !!draftId ||
                                    !profile ||
                                    !hasSelectableInventory ||
                                    (remainingCap ?? 0) <= 0
                                }
                            >
                                Chọn tất cả
                            </Button>
                            <Button
                                size="small"
                                onClick={clearSelection}
                                disabled={!!draftId || totalSelected === 0}
                            >
                                Bỏ chọn
                            </Button>
                            <Button size="small" onClick={() => refetchSuggestion()} disabled={!profile || isFetchingSuggestion}>
                                Tải lại gợi ý
                            </Button>
                        </Stack>
                    </Stack>

                    {!profile ? (
                        <Alert severity="info">
                            Chọn đại lý bán dạo để xem gợi ý phân bổ vé theo đài và số vé.
                        </Alert>
                    ) : isLoadingSuggestion ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                            <CircularProgress />
                        </Box>
                    ) : !suggestion?.stations?.length ? (
                        <Alert severity={suggestionBlockedMessage ? "warning" : "info"}>
                            {suggestionBlockedMessage || "Không có vé phù hợp cho ngày này."}
                        </Alert>
                    ) : (
                        <Stack spacing={3}>
                            {suggestion.stations.map((station) => (
                                <Box key={station.stationId}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                                        {station.stationName}
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            sx={{ ml: 1, color: "var(--palette-text-secondary)" }}
                                        >
                                            (chọn được {station.selectableCount}/{station.availableCount} · gợi ý {station.suggestedCount})
                                        </Typography>
                                    </Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Số vé</TableCell>
                                                    <TableCell align="right">Còn</TableCell>
                                                    <TableCell align="center">Đã chọn</TableCell>
                                                    <TableCell>Badge</TableCell>
                                                    <TableCell>Trạng thái</TableCell>
                                                    <TableCell align="right" />
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {station.tickets.map((ticket) => {
                                                    const key = ticketKey(station.stationId, ticket.ticketNumbers);
                                                    const qty = selectedQty[key] ?? 0;
                                                    const max = maxSelectableForTicket(ticket, canOverrideLucky);
                                                    const canAdjust = max > 0 && !draftId;
                                                    return (
                                                        <TableRow
                                                            key={key}
                                                            hover
                                                            sx={{
                                                                opacity: max > 0 || qty > 0 ? 1 : 0.55,
                                                                bgcolor: ticket.lucky ? "rgba(245, 158, 11, 0.04)" : undefined,
                                                            }}
                                                        >
                                                            <TableCell>
                                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                                    Số {ticket.ticketNumbers}
                                                                </Typography>
                                                                <Typography variant="caption" sx={{ color: "var(--palette-text-secondary)" }}>
                                                                    {formatCurrency(ticket.faceValue)}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell align="right">{ticket.availableCount}</TableCell>
                                                            <TableCell align="center">
                                                                <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                                                                    <IconButton
                                                                        size="small"
                                                                        disabled={!canAdjust || qty <= 0}
                                                                        onClick={() => adjustQty(station.stationId, ticket, -1)}
                                                                        aria-label="Giảm số lượng"
                                                                    >
                                                                        <RemoveIcon fontSize="small" />
                                                                    </IconButton>
                                                                    <Typography variant="body2" sx={{ minWidth: 24, textAlign: "center", fontWeight: 700 }}>
                                                                        {qty}
                                                                    </Typography>
                                                                    <IconButton
                                                                        size="small"
                                                                        disabled={!canAdjust || qty >= max}
                                                                        onClick={() => adjustQty(station.stationId, ticket, 1)}
                                                                        aria-label="Tăng số lượng"
                                                                    >
                                                                        <AddIcon fontSize="small" />
                                                                    </IconButton>
                                                                </Stack>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                                                    {(ticket.luckyBadges || []).map((badge) => (
                                                                        <Chip
                                                                            key={`${key}-${badge}`}
                                                                            size="small"
                                                                            label={badge}
                                                                            sx={{ fontWeight: 700 }}
                                                                        />
                                                                    ))}
                                                                    {!ticket.luckyBadges?.length && ticket.lucky && (
                                                                        <Chip size="small" label="Số đẹp" sx={{ fontWeight: 700 }} />
                                                                    )}
                                                                </Stack>
                                                            </TableCell>
                                                            <TableCell>
                                                                {ticket.vendorEligible ? (
                                                                    <Chip size="small" label="Có thể giao" color="success" variant="outlined" />
                                                                ) : (
                                                                    <Chip
                                                                        size="small"
                                                                        label={
                                                                            BLOCKED_REASON_LABELS[ticket.blockedReason || ""] ||
                                                                            ticket.blockedReason ||
                                                                            "Bị chặn"
                                                                        }
                                                                        color="warning"
                                                                        variant="outlined"
                                                                    />
                                                                )}
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <Button
                                                                    size="small"
                                                                    onClick={() =>
                                                                        setSerialDrawer({
                                                                            stationName: station.stationName,
                                                                            ticket,
                                                                        })
                                                                    }
                                                                >
                                                                    Xem serial
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            ))}
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
            </Stack>

            {!draftId && !blockingOpenBatch && profile && (
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
                    <LoadingButton
                        variant="contained"
                        size="large"
                        loading={isCreatingDraft}
                        label={`Tạo nháp & giữ vé${
                            vendorDefaults.draftReservationTtlMinutes != null
                                ? ` ${vendorDefaults.draftReservationTtlMinutes} phút`
                                : ""
                        }`}
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
                    setSelectedQty({});
                    setConfirmOpen(false);
                    // Open-batch query refresh shows the CONFIRMED blocker; do not refetch suggestions.
                }}
            />

            <Drawer
                anchor="right"
                open={!!serialDrawer}
                onClose={() => setSerialDrawer(null)}
                PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}
            >
                {serialDrawer && (
                    <Box sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column" }}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                    Serial — Số {serialDrawer.ticket.ticketNumbers}
                                </Typography>
                                <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                                    {serialDrawer.stationName} · {serialDrawer.ticket.availableCount} vé vật lý
                                </Typography>
                            </Box>
                            <IconButton onClick={() => setSerialDrawer(null)} aria-label="Đóng">
                                <CloseIcon />
                            </IconButton>
                        </Stack>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ overflow: "auto", flex: 1 }}>
                            <Stack spacing={1}>
                                {serialDrawer.ticket.serials.map((serial) => {
                                    const selected = selectedSerialIds.includes(serial.serialId);
                                    return (
                                        <Box
                                            key={serial.serialId}
                                            sx={{
                                                px: 1.5,
                                                py: 1,
                                                borderRadius: "var(--shape-borderRadius)",
                                                border: "1px solid",
                                                borderColor: selected
                                                    ? "var(--palette-primary-main)"
                                                    : "var(--palette-divider)",
                                                bgcolor: selected ? "action.hover" : "transparent",
                                            }}
                                        >
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                                                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                                                    {serial.serialNumber}
                                                </Typography>
                                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                                    {selected && <Chip size="small" label="Đã chọn" color="primary" variant="outlined" />}
                                                    {serial.lucky && <Chip size="small" label="Số đẹp" sx={{ fontWeight: 700 }} />}
                                                    {!serial.vendorEligible && (
                                                        <Chip
                                                            size="small"
                                                            label={
                                                                BLOCKED_REASON_LABELS[serial.blockedReason || ""] ||
                                                                serial.blockedReason ||
                                                                "Chặn"
                                                            }
                                                            color="warning"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                </Stack>
                                            </Stack>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        </Box>
                    </Box>
                )}
            </Drawer>
        </Box>
    );
};
