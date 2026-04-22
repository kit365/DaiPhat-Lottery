# DaiPhat Design System (Tailwind v4 tokens)

This document tracks all custom design tokens and utility classes used in the DaiPhat platform. Use these to maintain visual consistency across all components.

## 🎨 Colors (`client-*`)
Mapped in `tailwind.config.ts`. Usage: `text-client-primary`, `bg-client-navy`, etc.

| Class Suffix | Hex Code | Description |
| :--- | :--- | :--- |
| `primary` | `#FF6262` | Brand Red (Primary Action) |
| `primary-strong` | `#E33F3F` | Darker Red (Hover states) |
| `primary-soft` | `#FFF0F0` | Light Red Tint (Backgrounds) |
| `gold` | `#FFB800` | Accent Gold (Badges, Highlights) |
| `gold-soft` | `#FFF5CC` | Light Gold Tint |
| `navy` | `#102937` | Deep Navy (Headings, Desktop Header) |
| `navy-soft` | `#EAF0F3` | Light Navy Tint |
| `ink` | `#17191F` | Darkest Neutral (Body Text) |
| `text` | `#505050` | Standard Body Text |
| `muted` | `#78818A` | Subtle Text / Icons |
| `surface` | `#FFFFFF` | Card & Section Backgrounds |

## Typography (`font-client-*`)
Mapped in `tailwind.config.ts`. Usage: `font-client-main`, `font-client-display`.

- **`font-client-main`**: "DM Sans" (Primary sans-serif for body and UI)
- **`font-client-display`**: "Playfair Display" (Elegant serif for large hero headings)

## Border Radius (`rounded-client-*`)
Usage: `rounded-client-sm`, `rounded-client-xl`.

- **`client-sm` / `client-md`**: `8px` (Standard buttons and cards)
- **`client-xl`**: `24px` (Large layout containers and modals)

## Layout Utilities
Defined in `tailwind.config.ts` plugins/index.css:

- **`.app-container`**: Standard centered wrapper with responsive max-widths.
- **`.glass-header`**: Glassmorphism effect (backdrop-blur + translucent white).

---
*Last Updated: 2026-04-19*
