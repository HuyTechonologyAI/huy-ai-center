# HUY AI DIGITAL ECOSYSTEM — V2 MOTION SYSTEM SPECIFICATION

## 1. Principles of Motion

Motion within the **HUY AI DIGITAL ECOSYSTEM** is purposeful, subtle, and high-performance. It reinforces architectural hierarchy and spatial awareness without causing distraction or cognitive fatigue.

- **Purpose over Decoration:** Animations exist to guide user attention, confirm user actions, and illustrate system connections.
- **60 FPS Guarantee:** All animations rely exclusively on composited CSS properties (`transform`, `opacity`) to eliminate layout thrashing and repaints.
- **Strict Accessibility:** When `prefers-reduced-motion: reduce` is detected, all movement and staggered delays collapse to instantaneous opacity transitions.

---

## 2. Motion Tokens & Durations

| Token | Duration | Cubic Bezier Curve | Usage |
| :--- | :--- | :--- | :--- |
| `--motion-instant` | `100ms` | `cubic-bezier(0, 0, 0.2, 1)` | Checkbox toggle, tab switch, radio button selection |
| `--motion-fast` | `200ms` | `cubic-bezier(0, 0, 0.2, 1)` | Button hover, focus ring reveal, badge color shift |
| `--motion-normal` | `350ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Card tilt, modal entrance, drawer slide, dropdown expand |
| `--motion-slow` | `500ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Accordion section fold, tab content transition |
| `--motion-reveal` | `700ms` | `cubic-bezier(0.16, 1, 0.3, 1)` | Section scroll reveal, staggered metric entry |

---

## 3. Allowed Motion Patterns

### 3.1 Subtle Section Scroll Reveal
When a section enters the viewport (`IntersectionObserver` at `threshold: 0.15`):
- Elements fade in from `opacity: 0` to `opacity: 1`.
- Slight upward translation: `translateY(24px)` to `translateY(0)`.
- Stagger children delay: `80ms` between sequential items.

### 3.2 Ecosystem Node Pulse & Connection Ray
- Central node emits a gentle, rhythmic glow pulse (scale `1.0` to `1.03` over `3s`, easing `ease-in-out`).
- Data rays between the Central Node and the 5 BU nodes animate via SVG `stroke-dashoffset` to signify live data flow.
- Loop pauses when the element is off-screen.

### 3.3 Interactive Card Depth (Hover Depth)
- On hover, cards smoothly elevate: `transform: translateY(-4px) translateZ(10px)`.
- Border transitions from `rgba(255, 255, 255, 0.08)` to the BU's accent color.
- Subtle inner glow expands: `box-shadow: 0 12px 30px -10px var(--color-brand-glow)`.

### 3.4 Animated Count-Up Metrics
- Numbers smoothly count from `0` to target value (e.g., `1.200+`, `65`, `25`) over `1.8s` using cubic ease-out.
- Fires only once upon first entering the viewport.

---

## 4. Forbidden Animation Practices

1. ❌ **No Continuous Heavy Particles:** Avoid background particle meshes with hundreds of canvas nodes consuming continuous CPU/GPU cycles on mobile devices.
2. ❌ **No WebGL Bloat:** Avoid multi-megabyte 3D canvas libraries (Three.js / Spline) for simple decorations.
3. ❌ **No Essential Information Gated by Motion:** Key corporate facts, compliance notices, and phone numbers must be immediately readable even if JavaScript or animations fail.
4. ❌ **No Aggressive Flashing / Strobing:** Motion must strictly comply with WCAG 2.3.1 (Three Flashes or Below Threshold).

---

## 5. Implementation Standard with Framer Motion

```typescript
import { Variants } from "framer-motion";

export const fadeInVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};
```

### 5.1 Prefers-Reduced-Motion Media Query
```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
