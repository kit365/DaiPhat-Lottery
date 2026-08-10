import React from "react";
import { Box, Typography, Stack, Chip, Button } from "@mui/material";

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
}

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
}) => {
    return (
        <Box
            sx={{
                position: "relative",
                width: 156,
                minHeight: 90,
                bgcolor: "background.paper",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                p: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 1,
            }}
        >
            {quantity > 0 && (
                <Box
                    sx={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        borderRadius: "12px",
                        px: 1,
                        py: 0.25,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        boxShadow: 1,
                        zIndex: 1,
                    }}
                >
                    x{quantity}
                </Box>
            )}

            <Box>
                <Typography
                    variant="h6"
                    sx={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize: "1.25rem",
                        lineHeight: 1,
                        letterSpacing: "0.05em",
                        color: "text.primary",
                    }}
                >
                    {ticketNumbers}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {stationName}
                </Typography>
                <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                    {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(faceValue)}
                </Typography>
            </Box>

            {(isLucky || (luckyBadges && luckyBadges.length > 0)) && (
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {isLucky && <Chip size="small" label="Số đẹp" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }} />}
                    {luckyBadges?.map((badge, i) => (
                        <Chip key={i} size="small" label={badge} variant="outlined" color="primary" sx={{ height: 20, fontSize: "0.65rem" }} />
                    ))}
                </Stack>
            )}

            {counterReserveOverride && (
                <Chip
                    size="small"
                    color="warning"
                    label="BE đề xuất vé giữ quầy"
                    sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700 }}
                />
            )}

            {onClickAction && (
                <Box sx={{ mt: "auto", pt: 0.5 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        onClick={onClickAction}
                        disabled={disabled}
                        sx={{ fontSize: "0.7rem", py: 0.25 }}
                    >
                        {actionLabel || "Chọn"}
                    </Button>
                </Box>
            )}
        </Box>
    );
};
