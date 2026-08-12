import { getClientBannerUrlsForPath } from '../constants/clientBannerAssets';

type NetworkInformation = {
  saveData?: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
};

const prefetchedUrls = new Set<string>();
const pendingQueue: string[] = [];

let isProcessing = false;
let idleHandle: number | null = null;
let idleStartHandle: ReturnType<typeof setTimeout> | null = null;

const shouldSkipPrefetch = (): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }

  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (connection?.saveData) {
    return true;
  }

  const effectiveType = connection?.effectiveType;
  return effectiveType === 'slow-2g' || effectiveType === '2g';
};

export const shouldSkipClientPrefetch = shouldSkipPrefetch;

export const prefetchImage = (url: string): Promise<void> => {
  if (prefetchedUrls.has(url)) {
    return Promise.resolve();
  }

  prefetchedUrls.add(url);

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = url;
  });
};

const scheduleIdleTask = (task: () => void): number => {
  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(task, { timeout: 3000 });
  }

  return window.setTimeout(task, 16);
};

const cancelIdleTask = (handle: number): void => {
  if (typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(handle);
    return;
  }

  window.clearTimeout(handle);
};

const filterPendingUrls = (urls: readonly string[]): string[] =>
  [...new Set(urls)].filter((url) => !prefetchedUrls.has(url) && !pendingQueue.includes(url));

const prependToQueue = (urls: readonly string[]): void => {
  const incoming = filterPendingUrls(urls);
  if (incoming.length === 0) {
    return;
  }

  const incomingSet = new Set(incoming);
  const rest = pendingQueue.filter((url) => !incomingSet.has(url));
  pendingQueue.splice(0, pendingQueue.length, ...incoming, ...rest);
};

const appendToQueue = (urls: readonly string[]): void => {
  pendingQueue.push(...filterPendingUrls(urls));
};

export const waitForPrefetchIdle = (): Promise<void> =>
  new Promise((resolve) => {
    idleHandle = scheduleIdleTask(() => {
      idleHandle = null;
      resolve();
    });
  });

/** Tải ngay một nhóm ảnh song song (dùng chung cache với idle queue). */
export const prefetchImagesParallel = (urls: readonly string[]): Promise<void> => {
  const incoming = [...new Set(urls)].filter((url) => !prefetchedUrls.has(url));
  if (incoming.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(incoming.map((url) => prefetchImage(url))).then(() => undefined);
};

const processQueue = async (): Promise<void> => {
  if (isProcessing || shouldSkipPrefetch()) {
    return;
  }

  isProcessing = true;

  try {
    while (pendingQueue.length > 0) {
      const nextUrl = pendingQueue.shift();
      if (!nextUrl || prefetchedUrls.has(nextUrl)) {
        continue;
      }

      await waitForPrefetchIdle();
      await prefetchImage(nextUrl);
    }
  } finally {
    isProcessing = false;

    if (pendingQueue.length > 0) {
      void processQueue();
    }
  }
};

const kickIdleProcessing = (delay = 0): void => {
  if (shouldSkipPrefetch() || pendingQueue.length === 0) {
    return;
  }

  if (idleStartHandle) {
    clearTimeout(idleStartHandle);
  }

  idleStartHandle = setTimeout(() => {
    idleStartHandle = null;
    void processQueue();
  }, delay);
};

/**
 * Prefetch images one-by-one during browser idle time.
 * Returns a cleanup function (no-op — prefetch tiếp tục sau khi rời Home).
 */
export const prefetchImagesWhenIdle = (urls: readonly string[]): (() => void) => {
  if (shouldSkipPrefetch()) {
    return () => {};
  }

  appendToQueue(urls);
  kickIdleProcessing(800);

  return () => {
    if (idleStartHandle) {
      clearTimeout(idleStartHandle);
      idleStartHandle = null;
    }

    if (idleHandle !== null) {
      cancelIdleTask(idleHandle);
      idleHandle = null;
    }
  };
};

/** Hover/focus nav — tải ngay + đẩy lên đầu queue idle còn lại. */
export const prioritizePrefetchImages = (urls: readonly string[]): void => {
  if (shouldSkipPrefetch()) {
    return;
  }

  const incoming = [...new Set(urls)].filter((url) => !prefetchedUrls.has(url));
  if (incoming.length === 0) {
    return;
  }

  prependToQueue(incoming);
  void Promise.all(incoming.map((url) => prefetchImage(url)));

  if (!isProcessing && pendingQueue.length > 0) {
    void processQueue();
  }
};

export const prefetchBannersForPath = (path: string): void => {
  const urls = getClientBannerUrlsForPath(path);
  if (urls.length > 0) {
    prioritizePrefetchImages(urls);
  }
};

export const createNavBannerPrefetchHandlers = (path: string) => ({
  onMouseEnter: () => prefetchBannersForPath(path),
  onFocus: () => prefetchBannersForPath(path),
  onTouchStart: () => prefetchBannersForPath(path),
});
