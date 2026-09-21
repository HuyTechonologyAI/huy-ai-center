# HUY AI DIGITAL ECOSYSTEM — V2 TYPOGRAPHY SPECIFICATION

## 1. Overview & Type Architecture

The typography system for **HUY TECHNOLOGY AI GROUP** is engineered to balance high-tech authority with effortless editorial readability. It uses a three-tier typographic hierarchy:

1. **Display / Headline Font:** Geometric, futuristic, authoritative.
2. **Body / UI Font:** Clean, highly legible, optimized for dense technical reading and UI controls.
3. **Monospace / Metric Font:** Precise, developer-grade, designed for IDs, data points, and status logs.

---

## 2. Font Selection & Vietnamese Glyph Rendering

### 2.1 Family Mapping

| Role | Primary Font Family | Secondary / Fallback | Open Source License | Delivery Mode |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | **Space Grotesk** | **Sora** | SIL Open Font License 1.1 | `next/font/google` (Self-hosted via Next.js) |
| **Body** | **Plus Jakarta Sans** | **Inter** | SIL Open Font License 1.1 | `next/font/google` (Self-hosted via Next.js) |
| **Mono** | **JetBrains Mono** | **Fira Code** | Apache License 2.0 | `next/font/google` (Self-hosted via Next.js) |

### 2.2 Vietnamese Diacritics Verification
Vietnamese typography requires impeccable accent mark positioning (dấu sắc, huyền, hỏi, ngã, nặng, nón, râu: `á, à, ả, ã, ạ, ă, ắ, ằ, ẳ, ẵ, ặ, â, ấ, ầ, ẩ, ẫ, ậ, đ, é, è, ẻ, ẽ, ẹ, ê, ế, ề, ể, ễ, ệ, ó, ò, ỏ, õ, ọ, ô, ố, ồ, ổ, ỗ, ộ, ơ, ớ, ờ, ở, ỡ, ợ, ú, ù, ủ, ũ, ụ, ư, ứ, ừ, ử, ữ, ự, ý, ỳ, ỷ, ỹ, ỵ`).

- **Space Grotesk & Sora:** Complete coverage of Latin Extended-A and Vietnamese subsets without glyph clipping or vertical misalignments.
- **Plus Jakarta Sans:** Renowned for balanced ascenders and descenders with stacked Vietnamese accents (e.g., `ổ`, `ở`, `ế`).
- **Subsets Configuration in Next.js:**
  ```typescript
  import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";

  export const fontSans = Plus_Jakarta_Sans({
    subsets: ["latin", "vietnamese"],
    variable: "--font-sans",
    display: "swap",
  });

  export const fontDisplay = Space_Grotesk({
    subsets: ["latin", "vietnamese"],
    variable: "--font-display",
    display: "swap",
  });

  export const fontMono = JetBrains_Mono({
    subsets: ["latin", "vietnamese"],
    variable: "--font-mono",
    display: "swap",
  });
  ```

---

## 3. Typographic Hierarchy & Scale

| Style Name | Size | Line Height | Tracking | Weight | HTML Tag | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | `4.5rem` (72px) | `1.05` | `-0.04em` | 800 (Extrabold) | `<h1>` | Homepage Hero main headline |
| **Section Title** | `3.0rem` (48px) | `1.15` | `-0.03em` | 700 (Bold) | `<h2>` | Major section headers, ecosystem title |
| **Card Title** | `1.5rem` (24px) | `1.25` | `-0.02em` | 700 (Bold) | `<h3>` | Organization cards, solution cards |
| **Subheading** | `1.25rem` (20px) | `1.4` | `-0.01em` | 600 (Semibold) | `<h4>` | Feature headers, modal titles |
| **Body Large** | `1.125rem` (18px)| `1.6` | `0em` | 400 (Regular) | `<p>` | Section lead paragraphs, hero descriptions |
| **Body Base** | `1.0rem` (16px) | `1.5` | `0em` | 400 / 500 | `<p>` / `<span>`| Standard body text, feature lists |
| **Body Small** | `0.875rem` (14px)| `1.4` | `0em` | 400 / 500 | `<span>` | Card descriptions, footer links, input text |
| **Caption / Label**| `0.75rem` (12px)| `1.2` | `+0.05em` | 700 (Bold) | `<span>` | Badges, tags, status labels (all-caps) |
| **Code / Metric** | `0.875rem` (14px)| `1.4` | `0em` | 500 / 600 | `<code>` | Canonical IDs, model tiers, log entries |

---

## 4. Optical Spacing & Vietnamese Line Height Adjustments

Because Vietnamese accents add vertical height to glyphs, standard English line-heights can cause accented letters on adjacent lines to collide.

- **Rule 1 (Relaxed Line-Height):** Headings in Vietnamese must have a minimum `line-height` of `1.15` (avoid `1.0` or `0.95`).
- **Rule 2 (Tight Tracking):** Avoid excessive negative letter-spacing on display fonts in Vietnamese; limit to `-0.02em` to prevent diacritics from blending into neighboring letters.
- **Rule 3 (Typewriter Effect):** When rendering dynamic typewriter text in hero banners, use an explicit `min-height` and `min-width` container to prevent layout shifts (CLS = 0).
