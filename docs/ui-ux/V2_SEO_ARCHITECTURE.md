# HUY AI DIGITAL ECOSYSTEM — V2 SEO & INTERNATIONALIZATION ARCHITECTURE

## 1. SEO Architecture Overview

The SEO architecture for **HUY TECHNOLOGY AI GROUP** is designed for maximum domain authority, zero duplicate content penalties, and authoritative rich snippets across global search engines.

- **Canonical Domain:** `https://www.huycncdsai.io.vn`
- **Default Locale:** `vi_VN` (Vietnamese - Primary)
- **Secondary Locale:** `en_US` (English - Secondary)
- **Integrity Rule:** Zero fabricated reviews, inflated user counts, or fake star ratings in structured markup.

---

## 2. Meta Tags & Social Sharing Architecture

### 2.1 Title & Description Templates

```typescript
export const metadataConfig = {
  title: {
    default: "HUY TECHNOLOGY AI GROUP | Kiến tạo hệ sinh thái vận hành bằng AI",
    template: "%s | HUY TECHNOLOGY AI GROUP",
  },
  description: "Tập đoàn công nghệ kết nối các giải pháp AI, Tự động hóa, Giáo dục số, Pháp lý thuế và Truyền thông đa phương tiện trên nền tảng điều phối đa tác tử bảo mật.",
  keywords: [
    "HUY TECHNOLOGY AI GROUP",
    "AI Agency",
    "Tự động hóa doanh nghiệp",
    "Hệ thống đa tác tử HAIP",
    "GVCNCDSAI AI School",
    "SmartTax AI",
    "Huy Tech Media",
    "Ngô Quốc Huy",
    "Chuyển đổi số AI"
  ],
  authors: [{ name: "Ngô Quốc Huy", url: "https://www.huycncdsai.io.vn/leadership" }],
  creator: "HUY TECHNOLOGY AI GROUP",
  publisher: "HUY TECHNOLOGY AI GROUP",
  openGraph: {
    siteName: "HUY TECHNOLOGY AI GROUP",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "https://www.huycncdsai.io.vn/og-corporate-v2.png",
        width: 1200,
        height: 630,
        alt: "HUY TECHNOLOGY AI GROUP — Kiến tạo hệ sinh thái vận hành bằng AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HUY TECHNOLOGY AI GROUP | Kiến tạo hệ sinh thái vận hành bằng AI",
    description: "Tập đoàn công nghệ kết nối các giải pháp AI, Tự động hóa, Giáo dục số và Pháp lý thuế.",
    images: ["https://www.huycncdsai.io.vn/og-corporate-v2.png"],
  },
};
```

---

## 3. Structured Data (JSON-LD) Schemas

### 3.1 Organization Schema (Parent Holding)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.huycncdsai.io.vn/#organization",
  "name": "HUY TECHNOLOGY AI GROUP",
  "alternateName": "Vạn Hỏa Long Tech",
  "url": "https://www.huycncdsai.io.vn",
  "logo": "https://www.huycncdsai.io.vn/logo-huy-tech.svg",
  "founder": {
    "@type": "Person",
    "@id": "https://www.huycncdsai.io.vn/#founder",
    "name": "Ngô Quốc Huy",
    "jobTitle": "Founder & Chief Executive Officer",
    "alumniOf": "Đại học Sư Phạm Kỹ Thuật TP.HCM"
  },
  "subOrganization": [
    {
      "@type": "Organization",
      "name": "GVCNCDSAI AI SCHOOL",
      "url": "https://gvcncdsai.io.vn"
    },
    {
      "@type": "Organization",
      "name": "SMARTTAX AI",
      "url": "https://smarttax-ai.vercel.app"
    },
    {
      "@type": "Organization",
      "name": "HUY TECH MEDIA",
      "url": "https://www.huycncdsai.io.vn/media/tech"
    },
    {
      "@type": "Organization",
      "name": "GVCNCDSAI MEDIA",
      "url": "https://gvcncdsai.io.vn/media"
    },
    {
      "@type": "Organization",
      "name": "HUY CREATIVE MEDIA",
      "url": "https://www.huycncdsai.io.vn/media/creative"
    }
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+84-961-364-600",
    "contactType": "Corporate Inquiries",
    "email": "huytechnologyai2025@gmail.com",
    "areaServed": "VN",
    "availableLanguage": ["Vietnamese", "English"]
  }
}
```

### 3.2 Service Schema (AI Automation & Solutions)
```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "AI Agency as a Service & Enterprise Workflow Automation",
  "provider": {
    "@id": "https://www.huycncdsai.io.vn/#organization"
  },
  "areaServed": "VN",
  "description": "Tư vấn kiến trúc, triển khai tác tử AI tự động hóa quy trình và hạ tầng máy chủ AI xử lý nội bộ cho doanh nghiệp."
}
```

---

## 4. Robots & Sitemap Strategy

### 4.1 `robots.txt`
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin/
Disallow: /checkout
Disallow: /profile

Sitemap: https://www.huycncdsai.io.vn/sitemap.xml
```

### 4.2 `sitemap.xml` Generation
- Homepage (`/`): `priority: 1.0`, `changefreq: weekly`
- Ecosystem Hub (`/ecosystem`): `priority: 0.9`, `changefreq: weekly`
- Solutions (`/solutions/*`): `priority: 0.8`, `changefreq: monthly`
- Products (`/products`): `priority: 0.8`, `changefreq: monthly`
- Resources & Research (`/resources`, `/research`): `priority: 0.7`, `changefreq: weekly`
- About & Leadership (`/about`, `/leadership`): `priority: 0.6`, `changefreq: monthly`
- Contact (`/contact`): `priority: 0.7`, `changefreq: monthly`

---

## 5. Internationalization (i18n) Strategy

1. **Phase 1 (Current):** Vietnamese-first root (`/`) with bilingual content toggle in memory.
2. **Phase 2 (Scalable Routing):**
   - Vietnamese canonical: `https://www.huycncdsai.io.vn/` (or `/vi/`)
   - English canonical: `https://www.huycncdsai.io.vn/en/`
   - Configured via Next.js App Router subpath routing (`app/[lang]/page.tsx`).
3. **`hreflang` Tags:**
   ```html
   <link rel="alternate" href="https://www.huycncdsai.io.vn/" hreflang="vi-VN" />
   <link rel="alternate" href="https://www.huycncdsai.io.vn/en/" hreflang="en" />
   <link rel="alternate" href="https://www.huycncdsai.io.vn/" hreflang="x-default" />
   ```
4. **Google Translate Hygiene:** Uncontrolled third-party translation widgets with injecting banner frames are completely stripped to ensure pristine Core Web Vitals and layout stability.
