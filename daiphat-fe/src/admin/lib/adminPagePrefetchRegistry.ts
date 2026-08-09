type AdminChunkLoader = () => Promise<unknown>;

const chunkLoaders = new Map<string, AdminChunkLoader>();
const prefetchedChunks = new Set<string>();

// In `next dev`, every dynamic import() forces Turbopack to compile that
// route's module graph on demand — the exact same compiler queue a real
// navigation uses. Warming unvisited routes here competes with (and slows
// down) whatever page the user actually just clicked. Chunks are already
// bundled ahead of time in production, so prefetching there is cheap and safe.
const isDevRuntime = process.env.NODE_ENV !== 'production';

export const normalizeAdminPath = (path: string): string => {
  const [pathname] = String(path || '').split('?');
  const normalized = pathname.replace(/\/$/, '');
  return normalized || '/';
};

export const registerAdminPageChunkLoader = (path: string, loader: AdminChunkLoader) => {
  chunkLoaders.set(normalizeAdminPath(path), loader);
};

export const prefetchAdminPageChunk = (path: string): void => {
  if (isDevRuntime) {
    return;
  }

  const normalized = normalizeAdminPath(path);
  if (prefetchedChunks.has(normalized)) {
    return;
  }

  const loader = chunkLoaders.get(normalized);
  if (!loader) {
    return;
  }

  prefetchedChunks.add(normalized);
  void loader();
};
