const fs = require('fs');

const en = {
  "topikWriting": {
    "title": "TOPIK II Writing",
    "session": {
      "fillBlank": "Fill in the blank",
      "graphEssay": "Graph essay",
      "opinionEssay": "Opinion essay",
      "exampleBox": "Example / Context",
      "questionX": "Question {{num}}",
      "points": "pts",
      "answerPlaceholder": "Type your answer here...",
      "characterCount": "{{count}} chars",
      "remainingChars": "{{count}} left",
      "submitConfirmTitle": "Submit Exam?",
      "submitConfirmDesc": "Answered {{ans}}/{{total}} questions. You cannot change your answers after submitting.",
      "continueForm": "Continue",
      "confirmSubmit": "Confirm Submit",
      "submitting": "Submitting...",
      "saveIdle": "Auto-save",
      "saving": "Saving...",
      "saved": "✓ Saved",
      "saveError": "Save Failed",
      "submitButton": "Submit",
      "wongojiAnswer": "Wongoji Answer",
      "answerArea": "Answer Area",
      "maxLength": "Max {{count}} chars",
      "submittedTitle": "Successfully Submitted!",
      "submittedDesc": "Answered {{ans}} / {{total}} questions. Waiting for AI evaluation..."
    },
    "report": {
      "title": "Writing Evaluation Report",
      "subtitle": "TOPIK II Writing · AI Evaluation",
      "evaluatingTitle": "AI is evaluating...",
      "evaluatingDesc": "Analyzing based on official TOPIK grading criteria. Usually takes 30-60 seconds.",
      "dimTask": "Task Accomplishment",
      "dimStructure": "Development & Structure",
      "dimLanguage": "Language Use",
      "dimWongoji": "Wongoji Formatting",
      "maxScore": "Max {{score}}",
      "scoreLabel": "Score:",
      "dimScores": "Dimension Scores",
      "originalText": "Your Original Answer",
      "notAnswered": "(Not answered)",
      "aiCorrected": "AI Polished Version",
      "noCorrection": "(No correction)",
      "feedback": "Overall Feedback",
      "loadingError": "Failed to load evaluation, please refresh the page.",
      "back": "Back",
      "timeElapsed": "Time elapsed:",
      "timeFormat": "{{min}}m {{sec}}s",
      "totalScore": "Total Score:",
      "aiDone": "AI Evaluation Complete",
      "passExcellent": "Excellent 🎉",
      "passGood": "Pass ✅",
      "passNeedsWork": "Needs Work 📚",
      "overallAnalysis": "Overall Dimension Analysis",
      "questionFeedback": "Detailed Feedback by Question",
      "loadingOriginal": "Loading original exam paper..."
    }
  }
};

const zh = {
  "topikWriting": {
    "title": "TOPIK II 写作",
    "session": {
      "fillBlank": "补全短文",
      "graphEssay": "图表作文",
      "opinionEssay": "论述作文",
      "exampleBox": "보기",
      "questionX": "第 {{num}} 题",
      "points": "分",
      "answerPlaceholder": "答安을 입력하세요…",
      "characterCount": "{{count}} 字",
      "remainingChars": "还剩 {{count}} 字",
      "submitConfirmTitle": "确认交卷？",
      "submitConfirmDesc": "已完成 {{ans}}/{{total}} 题，交卷后不可修改。",
      "continueForm": "继续作答",
      "confirmSubmit": "确认交卷",
      "submitting": "提交中…",
      "saveIdle": "自动保存",
      "saving": "保存中…",
      "saved": "✓ 已保存",
      "saveError": "保存失败",
      "submitButton": "交卷",
      "wongojiAnswer": "원고지 答案",
      "answerArea": "答案区",
      "maxLength": "最多 {{count}} 字",
      "submittedTitle": "已成功提交！",
      "submittedDesc": "共作答 {{ans}} / {{total}} 题，正在等待 AI 批改…"
    },
    "report": {
      "title": "写作评估报告",
      "subtitle": "TOPIK II 写作 · AI 智能批改",
      "evaluatingTitle": "AI 正在批改中…",
      "evaluatingDesc": "正在按 TOPIK 官方评分标准逐题分析，通常需要 30-60 秒",
      "dimTask": "内容及课题完成度",
      "dimStructure": "文章展开与结构",
      "dimLanguage": "语言使用（词汇/语法）",
      "dimWongoji": "原稿纸使用规范",
      "maxScore": "满分 {{score}}",
      "scoreLabel": "得分：",
      "dimScores": "分项得分",
      "originalText": "考生原文",
      "notAnswered": "（未作答）",
      "aiCorrected": "AI 高分润色版",
      "noCorrection": "（无校正内容）",
      "feedback": "综合评语",
      "loadingError": "无法加载评估结果，请刷新页面。",
      "back": "返回",
      "timeElapsed": "作答用时：",
      "timeFormat": "{{min}} 分 {{sec}} 秒",
      "totalScore": "总分：",
      "aiDone": "AI 批改完成",
      "passExcellent": "优秀 🎉",
      "passGood": "合格 ✅",
      "passNeedsWork": "需加强 📚",
      "overallAnalysis": "总体维度分析",
      "questionFeedback": "逐题详细反馈",
      "loadingOriginal": "正在加载原考试试卷..."
    }
  }
};

const vi = {
  "topikWriting": {
    "title": "TOPIK II Viết",
    "session": {
      "fillBlank": "Điền vào chỗ trống",
      "graphEssay": "Viết biểu đồ",
      "opinionEssay": "Nghị luận",
      "exampleBox": "Ví dụ / Context",
      "questionX": "Câu {{num}}",
      "points": "điểm",
      "answerPlaceholder": "Nhập câu trả lời của bạn...",
      "characterCount": "{{count}} ký tự",
      "remainingChars": "Còn {{count}}",
      "submitConfirmTitle": "Nộp bài?",
      "submitConfirmDesc": "Đã trả lời {{ans}}/{{total}} câu. Không thể sửa sau khi nộp.",
      "continueForm": "Tiếp tục",
      "confirmSubmit": "Xác nhận nộp",
      "submitting": "Đang nộp...",
      "saveIdle": "Tự động lưu",
      "saving": "Đang lưu...",
      "saved": "✓ Đã lưu",
      "saveError": "Lỗi lưu",
      "submitButton": "Nộp bài",
      "wongojiAnswer": "Giấy kẻ ô Answer",
      "answerArea": "Khu vực trả lời",
      "maxLength": "Tối đa {{count}} ký tự",
      "submittedTitle": "Nộp bài thành công!",
      "submittedDesc": "Đã trả lời {{ans}}/{{total}} câu. Đang chờ AI đánh giá..."
    },
    "report": {
      "title": "Báo cáo Đánh giá Viết",
      "subtitle": "TOPIK II Viết · AI Đánh giá",
      "evaluatingTitle": "AI đang chấm điểm...",
      "evaluatingDesc": "Phân tích theo tiêu chuẩn TOPIK chính thức. Thường mất 30-60 giây.",
      "dimTask": "Mức độ hoàn thành",
      "dimStructure": "Cấu trúc & Phát triển",
      "dimLanguage": "Sử dụng ngôn ngữ",
      "dimWongoji": "Quy tắc giấy kẻ ô",
      "maxScore": "Tối đa {{score}}",
      "scoreLabel": "Điểm:",
      "dimScores": "Điểm từng phần",
      "originalText": "Bài làm của bạn",
      "notAnswered": "(Chưa trả lời)",
      "aiCorrected": "Bản sửa gợi ý (AI)",
      "noCorrection": "(Không có chỉnh sửa)",
      "feedback": "Nhận xét chung",
      "loadingError": "Không thể tải báo cáo, vui lòng tải lại trang.",
      "back": "Quay lại",
      "timeElapsed": "Thời gian làm bài:",
      "timeFormat": "{{min}}p {{sec}}s",
      "totalScore": "Tổng điểm:",
      "aiDone": "AI chấm xong",
      "passExcellent": "Xuất sắc 🎉",
      "passGood": "Đạt ✅",
      "passNeedsWork": "Cần cố gắng 📚",
      "overallAnalysis": "Phân tích tổng thể",
      "questionFeedback": "Nhận xét chi tiết từng câu",
      "loadingOriginal": "Đang tải đề thi gốc..."
    }
  }
};

const mn = {
  "topikWriting": {
    "title": "TOPIK II Бичих",
    "session": {
      "fillBlank": "Нөхөх дагалгавар",
      "graphEssay": "График эссэ",
      "opinionEssay": "Эссэ",
      "exampleBox": "Жишээ / Context",
      "questionX": "Асуулт {{num}}",
      "points": "оноо",
      "answerPlaceholder": "Хариултаа оруулна уу...",
      "characterCount": "{{count}} үсэг",
      "remainingChars": "{{count}} үлдлээ",
      "submitConfirmTitle": "Илгээх үү?",
      "submitConfirmDesc": "{{total}} асуултаас {{ans}}-д хариулав. Илгээсний дараа засах боломжгүй.",
      "continueForm": "Үргэлжлүүлэх",
      "confirmSubmit": "Илгээхийг баталгаажуулах",
      "submitting": "Илгээж байна...",
      "saveIdle": "Автомат хадгалалт",
      "saving": "Хадгалж байна...",
      "saved": "✓ Хадгалагдсан",
      "saveError": "Хадгалж чадсангүй",
      "submitButton": "Илгээх",
      "wongojiAnswer": "Вонгожи хариулт",
      "answerArea": "Хариулах хэсэг",
      "maxLength": "Ихдээ {{count}} үсэг",
      "submittedTitle": "Амжилттай илгээлээ!",
      "submittedDesc": "{{ans}} / {{total}} асуултад хариулав. AI үнэлгээг хүлээж байна..."
    },
    "report": {
      "title": "Бичих үнэлгээний тайлан",
      "subtitle": "TOPIK II Бичих · AI үнэлгээ",
      "evaluatingTitle": "AI дүгнэж байна...",
      "evaluatingDesc": "TOPIK албан ёсны шалгуурын дагуу шинжилж байна. Ихэвчлэн 30-60 секунд болно.",
      "dimTask": "Даалгавар гүйцэтгэл",
      "dimStructure": "Бүтэц ба хөгжүүлэлт",
      "dimLanguage": "Хэлний хэрэглээ",
      "dimWongoji": "Вонгожи дүрэм",
      "maxScore": "Дээд {{score}}",
      "scoreLabel": "Оноо:",
      "dimScores": "Хэсгийн оноо",
      "originalText": "Таны хариулт",
      "notAnswered": "(Хариулаагүй)",
      "aiCorrected": "AI сайжруулсан хувилбар",
      "noCorrection": "(Засваргүй)",
      "feedback": "Ерөнхий дүгнэлт",
      "loadingError": "Тайлан ачаалж чадсангүй нүүрийг дахин ачаална уу.",
      "back": "Буцах",
      "timeElapsed": "Зарцуулсан хугацаа:",
      "timeFormat": "{{min}}м {{sec}}с",
      "totalScore": "Нийт оноо:",
      "aiDone": "AI үнэлгээ дууссан",
      "passExcellent": "Онц 🎉",
      "passGood": "Тэнцсэн ✅",
      "passNeedsWork": "Сайжруулах 📚",
      "overallAnalysis": "Ерөнхий шинжилгээ",
      "questionFeedback": "Асуулт бүрийн дэлгэрэнгүй дүгнэлт",
      "loadingOriginal": "Эх шалгалтын материалыг ачаалж байна..."
    }
  }
};

const langs = { en, zh, vi, mn };
for (const [lang, appendObj] of Object.entries(langs)) {
  const file = `./public/locales/${lang}.json`;
  const dict = JSON.parse(fs.readFileSync(file, 'utf8'));
  dict.topikWriting = appendObj.topikWriting;
  if (!dict.vocab) dict.vocab = {};
  if (lang === 'en') dict.vocab.modeSpelling = "Spelling";
  if (lang === 'zh') dict.vocab.modeSpelling = "拼写";
  if (lang === 'vi') dict.vocab.modeSpelling = "Chính tả";
  if (lang === 'mn') dict.vocab.modeSpelling = "Зөв бичих";
  fs.writeFileSync(file, JSON.stringify(dict, null, 2));
}
console.log("Locales patched successfully.");
