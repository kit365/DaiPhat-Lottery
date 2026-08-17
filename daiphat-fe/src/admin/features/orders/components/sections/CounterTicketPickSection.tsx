"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    Box,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { LuckyTicketNumber } from "@/admin/features/street-agent/components/LuckyTicketNumber";
import { useTicketDetail } from "@/admin/features/ticket/inventory/hooks/useTicket";
import { BADGE_COLOR_PALETTE } from "@/admin/utils/badge";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const ACTIVE_ROW_BG = "rgba(255, 48, 48, 0.06)";
const ACTIVE_ROW_HOVER_BG = "rgba(255, 48, 48, 0.1)";
const LUCKY_ROW_BG = BADGE_COLOR_PALETTE.warning.unselected.bg;
const LUCKY_ROW_HOVER_BG = "rgba(255, 171, 0, 0.24)";
const checkboxSx = { p: 0.5, color: "#919EAB", "&.Mui-checked": { color: "#FF3030" } };
const headCellSx = {
    bgcolor: "#F4F6F8",
    color: "text.secondary",
    fontWeight: 700,
    fontSize: "0.75rem",
    whiteSpace: "nowrap" as const,
    borderBottom: "1px solid #F4F6F8",
};

export type CounterSelectedTicket = {
    qty: number;
    ticket: any;
    serialKeys: string[];
};

type SerialSlot = {
    key: string;
    label: string;
};

const ticketIdOf = (ticket: any) => String(ticket?.id ?? ticket?._id ?? "");

const isLuckyTicket = (ticket: any) =>
    Boolean(ticket?.lucky || (Array.isArray(ticket?.luckyBadges) && ticket.luckyBadges.length > 0));

const isInStockSerial = (serial: any) => {
    const st = String(serial?.status || "").toUpperCase();
    const cond = String(serial?.ticketCondition || "").toUpperCase();
    return (st === "IN_STOCK" || st === "AVAILABLE" || !st) && !["DAMAGED", "LOST", "VOIDED"].includes(cond);
};

const serialsFromTicket = (ticket: any): any[] =>
    Array.isArray(ticket?.serials) ? ticket.serials.filter(isInStockSerial) : [];

const slotsFromSerials = (serials: any[]): SerialSlot[] =>
    serials.map((serial) => ({
        key: String(serial.id ?? serial.serialId),
        label: serial.serialNumber || String(serial.id ?? serial.serialId),
    }));

const slotsFromQuantity = (ticketId: string, maxQty: number): SerialSlot[] =>
    Array.from({ length: maxQty }, (_, index) => ({
        key: `slot-${ticketId}-${index}`,
        label: `Tờ ${index + 1}`,
    }));

const stationNameOf = (ticket: any) =>
    ticket?.station?.name || ticket?.stationName || ticket?.region?.name || "—";

const stationKeyOf = (ticket: any) =>
    String(ticket?.stationId ?? ticket?.station?.id ?? ticket?.region?.id ?? stationNameOf(ticket));

export const CounterTicketPickSection = ({
    tickets,
    isLoading,
    selectedTickets,
    onChangeSelected,
}: {
    tickets: any[];
    isLoading: boolean;
    selectedTickets: Record<string, CounterSelectedTicket>;
    onChangeSelected: (next: Record<string, CounterSelectedTicket>) => void;
}) => {
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

    const groupedTickets = useMemo(() => {
        const groups = new Map<string, { name: string; tickets: any[] }>();
        tickets.forEach((ticket) => {
            const key = stationKeyOf(ticket);
            if (!groups.has(key)) {
                groups.set(key, { name: stationNameOf(ticket), tickets: [] });
            }
            groups.get(key)!.tickets.push(ticket);
        });
        return Array.from(groups.entries())
            .map(([key, group]) => ({
                key,
                ...group,
                tickets: [...group.tickets].sort((a, b) =>
                    String(a.numbers || "").localeCompare(String(b.numbers || ""), "vi")
                ),
            }))
            .sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }, [tickets]);

    useEffect(() => {
        if (tickets.length === 0) {
            setActiveTicketId(null);
            return;
        }
        if (!activeTicketId || !tickets.some((ticket) => ticketIdOf(ticket) === activeTicketId)) {
            setActiveTicketId(ticketIdOf(tickets[0]));
        }
    }, [tickets, activeTicketId]);

    const activeTicket = tickets.find((ticket) => ticketIdOf(ticket) === activeTicketId) ?? tickets[0] ?? null;
    const activeId = activeTicket ? ticketIdOf(activeTicket) : "";
    const listSerials = activeTicket ? serialsFromTicket(activeTicket) : [];
    const shouldFetchDetail = Boolean(activeId) && listSerials.length === 0;

    const { data: ticketDetail, isFetching: isFetchingSerials } = useTicketDetail(
        shouldFetchDetail ? activeId : undefined
    );

    const activeSlots = useMemo(() => {
        if (!activeTicket || !activeId) return [];
        const fromList = slotsFromSerials(listSerials);
        if (fromList.length > 0) return fromList;
        const fromDetail = slotsFromSerials(serialsFromTicket(ticketDetail));
        if (fromDetail.length > 0) return fromDetail;
        return slotsFromQuantity(activeId, activeTicket.quantity || 0);
    }, [activeTicket, activeId, listSerials, ticketDetail]);

    const selectedKeys = selectedTickets[activeId]?.serialKeys || [];
    const selectedInActive = activeSlots.filter((slot) => selectedKeys.includes(slot.key)).length;
    const allChecked = activeSlots.length > 0 && selectedInActive === activeSlots.length;
    const someChecked = selectedInActive > 0 && !allChecked;

    const applyKeys = (ticket: any, keys: string[]) => {
        const id = ticketIdOf(ticket);
        onChangeSelected((() => {
            const next = { ...selectedTickets };
            if (keys.length === 0) {
                delete next[id];
            } else {
                next[id] = { qty: keys.length, ticket, serialKeys: keys };
            }
            return next;
        })());
    };

    const toggleSlot = (ticket: any, key: string) => {
        const id = ticketIdOf(ticket);
        const current = selectedTickets[id]?.serialKeys || [];
        const nextKeys = current.includes(key)
            ? current.filter((item) => item !== key)
            : [...current, key];
        applyKeys(ticket, nextKeys);
    };

    const toggleAll = (ticket: any, slots: SerialSlot[]) => {
        const id = ticketIdOf(ticket);
        const current = selectedTickets[id]?.serialKeys || [];
        const allSelected = slots.length > 0 && slots.every((slot) => current.includes(slot.key));
        applyKeys(ticket, allSelected ? [] : slots.map((slot) => slot.key));
    };

    if (isLoading) {
        return (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320, py: 8 }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (tickets.length === 0) {
        return (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320, py: 8 }}>
                <span className="admin-datagrid-empty">Không có dữ liệu</span>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                borderTop: "1px solid #F4F6F8",
                minHeight: { md: 420 },
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0, maxHeight: { md: 520 }, overflow: "auto" }}>
                <Table stickyHeader size="small" sx={{ "--TableCell-stickyHeader-background": "#F4F6F8" }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={headCellSx}>Số vé</TableCell>
                            <TableCell align="center" sx={headCellSx}>Đã chọn</TableCell>
                            <TableCell align="center" sx={headCellSx}>Khả dụng</TableCell>
                            <TableCell sx={{ ...headCellSx, width: 40 }} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {groupedTickets.map((group) => (
                            <React.Fragment key={group.key}>
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        sx={{
                                            py: 1,
                                            px: 2,
                                            fontWeight: 700,
                                            fontSize: "0.8125rem",
                                            bgcolor: "#F4F6F8",
                                            borderBottom: "1px solid #ECEFF1",
                                            color: "var(--palette-text-primary)",
                                        }}
                                    >
                                        {group.name}
                                    </TableCell>
                                </TableRow>
                                {group.tickets.map((ticket, index) => {
                                    const id = ticketIdOf(ticket);
                                    const qty = selectedTickets[id]?.qty || 0;
                                    const maxQty = ticket.quantity || 0;
                                    const lucky = isLuckyTicket(ticket);
                                    const isActive = activeId === id;

                                    return (
                                        <TableRow
                                            key={id}
                                            onClick={() => setActiveTicketId(id)}
                                            sx={{
                                                cursor: "pointer",
                                                bgcolor: isActive
                                                    ? ACTIVE_ROW_BG
                                                    : lucky
                                                      ? LUCKY_ROW_BG
                                                      : index % 2 === 0
                                                        ? "#F9FAFB"
                                                        : "#FFFFFF",
                                                boxShadow: isActive ? "inset 3px 0 0 #FF3030" : "none",
                                                "&:hover": {
                                                    bgcolor: isActive
                                                        ? `${ACTIVE_ROW_HOVER_BG} !important`
                                                        : lucky
                                                          ? `${LUCKY_ROW_HOVER_BG} !important`
                                                          : "#F4F6F8 !important",
                                                },
                                                "& td": { borderBottom: "1px dashed #F4F6F8" },
                                            }}
                                        >
                                            <TableCell>
                                                <LuckyTicketNumber value={String(ticket.numbers || "")} />
                                                {lucky ? (
                                                    <Typography variant="caption" sx={{ color: "#B76E00", fontWeight: 700, display: "block" }}>
                                                        Số đẹp
                                                    </Typography>
                                                ) : null}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                    {qty}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Typography variant="body2" color="text.secondary">
                                                    {maxQty}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right" sx={{ pr: 1.5 }}>
                                                <ChevronRightIcon sx={{ fontSize: 20, color: isActive ? "#FF3030" : "#919EAB" }} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </Box>

            <Box
                sx={{
                    width: { xs: "100%", md: 320 },
                    flexShrink: 0,
                    borderLeft: { md: "1px solid #F4F6F8" },
                    borderTop: { xs: "1px solid #F4F6F8", md: "none" },
                    display: "flex",
                    flexDirection: "column",
                    minHeight: { xs: 240, md: 0 },
                    bgcolor: "#FAFBFC",
                }}
            >
                {activeTicket ? (
                    <>
                        <Box sx={{ px: 2, py: 2, borderBottom: "1px solid #F4F6F8", flexShrink: 0 }}>
                            <LuckyTicketNumber value={String(activeTicket.numbers || "")} fontSize="1rem" />
                            <Typography variant="caption" color="text.secondary" display="block">
                                {stationNameOf(activeTicket)} · Đã chọn {selectedInActive} / {activeSlots.length} seri
                            </Typography>
                        </Box>
                        <Box sx={{ flex: 1, overflow: "auto", px: 1.5, py: 1, maxHeight: { md: 440 } }}>
                            {shouldFetchDetail && isFetchingSerials ? (
                                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                                    <CircularProgress size={22} />
                                </Box>
                            ) : (
                                <>
                                    {activeSlots.length > 0 ? (
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={allChecked}
                                                    indeterminate={someChecked}
                                                    onChange={() => toggleAll(activeTicket, activeSlots)}
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
                                                bgcolor: allChecked ? ACTIVE_ROW_BG : "transparent",
                                            }}
                                        />
                                    ) : (
                                        <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2 }}>
                                            Không còn seri khả dụng.
                                        </Typography>
                                    )}
                                    {activeSlots.map((slot) => {
                                        const isPicked = selectedKeys.includes(slot.key);
                                        return (
                                            <FormControlLabel
                                                key={slot.key}
                                                control={
                                                    <Checkbox
                                                        checked={isPicked}
                                                        onChange={() => toggleSlot(activeTicket, slot.key)}
                                                        sx={checkboxSx}
                                                    />
                                                }
                                                label={
                                                    <Typography
                                                        sx={{
                                                            fontFamily: MONO,
                                                            fontSize: "0.75rem",
                                                            fontWeight: isPicked ? 700 : 400,
                                                            lineHeight: 1.4,
                                                            wordBreak: "break-all",
                                                        }}
                                                    >
                                                        {slot.label}
                                                    </Typography>
                                                }
                                                sx={{
                                                    m: 0,
                                                    mb: 0.25,
                                                    width: "100%",
                                                    px: 0.75,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    bgcolor: isPicked ? ACTIVE_ROW_BG : "transparent",
                                                    alignItems: "center",
                                                    "& .MuiFormControlLabel-label": { flex: 1, minWidth: 0, mt: 0 },
                                                    "&:hover": {
                                                        bgcolor: isPicked ? ACTIVE_ROW_HOVER_BG : "rgba(145, 158, 171, 0.08)",
                                                    },
                                                }}
                                            />
                                        );
                                    })}
                                </>
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
    );
};
