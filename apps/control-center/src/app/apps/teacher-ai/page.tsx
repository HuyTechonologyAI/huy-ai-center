'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherAIPage() {
  const router = useRouter();

  // Form states
  const [subject, setSubject] = useState('Vật lý');
  const [grade, setGrade] = useState('Lớp 10');
  const [lessonTitle, setLessonTitle] = useState('Định luật II Newton và Ứng dụng Thực tiễn');
  const [periods, setPeriods] = useState('2');
  const [requirements, setRequirements] = useState(
    'Thiết kế theo Công văn 5512/BGDĐT. Chú trọng hoạt động trải nghiệm, thí nghiệm trực quan và liên hệ thực tế giao thông an toàn.'
  );

  // Selected outputs
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([
    'Giáo án chi tiết',
    'Slide bài giảng',
    'Bộ câu hỏi trắc nghiệm (Quiz)',
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const outputOptions = [
    { id: 'lesson_plan', label: 'Giáo án chi tiết', icon: '📝', desc: 'Chuẩn Công văn 5512 BGD&ĐT' },
    { id: 'slides', label: 'Slide bài giảng', icon: '🖥️', desc: 'Dàn ý trình chiếu và gợi ý hình ảnh' },
    { id: 'quiz', label: 'Bộ câu hỏi trắc nghiệm (Quiz)', icon: '❓', desc: '10 câu hỏi 4 mức độ nhận thức kèm đáp án' },
    { id: 'mindmap', label: 'Sơ đồ tư duy (Mindmap)', icon: '🧠', desc: 'Hệ thống hóa cấu trúc kiến thức' },
    { id: 'worksheet', label: 'Phiếu học tập cá nhân/nhóm', icon: '📋', desc: 'Nhiệm vụ rèn luyện trên lớp' },
    { id: 'video_script', label: 'Kịch bản Video bài giảng', icon: '🎬', desc: 'Lời thoại & visual cues cho micro-learning' },
  ];

  const toggleOutput = (label: string) => {
    setSelectedOutputs((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) {
      setErrorMsg('Vui lòng nhập tên bài dạy');
      return;
    }
    if (selectedOutputs.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 định dạng đầu ra mong muốn');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const idempotencyKey = `teacher_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const response = await fetch('/api/ai/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock_teacher_session_token',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          source_app: 'education',
          task_type: 'lesson_plan',
          input: {
            subject,
            grade,
            lesson_title: lessonTitle,
            duration_periods: periods,
            requirements,
            outputs_requested: selectedOutputs,
          },
          options: {
            priority: 'high',
            timeout_seconds: 300,
            idempotency_key: idempotencyKey,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Không thể tạo tác vụ');
      }

      // Redirect to Job UI
      router.push(`/tasks/${data.task_id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ';
      setErrorMsg(message);
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <a href="/apps" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
            ← Kho Ứng Dụng
          </a>
          <span style={{ color: '#475569' }}>/</span>
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>Teacher AI</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              fontSize: '32px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              padding: '10px',
              borderRadius: '12px',
              border: '1px solid rgba(56, 189, 248, 0.2)',
            }}
          >
            🎓
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Teacher AI — Trợ Lý Soạn Giáo Án &amp; Tài Liệu
            </h1>
            <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontSize: '14px' }}>
              Tự động hóa xây dựng kế hoạch bài dạy, slide thuyết trình và học liệu tương tác.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
          }}
        >
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          {/* Môn học */}
          <div>
            <label htmlFor="subject" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
              Môn Học <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              <option value="Toán học">Toán học</option>
              <option value="Ngữ văn">Ngữ văn</option>
              <option value="Tiếng Anh">Tiếng Anh</option>
              <option value="Vật lý">Vật lý</option>
              <option value="Hóa học">Hóa học</option>
              <option value="Sinh học">Sinh học</option>
              <option value="Lịch sử">Lịch sử</option>
              <option value="Địa lý">Địa lý</option>
              <option value="Tin học">Tin học</option>
              <option value="Khoa học Tự nhiên">Khoa học Tự nhiên</option>
            </select>
          </div>

          {/* Lớp */}
          <div>
            <label htmlFor="grade" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
              Khối Lớp <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              <option value="Lớp 6">Lớp 6</option>
              <option value="Lớp 7">Lớp 7</option>
              <option value="Lớp 8">Lớp 8</option>
              <option value="Lớp 9">Lớp 9</option>
              <option value="Lớp 10">Lớp 10</option>
              <option value="Lớp 11">Lớp 11</option>
              <option value="Lớp 12">Lớp 12</option>
              <option value="Đại học">Đại học / Cao đẳng</option>
            </select>
          </div>

          {/* Số tiết */}
          <div>
            <label htmlFor="periods" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
              Thời Lượng (Số tiết) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              id="periods"
              value={periods}
              onChange={(e) => setPeriods(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              <option value="1">1 tiết (45 phút)</option>
              <option value="2">2 tiết (90 phút)</option>
              <option value="3">3 tiết</option>
              <option value="4">Chuyên đề (4 tiết)</option>
            </select>
          </div>
        </div>

        {/* Tên bài học */}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="lessonTitle" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
            Tên Bài Học / Chủ Đề <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="lessonTitle"
            type="text"
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="Ví dụ: Định luật II Newton và ứng dụng thực tiễn"
            required
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Yêu cầu sư phạm */}
        <div style={{ marginBottom: '28px' }}>
          <label htmlFor="requirements" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
            Yêu Cầu Sư Phạm &amp; Trọng Tâm Bài Học
          </label>
          <textarea
            id="requirements"
            rows={3}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="Mô tả mục tiêu phẩm chất, năng lực học sinh, thiết bị thí nghiệm hoặc phương pháp dạy học cụ thể..."
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '14px',
              boxSizing: 'border-box',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Tùy chọn định dạng đầu ra */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
            Định Dạng Đầu Ra Mong Muốn (Output Options)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {outputOptions.map((opt) => {
              const isSelected = selectedOutputs.includes(opt.label);
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleOutput(opt.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid #334155',
                    backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.08)' : '#1e293b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // Handled by div click
                    style={{ marginTop: '2px', accentColor: '#38bdf8' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: isSelected ? '#38bdf8' : '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {opt.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            ⚡ Tiêu thụ ước tính: <strong>10 Credits</strong>
          </span>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              backgroundColor: loading ? '#334155' : '#2563eb',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '15px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s',
            }}
          >
            {loading ? (
              <>
                <span>⏳</span>
                <span>Đang Khởi Tạo Tác Vụ...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Tạo Tác Vụ AI</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
