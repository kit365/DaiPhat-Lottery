"use client";

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PermissionGuard } from './PermissionGuard';

interface AdminPageBoundaryProps {
  permission?: string;
  permissions?: string[];
  loader: () => Promise<any>;
  exportName?: string;
}

const componentCache = new Map<string, React.ComponentType<any>>();

export function AdminPageBoundary({ permission, permissions, loader, exportName }: AdminPageBoundaryProps) {
  const DynamicComponent = useMemo(() => {
    const cacheKey = exportName ? `${loader.toString()}_${exportName}` : loader.toString();

    let comp = componentCache.get(cacheKey);
    if (!comp) {
      comp = dynamic(
        () =>
          loader().then((m) => {
            if (exportName && m[exportName]) {
              return m[exportName];
            }
            return m.default || m;
          }),
        {
          ssr: false,
          loading: () => null,
        }
      );
      componentCache.set(cacheKey, comp);
    }
    return comp;
  }, [loader, exportName]);

  return (
    <PermissionGuard permission={permission} permissions={permissions}>
      <DynamicComponent />
    </PermissionGuard>
  );
}
