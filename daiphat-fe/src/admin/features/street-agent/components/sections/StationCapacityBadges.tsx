import { Chip, Stack, Tooltip } from "@mui/material";
import { AdminLuckyDisplay } from "@/shared/lucky-number";

import { BADGE_COLOR_PALETTE, getMetricChipSx } from "@/admin/utils/badge";

type StationCapacityBadgesProps = {
    vendorCapacity: number;
    agencyReserve: number;
    luckyQuantity?: number;
};

const capacityLabel = (prefix: string, value: number) => (
    <>
        {prefix}
        <AdminLuckyDisplay component="span" value={String(value)} fontWeight={700} />
    </>
);

export const StationCapacityBadges = ({
    vendorCapacity,
    agencyReserve,
    luckyQuantity = 0,
}: StationCapacityBadgesProps) => (
    <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
        <Chip
            size="small"
            label={capacityLabel("Có thể giao: ", vendorCapacity)}
            sx={getMetricChipSx("success")}
        />
        <Chip
            size="small"
            label={capacityLabel("Chừa quầy: ", agencyReserve)}
            sx={getMetricChipSx("info")}
        />
        {luckyQuantity > 0 && (
            <Tooltip title="Số đẹp không tính vào capacity vendor (đã trừ trước khi chừa quầy)">
                <Chip
                    size="small"
                    label={capacityLabel("Số đẹp: ", luckyQuantity)}
                    sx={{
                        height: 26,
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        bgcolor: BADGE_COLOR_PALETTE.warning.unselected.bg,
                        color: BADGE_COLOR_PALETTE.warning.unselected.text,
                        border: "none",
                    }}
                />
            </Tooltip>
        )}
    </Stack>
);
