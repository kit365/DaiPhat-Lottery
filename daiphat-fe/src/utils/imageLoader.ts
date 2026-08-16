'use client';

import type { ImageLoaderProps } from 'next/image';

/**
 * Custom Image Loader for Next.js <Image /> components.
 * 
 * Delegates image resizing & format transformation directly to Cloudinary CDN URL parameters
 * (f_auto, q_auto, w_{width}, c_limit), completely bypassing Next.js server Sharp/libvips processing.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!src) return '';

  // If the image is hosted on Cloudinary, inject transformation parameters
  if (typeof src === 'string' && src.includes('res.cloudinary.com') && src.includes('/image/upload/')) {
    // Avoid duplicate transformation injection if already present
    if (src.includes('/image/upload/f_auto') || src.includes('/image/upload/c_')) {
      return src;
    }
    const q = quality ? `q_${quality}` : 'q_auto';
    const transform = `f_auto,${q},w_${width},c_limit`;
    return src.replace('/image/upload/', `/image/upload/${transform}/`);
  }

  // For static local assets or other external domains, include width so Next.js
  // validates the loader (CDN may ignore the query param).
  if (typeof src === 'string' && width && !src.includes('w=')) {
    const separator = src.includes('?') ? '&' : '?';
    return `${src}${separator}w=${width}${quality ? `&q=${quality}` : ''}`;
  }

  return src;
}
