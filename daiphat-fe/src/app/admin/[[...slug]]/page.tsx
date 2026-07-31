"use client";

import { use, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthGuard } from '@/admin/components/auth/AuthGuard';
import { LayoutAdmin } from '@/admin/layouts/LayoutAdmin';
import { AdminRoutes } from '@/admin/routes';
import { OutletProvider } from '@/components/router-compat';

function matchPathPattern(pattern?: string, pathSegments: string[] = []): boolean {
  if (!pattern) return false;
  const currentPath = pathSegments.join('/');
  if (pattern === currentPath) return true;

  const patternParts = pattern.split('/');
  if (patternParts.length !== pathSegments.length) return false;

  return patternParts.every((part, idx) => part.startsWith(':') || part === pathSegments[idx]);
}

export default function AdminCatchAllPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const slug = resolvedParams.slug || [];

  useEffect(() => {
    if (slug.length === 0) {
      router.replace('/admin/dashboard');
    }
  }, [slug, router]);

  if (slug.length === 0) {
    return null;
  }

  // Match current slug to AdminRoutes
  const currentSubPath = slug.join('/');
  const matchedRoute = AdminRoutes.find((r) => matchPathPattern(r.path, slug));

  const pageElement = matchedRoute ? matchedRoute.element : AdminRoutes.find(r => r.path === 'dashboard')?.element;

  return (
    <AuthGuard>
      <OutletProvider outlet={pageElement}>
        <LayoutAdmin />
      </OutletProvider>
    </AuthGuard>
  );
}
