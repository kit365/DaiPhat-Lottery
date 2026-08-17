"use client";

import React from "react";
import { Badge, Box, Typography, Stack, Chip, Button } from "@mui/material";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";

import { adminCountBadgeSx } from "@/admin/utils/badge";
import { LuckyTicketNumber } from "@/admin/features/street-agent/components/LuckyTicketNumber";
import { useLuckyPatternConfigs } from "@/admin/features/street-agent/hooks/useLuckyPattern";
import { luckyBadgeColor } from "@/admin/features/street-agent/utils/luckyNumberHighlight";

export interface AdminTicketCardProps {
    ticketNumbers: string;
    stationName: string;
    faceValue: number;
    quantity: number;
    isLucky?: boolean;
    luckyBadges?: string[];
    counterReserveOverride?: boolean;
    onClickAction?: () => void;
    actionLabel?: string;
    disabled?: boolean;
    onDecrement?: () => void;
    decrementDisabled?: boolean;
}

const luckyPrimaryChipSx = {
    height: 22,
    fontSize: "0.6875rem",
    fontWeight: 700,
    bgcolor: "rgba(255, 171, 0, 0.14)",
    color: "#B76E00",
    border: "1px solid rgba(255, 171, 0, 0.35)",
    "& .MuiChip-icon": {
        color: "#FFAB00",
        fontSize: 14,
        ml: 0.5,
    },
    "& .MuiChip-label": {
        px: 0.75,
    },
};

const luckyBadgeChipSx = {
    height: 20,
    fontSize: "0.625rem",
    fontWeight: 700,
    bgcolor: "rgba(255, 171, 0, 0.1)",
    color: "#B76E00",
    border: "1px solid rgba(255, 171, 0, 0.28)",
    "& .MuiChip-label": {
        px: 0.75,
    },
};

const formatQuantityBadge = (quantity: number) => {
    if (quantity > 99) {
        return "x99+";
    }
    return `x${quantity}`;
};

export const AdminTicketCard: React.FC<AdminTicketCardProps> = ({
    ticketNumbers,
    stationName,
    faceValue,
    quantity,
    isLucky,
    luckyBadges,
    counterReserveOverride,
    onClickAction,
    actionLabel,
    disabled,
    onDecrement,
    decrementDisabled,
}) => {
    const { data: luckyPatterns = [] } = useLuckyPatternConfigs();
    const isLuckyTicket = Boolean(isLucky || (luckyBadges && luckyBadges.length > 0));
    const resolvedActionLabel = actionLabel || "Chọn";
    const showTicketIcon = ["Đổi vé", "Chọn", "Chọn serial", "Ẩn serial"].includes(resolvedActionLabel);

    return (
        <Badge
            badgeContent={formatQuantityBadge(quantity)}
            color="error"
            invisible={quantity <= 0}
            overlap="rectangular"
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{
                ...adminCountBadgeSx,
                "& .MuiBadge-badge": {
                    ...adminCountBadgeSx["& .MuiBadge-badge"],
                    minWidth: 22,
                    padding: "0 6px",
                },
            }}
        >
            <Box
                sx={{
                    position: "relative",
                    width: 156,
                    minHeight: 90,
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: isLuckyTicket ? "rgba(255, 171, 0, 0.45)" : "divider",
                    boxShadow: isLuckyTicket
                        ? "0 2px 8px rgba(255, 171, 0, 0.12)"
                        : "0 1px 2px rgba(0,0,0,0.05)",
                    p: 1.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    overflow: "hidden",
                    "&::before": isLuckyTicket
                        ? {
                              content: '""',
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: 3,
                              bgcolor: "#FFAB00",
                          }
                        : undefined,
                }}
            >
                <Box sx={{ pl: isLuckyTicket ? 0.5 : 0 }}>
                    <LuckyTicketNumber
                        value={ticketNumbers}
                        fontSize="1.25rem"
                        sx={{
                            display: "block",
                            color: "text.primary",
                            pr: quantity > 0 ? 2 : 0,
                        }}
                    />
                    <Typography
                        variant="caption"
                        sx={{
                            color: "text.secondary",
                            display: "block",
                            mt: 0.5,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {stationName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700 }}>
                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(faceValue)}
                    </Typography>
                </Box>

                {isLuckyTicket ? (
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ pl: isLuckyTicket ? 0.5 : 0 }}>
                        {isLucky ? (
                            <Chip
                                size="small"
                                icon={<AutoAwesomeOutlinedIcon />}
                                label="Số đẹp"
                                sx={luckyPrimaryChipSx}
                            />
                        ) : null}
                        {luckyBadges?.map((badge, index) => {
                            const color = luckyBadgeColor(badge, luckyPatterns);
                            return (
                            <Chip
                                key={`${badge}-${index}`}
                                size="small"
                                label={badge}
                                sx={{
                                    ...luckyBadgeChipSx,
                                    bgcolor: `${color}22`,
                                    color,
                                    border: `1px solid ${color}59`,
                                }}
                            />
                            );
                        })}
                    </Stack>
                ) : null}

                {counterReserveOverride ? (
                    <Chip
                        size="small"
                        color="warning"
                        label="Giữ quầy"
                        sx={{
                            height: 20,
                            fontSize: "0.625rem",
                            fontWeight: 700,
                            alignSelf: "flex-start",
                            ml: isLuckyTicket ? 0.5 : 0,
                        }}
                    />
                ) : null}

                {onClickAction ? (
                    <Box sx={{ mt: "auto", pt: 0.25 }}>
                        {onDecrement ? (
                            <Stack direction="row" spacing={0.5}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={onDecrement}
                                    disabled={decrementDisabled || quantity <= 0}
                                    sx={{
                                        minWidth: 0,
                                        flex: 1,
                                        fontSize: "0.7rem",
                                        fontWeight: 700,
                                        py: 0.35,
                                        borderRadius: "8px",
                                        textTransform: "none",
                                    }}
                                >
                                    −
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={onClickAction}
                                    disabled={disabled}
                                    sx={{
                                        minWidth: 0,
                                        flex: 1,
                                        fontSize: "0.7rem",
                                        fontWeight: 700,
                                        py: 0.35,
                                        borderRadius: "8px",
                                        textTransform: "none",
                                    }}
                                >
                                    +
                                </Button>
                            </Stack>
                        ) : (
                            <Button
                                size="small"
                                variant="outlined"
                                fullWidth
                                onClick={onClickAction}
                                disabled={disabled}
                                startIcon={
                                    showTicketIcon ? (
                                        <ConfirmationNumberOutlinedIcon sx={{ fontSize: "0.95rem !important" }} />
                                    ) : undefined
                                }
                                sx={{
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    py: 0.35,
                                    borderRadius: "8px",
                                    textTransform: "none",
                                }}
                            >
                                {resolvedActionLabel}
                            </Button>
                        )}
                    </Box>
                ) : null}
            </Box>
        </Badge>
    );
};
