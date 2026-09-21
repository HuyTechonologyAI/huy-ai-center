# HUY AI DIGITAL ECOSYSTEM — V2 ACCESSIBILITY SPECIFICATION (WCAG 2.2 AA)

## 1. Compliance Commitment

**HUY TECHNOLOGY AI GROUP** is committed to digital inclusivity. The V2 corporate web platform is engineered to meet or exceed **WCAG 2.2 Level AA** standards across all viewports and devices.

Information and interactive controls must never rely solely on color, hover, or motion to convey meaning.

---

## 2. Core Accessibility Pillars

### 2.1 Semantic Landmarks & Document Structure
Pages must use valid HTML5 semantic tags to enable screen reader navigation (`NVDA`, `JAWS`, `VoiceOver`):
- `<header role="banner">`: Houses `AppHeader` and global navigation.
- `<nav role="navigation" aria-label="Main Navigation">`: Primary site navigation.
- `<main role="main" id="main-content">`: Main content container (target of skip-to-content link).
- `<section aria-labelledby="section-heading-id">`: Each of the 16 homepage sections.
- `<footer role="contentinfo">`: Multi-entity footer and legal notices.

### 2.2 Skip to Content Link
A visible-on-focus skip link is placed as the very first element in `<body>`:
```html
<a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand-primary focus:text-black focus:font-bold focus:rounded-md">
  Chuyển đến nội dung chính (Skip to content)
</a>
```

### 2.3 Strict Heading Hierarchy
Every page strictly follows logical heading nesting:
- Exactly **one `<h1>`** per page (in HeroSection).
- Section titles are strictly `<h2>`.
- Card titles and sub-components are strictly `<h3>`.
- Feature details and accordion triggers are `<h4>`.
- Headings are never skipped (e.g., `<h1>` directly to `<h3>` is forbidden).

---

## 3. Contrast Ratios & Color Independence

### 3.1 Contrast Thresholds
- **Normal Body Text (< 18pt or < 14pt bold):** Contrast ratio >= **4.5:1** against background.
- **Large Text (>= 18pt or >= 14pt bold):** Contrast ratio >= **3.0:1** against background.
- **Interactive UI Controls & Borders:** Contrast ratio >= **3.0:1** against adjacent background.

### 3.2 Non-Color Visual Cues
- Status badges do not rely solely on color. They must pair an icon, explicit text label, and distinct border:
  - *Active:* Green dot + Check icon + Text "Đang hoạt động".
  - *Approval Required:* Amber dot + Clock icon + Text "Yêu cầu phê duyệt".
  - *Critical Risk:* Red dot + Alert icon + Text "Nguy cơ cao".

---

## 4. Keyboard Navigation & Focus Management

1. **Tab Sequence:** Follows natural visual reading order (top-to-bottom, left-to-right).
2. **Focus Rings:** Invisible or suppressed focus outlines are strictly prohibited. Every interactive element must display a high-contrast focus indicator:
   ```css
   :focus-visible {
     outline: 2px solid var(--color-brand-primary);
     outline-offset: 2px;
     box-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
   }
   ```
3. **Modals & Drawers (`Focus Trap`):**
   - When a modal opens, focus moves automatically to the first focusable control inside the modal.
   - Pressing `Tab` cycles exclusively within the modal.
   - Pressing `Escape` immediately dismisses the modal and returns focus to the triggering element.
   - Background content is marked `aria-hidden="true"` while the modal is active.

---

## 5. Forms & Error Handling

1. **Explicit Label Association:** Every input field has a matching `<label htmlFor="field-id">`.
2. **Error Announcement:**
   - Fields with validation errors have `aria-invalid="true"`.
   - Error messages are associated via `aria-describedby="field-id-error"`.
   - Form submission errors trigger an `aria-live="polite"` announcement summary.

---

## 6. Media & SVG Accessibility

- All images must provide meaningful `alt` text describing content and context (e.g., `alt="Sơ đồ điều phối đa tác tử HUY AI theo giao thức HAIP"`).
- Decorative icons and illustrations have `aria-hidden="true"`.
- Complex diagrams (e.g., `EcosystemMap`) provide an equivalent textual description accessible via screen readers or an alternative table view.
