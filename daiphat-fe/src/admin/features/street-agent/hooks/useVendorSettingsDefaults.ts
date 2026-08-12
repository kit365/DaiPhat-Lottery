"use client";

import { useMemo } from "react";
import { useSystemConfigs } from "../../system-config/hooks/useSystemConfig";
import { ConfigType } from "../../system-config/types/system-config";

export const VENDOR_SETTING_KEYS = {
    STREET_AGENT_COUNTER_RESERVE_PER_STATION: "STREET_AGENT_COUNTER_RESERVE_PER_STATION",
    VENDOR_COMMISSION_RATE: "VENDOR_COMMISSION_RATE",
    VENDOR_DEFAULT_CONTRACT_MAX_DAILY_CAP: "VENDOR_DEFAULT_CONTRACT_MAX_DAILY_CAP",
    VENDOR_DEPOSIT_RATE: "VENDOR_DEPOSIT_RATE",
    VENDOR_DRAFT_RESERVATION_TTL_MINUTES: "VENDOR_DRAFT_RESERVATION_TTL_MINUTES",
    VENDOR_RETURN_CUTOFF: "VENDOR_RETURN_CUTOFF",
    VENDOR_LATE_RETURN_POLICY: "VENDOR_LATE_RETURN_POLICY",
    RETURN_BUFFER_TIME: "RETURN_BUFFER_TIME",
} as const;

export type VendorLateReturnPolicyValue = "FORFEIT_DEPOSIT" | "FORCE_PURCHASE_ALL";

export const VENDOR_LATE_RETURN_POLICY_LABELS: Record<VendorLateReturnPolicyValue, string> = {
    FORFEIT_DEPOSIT: "Tịch thu tiền cọc",
    FORCE_PURCHASE_ALL: "Ép mua toàn bộ vé",
};

export interface VendorTimingSettings {
    returnCutoff: string | null;
    draftReservationTtlMinutes: number | null;
    returnBufferMinutes: number | null;
}

export interface VendorSettingsDefaults {
    counterReservePerStation: number | null;
    commissionRate: number | null;
    defaultContractMaxDailyCap: number | null;
    depositRate: number | null;
    draftReservationTtlMinutes: number | null;
    returnCutoff: string | null;
    lateReturnPolicy: VendorLateReturnPolicyValue | null;
    timing: VendorTimingSettings;
}

const parseNumber = (raw?: string | null): number | null => {
    if (raw == null || raw.trim() === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
};

export const useVendorSettingsDefaults = () => {
    const query = useSystemConfigs(ConfigType.VENDOR_SETTING);
    const returnQuery = useSystemConfigs(ConfigType.TICKET_IMPORT);

    const defaults = useMemo<VendorSettingsDefaults>(() => {
        const configs = query.data?.data || [];
        const byKey = Object.fromEntries(configs.map((item) => [item.configKey, item.configValue]));

        const returnConfigs = returnQuery.data?.data || [];
        const returnByKey = Object.fromEntries(returnConfigs.map((item) => [item.configKey, item.configValue]));

        const latePolicy = byKey[VENDOR_SETTING_KEYS.VENDOR_LATE_RETURN_POLICY];
        return {
            counterReservePerStation: parseNumber(byKey[VENDOR_SETTING_KEYS.STREET_AGENT_COUNTER_RESERVE_PER_STATION]),
            commissionRate: parseNumber(byKey[VENDOR_SETTING_KEYS.VENDOR_COMMISSION_RATE]),
            defaultContractMaxDailyCap: parseNumber(byKey[VENDOR_SETTING_KEYS.VENDOR_DEFAULT_CONTRACT_MAX_DAILY_CAP]),
            depositRate: parseNumber(byKey[VENDOR_SETTING_KEYS.VENDOR_DEPOSIT_RATE]),
            draftReservationTtlMinutes: parseNumber(byKey[VENDOR_SETTING_KEYS.VENDOR_DRAFT_RESERVATION_TTL_MINUTES]),
            returnCutoff: byKey[VENDOR_SETTING_KEYS.VENDOR_RETURN_CUTOFF] || null,
            lateReturnPolicy:
                latePolicy === "FORFEIT_DEPOSIT" || latePolicy === "FORCE_PURCHASE_ALL"
                    ? latePolicy
                    : null,
            timing: {
                returnCutoff: byKey[VENDOR_SETTING_KEYS.VENDOR_RETURN_CUTOFF] || null,
                draftReservationTtlMinutes: parseNumber(byKey[VENDOR_SETTING_KEYS.VENDOR_DRAFT_RESERVATION_TTL_MINUTES]),
                returnBufferMinutes: parseNumber(returnByKey[VENDOR_SETTING_KEYS.RETURN_BUFFER_TIME]),
            },
        };
    }, [query.data?.data, returnQuery.data?.data]);

    return {
        ...query,
        isLoading: query.isLoading || returnQuery.isLoading,
        defaults,
    };
};
