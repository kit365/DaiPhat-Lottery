"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams as useNextSearchParams, useParams as useNextParams } from 'next/navigation';
import NextLink from 'next/link';

// Context to pass active child route element for Outlet simulation
const OutletContext = createContext<React.ReactNode | null>(null);

export const OutletProvider = ({ children, outlet }: { children: React.ReactNode; outlet: React.ReactNode }) => (
  <OutletContext.Provider value={outlet}>{children}</OutletContext.Provider>
);

export const Outlet = () => {
  const outlet = useContext(OutletContext);
  return <>{outlet}</>;
};

export const useNavigate = () => {
  const router = useRouter();
  return (to: string | number, options?: { replace?: boolean }) => {
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
  return {
    pathname,
    search,
    hash,
    state: null,
    key: pathname,
  };
};

export const useParams = <T extends Record<string, string | string[]> = Record<string, string>>(): T => {
  const params = useNextParams();
  return (params || {}) as T;
};

export const useSearchParams = (): [URLSearchParams, (params: any, options?: any) => void] => {
  const nextSearchParams = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const searchParams = new URLSearchParams(nextSearchParams ? nextSearchParams.toString() : '');

  const setSearchParams = (newParams: any, options?: any) => {
    const params = new URLSearchParams(newParams);
    const url = `${pathname}?${params.toString()}`;
    if (options?.replace) {
      router.replace(url);
    } else {
      router.push(url);
    }
  };

  return [searchParams, setSearchParams];
};

export const Link = ({ to, href, children, className, ...props }: any) => {
  const target = to || href || '#';
  return (
    <NextLink href={target} className={className} {...props}>
      {children}
    </NextLink>
  );
};

export const Navigate = ({ to, replace = true }: { to: string; replace?: boolean; state?: any }) => {
  const router = useRouter();
  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [router, to, replace]);
  return null;
};
export const BrowserRouter = ({ children }: any) => <>{children}</>;
export const Routes = ({ children }: any) => <>{children}</>;
export const Route = ({ children }: any) => <>{children}</>;

