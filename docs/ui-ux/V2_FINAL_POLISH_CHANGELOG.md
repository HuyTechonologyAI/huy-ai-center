# V2 FINAL POLISH CHANGELOG
## HUY AI AGENCY GROUP V2.0 — CORPORATE DIGITAL ECOSYSTEM
**Date:** 2026-09-21  
**Phase:** 06J-UX-B.2 — Final Polish & Launch Readiness  
**Target Route:** `/v2` on `https://www.huycncdsai.io.vn` (Local Feature Branch: `feature/06j-ux-b-corporate-v2-preview`)  

---

### 1. Legacy UI Contamination Elimination
- **Legacy Shell Wrapper:** Created `src/components/LegacyShellWrapper.tsx` utilizing Next.js `usePathname()`.
- **Clean Route Isolation:** When browsing `/v2*`, legacy global elements are excluded:
  - `EcosystemHeaderBar` (Legacy ecosystem top strip): REMOVED on `/v2`.
  - `Header` (Legacy "AI & AutoExpert" single-expert navigation): REMOVED on `/v2`.
  - `MobileNavMenu` (Legacy mobile bottom navigation dock): REMOVED on `/v2`.
  - `EcosystemFooter` (Legacy single-expert footer): REMOVED on `/v2`.
  - `AIChatbot` & `ZaloFloatingButton` (Legacy floating widgets): REMOVED on `/v2`.
- **Zero Regression on Legacy:** Existing portfolio routes (`/`, `/about`, `/courses`, etc.) continue to render the standard legacy layout without any disruption.

---

### 2. Mobile Floating Widgets & Interaction Polish
- **Dedicated Floating Stack:** Implemented `CorporateFloatingWidgets.tsx` specifically for `/v2`.
- **Safe Area Inset Support:** Styled with `pb-[env(safe-area-inset-bottom,0px)]` to respect notch and gesture bars on iOS/Android.
- **Scroll Lock & Collision Prevention:**
  - Integrated body scroll locking (`overflow: hidden`) whenever the mobile navigation drawer opens.
  - Added `.v2-menu-open` selector to automatically hide floating widgets while mobile drawer is active, preventing tap collisions.
- **Visual Separation:** Added clear bottom margins and z-index layering (`z-40` for widgets, `z-50` for header/drawer) so CTAs, cards, and footer remain unblocked.

---

### 3. AI Agency Hierarchy Representation Correction
- **Human Governance Elevation:**
  - Removed misleading numeric level assignment (`Level 4`) from Human Governance.
  - Formatted strictly as an overarching governance layer: `Human Governance (Hội đồng Quản trị & Điều hành Con người)` above the agent hierarchy.
- **5-Tier Canonical Agent Hierarchy:**
  - **Level 4 • Group AI:** Tập đoàn / Group Executive Orchestrator (Điều phối chiến lược tập đoàn).
  - **Level 3 • Company AI:** Đơn vị Thành viên / Company Orchestrator (Quản trị 6 Business Units).
  - **Level 2 • Department AI:** Khối Chức năng / Department Agents (Vận hành 65 phòng ban nghiệp vụ).
  - **Level 1 • Specialist AI:** Chuyên viên Nghiệp vụ / Specialist Agents (Tác tử chuyên môn hóa).
  - **Level 0 • Tools:** Công cụ & Hệ thống / Tools & System Connectors (MCP, DB, APIs, Automation).

---

### 4. Security & Governance Copy Hardening (Public Abstraction)
- **Technical Implementation Details Abstraction:**
  - Replaced internal database terms (`RLS Matrix`, `Row-Level Security`, `check_ai_task_status_transition`, `pgmq`) with enterprise-grade security principles.
  - Replaced internal risk codes (`R0`, `R1`, `R2`, `R3`, `R4`) with customer-friendly operational descriptors (`Mức độ rủi ro hoạt động`, `Quy trình kiểm soát đa tầng`).
  - Removed unsupported claims (e.g., `100% Vết kiểm toán`).
- **Four Core Public Pillars:**
  1. **Phân Quyền Theo Phạm Vi Dữ Liệu:** Đảm bảo ranh giới dữ liệu độc lập giữa các công ty và phòng ban.
  2. **Giám Sát Của Con Người (Human-in-the-Loop):** Các quyết định quan trọng bắt buộc có sự phê duyệt từ nhân sự có thẩm quyền.
  3. **Quyền Hạn Tối Thiểu (Least Privilege):** Mỗi tác tử chỉ được cấp quyền truy cập tài nguyên vừa đủ để thực hiện nhiệm vụ.
  4. **Nhật Ký & Khả Năng Truy Vết (Auditability):** Toàn bộ hành động tác tử được ghi vết minh bạch phục vụ kiểm tra và tuân thủ.
- **Badges:** Standardized on `Nguyên tắc thiết kế` (Design Principle).

---

### 5. Hero & Corporate Tone Alignment
- **Positioning Alignment:** Updated headline and description to consistently position the entity as a **"Hệ sinh thái công nghệ kết nối"** (Connected Technology Ecosystem) instead of an oversized conglomerate.
- **CTA Hierarchy:**
  - **Primary CTA:** `Tư vấn AI Automation` (`#contact` anchor, high-contrast brand styling).
  - **Secondary CTA:** `Khám phá hệ sinh thái` (`#ecosystem` anchor, subtle outline styling).

---

### 6. Sticky Header & Anchor Scroll Correction
- **Header Offset Padding:** Added `scroll-mt-24 md:scroll-mt-28` to all section IDs across `/v2`:
  - `#hero`, `#ecosystem`, `#ai-agency`, `#solutions`, `#products`, `#technology`, `#leadership`, `#contact`, `#case-studies`, `#media`, `#resources`.
- **Result:** Direct anchor navigation or clicking header menu links perfectly aligns section headers below the sticky navigation bar without header truncation.

---

### 7. Ecosystem Map & Density Polish
- **Constellation Centering:** Shifted constellation node layout to the left half (`x <= 300`) to guarantee nodes are not obscured by the detail sidebar.
- **Detail Drawer Ergonomics:** Constrained detail drawer width to `w-72 right-4` with glassmorphism backdrop.
- **Responsive BU Tags:** Hidden business unit product tags on extra-small mobile devices (`hidden sm:block`) to eliminate card clutter.

---

### 8. Founder Credentials Integrity
- **Verified Facts Strictly Preserved:**
  - **Founder:** Ngô Quốc Huy.
  - **Degree:** Kỹ sư Cơ khí Chế tạo — Trường Đại học Sư Phạm Kỹ Thuật TP.HCM (HCMUTE).
  - **Role:** Nhà Sáng Lập & Giám Đốc Điều Hành (Founder & CEO).
  - **Award 1:** Giải thưởng "Người thợ trẻ giỏi toàn quốc" (2020) do Trung ương Đoàn TNCS Hồ Chí Minh trao tặng.
  - **Award 2:** Giải Nhất cuộc thi "Khởi nghiệp Đổi mới Sáng tạo OCOP" tỉnh Đồng Nai (2020).
- **Zero Revision Warning:** All verified credentials preserved without alteration.

---

### 9. Verification & Automated Test Status
- **Portfolio Build:** `npm run build` PASS (56/56 routes compiled cleanly, 0 errors).
- **Automated Test Suite:** `scratch/huy-ai-center/tests/ui-ux-v2-final-polish.test.ts` added.
- **Full Monorepo Tests:** `npm test` PASS (**58/58 tests passing**, 100% success rate).
- **Visual Capture:** 16 final screenshots generated in `screenshots-v2-final/` across mobile (390px), tablet (768px), laptop (1280px), desktop (1440px), and detailed component focus.
