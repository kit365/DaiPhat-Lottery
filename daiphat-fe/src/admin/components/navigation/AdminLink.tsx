"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { notifyPageNavigation } from "@/admin/context/PageNavigationContext";

type AdminLinkProps = ComponentProps<typeof NextLink> & {
    /** @deprecated React Router compat — use `href` */
    to?: string;
};

/** Next.js Link with admin navigation progress bar integration. */
export default function AdminLink({ href, to, onClick, ...props }: AdminLinkProps) {
    const resolvedHref = href ?? to;
    const target =
        typeof resolvedHref === "string"
            ? resolvedHref
            : typeof resolvedHref === "object" && resolvedHref !== null && "pathname" in resolvedHref
              ? String(resolvedHref.pathname ?? "")
              : "";

    if (!resolvedHref) {
        return null;
    }

    return (
        <NextLink
            href={resolvedHref}
            onClick={(event) => {
                if (target.startsWith("/admin")) {
                    notifyPageNavigation(target);
                }
                onClick?.(event);
            }}
            {...props}
        />
    );
}
