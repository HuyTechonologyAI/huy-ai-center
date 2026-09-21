# HUY AI DIGITAL ECOSYSTEM — V2 PRIVACY-CONSCIOUS ANALYTICS PLAN

## 1. Principles of Privacy & Telemetry

The analytics architecture for **HUY TECHNOLOGY AI GROUP** is designed to understand user interaction flows while adhering to rigorous data privacy principles (GDPR, Decree 13/2023/ND-CP on Personal Data Protection):

- **Zero PII Collection:** Analytics events strictly prohibit capturing Personally Identifiable Information (no customer names, email addresses, phone numbers, or IP addresses in event payloads).
- **Design-Time Specification:** No third-party tracking scripts or tracking cookies are injected during Phase 06J-UX-A.
- **Client-Side Sanitization:** All payload parameters are deterministic enums or anonymized IDs.

---

## 2. Canonical Public Event Taxonomy

| Event Name | Trigger Context | Payload Schema | Business Value |
| :--- | :--- | :--- | :--- |
| **`hero_cta_clicked`** | User clicks primary or secondary Hero CTA button | `{ cta_type: "explore_ecosystem" \| "consultation", viewport: "desktop" \| "mobile" }` | Measures above-the-fold engagement |
| **`ecosystem_org_opened`**| User clicks/taps an organization node in `EcosystemMap` | `{ org_id: "org-01-huytech" ... "org-06-media-creative", mode: "constellation" \| "tab_stack" }` | Evaluates interest distribution across the 6 BUs |
| **`solution_viewed`** | User views or expands an enterprise solution card | `{ solution_category: "ai_automation" \| "software_dev" \| "knowledge_ai" \| "taxtech" }` | Identifies high-demand B2B services |
| **`product_cta_clicked`** | User clicks a product link (e.g., Smart Teacher Schedule) | `{ product_id: "teacher_schedule" \| "smarttax_copilot" \| "aaas_platform" }` | Tracks conversion from corporate to product |
| **`school_handoff`** | User navigates from corporate site to `gvcncdsai.io.vn` | `{ source_section: "ecosystem_map" \| "header_nav" \| "footer", destination_page: "school_home" }` | Monitors education cross-traffic |
| **`smarttax_handoff`** | User navigates to `smarttax-ai.vercel.app` | `{ source_section: "ecosystem_map" \| "solution_card" \| "footer", mode: "direct_link" }` | Measures TaxTech interest pipeline |
| **`contact_started`** | User focuses the first input in the contact form | `{ intent_selected: "automation" \| "education" \| "tax" \| "partnership" \| "media" }` | Measures form initiation rate |
| **`contact_submitted`** | User successfully submits consultation inquiry | `{ intent_selected: string, has_attachment: boolean, submission_time_ms: number }` | Measures ultimate B2B conversion rate |

---

## 3. Lead Generation UX & Intent Routing

Instead of a generic single contact form, the V2 lead intake intelligently routes inquiries based on user intent:

```
┌────────────────────────────────────────────────────────┐
│               ENTERPRISE INQUIRY FORM                  │
├────────────────────────────────────────────────────────┤
│ [1] Select Inquiring Intent:                           │
│     ( ) Tư Vấn AI Automation Cho Doanh Nghiệp          │
│     ( ) Hợp Tác Giáo Dục & Đào Tạo AI School           │
│     ( ) Giải Pháp Kê Khai Thuế & SmartTax AI           │
│     ( ) Truyền Thông & Hợp Tác Nội Dung Media          │
│     ( ) Đầu Tư & Đối Tác Chiến Lược                    │
├────────────────────────────────────────────────────────┤
│ [2] Company / Organization Name                        │
│ [3] Work Email / Zalo Number                           │
│ [4] Scope of Requirements / Workflows to Optimize      │
├────────────────────────────────────────────────────────┤
│ [ Submit Inquiry (Bảo Mật Thông Tin Doanh Nghiệp) ]    │
└────────────────────────────────────────────────────────┘
```

- Inquiries selected as **"Tư Vấn AI Automation"** route to the Huy Tech Enterprise Solutions team.
- Inquiries selected as **"Hợp Tác Giáo Dục"** route to the GVCNCDSAI AI School Admissions office.
- Inquiries selected as **"SmartTax AI"** route to the TaxTech CPA Gateway.
