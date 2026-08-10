import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Button,
    Divider,
    Drawer,
    IconButton,
    Stack,
    Typography,
    TextField,
    Alert,
    Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { VendorAllocationStationGroup } from "../../types/street-agent.type";

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

    useEffect(() => {
        if (open) {
            setDraftSerialIds(initialSelectedSerialIds);
            setLuckyOverrideReason(initialLuckyReason);
            setInlineMessage("");

            if (focusedTicketNumber && station) {
                const focusedTicket = station.tickets.find(t => t.ticketNumbers === focusedTicketNumber);
                if (focusedTicket) {
                    const selectedSource = focusedTicket.serials.find(s => initialSelectedSerialIds.includes(s.serialId));
                    setFocusedSourceSerialId(selectedSource ? selectedSource.serialId : null);
                } else {
                    setFocusedSourceSerialId(null);
                }
            } else {
                setFocusedSourceSerialId(null);
            }
        }
    }, [open, initialSelectedSerialIds, initialLuckyReason, focusedTicketNumber, station]);

    const isCounterReserve = (serial: { blockedReason?: string | null }) =>
        serial.blockedReason === "COUNTER_RESERVE";

    const ticketsToRender = useMemo(() => {
        if (!station) return [];
        if (focusedTicketNumber) {
            return station.tickets.filter(t => {
                if (t.ticketNumbers === focusedTicketNumber) return false;

                const isAlreadyPicked = t.serials.some(s => draftSerialIds.includes(s.serialId));
                if (isAlreadyPicked) return false;

                const hasEligible = t.serials.some(s => {
                    if (isCounterReserve(s) && !s.suggested) return false;
                    return s.vendorEligible || (s.lucky && canOverrideLucky);
                });
                return hasEligible;
            });
        }
        return station.tickets;
    }, [station, focusedTicketNumber, draftSerialIds, canOverrideLucky]);

    const totalSelected = draftSerialIds.length;

    const hasLuckySelected = useMemo(() => {
        for (const ticket of ticketsToRender) {
            if (!ticket.lucky) continue;
            if (ticket.serials.some(s => draftSerialIds.includes(s.serialId))) {
                return true;
            }
        }
        return false;
    }, [ticketsToRender, draftSerialIds]);

    const suggestedCounterReserveCount = useMemo(() => {
        return ticketsToRender.reduce(
            (count, ticket) => count + ticket.serials.filter(
                (serial) => isCounterReserve(serial) && serial.suggested && draftSerialIds.includes(serial.serialId)
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
            } else {
                if (focusedTicketNumber && focusedSourceSerialId) {
                    if (prev.includes(focusedSourceSerialId)) {
                        return [...prev.filter(id => id !== focusedSourceSerialId), serialId];
                    } else {
                        const currentReplacementId = prev.find(id => !initialSelectedSerialIds.includes(id));
                        if (currentReplacementId !== undefined) {
                            return [...prev.filter(id => id !== currentReplacementId), serialId];
                        }
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
            }
        });
    };

    const handleSave = () => {
        onSave(draftSerialIds, luckyOverrideReason);
    };

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{ sx: { width: { xs: "100%", sm: 480 } } }}
        >
            {station && (
                <Box sx={{ p: 2.5, height: "100%", display: "flex", flexDirection: "column" }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                        <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {focusedTicketNumber ? `Đổi vé - ${station.stationName}` : `Chọn vé - ${station.stationName}`}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "var(--palette-text-secondary)" }}>
                                Có thể giao: {station.vendorCapacity} · Chừa quầy: {station.effectiveAgencyReserveQuantity}
                            </Typography>
                        </Box>
                        <IconButton onClick={onClose} aria-label="Đóng">
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ overflow: "auto", flex: 1 }}>
                        <Stack spacing={3}>
                            {suggestedCounterReserveCount > 0 && (
                                <Alert severity="warning">
                                    BE đang đề xuất {suggestedCounterReserveCount} vé thuộc phần giữ cho quầy. Kiểm tra lại trước khi lưu.
                                </Alert>
                            )}
                            {inlineMessage && (
                                <Alert severity="info">
                                    {inlineMessage}
                                </Alert>
                            )}
                            {focusedTicketNumber && station && (() => {
                                const oldSerials = station.tickets.find(t => t.ticketNumbers === focusedTicketNumber)?.serials || [];
                                const oldSelectedCount = oldSerials.filter(s => draftSerialIds.includes(s.serialId)).length;
                                const oldTotalInitialCount = oldSerials.filter(s => initialSelectedSerialIds.includes(s.serialId)).length;
                                const removedCount = oldTotalInitialCount - oldSelectedCount;

                                const newIds = draftSerialIds.filter(id => !initialSelectedSerialIds.includes(id));

                                return (
                                    <Box sx={{ p: 2, bgcolor: "info.lighter", borderRadius: 1, border: "1px solid", borderColor: "info.light", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle2" color="info.dark">
                                                Đang thay vé: {focusedTicketNumber}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Bỏ {removedCount} vé cũ · Chọn {newIds.length} vé mới
                                            </Typography>
                                        </Box>
                                        {newIds.length > 0 && (
                                            <Stack direction="row" spacing={0.5}>
                                                {newIds.slice(0, 3).map(id => {
                                                    const s = station.tickets.flatMap(t => t.serials).find(x => x.serialId === id);
                                                    return s ? <Chip key={id} size="small" label={s.serialNumber} color="success" /> : null;
                                                })}
                                                {newIds.length > 3 && <Chip size="small" label={`+${newIds.length - 3}`} />}
                                            </Stack>
                                        )}
                                    </Box>
                                );
                            })()}
                            {ticketsToRender.map((ticket) => {
                                const visibleSerials = ticket.serials.filter(
                                    (serial) => !isCounterReserve(serial) || serial.suggested || draftSerialIds.includes(serial.serialId)
                                );
                                const hiddenCounterReserveCount = ticket.serials.length - visibleSerials.length;
                                if (visibleSerials.length === 0) return null;
                                const selectedInGroup = visibleSerials.filter(s => draftSerialIds.includes(s.serialId)).length;
                                const maxSelectable = ticket.vendorEligible
                                    ? ticket.selectableCount
                                    : (ticket.lucky && canOverrideLucky ? ticket.availableCount : 0);

                                return (
                                    <Box key={ticket.ticketNumbers}>
                                        <Box mb={1.5}>
                                            <Typography variant="subtitle2" sx={{ fontFamily: "monospace", fontSize: "1.1rem" }}>
                                                {ticket.ticketNumbers} {ticket.lucky && <Typography component="span" variant="caption" sx={{ color: "primary.main", fontWeight: 700, ml: 1 }}>[Số đẹp]</Typography>}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Đã chọn {selectedInGroup} / Khả dụng {maxSelectable}
                                            </Typography>
                                            {ticket.blockedReason && (
                                                <Typography variant="caption" color="error" display="block">
                                                    Lý do chặn: {ticket.blockedReason}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
                                            <Stack direction="row" flexWrap="wrap" gap={1}>
                                                {visibleSerials.map(serial => {
                                                    const isPicked = draftSerialIds.includes(serial.serialId);
                                                    const isSuggestedCounterReserve = isCounterReserve(serial) && serial.suggested;
                                                    const isSelectable = serial.vendorEligible || (serial.lucky && canOverrideLucky);
                                                    const blockedText = !isSelectable ? (serial.blockedReason || "Không hợp lệ") : "";

                                                    return (
                                                        <Chip
                                                            key={serial.serialId}
                                                            label={serial.serialNumber}
                                                            onClick={isSelectable ? () => toggleSerial(serial.serialId, !!serial.lucky, !!serial.vendorEligible) : undefined}
                                                            variant={isPicked ? "filled" : "outlined"}
                                                            color={isSuggestedCounterReserve ? "warning" : isPicked ? "primary" : "default"}
                                                            sx={{
                                                                fontFamily: "monospace",
                                                                fontWeight: isPicked ? 700 : 400,
                                                                opacity: isSelectable ? 1 : 0.5,
                                                                textDecoration: !isSelectable ? "line-through" : "none",
                                                            }}
                                                            title={isSuggestedCounterReserve ? "BE đề xuất vé đang giữ cho quầy" : blockedText}
                                                        />
                                                    );
                                                })}
                                            </Stack>
                                            {hiddenCounterReserveCount > 0 && (
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                                    Đã ẩn {hiddenCounterReserveCount} vé chừa cho quầy.
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Stack>

                        {hasLuckySelected && canOverrideLucky && (
                            <Box sx={{ mt: 3, p: 2, bgcolor: "info.lighter", borderRadius: 1, border: "1px solid", borderColor: "info.light" }}>
                                <Typography variant="subtitle2" color="info.dark" gutterBottom>
                                    Cấp vé số đẹp
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Lý do cấp vé số đẹp..."
                                    value={luckyOverrideReason}
                                    onChange={(e) => setLuckyOverrideReason(e.target.value)}
                                />
                            </Box>
                        )}
                        {hasLuckySelected && !canOverrideLucky && (
                            <Alert severity="error" sx={{ mt: 3 }}>
                                Bạn không có quyền cấp vé số đẹp.
                            </Alert>
                        )}
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Đã chọn: {totalSelected} / {allowedQuantity}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                            <Button onClick={onClose} color="inherit">Hủy</Button>
                            <Button
                                variant="contained"
                                onClick={handleSave}
                                disabled={hasLuckySelected && canOverrideLucky && !luckyOverrideReason.trim()}
                            >
                                Lưu thay đổi
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            )}
        </Drawer>
    );
};
