"use client";

import { usePathname } from 'next/navigation';
import React from 'react';

const HIDE_HEADER_ROUTES = ['/login', '/register', '/forgot-password'];

export function ClientHeaderGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldHideHeader = HIDE_HEADER_ROUTES.includes(pathname || '');

  if (shouldHideHeader) {
    return null;
  }

  return <>{children}</>;
}
