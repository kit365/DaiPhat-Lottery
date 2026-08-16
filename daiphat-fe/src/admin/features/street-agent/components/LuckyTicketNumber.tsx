"use client";

import { useMemo } from "react";
import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import { highlightLuckyDigits, useLuckyPatternConfigs } from "@/shared/lucky-number";

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

type LuckyTicketNumberProps = {
    value?: string | null;
    fontSize?: string | number;
    fontWeight?: number;
    letterSpacing?: string;
    sx?: SxProps<Theme>;
};

export const LuckyTicketNumber = ({
    value,
    fontSize = "0.9375rem",
    fontWeight = 800,
    letterSpacing = "0.06em",
    sx,
}: LuckyTicketNumberProps) => {
    const { data: patterns = [] } = useLuckyPatternConfigs();
    const segments = useMemo(
        () => highlightLuckyDigits(value || "", patterns),
        [value, patterns]
    );

    return (
        <Typography
            component="span"
            sx={{
                fontFamily: MONO,
                fontWeight,
                fontSize,
                letterSpacing,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                ...sx,
            }}
        >
            {segments.map((segment, index) => (
                <Box
                    component="span"
                    key={`${segment.text}-${index}`}
                    sx={
                        segment.color
                            ? { color: segment.color, fontWeight }
                            : undefined
                    }
                >
                    {segment.text}
                </Box>
            ))}
        </Typography>
    );
};

export { AdminLuckyDisplay as LuckyDisplay } from "@/shared/lucky-number";
