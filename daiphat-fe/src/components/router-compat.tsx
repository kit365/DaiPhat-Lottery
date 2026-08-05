"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import {
  useRouter,
  usePathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from 'next/navigation';
import NextLink from 'next/link';

/** Matched React-Router-style params (e.g. `{ id: "45" }`) from AdminRoutes. */
const RouteParamsContext = createContext<Record<string, string>>({});

// Context to pass active child route element for Outlet simulation
const OutletContext = createContext<React.ReactNode | null>(null);

export const OutletProvider = ({
  children,
  outlet,
  params,
}: {
  children: React.ReactNode;
  outlet: React.ReactNode;
  params?: Record<string, string>;
}) => (
  <RouteParamsContext.Provider value={params ?? {}}>
    <OutletContext.Provider value={outlet}>{children}</OutletContext.Provider>
  </RouteParamsContext.Provider>
);

export const Outlet = () => {
  const outlet = useContext(OutletContext);
  return <>{outlet}</>;
};

export const useNavigate = () => {
  const router = useRouter();
  return (to: string | number, options?: { replace?: boolean; state?: any }) => {
    if (typeof to === 'number') {
      if (to === -1) router.back();
      return;
    }
    if (options?.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  };
};


export const useLocation = () => {
  const pathname = usePathname() || '';
  const searchParams = useNextSearchParams();
  const search = searchParams ? `?${searchParams.toString()}` : '';
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  return useMemo(
    () => ({
      pathname,
      search,
      hash,
      state: null,
      key: pathname + search,
    }),
    [pathname, search, hash]
  );
};

/**
 * Next.js catch-all `[[...slug]]` only exposes `{ slug: string[] }`.
 * Detail pages expect React Router params like `{ id }`, so prefer the
 * params extracted by the admin catch-all matcher.
 */
export const useParams = <T extends Record<string, string | string[]> = Record<string, string>>(): T => {
  const routeParams = useContext(RouteParamsContext);
  const nextParams = useNextParams();
  return useMemo(
    () => ({ ...(nextParams || {}), ...routeParams }) as T,
    [nextParams, routeParams]
  );
};

export type SearchParamsInit = URLSearchParams | Record<string, string | string[] | number | boolean | undefined | null> | string;

const normalizeQueryString = (params: URLSearchParams): string => {
  const entries = Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b));
  return new URLSearchParams(entries).toString();
};

export const useSearchParams = (): [
  URLSearchParams,
  (newParams: SearchParamsInit, options?: { replace?: boolean }) => void
] => {
  const nextSearchParams = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentQuery = nextSearchParams ? nextSearchParams.toString() : '';

  const searchParams = useMemo(
    () => new URLSearchParams(currentQuery),
    [currentQuery]
  );

  const setSearchParams = useCallback(
    (newParams: SearchParamsInit, options?: { replace?: boolean }) => {
      let params: URLSearchParams;
      if (newParams instanceof URLSearchParams) {
        params = new URLSearchParams(newParams.toString());
      } else if (typeof newParams === 'string') {
        params = new URLSearchParams(newParams);
      } else {
        params = new URLSearchParams();
        Object.entries(newParams).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            params.set(key, String(val));
          }
        });
      }

      const nextQuery = params.toString();
      // Avoid replace/push loops that remount the page and reset scroll.
      if (normalizeQueryString(params) === normalizeQueryString(new URLSearchParams(currentQuery))) {
        return;
      }

      const url = nextQuery ? `${pathname}?${nextQuery}` : pathname || '/';
      if (options?.replace) {
        router.replace(url);
      } else {
        router.push(url);
      }
    },
    [currentQuery, pathname, router]
  );

  return [searchParams, setSearchParams];
};

export type LinkProps = Omit<React.ComponentPropsWithoutRef<typeof NextLink>, 'href'> & {
  to?: string;
  href?: string;
  state?: any;
};

export const Link: React.FC<LinkProps> = ({ to, href, state, children, className, ...props }) => {
  const target = to || href || '#';
  return (
    <NextLink href={target} className={className} {...props}>
      {children}
    </NextLink>
  );
};


export const Navigate = ({ to, replace = true }: { to: string; replace?: boolean; state?: unknown }) => {
  const router = useRouter();
  const pathname = usePathname() || '';
  const searchParams = useNextSearchParams();
  const search = searchParams ? `?${searchParams.toString()}` : '';
  const fullPath = pathname + search;

  useEffect(() => {
    if (to && fullPath !== to && pathname !== to) {
      if (replace) {
        router.replace(to);
      } else {
        router.push(to);
      }
    }
  }, [router, to, replace, pathname, fullPath]);
  return null;
};

export interface RouteProps {
  path?: string;
  element?: React.ReactNode;
  index?: boolean;
  children?: React.ReactNode;
}

export const BrowserRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const Routes: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const Route: React.FC<RouteProps> = ({ children }) => <>{children}</>;

/** Match a React-Router-style path pattern against URL segments. */
export function matchPathPattern(pattern?: string, pathSegments: string[] = []): boolean {
  if (!pattern || pattern === '*') {
    return false;
  }
  // Exact static match (also covers index-less simple paths)
  const currentPath = pathSegments.join('/');
  if (pattern === currentPath) {
    return true;
  }

  const patternParts = pattern.split('/').filter(Boolean);
  if (patternParts.length === 0) {
    return false;
  }

  // Trailing splat: dashboard/settings/*
  const last = patternParts[patternParts.length - 1];
  if (last === '*') {
    const prefix = patternParts.slice(0, -1);
    if (pathSegments.length < prefix.length) {
      return false;
    }
    return prefix.every((part, idx) => part.startsWith(':') || part === pathSegments[idx]);
  }

  if (patternParts.length !== pathSegments.length) {
    return false;
  }

  return patternParts.every((part, idx) => part.startsWith(':') || part === pathSegments[idx]);
}

/** Extract `:id`-style params from a matched pattern + segments. */
export function extractRouteParams(
  pattern: string | undefined,
  pathSegments: string[]
): Record<string, string> {
  if (!pattern) {
    return {};
  }
  const patternParts = pattern.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  patternParts.forEach((part, idx) => {
    if (part.startsWith(':') && pathSegments[idx] != null) {
      params[part.slice(1)] = decodeURIComponent(pathSegments[idx]);
    }
  });
  return params;
}
