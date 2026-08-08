"use client";

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

import { PermissionGuard } from '@/admin/components/auth/PermissionGuard';
import { SpinnerLoading } from '@/admin/components/ui/SpinnerLoading';

type AdminClientPageOptions =
    | {
          component: ComponentType;
          permission?: string;
          permissions?: string[];
          loader?: never;
          exportName?: never;
      }
    | {
          component?: never;
          loader: () => Promise<Record<string, unknown>>;
          exportName: string;
          permission?: string;
          permissions?: string[];
      };

function createLazyFeaturePage(loader: () => Promise<Record<string, unknown>>, exportName: string) {
    return dynamic(
        () => loader().then((module) => (module[exportName] ?? module.default) as ComponentType),
        {
            ssr: false,
            loading: () => <SpinnerLoading />,
        }
    );
}

export function createAdminClientPage(options: AdminClientPageOptions) {
    const { permission, permissions } = options;

    if ('component' in options && options.component) {
        const Component = options.component;

        return function ClientPage() {
            return (
                <PermissionGuard permission={permission} permissions={permissions}>
                    <Component />
                </PermissionGuard>
            );
        };
    }

    const FeaturePage = createLazyFeaturePage(options.loader, options.exportName);

    return function ClientPage() {
        return (
            <PermissionGuard permission={permission} permissions={permissions}>
                <FeaturePage />
            </PermissionGuard>
        );
    };
}
