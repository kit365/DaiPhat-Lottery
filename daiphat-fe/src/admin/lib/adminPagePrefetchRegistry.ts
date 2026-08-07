type AdminChunkLoader = () => Promise<unknown>;

const chunkLoaders = new Map<string, AdminChunkLoader>();
const prefetchedChunks = new Set<string>();

export const normalizeAdminPath = (path: string): string => {
  const [pathname] = String(path || '').split('?');
  const normalized = pathname.replace(/\/$/, '');
  return normalized || '/';
};

export const registerAdminPageChunkLoader = (path: string, loader: AdminChunkLoader) => {
  chunkLoaders.set(normalizeAdminPath(path), loader);
};

export const prefetchAdminPageChunk = (path: string): void => {
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
