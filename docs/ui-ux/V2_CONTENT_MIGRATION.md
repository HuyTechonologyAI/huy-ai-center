# HUY AI DIGITAL ECOSYSTEM — V2 CONTENT MIGRATION & CROSS-SITE HANDOFF MATRIX

## 1. Migration Overview & Non-Destructive Policy

**Strict Rule for Phase 06J-UX:**  
**ZERO CONTENT DELETION.** No existing database rows, video links, or training pages are deleted or removed during this architectural phase.

Existing content on `huycncdsai.io.vn` is audited and mapped to its appropriate long-term home within the 6-organization ecosystem to prevent SEO ranking loss and preserve user bookmarks.

---

## 2. Content Audit & Migration Decision Matrix

| Existing Route / Section | Current Content Scope | Strategic Classification | Target Destination / Action | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **`/` (Homepage Hero)** | "Làm Chủ AI & Tự Động Hóa", Personal trainer tagline | `REPOSITION` | Corporate Hero (`HUY TECHNOLOGY AI GROUP`) | Establish parent technology group authority |
| **`/roadmap`** | Lộ trình học n8n, Make.com, AI Agent cơ bản -> nâng cao | `MOVE_TO_AI_SCHOOL` | `https://gvcncdsai.io.vn/roadmap` (with corporate redirect / link) | Education curricula belongs natively under `org-02-aischool` |
| **`/resources`** | Kho tài liệu Ebook, Slide mẫu, Kịch bản n8n JSON | `MOVE_TO_RESOURCES` | Kept at `/resources` as Public Tech Assets & Whitepapers | Rebranded from course handouts to Enterprise Tech Whitepapers & Public Toolkits |
| **`/videos`** | Video hướng dẫn kỹ thuật, bài giảng n8n/Make | `MOVE_TO_MEDIA_TECH` | Rebranded under `/media` (`org-04-media-tech`) | Aligns with HUY TECH MEDIA content stream |
| **`/pricing`** | Bảng giá khóa học cá nhân & thành viên VIP | `MOVE_TO_AI_SCHOOL` | Migrates to `https://gvcncdsai.io.vn/pricing` | Commercial course pricing removed from corporate holding homepage |
| **`/rewards`** | Đổi quà, điểm tích lũy học viên, gamification | `MOVE_TO_AI_SCHOOL` | Migrates to `https://gvcncdsai.io.vn/rewards` | Student gamification is an EdTech academy function |
| **`/quiz`** | AI Dynamic Quiz (Gemini API test trắc nghiệm) | `MOVE_TO_AI_SCHOOL` | Migrates to `https://gvcncdsai.io.vn/quiz` | Interactive testing tools belong to AI School |
| **`/certificate`** | Cấp chứng chỉ hoàn thành khóa học điện tử | `MOVE_TO_AI_SCHOOL` | Migrates to `https://gvcncdsai.io.vn/verify` | Official educational certifications belong to AI School |
| **`/affiliate`** | Tiếp thị liên kết bán khóa học | `MOVE_TO_AI_SCHOOL` | Handled within AI School partner portal | Not part of corporate enterprise engagement |
| **`/about` (Expert Profile)** | Tiểu sử Ngô Quốc Huy, giải thưởng Kỹ sư, OCOP | `KEEP_ON_CORPORATE` | Section 13 (`Founder & Leadership Credibility`) | Repositioned from lone trainer to Executive Founder & Chief Architect |
| **`/contact`** | Biểu mẫu liên hệ chung | `KEEP_ON_CORPORATE` | Upgraded to Intent-Aware Corporate Portal | Routes inquiries to Automation, Education, TaxTech, or Media |
| **`/admin`** | Quản lý CMS, Người dùng, Bài viết | `MOVE_TO_CONTROL_CENTER`| Separated from public UI to dedicated Control Center | Security hygiene: internal operations isolated from marketing |

---

## 3. GVCNCDSAI AI School Handoff Protocol

Education-focused assets, lesson plan generators, and student management systems natively belong to **`org-02-aischool`** (`https://gvcncdsai.io.vn`).

### 3.1 Cross-Site Linking Rules
1. **Header Link:** The corporate header displays `"AI School"` linking to `https://gvcncdsai.io.vn` with `rel="noopener"`.
2. **Seamless Navigation:** Course seekers landing on corporate pages see an informative banner:
   > *"Đang tìm kiếm các khóa đào tạo AI & Trợ lý giáo án Công văn 5512? Ghé thăm [GVCNCDSAI AI School ↗](https://gvcncdsai.io.vn)."*
3. **SEO Preserve:** Once the AI School domain is live in production, 301 permanent redirects will map legacy course routes (`/roadmap`, `/pricing`, `/quiz`) to their canonical `gvcncdsai.io.vn` equivalents.

---

## 4. SmartTax AI Handoff Protocol

TaxTech, legal compliance, and CPA document verification belong to **`org-03-smarttax`** (`https://smarttax-ai.vercel.app`).

### 4.1 Boundary Rules
1. **Public Exposure Only:** The corporate website features SmartTax AI's three operating modes (Mode A: Tra cứu luật định danh, Mode B: Soạn thảo chứng từ thuế, Mode C: Kết nối CPA chuyên nghiệp) as an ecosystem solution.
2. **Confidentiality Lock:** Raw taxpayer files, invoice OCR data, and confidential CPA communications are NEVER handled or stored on the corporate website. All intake occurs within SmartTax's dedicated secure infrastructure.

---

## 5. Media Brands Handoff Protocol

The three media agencies (`org-04-media-tech`, `org-05-media-edu`, `org-06-media-creative`) are integrated into a coordinated **Corporate Media Hub**:

1. **HUY TECH MEDIA (`/media/tech`):** Deep architectural articles, n8n/Make automation tutorials, and corporate case study videos.
2. **GVCNCDSAI MEDIA (`/media/education`):** Pedagogical insights, teacher growth vlogs, and STEM teaching guides.
3. **HUY CREATIVE MEDIA (`/media/creative`):** Royalty-free AI audio tracks, creative viral shorts, and lifestyle soundscapes.

*Social Integration Policy:* Avoid raw, unmoderated live social feeds. All public media items displayed on the corporate portal are curated and fetched via secure, cached API endpoints to protect site performance and brand integrity.
