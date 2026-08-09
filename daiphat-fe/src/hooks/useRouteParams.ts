"use client";

import { useParams } from "next/navigation";

type ParamRecord = Record<string, string>;

/** Normalized route params (always string values) for Next.js App Router. */
export function useRouteParams<T extends ParamRecord = ParamRecord>(): T {
    const params = useParams();
    const normalized: ParamRecord = {};

    for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
            normalized[key] = value[0] ?? "";
        } else {
            normalized[key] = value ?? "";
        }
    }

    return normalized as T;
}
