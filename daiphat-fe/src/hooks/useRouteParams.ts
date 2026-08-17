"use client";

import { useParams } from "next/navigation";

type ParamRecord = Record<string, string>;

/** Normalized route params (always string values) for Next.js App Router. */
export function useRouteParams<T extends ParamRecord = ParamRecord>(): T {
    const params = useParams();
    const normalized: ParamRecord = {};
    const source =
        params && typeof params === "object" && !Array.isArray(params) ? params : {};

    for (const [key, value] of Object.entries(source)) {
        if (Array.isArray(value)) {
            normalized[key] = value[0] ?? "";
        } else if (value == null) {
            normalized[key] = "";
        } else {
            normalized[key] = String(value);
        }
    }

    return normalized as T;
}
