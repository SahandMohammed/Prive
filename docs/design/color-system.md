# Privé Design System — Color & Brand Guidelines

**Version:** 2.0  
**Authority:** Official Privé Brand & UI Color Architecture  
**Scope:** ASP.NET Core & React / Tailwind v4 Client

---

## 1. Executive Summary & Brand Philosophy

Privé is an ultra-luxury salon management and private grooming platform. The brand aesthetic merges the timeless prestige of high-end French atelier styling with the discreet precision of a modern executive suite.

The color system avoids cold, sterile SaaS blue-greys and harsh pure black borders. Instead, it relies on warm, organic, tactile tones: deep velvety blacks, warm linen creams, golden champagne metallics, and botanical olive tones.

---

## 2. Core Brand Palette

| Role | Color Name | Hex Code | OKLCH / RGB | Suggested Use |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Background** | Privé Black | `#0A0A0A` | `oklch(0.145 0 0)` / `rgb(10, 10, 10)` | Primary backgrounds, dark canvas, brand authority, high-contrast light-mode primary buttons. |
| **Surface Separation** | UI Near-black | `#0A0A0F` | `oklch(0.148 0.005 270)` / `rgb(10, 10, 15)` | App surfaces, sidebar canvas, subtle section separation without stark dividing lines. |
| **Primary Typography** | Privé Cream | `#EBDDD0` | `oklch(0.89 0.02 65)` / `rgb(235, 221, 208)` | Headlines, brand wordmark, primary dark-theme typography, light-mode secondary accents. |
| **Primary Action** | Champagne | `#C6AD8F` | `oklch(0.74 0.045 70)` / `rgb(198, 173, 143)` | Primary actions, emphasis, focus rings, badges, status callouts, luxury details. |
| **Interactive State** | Light Champagne | `#D1B59A` | `oklch(0.77 0.045 68)` / `rgb(209, 181, 154)` | Button hover states, glowing highlights, selected tab indicators, active chip accents. |
| **Editorial Environment**| Privé Olive | `#4D4D35` | `oklch(0.38 0.035 110)` / `rgb(77, 77, 53)` | Editorial feature cards, master environment headers, brand monogram pattern base. |
| **Tonal Layering** | Deep Olive | `#303020` | `oklch(0.26 0.025 110)` / `rgb(48, 48, 32)` | Card backgrounds, elevated surface layering, luxury tonal shadows in dark mode. |
| **Contrast Support** | White | `#FFFFFF` | `oklch(1 0 0)` / `rgb(255, 255, 255)` | Limited high-contrast support, light-theme card surfaces, crisp status dots. |

---

## 3. Dual Theme Specifications

Privé provides a dual-theme experience designed with symmetrical prestige:

### 3.1 Dark Theme (The Signature Privé Brand Experience)
Dark mode is the flagship salon atmosphere—sensory, discreet, and cinematic.

- **Canvas Background (`--background`):** `#0A0A0A` (Privé Black)
- **App Surfaces & Sidebar (`--sidebar`):** `#0A0A0F` (UI Near-black)
- **Card Surfaces (`--card`):** `#151511` (Elevated Deep Olive / Charcoal undertone)
- **Headlines & Text (`--foreground`):** `#EBDDD0` (Privé Cream)
- **Muted Text (`--muted-foreground`):** `#9C9387` (Warm champagne-slate)
- **Primary Action (`--primary`):** `#C6AD8F` (Champagne)
- **Primary Action Text (`--primary-foreground`):** `#0A0A0A` (Privé Black for crisp, bold contrast)
- **Secondary Surfaces (`--secondary`, `--muted`):** `#22221A` / `#1B1B15` (Deep Olive warmth)
- **Borders & Dividers (`--border`, `--input`):** `#292820` (Subtle warm olive-tinted border — **eliminates harsh black borders**)
- **Focus Ring & Highlights (`--ring`, `--highlight`):** `#C6AD8F` / `#D1B59A` (Champagne glow)

### 3.2 Light Theme (Editorial Luxury Salon)
Light mode mirrors the atmosphere of an airy, sunlit high-end boutique—warm linen stationery, crisp marble surfaces, and editorial typography.

- **Canvas Background (`--background`):** `#FAF8F5` (Warm linen/alabaster canvas derived from Privé Cream)
- **Card Surfaces (`--card`, `--popover`):** `#FFFFFF` (Pure white for crisp, elevated cards)
- **Sidebar (`--sidebar`):** `#FFFFFF`
- **Headlines & Text (`--foreground`):** `#0A0A0A` (Privé Black for razor-sharp legibility)
- **Muted Text (`--muted-foreground`):** `#6A655C` (Refined warm olive-charcoal)
- **Primary Action (`--primary`):** `#0A0A0A` (Privé Black button)
- **Primary Action Text (`--primary-foreground`):** `#EBDDD0` (Privé Cream typography)
- **Secondary Surfaces (`--secondary`, `--muted`):** `#F2ECE4` (Soft cream wash)
- **Borders & Dividers (`--border`, `--input`):** `#E6DFD5` (Warm delicate cream border — **no harsh black lines**)
- **Focus Ring & Highlights (`--ring`, `--highlight`):** `#C6AD8F` (Champagne)

---

## 4. Semantic Token & Utility Reference

### 4.1 Tailwind v4 Named Utility Classes
Defined in `src/index.css` via `@theme inline`:

```css
--color-prive-black: #0A0A0A;
--color-prive-nearblack: #0A0A0F;
--color-prive-cream: #EBDDD0;
--color-prive-champagne: #C6AD8F;
--color-prive-champagne-light: #D1B59A;
--color-prive-olive: #4D4D35;
--color-prive-olive-deep: #303020;
--color-prive-white: #FFFFFF;
```

**Tailwind Usage Examples:**
- `bg-prive-black` / `text-prive-black`
- `bg-prive-nearblack`
- `text-prive-cream` / `border-prive-cream`
- `bg-prive-champagne` / `border-prive-champagne`
- `hover:bg-prive-champagne-light`
- `bg-prive-olive` / `bg-prive-olive-deep`

### 4.2 Semantic Component Mapping Table

| Component Token | Light Mode Value | Dark Mode Value | Intended Purpose |
| :--- | :--- | :--- | :--- |
| `--background` | `#FAF8F5` | `#0A0A0A` | Full page canvas |
| `--foreground` | `#0A0A0A` | `#EBDDD0` | Primary text and headings |
| `--card` | `#FFFFFF` | `#151511` | Card, container, and modal backgrounds |
| `--card-foreground` | `#0A0A0A` | `#EBDDD0` | Text on card surfaces |
| `--primary` | `#0A0A0A` | `#C6AD8F` | Primary buttons and key actions |
| `--primary-foreground` | `#EBDDD0` | `#0A0A0A` | Text on primary buttons |
| `--secondary` | `#F2ECE4` | `#22221A` | Secondary pills, filters, chips |
| `--muted` | `#F2ECE4` | `#1B1B15` | Inactive tracks, subtle backgrounds |
| `--muted-foreground` | `#6A655C` | `#9C9387` | Subtitles, labels, secondary icons |
| `--accent` | `#EFE8DC` | `#25241C` | Hover states on interactive items |
| `--border` | `#E6DFD5` | `#292820` | Container outlines, subtle separators |
| `--input` | `#E6DFD5` | `#292820` | Form field borders |
| `--ring` | `#C6AD8F` | `#C6AD8F` | Focus outline indicators |
| `--highlight` | `#C6AD8F` | `#D1B59A` | Badges, counters, brand callouts |

---

## 5. Accessibility & Contrast Verification

Every primary combination satisfies or exceeds WCAG 2.1 AA / AAA standards:

- **Privé Cream (`#EBDDD0`) on Privé Black (`#0A0A0A`):**  
  Contrast ratio: **14.8:1** (Passes WCAG AAA)
- **Privé Black (`#0A0A0A`) on Champagne (`#C6AD8F`):**  
  Contrast ratio: **9.2:1** (Passes WCAG AAA)
- **Privé Black (`#0A0A0A`) on Light Champagne (`#D1B59A`):**  
  Contrast ratio: **10.5:1** (Passes WCAG AAA)
- **Privé Cream (`#EBDDD0`) on Deep Olive (`#303020`):**  
  Contrast ratio: **8.4:1** (Passes WCAG AAA)
- **Privé Black (`#0A0A0A`) on Light Canvas (`#FAF8F5`):**  
  Contrast ratio: **18.7:1** (Passes WCAG AAA)
- **Muted Text (`#6A655C`) on Light Canvas (`#FAF8F5`):**  
  Contrast ratio: **5.6:1** (Passes WCAG AA for normal text, AAA for large text)
- **Muted Text (`#9C9387`) on Dark Canvas (`#0A0A0A`):**  
  Contrast ratio: **6.8:1** (Passes WCAG AA for normal text, AAA for large text)

---

## 6. Border & Surface Rules

1. **No Harsh Black Borders:** Never use pure black (`#000000` or `border-black`), dark charcoal rings, or `ring-foreground/10` on cards or form controls.
2. **Warm Border Blending:** Always use the semantic `--border` token (`border border-border/50`), which softly blends with cream in light mode and subtle deep olive in dark mode.
3. **Glassmorphic Cards:** On landing, login, and elevated modal surfaces, use `bg-card/85 backdrop-blur-2xl border border-border/40 shadow-xl` for modern depth without visual clutter.
4. **Input Focus States:** Focus rings must use Champagne (`focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0`), never default browser blue or stark black.

---

## 7. Official Brand Assets & Copyright Notice

### 7.1 Visual Assets
- **Cover Pattern (`/assets/images/cover.png`):** Bespoke Privé olive monogram pattern with an illuminated golden É emblem. Used as the left editorial hero in the authentication suite.
- **Wordmark (`/assets/images/Wordmark.png`):** Official "PRIVÉ GROOMING LOUNGE" logotype in Privé Cream. When rendered in light mode on bright backgrounds, apply `brightness-0 dark:brightness-100` for crisp legibility.
- **System Ownership (`/assets/images/LogicBloom.png`):** Official LogicBloom company mark. When displayed in dark mode, apply `dark:brightness-0 dark:invert` to render in pure white.

### 7.2 Copyright & Attribution Rule
All system portals, footers, and export documents must declare copyright ownership:
> **"System copyrighted to LogicBloom. All rights reserved."**
