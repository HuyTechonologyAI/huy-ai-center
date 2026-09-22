# BÁO CÁO QUẢN TRỊ SAU PHÁT HÀNH & TĂNG CƯỜNG KIỂM SOÁT MÃ NGUỒN
## PHASE 06J-UX-D.1 — POST-LAUNCH GOVERNANCE + SOURCE CONTROL HARDENING

**Dự án:** HUY AI AGENCY GROUP V2.0  
**Thương hiệu chủ quản:** HUY TECHNOLOGY AI GROUP  
**Domain Sản xuất chính thức:** `https://www.huycncdsai.io.vn`  
**Kho lưu trữ:** `HuyTechonologyAI/edtech-ai-portfolio`  
**Thời điểm thực hiện:** 2026-09-22T09:13:00+07:00  
**Trạng thái giai đoạn:** **PASS**  

---

## 1. MỤC TIÊU VÀ NGUYÊN TẮC KỶ LUẬT (HARD SAFETY RULES COMPLIANCE)

Giai đoạn **06J-UX-D.1** tập trung củng cố toàn diện năng lực quản trị, thiết lập ranh giới an toàn cho mã nguồn và các tác tử AI ngay sau khi chuyển giao sản xuất thành công:
1. Xác thực nguồn chân lý mã nguồn sản xuất (Production Source of Truth).
2. Thiết kế và đối soát quy tắc bảo vệ nhánh `main` (Branch Protection).
3. Ban hành quy trình phát hành chuẩn tắc (Release Workflow Governance).
4. Phân định ranh giới và quyền hạn thao tác mã nguồn của tác tử AI (AI Agent Code Policy).
5. Chuẩn hóa quy trình phân cấp sự cố và phục hồi khẩn cấp (Incident & Rollback Standard).
6. Ban hành biểu mẫu PR và biểu mẫu báo cáo sự cố chuẩn GitHub.

### Cam kết Kỷ luật Tuyệt đối (Hard Safety Rules):
- **Cơ sở dữ liệu Supabase Production:** Giữ nguyên 34 bảng public, 7 lịch sử migration, 0 tác tử được seed, hàng đợi `ai-jobs` trống 0 thông điệp. ZERO DB CHANGES.
- **Hạ tầng AI Runtime & Dispatcher:** Dispatcher **NOT DEPLOYED**, node Dell M4800 giữ nguyên trạng Offline an toàn. Không triển khai n8n, Langflow, LiteLLM, Ollama.
- **Giao diện Sản xuất:** Giữ ổn định 100%, ZERO UI REDESIGN.

---

## 2. XÁC THỰC NGUỒN CHÂN LÝ SẢN XUẤT (PRODUCTION SOURCE OF TRUTH)

- **Kho lưu trữ (Repository):** `HuyTechonologyAI/edtech-ai-portfolio`
- **Nhánh Sản xuất (Production Branch):** `main`
- **Current Production Main SHA (Ghi nhận):** `2fcf4823e8c6649a5be3813cf9210ee2063932f9`
- **Commit Baseline tiền Cutover:** `7f3dfdf7f5c0fe59381da431bff7bc473082f5bc`
- **Merge Commit Cutover:** `32d096ab22e48f0581da0334c429f6d1884442d6`
- **Thời điểm Cutover Sản xuất:** `2026-09-21T22:20:07+07:00` (15:20:07 UTC)
- **Vercel Production Deployment ID:** `sin1::59jds-1790004036237-c1ef45dc79ee` (URL nội bộ Vercel: `P3XZ89gLPxorWWakjwJikXDCQqDA`)
- **Rollback Tag Đã Kiểm Tra:** `pre-corporate-v2-cutover-2026-09-21` (Phân giải chính xác về `7f3dfdf7f5c0fe59381da431bff7bc473082f5bc`)
- **Production Release Tag Đã Tạo:** `corporate-v2.0.0` (Trỏ trực tiếp vào commit phát hành `2fcf4823e8c6649a5be3813cf9210ee2063932f9`, đã đẩy lên remote origin).

---

## 3. THIẾT KẾ VÀ ĐỐI SOÁT BẢO VỆ NHÁNH `main` (BRANCH PROTECTION)

- **Chính sách Bắt buộc Đã Thiết kế:**
  - Bắt buộc Pull Request trước khi Merge (`require_pull_request: TRUE`).
  - Bắt buộc kiểm thử CI tự động trước khi Merge (`require_status_checks: TRUE`).
  - Chặn hoàn toàn Force Push (`block_force_push: TRUE`).
  - Chặn hoàn toàn Xóa Nhánh (`block_deletion: TRUE`).
  - Chặn commit trực tiếp vào `main` cho toàn bộ lập trình viên và tác tử AI.
  - Bắt buộc giải quyết hội thoại trong PR (`require_conversation_resolution: TRUE`).
  - Không khóa quyền can thiệp khẩn cấp của Repository Owner.
- **Trạng thái Kỹ thuật Trên GitHub API:**
  - Lệnh kiểm tra qua GitHub API trả về `HTTP 401 Unauthorized` do môi trường hiện tại không lưu trữ GitHub Admin Personal Access Token.
  - **Báo cáo chuẩn mực:** `BRANCH_PROTECTION: MANUAL_ACTION_REQUIRED`.
  - Đã lập tài liệu hướng dẫn từng bước kích hoạt trên giao diện GitHub Web Settings cho Repository Owner tại `docs/governance/V2_GIT_BRANCH_POLICY.md`.

---

## 4. RANH GIỚI THAO TÁC CỦA TÁC TỬ AI (AI AGENT CODE-CHANGE BOUNDARIES)

Các tác tử AI trong tương lai tuân thủ nguyên tắc **TỪ CHỐI MẶC ĐỊNH (DEFAULT DENY)**:
- **CẤM TUYỆT ĐỐI (MUST NOT):**
  1. Không push trực tiếp lên `main`.
  2. Không force push (`--force` / `--force-with-lease`).
  3. Không tự merge Pull Request của chính mình.
  4. Không sửa đổi Branch Protection Rules.
  5. Không trích xuất hay chỉnh sửa production secrets.
  6. Không tự ý triển khai Production khi chưa có lệnh của con người.
  7. Không tự phê duyệt thay đổi cấp độ Risk 3 và Risk 4.
- **ĐƯỢC PHÉP (MAY):**
  1. Tạo nhánh tính năng (`feat/...`, `fix/...`, `docs/...`).
  2. Chỉnh sửa code trong phạm vi nhiệm vụ được giao.
  3. Chạy kiểm thử tự động cục bộ (`npm test`, `npx tsc --noEmit`).
  4. Tạo commit có cấu trúc chuẩn Semantic Commit (`feat(web):`, `fix(web):`...).
  5. Mở Draft Pull Request và đính kèm checklist kiểm thử.
  6. Soạn thảo Release Notes và tài liệu kỹ thuật.
  7. Yêu cầu con người đánh giá và xin phê duyệt (Request human review).

---

## 5. BỘ QUY TRÌNH QUẢN TRỊ ĐÃ BAN HÀNH (GOVERNANCE SUITE)

Hệ thống đã xuất xưởng 6 tài liệu tiêu chuẩn tại thư mục `scratch/huy-ai-center/docs/governance/`:
1. `V2_RELEASE_GOVERNANCE.md`: Quy trình 10 bước phát hành chuẩn, quản trị SEO, quản trị nội dung xác thực, quản trị bản sắc 6 BUs.
2. `V2_GIT_BRANCH_POLICY.md`: Chính sách bảo vệ nhánh `main`, hướng dẫn thiết lập thủ công, chuẩn commit.
3. `V2_AI_AGENT_CODE_POLICY.md`: Ranh giới quyền hạn tác tử AI, bảng phân cấp rủi ro thay đổi (LOW / MEDIUM / HIGH / CRITICAL).
4. `V2_PRODUCTION_INCIDENT_POLICY.md`: Phân cấp sự cố 4 mức (SEV-1 đến SEV-4), quy trình đóng băng, hotfix và liên hệ khẩn cấp.
5. `V2_ROLLBACK_STANDARD.md`: Thứ tự ưu tiên phục hồi (Vercel Instant Rollback < 30s -> Git Revert PR -> Pre-cutover tag recovery). Xác nhận `ROLLBACK_READY: YES`.
6. `V2_ENVIRONMENT_BOUNDARIES.md`: Phân định 3 tầng môi trường (LOCAL / PREVIEW / PRODUCTION), bộ header bảo mật chuẩn (HSTS, CSP, X-Frame-Options...) và quản trị form liên hệ.

---

## 6. BIỂU MẪU GITHUB CHUẨN ĐÃ THIẾT LẬP

Đã tạo và đồng bộ biểu mẫu trên cả hai kho lưu trữ:
- `.github/pull_request_template.md`: Checklist đối soát phạm vi, mức độ rủi ro, kiểm thử, zero-DB-changes, SEO và chữ ký phê duyệt của con người.
- `.github/ISSUE_TEMPLATE/production-incident.md`: Mẫu báo cáo sự cố chuẩn hóa (SEV level, URL, thời điểm, log lỗi, quyết định rollback, root cause).

---

## 7. KẾT QUẢ KIỂM THỬ VÀ BIÊN DỊCH TOÀN HỆ THỐNG

- **Monorepo Tests (`scratch/huy-ai-center`):** **PASS (58/58 tests, 100%)**.
- **TypeScript Compile (`edtech-ai-portfolio`):** **PASS (0 lỗi, code 0)**.
- **Next.js Production Build (`edtech-ai-portfolio`):** **PASS (57/57 routes)**.
- **Trạng thái Website Sản xuất (`https://www.huycncdsai.io.vn`):** **LIVE (HTTP 200 OK)**.
