import { useEffect, useMemo, useState } from "react";
import { VendorAllocationBatch } from "../types/street-agent.type";

/** Draft selection starts from persisted staged serials and refreshes after a server mutation. */
export const useVendorReturnSelectionDraft = (batch?: VendorAllocationBatch | null) => {
    const stagedSerialIds = useMemo(
        () => (batch?.serials ?? [])
            .filter((serial) => serial.allocationStatus === "RETURN_PENDING_INSPECTION")
            .map((serial) => serial.serialId),
        [batch?.id, batch?.serials]
    );
    const stagedKey = stagedSerialIds.join(",");
    const [selectedSerialIds, setSelectedSerialIds] = useState<number[]>(stagedSerialIds);

    useEffect(() => {
        setSelectedSerialIds(stagedSerialIds);
    }, [batch?.id, stagedKey]);

    return { selectedSerialIds, setSelectedSerialIds };
};
