import React, { useState, useEffect, useMemo } from "react";
import {
    Alert,
    Box,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
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
    Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
    VendorAllocationSerialItem,
    VendorAllocationStationGroup,
    VendorAllocationTicketGroup,
} from "../../types/street-agent.type";
import { BLOCKED_REASON_LABELS } from "../configs/constants";
import { StationCapacityBadges } from "./StationCapacityBadges";
import { Button } from "../../../../components/ui/Button";
import { formatCurrency } from "../../utils/format";
import { BADGE_COLOR_PALETTE } from "@/admin/utils/badge";
import { LuckyTicketNumber } from "../LuckyTicketNumber";

const blockedReasonLabel = (code?: string | null) => {
    if (!code) return "";
    return BLOCKED_REASON_LABELS[code] || code;
};

export interface VendorAllocationStationDrawerProps {
    open: boolean;
    station: VendorAllocationStationGroup | null;
    focusedTicketNumber?: string | null;
    initialSelectedSerialIds: number[];
    initialLuckyReason: string;
    canOverrideLucky: boolean;
    allowedQuantity: number;
    onClose: () => void;
    onSave: (draftIds: number[], luckyReason: string) => void;
}

const MONO = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
const LUCKY_ROW_BG = BADGE_COLOR_PALETTE.warning.unselected.bg;
const LUCKY_ROW_HOVER_BG = "rgba(255, 171, 0, 0.24)";
const ACTIVE_ROW_BG = "rgba(255, 48, 48, 0.08)";
const ACTIVE_ROW_HOVER_BG = "rgba(255, 48, 48, 0.12)";

const isCounterReserve = (serial: { blockedReason?: string | null }) =>
    serial.blockedReason === "COUNTER_RESERVE";

const matchesQuery = (ticketNumbers: string, serials: VendorAllocationSerialItem[], query: string) => {
    if (!query) return true;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    if (ticketNumbers.toLowerCase().includes(needle)) return true;
    return serials.some((serial) => serial.serialNumber.toLowerCase().includes(needle));
};

const visibleSerialsOf = (ticket: VendorAllocationTicketGroup, draftSerialIds: number[]) =>
    ticket.serials.filter(
        (serial) => !isCounterReserve(serial) || serial.suggested || draftSerialIds.includes(serial.serialId)
    );

const isSerialSelectable = (serial: VendorAllocationSerialItem, canOverrideLucky: boolean) =>
    serial.vendorEligible || (serial.lucky && canOverrideLucky);

export const VendorAllocationStationDrawer: React.FC<VendorAllocationStationDrawerProps> = ({
    open,
    station,
    focusedTicketNumber,
    initialSelectedSerialIds,
    initialLuckyReason,
    canOverrideLucky,
    allowedQuantity,
    onClose,
    onSave,
}) => {
    const [draftSerialIds, setDraftSerialIds] = useState<number[]>([]);
    const [luckyOverrideReason, setLuckyOverrideReason] = useState("");
    const [inlineMessage, setInlineMessage] = useState("");
    const [focusedSourceSerialId, setFocusedSourceSerialId] = useState<number | null>(null);
    const [query, setQuery] = useState("");
    const [selectedTicketNumber, setSelectedTicketNumber] = useState<string | null>(null);
    const [overrideOpen, setOverrideOpen] = useState(false);

    useEffect(() => {
        if (open) {
            setDraftSerialIds(initialSelectedSerialIds);
            setLuckyOverrideReason(initialLuckyReason);
            setInlineMessage("");
            setQuery("");
            setOverrideOpen(false);

            const firstSelected = station?.tickets.find((ticket) =>
                ticket.serials.some((serial) => initialSelectedSerialIds.includes(serial.serialId))
            );
            setSelectedTicketNumber(firstSelected?.ticketNumbers ?? station?.tickets[0]?.ticketNumbers ?? null);

            if (focusedTicketNumber && station) {
                const focusedTicket = station.tickets.find((t) => t.ticketNumbers === focusedTicketNumber);
                if (focusedTicket) {
                    const selectedSource = focusedTicket.serials.find((s) =>
                        initialSelectedSerialIds.includes(s.serialId)
                    );
                    setFocusedSourceSerialId(selectedSource ? selectedSource.serialId : null);
                } else {
                    setFocusedSourceSerialId(null);
                }
            } else {
                setFocusedSourceSerialId(null);
            }
        }
    }, [open, initialSelectedSerialIds, initialLuckyReason, focusedTicketNumber, station]);

    const ticketsToRender = useMemo(() => {
        if (!station) return [];
        if (focusedTicketNumber) {
            return station.tickets.filter((t) => {
                if (t.ticketNumbers === focusedTicketNumber) return false;

                const isAlreadyPicked = t.serials.some((s) => draftSerialIds.includes(s.serialId));
                if (isAlreadyPicked) return false;

                const hasEligible = t.serials.some((s) => {
                    if (isCounterReserve(s) && !s.suggested) return false;
                    return s.vendorEligible || (s.lucky && canOverrideLucky);
                });
                return hasEligible;
            });
        }
        return station.tickets;
    }, [station, focusedTicketNumber, draftSerialIds, canOverrideLucky]);

    const visibleTickets = useMemo(
        () => ticketsToRender.filter((ticket) => matchesQuery(ticket.ticketNumbers, ticket.serials, query)),
        [ticketsToRender, query]
    );

    useEffect(() => {
        if (!query.trim()) return;
        const firstMatch = visibleTickets[0];
        if (firstMatch) setSelectedTicketNumber(firstMatch.ticketNumbers);
    }, [query, visibleTickets]);

    const selectedTicket = useMemo(
        () => visibleTickets.find((ticket) => ticket.ticketNumbers === selectedTicketNumber) ?? null,
        [visibleTickets, selectedTicketNumber]
    );

    const totalSelected = draftSerialIds.length;

    const hasLuckySelected = useMemo(() => {
        for (const ticket of ticketsToRender) {
            if (!ticket.lucky) continue;
            if (ticket.serials.some((s) => draftSerialIds.includes(s.serialId))) {
                return true;
            }
        }
        return false;
    }, [ticketsToRender, draftSerialIds]);

    const suggestedCounterReserveCount = useMemo(() => {
        return ticketsToRender.reduce(
            (count, ticket) =>
                count +
                ticket.serials.filter(
                    (serial) =>
                        isCounterReserve(serial) && serial.suggested && draftSerialIds.includes(serial.serialId)
                ).length,
            0
        );
    }, [ticketsToRender, draftSerialIds]);

    const toggleSerial = (serialId: number, isLucky: boolean, isVendorEligible: boolean) => {
        setInlineMessage("");
        if (!isVendorEligible && !(isLucky && canOverrideLucky)) {
            return;
        }

        setDraftSerialIds((prev) => {
            const isSelected = prev.includes(serialId);
            if (isSelected) {
                return prev.filter((id) => id !== serialId);
            }
            if (focusedTicketNumber && focusedSourceSerialId) {
                if (prev.includes(focusedSourceSerialId)) {
                    return [...prev.filter((id) => id !== focusedSourceSerialId), serialId];
                }
                const currentReplacementId = prev.find((id) => !initialSelectedSerialIds.includes(id));
                if (currentReplacementId !== undefined) {
                    return [...prev.filter((id) => id !== currentReplacementId), serialId];
                }
            }

            if (prev.length >= allowedQuantity) {
                if (focusedTicketNumber && !focusedSourceSerialId) {
                    setInlineMessage("Lỗi: Không tìm thấy vé gốc để thay thế.");
                } else if (!focusedTicketNumber) {
                    setInlineMessage("Không thể chọn thêm vé. Đã đạt giới hạn.");
                } else {
                    setInlineMessage("Không thể chọn thêm vé. Hãy bỏ chọn một vé khác trước.");
                }
                return prev;
            }
            return [...prev, serialId];
        });
    };

    const toggleAllSerials = (ticket: VendorAllocationTicketGroup) => {
        const selectable = visibleSerialsOf(ticket, draftSerialIds).filter((serial) =>
            isSerialSelectable(serial, canOverrideLucky)
        );
        if (selectable.length === 0) return;

        const selectedHere = selectable.filter((serial) => draftSerialIds.includes(serial.serialId));
        const allChecked = selectedHere.length === selectable.length;

        setInlineMessage("");
        setDraftSerialIds((prev) => {
            const selectableIds = new Set(selectable.map((serial) => serial.serialId));
            if (allChecked) {
                return prev.filter((id) => !selectableIds.has(id));
            }

            const already = new Set(prev);
            const toAdd: number[] = [];
            for (const serial of selectable) {
                if (already.has(serial.serialId)) continue;
                if (prev.length + toAdd.length >= allowedQuantity) break;
                toAdd.push(serial.serialId);
            }

            if (toAdd.length === 0) {
                setInlineMessage("Không thể chọn thêm vé. Đã đạt giới hạn.");
                return prev;
            }
            return [...prev, ...toAdd];
        });
    };

    const handleSave = () => {
        if (hasLuckySelected && !canOverrideLucky) {
            return;
        }
        if (hasLuckySelected && canOverrideLucky) {
            setOverrideOpen(true);
            return;
        }
        onSave(draftSerialIds, luckyOverrideReason);
    };

    const confirmLuckyOverride = () => {
        if (!luckyOverrideReason.trim()) return;
        setOverrideOpen(false);
        onSave(draftSerialIds, luckyOverrideReason.trim());
    };

    const title = focusedTicketNumber
        ? `Đổi vé — ${station?.stationName || ""}`
        : `Chọn vé — ${station?.stationName || ""}`;

    const selectedVisibleSerials = selectedTicket ? visibleSerialsOf(selectedTicket, draftSerialIds) : [];
    const selectedSelectable = selectedVisibleSerials.filter((serial) =>
        isSerialSelectable(serial, canOverrideLucky)
    );
    const selectedInGroup = selectedVisibleSerials.filter((s) => draftSerialIds.includes(s.serialId)).length;
    const allChecked =
        selectedSelectable.length > 0 &&
        selectedSelectable.every((serial) => draftSerialIds.includes(serial.serialId));
    const someChecked = selectedInGroup > 0 && !allChecked;
    const hiddenCounterReserveCount = selectedTicket
        ? selectedTicket.serials.length - selectedVisibleSerials.length
        : 0;

    return (
        <>
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="lg"
            scroll="paper"
            PaperProps={{
                className: "admin-theme",
                sx: {
                    borderRadius: "16px",
                    boxShadow: "var(--customShadows-dialog, 0px 24px 48px -8px rgba(0, 0, 0, 0.16))",
                    maxHeight: "calc(100% - 48px)",
                    height: { xs: "100%", sm: "min(760px, calc(100% - 48px))" },
                    display: "flex",
                    flexDirection: "column",
                    bgcolor: "#FFFFFF",
                },
            }}
        >
            <DialogTitle
                sx={{
                    m: 0,
                    px: 3,
                    pt: 2.5,
                    pb: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1.5,
                    borderBottom: "1px solid var(--palette-background-neutral)",
                    flexShrink: 0,
                }}
            >
                <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap gap={1.25} sx={{ minWidth: 0, flex: 1 }}>
                    <Typography component="span" sx={{ fontWeight: 700, fontSize: "1.125rem", whiteSpace: "nowrap" }}>
                        {title}
                    </Typography>
                    {station && (
                        <StationCapacityBadges
                            vendorCapacity={station.vendorCapacity}
                            agencyReserve={station.effectiveAgencyReserveQuantity}
                            luckyQuantity={station.luckyQuantity}
                        />
                    )}
                </Stack>
                <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary", flexShrink: 0 }} aria-label="Đóng">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>

            <DialogContent
                sx={{
                    px: 0,
                    pt: "16px !important",
                    pb: 0,
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
            >
                {station && (
                    <Stack spacing={2} sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                        {suggestedCounterReserveCount > 0 && (
                            <Alert severity="warning" sx={{ mx: 3 }}>
                                BE đang đề xuất {suggestedCounterReserveCount} vé thuộc phần giữ cho quầy. Kiểm tra lại
                                trước khi lưu.
                            </Alert>
                        )}
                        {inlineMessage && (
                            <Alert severity="info" sx={{ mx: 3 }}>
                                {inlineMessage}
                            </Alert>
                        )}

                        {focusedTicketNumber &&
                            (() => {
                                const oldSerials =
                                    station.tickets.find((t) => t.ticketNumbers === focusedTicketNumber)?.serials || [];
                                const oldSelectedCount = oldSerials.filter((s) =>
                                    draftSerialIds.includes(s.serialId)
                                ).length;
                                const oldTotalInitialCount = oldSerials.filter((s) =>
                                    initialSelectedSerialIds.includes(s.serialId)
                                ).length;
                                const removedCount = oldTotalInitialCount - oldSelectedCount;
                                const newIds = draftSerialIds.filter((id) => !initialSelectedSerialIds.includes(id));

                                return (
                                    <Box
                                        sx={{
                                            mx: 3,
                                            p: 2,
                                            bgcolor: "info.lighter",
                                            borderRadius: 1.5,
                                            border: "1px solid",
                                            borderColor: "info.light",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 2,
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="subtitle2" color="info.dark">
                                                Đang thay vé: {focusedTicketNumber}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Bỏ {removedCount} vé cũ · Chọn {newIds.length} vé mới
                                            </Typography>
                                        </Box>
                                        {newIds.length > 0 && (
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                                {newIds.slice(0, 3).map((id) => {
                                                    const s = station.tickets
                                                        .flatMap((t) => t.serials)
                                                        .find((x) => x.serialId === id);
                                                    return s ? (
                                                        <Chip key={id} size="small" label={s.serialNumber} color="success" />
                                                    ) : null;
                                                })}
                                                {newIds.length > 3 && (
                                                    <Chip size="small" label={`+${newIds.length - 3}`} />
                                                )}
                                            </Stack>
                                        )}
                                    </Box>
                                );
                            })()}

                        <Box sx={{ px: 3, pt: 0.5, flexShrink: 0, overflow: "visible" }}>
                            <TextField
                                size="small"
                                placeholder="Tìm số vé hoặc seri…"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                fullWidth
                            />
                        </Box>

                        <Box
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                display: "flex",
                                flexDirection: { xs: "column", md: "row" },
                                borderTop: "1px solid #F4F6F8",
                            }}
                        >
                            <TableContainer sx={{ flex: 1, minWidth: 0, overflow: "auto" }}>
                                <Table
                                    stickyHeader
                                    size="small"
                                    sx={{ "--TableCell-stickyHeader-background": "#F4F6F8" }}
                                >
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={headCellSx}>Số vé</TableCell>
                                            <TableCell sx={headCellSx}>Mệnh giá</TableCell>
                                            <TableCell align="center" sx={headCellSx}>
                                                Đã chọn
                                            </TableCell>
                                            <TableCell align="center" sx={headCellSx}>
                                                Khả dụng
                                            </TableCell>
                                            <TableCell sx={{ ...headCellSx, width: 40 }} />
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {visibleTickets.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>
                                                    Không có vé khớp.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {visibleTickets.map((ticket, index) => {
                                            const visibleSerials = visibleSerialsOf(ticket, draftSerialIds);
                                            if (visibleSerials.length === 0) return null;

                                            const selectedCount = visibleSerials.filter((s) =>
                                                draftSerialIds.includes(s.serialId)
                                            ).length;
                                            const maxSelectable = ticket.vendorEligible
                                                ? ticket.selectableCount
                                                : ticket.lucky && canOverrideLucky
                                                  ? ticket.availableCount
                                                  : 0;
                                            const isActive = selectedTicketNumber === ticket.ticketNumbers;

                                            return (
                                                <TableRow
                                                    key={ticket.ticketNumbers}
                                                    onClick={() => setSelectedTicketNumber(ticket.ticketNumbers)}
                                                    sx={{
                                                        cursor: "pointer",
                                                        bgcolor: isActive
                                                            ? ACTIVE_ROW_BG
                                                            : ticket.lucky
                                                              ? LUCKY_ROW_BG
                                                              : index % 2 === 0
                                                                ? "#F9FAFB"
                                                                : "#FFFFFF",
                                                        boxShadow: isActive ? "inset 3px 0 0 #FF3030" : "none",
                                                        "&:hover": {
                                                            bgcolor: isActive
                                                                ? `${ACTIVE_ROW_HOVER_BG} !important`
                                                                : ticket.lucky
                                                                  ? `${LUCKY_ROW_HOVER_BG} !important`
                                                                  : "#F4F6F8 !important",
                                                        },
                                                        "&.MuiTableRow-hover:hover": {
                                                            bgcolor: isActive
                                                                ? `${ACTIVE_ROW_HOVER_BG} !important`
                                                                : ticket.lucky
                                                                  ? `${LUCKY_ROW_HOVER_BG} !important`
                                                                  : "#F4F6F8 !important",
                                                        },
                                                        "& td": {
                                                            borderBottom: "1px dashed #F4F6F8",
                                                        },
                                                    }}
                                                >
                                                    <TableCell>
                                                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                                                            <LuckyTicketNumber value={ticket.ticketNumbers} />
                                                            {ticket.lucky && (
                                                                <Chip
                                                                    size="small"
                                                                    label="Số đẹp"
                                                                    sx={{
                                                                        height: 22,
                                                                        fontWeight: 700,
                                                                        fontSize: "0.6875rem",
                                                                        bgcolor: LUCKY_ROW_BG,
                                                                        color: BADGE_COLOR_PALETTE.warning.unselected.text,
                                                                        border: "none",
                                                                    }}
                                                                />
                                                            )}
                                                        </Stack>
                                                        {ticket.blockedReason && ticket.blockedReason !== "LUCKY_PATTERN" && (
                                                            <Typography variant="caption" color="error" display="block">
                                                                {blockedReasonLabel(ticket.blockedReason)}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {formatCurrency(ticket.faceValue)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                            {selectedCount}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography variant="body2" color="text.secondary">
                                                            {maxSelectable}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ pr: 1.5 }}>
                                                        <ChevronRightIcon
                                                            sx={{
                                                                fontSize: 20,
                                                                color: isActive ? "#FF3030" : "#919EAB",
                                                            }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Box
                                sx={{
                                    width: { xs: "100%", md: 320 },
                                    flexShrink: 0,
                                    borderLeft: { md: "1px solid #F4F6F8" },
                                    borderTop: { xs: "1px solid #F4F6F8", md: "none" },
                                    display: "flex",
                                    flexDirection: "column",
                                    minHeight: { xs: 220, md: 0 },
                                    bgcolor: "#FAFBFC",
                                }}
                            >
                                {selectedTicket ? (
                                    <>
                                        <Box sx={{ px: 2, py: 2, borderBottom: "1px solid #F4F6F8", flexShrink: 0 }}>
                                            <LuckyTicketNumber value={selectedTicket.ticketNumbers} fontSize="1rem" />
                                            <Typography variant="caption" color="text.secondary">
                                                Đã chọn {selectedInGroup} / {selectedSelectable.length} seri
                                            </Typography>
                                        </Box>
                                        <Box sx={{ flex: 1, overflow: "auto", px: 1.5, py: 1 }}>
                                            <FormControlLabel
                                                disabled={selectedSelectable.length === 0}
                                                control={
                                                    <Checkbox
                                                        checked={allChecked}
                                                        indeterminate={someChecked}
                                                        onChange={() => toggleAllSerials(selectedTicket)}
                                                        sx={checkboxSx}
                                                    />
                                                }
                                                label={
                                                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                                                        Chọn tất cả
                                                    </Typography>
                                                }
                                                sx={{
                                                    m: 0,
                                                    mb: 0.75,
                                                    width: "100%",
                                                    px: 0.75,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    bgcolor: allChecked ? "rgba(255, 48, 48, 0.06)" : "transparent",
                                                }}
                                            />
                                            {selectedVisibleSerials.map((serial) => {
                                                const isPicked = draftSerialIds.includes(serial.serialId);
                                                const isSuggestedCounterReserve =
                                                    isCounterReserve(serial) && serial.suggested;
                                                const selectableSerial = isSerialSelectable(serial, canOverrideLucky);
                                                const blockedText = !selectableSerial
                                                    ? blockedReasonLabel(serial.blockedReason) || "Không hợp lệ"
                                                    : "";

                                                return (
                                                    <FormControlLabel
                                                        key={serial.serialId}
                                                        disabled={!selectableSerial}
                                                        control={
                                                            <Checkbox
                                                                checked={isPicked}
                                                                onChange={() =>
                                                                    toggleSerial(
                                                                        serial.serialId,
                                                                        !!serial.lucky,
                                                                        !!serial.vendorEligible
                                                                    )
                                                                }
                                                                sx={checkboxSx}
                                                            />
                                                        }
                                                        title={
                                                            isSuggestedCounterReserve
                                                                ? "BE đề xuất vé đang giữ cho quầy"
                                                                : blockedText
                                                        }
                                                        label={
                                                            <Typography
                                                                sx={{
                                                                    fontFamily: MONO,
                                                                    fontSize: "0.75rem",
                                                                    fontWeight: isPicked ? 700 : 500,
                                                                    textDecoration: !selectableSerial
                                                                        ? "line-through"
                                                                        : "none",
                                                                    color: isSuggestedCounterReserve
                                                                        ? "warning.dark"
                                                                        : "text.primary",
                                                                    wordBreak: "break-all",
                                                                }}
                                                            >
                                                                {serial.serialNumber}
                                                            </Typography>
                                                        }
                                                        sx={{
                                                            m: 0,
                                                            mb: 0.25,
                                                            width: "100%",
                                                            px: 0.75,
                                                            py: 0.35,
                                                            borderRadius: 1,
                                                            opacity: selectableSerial ? 1 : 0.5,
                                                            bgcolor: isPicked
                                                                ? ACTIVE_ROW_BG
                                                                : serial.lucky
                                                                  ? LUCKY_ROW_BG
                                                                  : "transparent",
                                                            "&:hover": selectableSerial
                                                                ? {
                                                                      bgcolor: isPicked
                                                                          ? ACTIVE_ROW_HOVER_BG
                                                                          : serial.lucky
                                                                            ? LUCKY_ROW_HOVER_BG
                                                                            : "rgba(145, 158, 171, 0.08)",
                                                                  }
                                                                : undefined,
                                                        }}
                                                    />
                                                );
                                            })}
                                            {hiddenCounterReserveCount > 0 && (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    display="block"
                                                    sx={{ mt: 1, ml: 0.75 }}
                                                >
                                                    Đã ẩn {hiddenCounterReserveCount} vé chừa cho quầy.
                                                </Typography>
                                            )}
                                        </Box>
                                    </>
                                ) : (
                                    <Box sx={{ p: 3, textAlign: "center", color: "text.secondary" }}>
                                        <Typography variant="body2">Chọn một số vé bên trái để xem seri.</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        {hasLuckySelected && !canOverrideLucky && (
                            <Alert severity="error" sx={{ mx: 3, mb: 2, flexShrink: 0 }}>
                                Bạn không có quyền cấp vé số đẹp.
                            </Alert>
                        )}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    px: 3,
                    py: 2,
                    gap: 1.5,
                    borderTop: "1px solid var(--palette-background-neutral)",
                    justifyContent: "space-between",
                    flexShrink: 0,
                }}
            >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Đã chọn: {totalSelected} / {allowedQuantity}
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={hasLuckySelected && !canOverrideLucky}
                    >
                        Lưu thay đổi
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>

        <Dialog
            open={overrideOpen}
            onClose={() => setOverrideOpen(false)}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                className: "admin-theme",
                sx: {
                    borderRadius: "16px",
                    boxShadow: "var(--customShadows-dialog, 0px 24px 48px -8px rgba(0, 0, 0, 0.16))",
                    bgcolor: "#FFFFFF",
                },
            }}
        >
            <DialogTitle
                sx={{
                    m: 0,
                    px: 3,
                    pt: 2.5,
                    pb: 2,
                    fontWeight: 700,
                    fontSize: "1.125rem",
                    borderBottom: "1px solid var(--palette-divider)",
                }}
            >
                Cấp vé số đẹp
            </DialogTitle>
            <DialogContent sx={{ px: 3, pt: "24px !important", pb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Vé số đẹp cần lý do khi cấp cho người bán. Lý do sẽ được lưu cùng phiếu bàn giao.
                </Typography>
                <TextField
                    autoFocus
                    fullWidth
                    multiline
                    minRows={3}
                    label="Lý do cấp vé số đẹp"
                    placeholder="Nhập lý do override..."
                    value={luckyOverrideReason}
                    onChange={(e) => setLuckyOverrideReason(e.target.value)}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2.5, gap: 1.5 }}>
                <Button variant="outlined" color="inherit" onClick={() => setOverrideOpen(false)} label="Hủy" />
                <Button
                    variant="contained"
                    onClick={confirmLuckyOverride}
                    disabled={!luckyOverrideReason.trim()}
                    label="Xác nhận"
                />
            </DialogActions>
        </Dialog>
        </>
    );
};

const checkboxSx = {
    color: "#919EAB",
    "&.Mui-checked, &.MuiCheckbox-indeterminate": {
        color: "#FF3030",
    },
};

const headCellSx = {
    fontWeight: 700,
    fontSize: "0.75rem",
    color: "#637381",
    bgcolor: "#F4F6F8",
    backgroundColor: "#F4F6F8 !important",
    borderBottom: "none",
    py: 1.25,
    px: 2,
    top: 0,
    zIndex: 3,
    position: "sticky",
};
