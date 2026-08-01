"use client";

import { use, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AdminRoutes, renderAdminRouteElement } from '@/admin/routes';
import {
  OutletProvider,
  extractRouteParams,
  matchPathPattern,
} from '@/components/router-compat';

export default function AdminCatchAllPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const slug = resolvedParams.slug || [];

  useEffect(() => {
    if (slug.length === 0) {
      router.replace('/admin/dashboard');
    }
  }, [slug, router]);

  const { pageElement, routeParams } = useMemo(() => {
    if (slug.length === 0) {
      return { pageElement: null, routeParams: {} as Record<string, string> };
    }

    // Prefer the most specific match (longest pattern) so
    // import-batch/detail/:id/line/:lineId wins over import-batch/detail/:id.
    const candidates = AdminRoutes.filter(
      (r) => typeof r.path === 'string' && matchPathPattern(r.path, slug)
    ).sort(
      (a, b) =>
        String(b.path).split('/').filter(Boolean).length -
        String(a.path).split('/').filter(Boolean).length
    );

    const matchedRoute = candidates[0] || AdminRoutes.find((r) => r.path === 'dashboard');
    if (!matchedRoute) {
      return {
        pageElement: null,
        routeParams: {} as Record<string, string>,
      };
    }

    return {
      pageElement: renderAdminRouteElement(matchedRoute),
      routeParams: matchedRoute.path ? extractRouteParams(matchedRoute.path, slug) : {},
    };
  }, [slug]);

  if (slug.length === 0) {
    return null;
  }

  return (
    <OutletProvider outlet={pageElement} params={routeParams}>
      {pageElement}
    </OutletProvider>
  );
}
