'use client';

import NextImage, { type ImageProps } from 'next/image';
import imageLoader from '@/utils/imageLoader';

/** Wraps next/image with the project's custom loader (required when images.loader = custom). */
export function AppImage({ loader, unoptimized, ...props }: ImageProps) {
  if (unoptimized) {
    return <NextImage unoptimized {...props} />;
  }

  return <NextImage loader={loader ?? imageLoader} {...props} />;
}

export default AppImage;
