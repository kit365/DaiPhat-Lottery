import { describe, expect, it } from 'vitest';
import {
    computeContainedImageRect,
    isNormalizedBoundingBox,
    mapBoxToNaturalPixels,
    resolveCoordSize,
} from './ocrBboxOverlay';

describe('computeContainedImageRect', () => {
    it('letterboxes a landscape image in a taller container', () => {
        const layout = computeContainedImageRect(800, 600, 1600, 900);
        expect(layout).toEqual({
            offsetX: 0,
            offsetY: 75,
            displayWidth: 800,
            displayHeight: 450,
            naturalWidth: 1600,
            naturalHeight: 900,
        });
    });

    it('letterboxes a portrait image in a wider container', () => {
        const layout = computeContainedImageRect(800, 400, 600, 800);
        expect(layout).toEqual({
            offsetX: 250,
            offsetY: 0,
            displayWidth: 300,
            displayHeight: 400,
            naturalWidth: 600,
            naturalHeight: 800,
        });
    });
});

describe('mapBoxToNaturalPixels', () => {
    it('scales OCR-resized pixel boxes up to the natural image size', () => {
        const mapped = mapBoxToNaturalPixels(
            { x: 100, y: 50, width: 400, height: 300 },
            800,
            600,
            1600,
            1200
        );
        expect(mapped).toMatchObject({
            x: 200,
            y: 100,
            width: 800,
            height: 600,
        });
    });

    it('converts normalized 0..1 boxes into natural pixels', () => {
        const mapped = mapBoxToNaturalPixels(
            { x: 0.1, y: 0.2, width: 0.5, height: 0.4 },
            800,
            600,
            1600,
            1200
        );
        expect(mapped).toMatchObject({
            x: 160,
            y: 240,
            width: 800,
            height: 480,
        });
    });

    it('detects normalized boxes', () => {
        expect(isNormalizedBoundingBox({ x: 0.1, y: 0.2, width: 0.5, height: 0.4 })).toBe(
            true
        );
        expect(isNormalizedBoundingBox({ x: 10, y: 20, width: 100, height: 80 })).toBe(
            false
        );
    });
});

describe('resolveCoordSize', () => {
    it('prefers OCR dimensions when present', () => {
        expect(resolveCoordSize(1280, 960, 2560, 1920)).toEqual({
            coordWidth: 1280,
            coordHeight: 960,
        });
    });

    it('falls back to natural size when OCR size is missing', () => {
        expect(resolveCoordSize(null, null, 2560, 1920)).toEqual({
            coordWidth: 2560,
            coordHeight: 1920,
        });
    });
});
