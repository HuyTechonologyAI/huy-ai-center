import { AdapterType, TaskPayload, TaskResult } from '@huy-ai/contracts';
import { Logger } from '@huy-ai/shared';
import { BaseAIServiceAdapter } from './base.js';

export class MockAdapter extends BaseAIServiceAdapter {
  readonly type: AdapterType = 'mock';
  readonly name = 'Mock AI Service Adapter (V1 Offline-Ready)';

  constructor(logger: Logger) {
    super(logger);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  protected async executeInternal(payload: TaskPayload): Promise<TaskResult> {
    const prompt = payload.prompt || '';
    const taskType = (payload.parameters?.task_type as string) || 'lesson_plan';
    const sourceApp = (payload.parameters?.source_app as string) || 'education';
    const inputs = (payload.inputs || payload.parameters || {}) as Record<string, unknown>;

    this.logger.info(`[MockAdapter] Executing mock task for ${taskType}`, {
      sourceApp,
      inputs,
    });

    // Simulate inference latency
    await new Promise((res) => setTimeout(res, 200));

    if (taskType === 'quiz_generator' || prompt.includes('quiz') || prompt.includes('trắc nghiệm')) {
      return this.generateMockQuiz(inputs);
    }

    if (taskType === 'presentation_slides' || prompt.includes('slide') || prompt.includes('bài giảng')) {
      return this.generateMockSlides(inputs);
    }

    if (taskType === 'vat_classification' || prompt.includes('thuế') || prompt.includes('hóa đơn')) {
      return this.generateMockTax(inputs);
    }

    // Default: Lesson Plan (CV 5512)
    return this.generateMockLessonPlan(inputs);
  }

  private generateMockLessonPlan(inputs: Record<string, unknown>): TaskResult {
    const subject = (inputs.subject as string) || 'Tin học';
    const grade = (inputs.grade as string) || 'Lớp 8';
    const topic = (inputs.topic as string) || 'Mạng máy tính và Internet toàn cầu';
    const periods = Number(inputs.periods) || 2;

    const markdownPlan = `
# KẾ HOẠCH BÀI DẠY (GIÁO ÁN CHUẨN CÔNG VĂN 5512/BGDĐT)
**MÔN:** ${subject.toUpperCase()} — **${grade.toUpperCase()}**  
**BÀI HỌC:** ${topic.toUpperCase()}  
**Thời lượng thực hiện:** ${periods} tiết  

---

### I. MỤC TIÊU BÀI HỌC
1. **Kiến thức:**
   - Học sinh nêu được định nghĩa mạng máy tính, các thành phần cơ bản của mạng máy tính.
   - Phân biệt được mạng có dây, mạng không dây và vai trò của mạng toàn cầu Internet.
2. **Năng lực:**
   - *Năng lực tin học:* Biết kết nối thiết bị với mạng Wi-Fi an toàn, nhận biết các thiết bị mạng cơ bản (Switch, Router, Access Point).
   - *Năng lực tự chủ và tự học:* Tự tìm kiếm và tra cứu tài liệu bài học trực tuyến.
3. **Phẩm chất:**
   - Trách nhiệm, tuân thủ các quy tắc an toàn khi tham gia môi trường mạng Internet.

---

### II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
- **Giáo viên:** Máy chiếu/Tivi, sơ đồ mạng mô hình, các thiết bị mẫu (Router, Switch, dây cáp mạng UTP).
- **Học sinh:** Sách giáo khoa, vở ghi, phiếu học tập số 01.

---

### III. TIẾN TRÌNH DẠY HỌC
#### HOẠT ĐỘNG 1: KHỞI ĐỘNG (7 PHÚT)
- **Mục tiêu:** Tạo hứng thú, liên hệ thực tế về nhu cầu kết nối thông tin giữa các thiết bị.
- **Nội dung:** Giáo viên đặt câu hỏi: "Làm thế nào để gửi một bức ảnh từ điện thoại của bạn sang máy tính của giáo viên?"
- **Sản phẩm:** Câu trả lời của học sinh (Bluetooth, Wi-Fi, Internet, Cáp USB).
- **Tổ chức thực hiện:** Giáo viên chuyển giao nhiệm vụ, học sinh thảo luận cặp đôi và phát biểu.

#### HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC (25 PHÚT)
- **Mục tiêu:** Nắm được khái niệm mạng máy tính, các thành phần chính và phân loại mạng.
- **Nội dung:** Tìm hiểu SGK kết hợp quan sát sơ đồ kết nối mạng trong phòng máy trường học.
- **Sản phẩm:** Sơ đồ tư duy về các thành phần mạng máy tính hoàn thành trong phiếu học tập.
- **Tổ chức thực hiện:** Chia lớp thành 4 nhóm chuyên sâu, thảo luận và đại diện nhóm báo cáo.

#### HOẠT ĐỘNG 3: LUYỆN TẬP (8 PHÚT)
- **Mục tiêu:** Củng cố kiến thức thông qua bộ 5 câu hỏi trắc nghiệm tương tác.
- **Nội dung:** Học sinh tham gia trò chơi trắc nghiệm nhanh trên máy tính.
- **Sản phẩm:** Điểm số và bảng tổng kết câu trả lời đúng của học sinh.

#### HOẠT ĐỘNG 4: VẬN DỤNG & MỞ RỘNG (5 PHÚT)
- **Mục tiêu:** Vận dụng kiến thức khảo sát mạng Wi-Fi tại gia đình.
- **Nội dung:** Vẽ lại sơ đồ các thiết bị kết nối Internet trong ngôi nhà của em.
- **Sản phẩm:** Bài tập về nhà nộp vào tiết học tiếp theo.
`.trim();

    return {
      text: markdownPlan,
      output: {
        format: 'lesson_plan_cv5512',
        subject,
        grade,
        topic,
        periods,
        markdown: markdownPlan,
      },
      model: 'mock-dell-node-01/qwen2.5-coder-7b',
      tokens: {
        prompt: 180,
        completion: 720,
        total: 900,
      },
      tokensUsed: {
        prompt: 180,
        completion: 720,
        total: 900,
      },
      latencyMs: 215,
      finishReason: 'stop',
      metadata: {
        curriculum_standard: 'GDPT 2018 / CV 5512',
        worker_id: 'huy-ai-node-01',
        provider: 'mock',
      },
    };
  }

  private generateMockSlides(inputs: Record<string, unknown>): TaskResult {
    const topic = (inputs.topic as string) || 'Mạng máy tính và Internet toàn cầu';
    const slides = [
      {
        slideNumber: 1,
        title: topic,
        subtitle: 'Bài giảng điện tử tương tác — Chuyên đề Tin học',
        bullets: ['Giáo viên: Huy Technology AI Center', 'Thời lượng: 2 tiết giảng'],
      },
      {
        slideNumber: 2,
        title: 'Mục Tiêu Bài Học',
        bullets: [
          'Hiểu rõ bản chất mạng máy tính là gì',
          'Nhận biết các thiết bị mạng: Switch, Router, Modem',
          'Sử dụng Internet an toàn và có trách nhiệm',
        ],
      },
      {
        slideNumber: 3,
        title: '1. Khái Niệm Mạng Máy Tính',
        bullets: [
          'Tập hợp các máy tính được kết nối với nhau để chia sẻ dữ liệu và tài nguyên',
          'Thành phần: Thiết bị đầu cuối, Thiết bị kết nối, Phần mềm mạng',
        ],
      },
      {
        slideNumber: 4,
        title: '2. Phân Loại Mạng',
        bullets: [
          'Mạng có dây (Wired Network): Độ ổn định cao, sử dụng cáp xoắn đôi / cáp quang',
          'Mạng không dây (Wireless Network / Wi-Fi): Tiện lợi, linh hoạt cho thiết bị di động',
        ],
      },
      {
        slideNumber: 5,
        title: '3. Internet Toàn Cầu',
        bullets: [
          'Mạng của các mạng máy tính phủ sóng toàn cầu',
          'Các dịch vụ chính: World Wide Web (WWW), Email, Điện toán đám mây, AI Trực tuyến',
        ],
      },
      {
        slideNumber: 6,
        title: 'Tổng Kết & Bài Tập Về Nhà',
        bullets: [
          'Ghi nhớ 3 thành phần chính của mạng máy tính',
          'Thực hiện phiếu khảo sát mạng kết nối tại gia đình',
        ],
      },
    ];

    return {
      text: JSON.stringify(slides, null, 2),
      output: {
        format: 'presentation_slides',
        topic,
        totalSlides: slides.length,
        slides,
      },
      model: 'mock-dell-node-01/qwen2.5-coder-7b',
      tokens: { prompt: 140, completion: 480, total: 620 },
      tokensUsed: { prompt: 140, completion: 480, total: 620 },
      latencyMs: 190,
      finishReason: 'stop',
      metadata: {
        worker_id: 'huy-ai-node-01',
        provider: 'mock',
      },
    };
  }

  private generateMockQuiz(inputs: Record<string, unknown>): TaskResult {
    const topic = (inputs.topic as string) || 'Mạng máy tính';
    const questions = [
      {
        id: 1,
        level: 'Nhận biết',
        question: 'Thiết bị nào sau đây đóng vai trò chuyển tiếp gói tin trong mạng cục bộ LAN?',
        options: {
          A: 'Switch (Bộ chuyển mạch)',
          B: 'Bàn phím (Keyboard)',
          C: 'Máy in mạng',
          D: 'Chuột quang',
        },
        correctAnswer: 'A',
        explanation: 'Switch là thiết bị mạng kết nối các đoạn mạng với nhau theo mô hình hình sao, chịu trách nhiệm chuyển tiếp dữ liệu đến đúng cổng của thiết bị nhận.',
      },
      {
        id: 2,
        level: 'Thông hiểu',
        question: 'Đặc điểm nổi bật nhất của mạng không dây (Wi-Fi) so với mạng có dây là gì?',
        options: {
          A: 'Tốc độ luôn nhanh hơn cáp quang',
          B: 'Linh hoạt, cho phép thiết bị di chuyển mà vẫn giữ kết nối',
          C: 'Không bao giờ bị suy hao tín hiệu do vật cản',
          D: 'Không cần sử dụng năng lượng điện',
        },
        correctAnswer: 'B',
        explanation: 'Mạng không dây sử dụng sóng điện từ, mang lại sự linh hoạt và tiện lợi cao cho các thiết bị di động như laptop, smartphone.',
      },
      {
        id: 3,
        level: 'Vận dụng',
        question: 'Khi mạng gia đình em không thể truy cập Internet nhưng đèn tín hiệu trên Router vẫn sáng, thao tác xử lý cơ bản đầu tiên nên làm là gì?',
        options: {
          A: 'Cắt toàn bộ dây mạng trong nhà',
          B: 'Khởi động lại (Restart/Power cycle) thiết bị Router/Modem',
          C: 'Cài đặt lại toàn bộ hệ điều hành máy tính',
          D: 'Mua ngay một gói cước mạng của nhà mạng khác',
        },
        correctAnswer: 'B',
        explanation: 'Khởi động lại thiết bị mạng giúp làm mới bảng định tuyến và cấp phát lại địa chỉ IP, giải quyết phần lớn sự cố treo phiên kết nối thông thường.',
      },
    ];

    return {
      text: JSON.stringify(questions, null, 2),
      output: {
        format: 'quiz_bank',
        topic,
        totalQuestions: questions.length,
        questions,
      },
      model: 'mock-dell-node-01/qwen2.5-coder-7b',
      tokens: { prompt: 160, completion: 520, total: 680 },
      tokensUsed: { prompt: 160, completion: 520, total: 680 },
      latencyMs: 185,
      finishReason: 'stop',
      metadata: {
        worker_id: 'huy-ai-node-01',
        provider: 'mock',
      },
    };
  }

  private generateMockTax(inputs: Record<string, unknown>): TaskResult {
    return {
      text: 'Đã hoàn tất phân tích hóa đơn và đối chiếu nghĩa vụ thuế GTGT.',
      output: {
        format: 'tax_audit_report',
        invoiceNumber: inputs.invoiceNumber || 'HD-2026-8812',
        vatRate: '10%',
        taxDeductible: true,
        riskScore: 'Low (0.02)',
        notes: 'Hóa đơn điện tử hợp lệ, mã cơ quan thuế hợp chuẩn Thông tư 78/2021/TT-BTC.',
      },
      model: 'mock-dell-node-01/qwen2.5-coder-7b',
      tokens: { prompt: 110, completion: 320, total: 430 },
      tokensUsed: { prompt: 110, completion: 320, total: 430 },
      latencyMs: 160,
      finishReason: 'stop',
      metadata: {
        worker_id: 'huy-ai-node-01',
        provider: 'mock',
      },
    };
  }
}
