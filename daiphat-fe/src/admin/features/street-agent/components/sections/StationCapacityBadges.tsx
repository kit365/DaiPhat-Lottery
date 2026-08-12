import { Chip, Stack } from "@mui/material";

import { getMetricChipSx } from "@/admin/utils/badge";

type StationCapacityBadgesProps = {
    vendorCapacity: number;
    agencyReserve: number;
};

export const StationCapacityBadges = ({
    vendorCapacity,
    agencyReserve,
}: StationCapacityBadgesProps) => (
    <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
        <Chip
            size="small"
            label={`Có thể giao: ${vendorCapacity}`}
            sx={getMetricChipSx("success")}
        />
        <Chip
            size="small"
            label={`Chừa quầy: ${agencyReserve}`}
            sx={getMetricChipSx("info")}
        />
    </Stack>
);
