"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams as useNextSearchParams } from "next/navigation";

export type SearchParamsInit =
    | URLSearchParams
    | Record<string, string | string[] | number | boolean | undefined | null>
    | string;

const normalizeQueryString = (params: URLSearchParams): string => {
    const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
    return new URLSearchParams(entries).toString();
};

/**
 * React Router–style search params with a setter (Next.js App Router has no built-in setter).
 */
export function useAppSearchParams(): [
    URLSearchParams,
    (newParams: SearchParamsInit, options?: { replace?: boolean }) => void,
] {
    const nextSearchParams = useNextSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const currentQuery = nextSearchParams ? nextSearchParams.toString() : "";

    const searchParams = useMemo(
        () => new URLSearchParams(currentQuery),
        [currentQuery],
    );

    const setSearchParams = useCallback(
        (newParams: SearchParamsInit, options?: { replace?: boolean }) => {
            let params: URLSearchParams;

            if (newParams instanceof URLSearchParams) {
                params = new URLSearchParams(newParams.toString());
            } else if (typeof newParams === "string") {
                params = new URLSearchParams(newParams);
            } else {
                params = new URLSearchParams();
                Object.entries(newParams).forEach(([key, val]) => {
                    if (val !== undefined && val !== null) {
                        params.set(key, String(val));
                    }
                });
            }

            if (
                normalizeQueryString(params) ===
                normalizeQueryString(new URLSearchParams(currentQuery))
            ) {
                return;
            }

            const nextQuery = params.toString();
            const url = nextQuery ? `${pathname}?${nextQuery}` : pathname || "/";

            if (options?.replace) {
                router.replace(url);
            } else {
                router.push(url);
            }
        },
        [currentQuery, pathname, router],
    );

    return [searchParams, setSearchParams];
}
