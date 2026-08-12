"use client";

import { useAppSearchParams } from "@/hooks/useAppSearchParams";
import Link from "@/admin/components/navigation/AdminLink";
import { ReactNode, useEffect, useMemo, useState } from "react";
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
    Tooltip,
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
import { getMetricChipSx } from "@/admin/utils/badge";
import { useVendorSettingsDefaults } from "../../hooks/useVendorSettingsDefaults";
import { ConfirmVendorDepositDialog } from "../ConfirmVendorDepositDialog";
import { AdminTicketCard } from "../../../../components/ui/AdminTicketCard";
import { StationCapacityBadges } from "../sections/StationCapacityBadges";
import { AdminDatePicker } from "../../../../components/ui/AdminDatePicker";
import { VendorAllocationStationDrawer } from "../sections/VendorAllocationStationDrawer";

const fieldSx = {
    "& .MuiOutlinedInput-root": {
        borderRadius: "var(--shape-borderRadius)",
        fontSize: "0.875rem",
    },
};

type TicketKey = string;
type AllocationSelectionMode = "SYSTEM" | "MANUAL";

const ALLOCATION_SELECTION_MODE_OPTIONS: { value: AllocationSelectionMode; label: string }[] = [
    { value: "SYSTEM", label: "Tự động" },
    { value: "MANUAL", label: "Thủ công" },
];

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
    DAILY_CAP_LIMIT: "Phiếu đang mở đã đạt giới hạn giao vé.",
    DAILY_CAP_EXHAUSTED: "Phiếu đang mở đã đạt giới hạn giao vé.",
    INSUFFICIENT_STATION_CAPACITY: "Kho không đủ vé thường sau khi chừa phần bán tại quầy.",
    NO_DRAWING_STATION: "Ngày này không có đài xổ phù hợp.",
    NO_ELIGIBLE_TICKET: "Không còn vé hợp lệ để giao.",
    NO_ELIGIBLE_INVENTORY: "Kho hiện không còn vé phù hợp để giao.",
    DRAW_SCHEDULE_MISSING: "Chưa có lịch xổ của đài nên hệ thống chưa thể xác định vé được giao.",
    DATE_NOT_SCHEDULED: "Đài không xổ vào ngày đã chọn.",
    RETURN_CUTOFF_REACHED: "Đã qua giờ nhận trả vé của ngày kinh doanh.",
    INSUFFICIENT_INVENTORY: "Kho hiện không đủ vé phù hợp để giao.",
    VENDOR_CAP_REACHED: "Đã đạt hạn mức giao vé của người bán vé số.",
    AGENCY_RESERVE_CAP: "Không đủ vé sau khi chừa quầy",
    DRAW_TIME_PASSED: "Đã qua giờ xổ",
    INSUFFICIENT_FUNDS: "Không đủ số dư cọc",
    LUCKY_TICKET_RESERVED: "Vé số đẹp đang giữ",
    STATION_BLOCKED: "Đài bị chặn",
    BUSINESS_DATE_PASSED: "Ngày kinh doanh đã qua, không thể tạo hoặc xác nhận bàn giao.",
    OPERATIONAL_DEADLINE_REACHED: "Đã qua thời điểm cuối có thể bàn giao trong ngày.",
    SUPPLIER_RETURN_CUTOFF_MISSING: "Chưa đủ giờ nhận lại vé để xác định thời điểm bàn giao.",
};

const formatTime = (value?: string | null) => {
    if (!value) return null;
    const match = value.match(/^(\d{1,2}:\d{2})/);
    return match?.[1] || value;
};

const formatDeadline = (value?: string | null, fallback?: string | null) => {
    if (value) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return `${date.toLocaleDateString("vi-VN")} lúc ${date.toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            })}`;
        }
    }
    return fallback ? formatTime(fallback) : null;
};

const mapReasonDetail = (detail: NonNullable<VendorAllocationSuggestion["reasonDetails"]>[number]) => {
    const cutoff = formatTime(detail.cutoffTime);
    const drawTime = formatTime(detail.drawTime);
    const deadline = formatDeadline(detail.effectiveDeadlineAt, cutoff);

    switch (detail.code) {
        case "OPERATIONAL_DEADLINE_REACHED":
            return deadline
                ? `Đã qua thời điểm cuối có thể bàn giao (${deadline}). Mốc này đã chừa thời gian để Đại Phát nhận lại vé.`
                : SHORTAGE_REASON_LABELS.OPERATIONAL_DEADLINE_REACHED;
        case "RETURN_CUTOFF_REACHED":
            return deadline
                ? `Đã qua giờ chốt trả vé trong ngày (${deadline}), không thể bàn giao thêm.`
                : "Đã qua giờ chốt trả vé trong ngày, không thể bàn giao thêm.";
        case "BUSINESS_DATE_PASSED":
            return SHORTAGE_REASON_LABELS.BUSINESS_DATE_PASSED;
        case "SUPPLIER_RETURN_CUTOFF_MISSING":
            return detail.stationName
                ? `Đài ${detail.stationName} chưa có giờ Đại Phát nhận lại vé; chưa thể tính giờ bàn giao.`
                : SHORTAGE_REASON_LABELS.SUPPLIER_RETURN_CUTOFF_MISSING;
        case "DRAW_TIME_PASSED":
            return detail.stationName && drawTime
                ? `Đài ${detail.stationName} đã qua giờ xổ (${drawTime}), không còn vé được giao.`
                : SHORTAGE_REASON_LABELS.DRAW_TIME_PASSED;
        case "DAILY_CAP_LIMIT":
        case "DAILY_CAP_EXHAUSTED":
            return detail.remainingDailyCap == null || detail.remainingDailyCap <= 0
                ? "Phiếu đang mở đã đạt giới hạn giao vé. Hoàn tất hoặc hủy phiếu này trước khi tạo phiếu mới."
                : `Phiếu đang mở chỉ còn có thể thêm ${detail.remainingDailyCap} vé.`;
        case "INSUFFICIENT_STATION_CAPACITY":
            if (detail.requestedQuantity != null && detail.vendorCapacity != null) {
                return `Kho chỉ có thể giao ${detail.vendorCapacity}/${detail.requestedQuantity} vé sau khi chừa vé cho quầy.`;
            }
            return SHORTAGE_REASON_LABELS.INSUFFICIENT_STATION_CAPACITY;
        default:
            return SHORTAGE_REASON_LABELS[detail.code] || null;
    }
};

const getSuggestionReasonMessages = (suggestion?: VendorAllocationSuggestion | null) => {
    const detailMessages = (suggestion?.reasonDetails || [])
        .map(mapReasonDetail)
        .filter((message): message is string => Boolean(message));
    if (detailMessages.length > 0) return Array.from(new Set(detailMessages));
    return [mapShortageReasons(suggestion?.shortageReasons, suggestion?.blockedReason)];
};

const DisabledWithTooltip = ({
    title,
    disabled,
    children,
    fullWidth = false,
}: {
    title: string | null;
    disabled: boolean;
    children: ReactNode;
    fullWidth?: boolean;
}) => {
    if (!disabled || !title) {
        return <>{children}</>;
    }

    return (
        <Tooltip title={title} arrow>
            <span
                style={{
                    display: fullWidth ? "block" : "inline-flex",
                    width: fullWidth ? "100%" : undefined,
                }}
            >
                {children}
            </span>
        </Tooltip>
    );
};

const isVendorOpenBatchBlockedMessage = (message?: string | null) =>
    !!message &&
    /phiếu bàn giao/i.test(message) &&
    /quyết toán|chưa đóng|chưa quyết/i.test(message);

const mapShortageReasons = (reasons?: string[] | null, blockedReason?: string | null) => {
    if (blockedReason === "DRAW_TIME_PASSED" || reasons?.includes("DRAW_TIME_PASSED")) {
        return "Đã qua giờ xổ của các đài hôm nay, không còn vé có thể giao.";
    }
    if (blockedReason && SHORTAGE_REASON_LABELS[blockedReason]) {
        return SHORTAGE_REASON_LABELS[blockedReason];
    }
    if (!reasons || reasons.length === 0) {
        return "Kho hiện không còn vé phù hợp để giao.";
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

    // A DRAFT batch only holds serials temporarily. It is rendered by the
    // draft banner below and must not be presented as an unsettled handover.
    // Only a confirmed/return-open batch blocks a new allocation and produces
    // the "chưa quyết toán" warning.
    const blockingOpenBatch =
        openBatch && (openBatch.status === "CONFIRMED" || openBatch.status === "RETURN_OPEN")
            ? openBatch
            : null;

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
        !blockingOpenBatch &&
        !draftId &&
        openBatch?.status !== "DRAFT" &&
        !isLoadingOpen &&
        !isFetchingOpen &&
        profile?.status === "ACTIVE"
    );

    const { data: draftBatch } = useVendorAllocationBatch(draftId);
    const { mutate: createDraft, isPending: isCreatingDraft } = useCreateVendorAllocationDraft();
    const { mutate: cancelDraft, isPending: isCancelling } = useCancelVendorAllocation();
    const { defaults: vendorDefaults } = useVendorSettingsDefaults();

    const hasActiveDraft = Boolean(
        draftId ||
        openBatch?.status === "DRAFT" ||
        draftBatch?.status === "DRAFT"
    );

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
    const availableForCurrentBatch =
        remainingCap ?? profile?.remainingDailyCap ?? profile?.effectiveDailyCap ?? null;
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
    const suggestionReasonMessages = getSuggestionReasonMessages(suggestion);

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
            toast.error(`Số vé chọn vượt số lượng còn có thể thêm vào phiếu (${remainingCap})`);
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

    const vendorOpenBatchAlertMessage = useMemo(() => {
        // A draft is already explained by the reservation banner. In
        // particular, ignore a stale SAG_010 suggestion error caused by the
        // draft itself being part of the backend's open-batch guard.
        if (hasActiveDraft) {
            return null;
        }
        if (blockingOpenBatch) {
            return (
                <>
                    Vendor vẫn còn phiếu bàn giao <strong>{blockingOpenBatch.batchCode}</strong> chưa quyết toán (
                    {ALLOCATION_BATCH_STATUS_LABELS[blockingOpenBatch.status] || blockingOpenBatch.status}
                    ). Không thể tạo phiếu nháp mới cho đến khi phiếu này được quyết toán / đóng.
                </>
            );
        }
        if (isVendorOpenBatchBlockedMessage(suggestionErrorMessage)) {
            return suggestionErrorMessage;
        }
        return null;
    }, [blockingOpenBatch, hasActiveDraft, suggestionErrorMessage]);

    const businessDateDisabledReason = draftId
        ? `Đang có phiếu nháp${draftBatch?.batchCode ? ` ${draftBatch.batchCode}` : ""} — không thể đổi ngày kinh doanh.`
        : null;

    const selectionModeDisabledReason = draftId
        ? "Đang có phiếu nháp — không thể đổi cách chọn vé."
        : isFetchingSuggestion
          ? "Đang cập nhật gợi ý bàn giao…"
          : null;

    const manualPickDisabledReason = draftId
        ? "Đang có phiếu nháp — không thể chọn vé thủ công."
        : blockingOpenBatch
          ? `Còn phiếu mở ${blockingOpenBatch.batchCode} — không thể chọn vé mới.`
          : profile?.status !== "ACTIVE"
            ? "Người bán vé số chưa kích hoạt — không thể chọn vé."
            : null;

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
                {draftBatch?.status === "DRAFT" && (
                    <Alert
                        severity={isExpired ? "error" : "warning"}
                        action={
                            canEdit ? (
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Button
                                        color="inherit"
                                        size="small"
                                        disabled={isCancelling}
                                        onClick={handleCancel}
                                    >
                                        Hủy nháp
                                    </Button>
                                    {isExpired ? (
                                        <Button
                                            color="inherit"
                                            size="small"
                                            disabled={isCancelling}
                                            onClick={handleCancel}
                                        >
                                            Làm mới báo giá
                                        </Button>
                                    ) : null}
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
                        Phiếu {draftBatch.batchCode} đang giữ {draftBatch.allocatedQuantity} vé. Hết hạn giữ chỗ sau <strong>{countdown}</strong>
                        {isExpired ? " (đã hết hạn)." : "."}
                    </Alert>
                )}

                {vendorOpenBatchAlertMessage && (
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
                        {vendorOpenBatchAlertMessage}
                    </Alert>
                )}

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
                            loadingText="Đang tải danh sách…"
                            noOptionsText="Không tìm thấy người bán vé số"
                            renderInput={(params) => (
                                <TextField {...params} label="Người bán vé số *" sx={fieldSx} />
                            )}
                        />
                        <DisabledWithTooltip
                            title={businessDateDisabledReason}
                            disabled={!!businessDateDisabledReason}
                            fullWidth
                        >
                            <AdminDatePicker
                                label="Ngày kinh doanh"
                                value={businessDate}
                                onChange={setBusinessDate}
                                disabled={!!businessDateDisabledReason}
                            />
                        </DisabledWithTooltip>
                    </Box>

                    {profile && (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mt: 2 }} flexWrap="wrap">
                            <Chip
                                size="small"
                                label={`Tin cậy: ${CONFIDENCE_TIER_LABELS[profile.confidenceTier || ""] || profile.confidenceTier || "—"}`}
                                sx={getMetricChipSx("success")}
                            />
                            <Chip
                                size="small"
                                label={`Có thể giao trong phiếu này: ${availableForCurrentBatch == null ? "—" : `${availableForCurrentBatch} vé`}`}
                                sx={getMetricChipSx("info")}
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
                {suggestionErrorMessage && !hasActiveDraft && !vendorOpenBatchAlertMessage && (
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
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }} flexWrap="wrap" useFlexGap>
                            {hasSelectableInventory && (suggestion?.allowedQuantity ?? 0) > 0 && (
                                <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 700,
                                            color: "var(--palette-text-primary)",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        Đã chọn {totalSelected}/{suggestion?.allowedQuantity ?? 0}:
                                    </Typography>
                                    <DisabledWithTooltip
                                        title={selectionModeDisabledReason}
                                        disabled={!!selectionModeDisabledReason}
                                    >
                                        <Box
                                            role="group"
                                            aria-label="Cách chọn vé"
                                            sx={{
                                                display: "inline-flex",
                                                width: { xs: "100%", sm: 200 },
                                                minWidth: { sm: 200 },
                                                p: "3px",
                                                borderRadius: "10px",
                                                border: "1px solid",
                                                borderColor: "divider",
                                                bgcolor: "background.paper",
                                                opacity: selectionModeDisabledReason ? 0.6 : 1,
                                            }}
                                        >
                                            {ALLOCATION_SELECTION_MODE_OPTIONS.map((option) => {
                                                const selected = selectionMode === option.value;
                                                return (
                                                    <Box
                                                        key={option.value}
                                                        component="button"
                                                        type="button"
                                                        disabled={!!selectionModeDisabledReason}
                                                        onClick={() => changeSelectionMode(option.value)}
                                                        sx={{
                                                            flex: 1,
                                                            width: "50%",
                                                            border: 0,
                                                            borderRadius: "8px",
                                                            py: 0.75,
                                                            px: 1,
                                                            fontSize: "0.8125rem",
                                                            fontWeight: selected ? 600 : 500,
                                                            lineHeight: 1.2,
                                                            cursor: selectionModeDisabledReason ? "not-allowed" : "pointer",
                                                            bgcolor: selected ? "action.selected" : "transparent",
                                                            color: "text.primary",
                                                            transition: "background-color 0.15s ease",
                                                            "&:hover": selectionModeDisabledReason
                                                                ? undefined
                                                                : {
                                                                      bgcolor: selected ? "action.selected" : "action.hover",
                                                                  },
                                                        }}
                                                    >
                                                        {option.label}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </DisabledWithTooltip>
                                </Stack>
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
                                    <Stack spacing={0.25}>
                                        <Typography variant="body2">
                                            Chỉ có thể bàn giao {suggestion.allowedQuantity}/{suggestion.requestedQuantity} vé.
                                        </Typography>
                                        {suggestionReasonMessages.map((message) => (
                                            <Typography key={message} variant="body2">{message}</Typography>
                                        ))}
                                    </Stack>
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
                            <Stack spacing={0.25}>
                                {suggestionReasonMessages.map((message) => (
                                    <Typography key={message} variant="body2">{message}</Typography>
                                ))}
                            </Stack>
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
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            spacing={1}
                                            flexWrap="wrap"
                                            useFlexGap
                                            sx={{ mb: 1.5 }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontWeight: 700,
                                                    fontSize: { xs: "1.0625rem", sm: "1.25rem" },
                                                    lineHeight: 1.2,
                                                    color: "var(--palette-text-primary)",
                                                }}
                                            >
                                                {station.stationName}
                                            </Typography>
                                            <StationCapacityBadges
                                                vendorCapacity={station.vendorCapacity}
                                                agencyReserve={station.effectiveAgencyReserveQuantity}
                                            />
                                        </Stack>

                                        {station.vendorCapacity === 0 ? (
                                            <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
                                                Hết vé (Đã chừa quầy)
                                            </Typography>
                                        ) : !hasPicked ? (
                                            <DisabledWithTooltip
                                                title={manualPickDisabledReason}
                                                disabled={!!manualPickDisabledReason}
                                            >
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
                                                        cursor: manualPickDisabledReason ? "not-allowed" : "pointer",
                                                        opacity: manualPickDisabledReason ? 0.6 : 1,
                                                        transition: "border-color 0.2s",
                                                        "&:hover": manualPickDisabledReason
                                                            ? undefined
                                                            : { borderColor: "primary.main" },
                                                    }}
                                                    onClick={() => {
                                                        if (manualPickDisabledReason) return;
                                                        setSelectionMode("MANUAL");
                                                        setSelectedSerialIds([]);
                                                        setDrawerStation(station);
                                                        setDrawerTicketNumber(null);
                                                    }}
                                                >
                                                    <Typography variant="caption" color="text.secondary" mb={1}>
                                                        Chưa chọn vé
                                                    </Typography>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        disabled={!!manualPickDisabledReason}
                                                    >
                                                        Chọn thủ công
                                                    </Button>
                                                </Box>
                                            </DisabledWithTooltip>
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
