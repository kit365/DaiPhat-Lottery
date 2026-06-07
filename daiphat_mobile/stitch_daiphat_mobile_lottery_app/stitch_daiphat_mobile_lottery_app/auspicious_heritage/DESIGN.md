---
name: Auspicious Heritage
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#5e3f3b'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#936e6a'
  outline-variant: '#e8bcb7'
  surface-tint: '#c00013'
  primary: '#bb0012'
  on-primary: '#ffffff'
  primary-container: '#e7151f'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb4ab'
  secondary: '#705d00'
  on-secondary: '#ffffff'
  secondary-container: '#fcd400'
  on-secondary-container: '#6e5c00'
  tertiary: '#785600'
  on-tertiary: '#ffffff'
  tertiary-container: '#986d00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad6'
  primary-fixed-dim: '#ffb4ab'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#93000b'
  secondary-fixed: '#ffe16d'
  secondary-fixed-dim: '#e9c400'
  on-secondary-fixed: '#221b00'
  on-secondary-fixed-variant: '#544600'
  tertiary-fixed: '#ffdea6'
  tertiary-fixed-dim: '#f7bd48'
  on-tertiary-fixed: '#271900'
  on-tertiary-fixed-variant: '#5d4200'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.5px
  number-display:
    fontFamily: Be Vietnam Pro
    fontSize: 22px
    fontWeight: '800'
    lineHeight: 28px
    letterSpacing: 1px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  margin-mobile: 16px
  gutter-mobile: 12px
  card-padding: 16px
  stack-gap: 8px
---

## Brand & Style
The brand personality is rooted in the concept of "Tài Lộc" (Wealth and Luck), blending traditional Vietnamese cultural values with modern digital convenience. The target audience seeks a reliable, festive, and rewarding experience. 

The design style is **Corporate / Modern** with subtle **Tactile** influences. It utilizes a clean, card-based layout to organize complex lottery data while employing a high-energy color palette of red and gold to evoke prosperity. The mobile experience must feel efficient yet celebratory, using crisp white surfaces to let the lucky red accents and data-heavy results remain highly legible.

## Colors
The palette is dominated by **Auspicious Red** (Primary), used for critical actions, headers, and winning numbers to signify energy and luck. **Prosperity Gold** (Secondary) and its deeper tonal variant (Tertiary) are used as accents, icons, and highlights to represent wealth and premium value.

The background is a soft neutral grey/white to ensure maximum readability for the dense numerical data characteristic of lottery platforms. Functional colors like success (green) or information (blue) should be used sparingly, as red is the semantic driver of the brand's identity.

## Typography
This design system uses **Be Vietnam Pro** across all levels to maintain a contemporary, approachable, and localized feel. Since the application is data-centric, the typography relies on varying weights rather than many different typefaces.

Winning numbers and ticket digits use the `number-display` role, featuring extra-bold weights and increased letter-spacing to ensure no ambiguity. For mobile, headline sizes are capped at 24px to prevent excessive wrapping while maintaining a clear information hierarchy.

## Layout & Spacing
The layout follows a **fluid grid** model adapted for mobile screens. The horizontal margins are fixed at 16px to create a consistent "frame" for content. Elements within cards utilize an 8px or 12px gutter to maximize the limited screen real estate without feeling cluttered.

Vertical rhythm is established through a 4px baseline unit. Grouped list items use an 8px gap, while distinct logical sections use 24px of separation to indicate a transition in content.

## Elevation & Depth
Hierarchy is established through **Tonal Layers** and **Ambient Shadows**. The primary background is the lowest level (Neutral). Content is housed in white cards with a very soft, diffused shadow (Blur: 8px, Y: 2px, Opacity: 5%) to create a sense of physical layering without adding visual noise.

Buttons and active selection states (like a chosen lottery ticket) use a subtle inner glow or a 1px border in the primary red color to signify their interactive status. Depth is also communicated through "Surface Containers"—subtle grey backgrounds behind input areas or non-interactive data tables.

## Shapes
The shape language is **Rounded**, striking a balance between modern software design and a friendly, approachable brand image. Standard components (buttons, input fields, cards) use a 0.5rem (8px) corner radius. Large containers or banners may use the `rounded-lg` (16px) variant to feel more like distinct physical objects. 

Circular shapes are reserved exclusively for "Lottery Balls" and avatar containers to maintain their traditional symbolic meaning.

## Components

- **Buttons:** Primary buttons are solid red with white text. Secondary buttons use a red 1px outline with a white background. All buttons have a minimum height of 48px for mobile tap targets.
- **Cards:** White backgrounds with an 8px radius. Use a light grey border (1px) instead of heavy shadows for data tables within cards.
- **Lottery Chips:** Small, rounded-pill containers used for number selection. Inactive: light grey background with dark text. Active: primary red background with white text.
- **Input Fields:** Outlined style with 8px radius. On focus, the border transitions to primary red.
- **Bottom Sheets:** Used for filters and "Select Province" actions on mobile, featuring a 16px top-corner radius and a handle indicator.
- **Lists:** Clean row-based lists with a 1px bottom separator and a chevron-right trailing icon to indicate drill-down navigation.