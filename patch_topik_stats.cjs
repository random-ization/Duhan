const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'public', 'locales');
const langs = ['en', 'zh', 'vi', 'mn'];

const additions = {
    en: {
        statsTitle: "My Stats",
        avgScore: "Avg. Score",
        passRate: "Pass Rate",
        breakdown: "Subject Breakdown",
        notTried: "Not tried",
        subjectAttempts_one: "{{count}} attempt",
        subjectAttempts_other: "{{count}} attempts",
        tryThisSection: "← Try this section!",
        trendUp: "Score improving in last 5 attempts",
        trendDown: "Score declining — focus on weak areas",
        todayTitle: "Today's Tip",
        recommended: "Recommended",
        estimatedTime: "Est. time:",
        minutes: "min",
        allDone: "You've tried all available exams!",
        reminder: {
            firstTime: "Start your first TOPIK simulation!",
            good: "Great streak! Keep the momentum.",
            warn: "{{count}} days since last practice — stay sharp!",
            danger: "{{count}} days away — memory may have faded!"
        }
    },
    zh: {
        statsTitle: "学习数据",
        avgScore: "平均分",
        passRate: "通过率",
        breakdown: "各科表现",
        notTried: "未尝试",
        subjectAttempts_one: "{{count}} 次作答",
        subjectAttempts_other: "{{count}} 次作答",
        tryThisSection: "← 尝试此部分！",
        trendUp: "最近5次成绩有所提升",
        trendDown: "成绩下降 — 请关注薄弱环节",
        todayTitle: "今日提示",
        recommended: "推荐实战",
        estimatedTime: "预计用时:",
        minutes: "分钟",
        allDone: "太棒了，你已完成所有可用考试！",
        reminder: {
            firstTime: "开始你的第一次 TOPIK 模拟！",
            good: "保持连胜！继续保持势头。",
            warn: "距离上次练习已过 {{count}} 天 — 保持敏锐！",
            danger: "距离上次练习已过 {{count}} 天 — 记忆可能已经衰退！"
        }
    },
    vi: {
        statsTitle: "Thống kê của tôi",
        avgScore: "Điểm TB",
        passRate: "Tỷ lệ đỗ",
        breakdown: "Phân tích môn học",
        notTried: "Chưa thử",
        subjectAttempts_one: "{{count}} lần làm bài",
        subjectAttempts_other: "{{count}} lần làm bài",
        tryThisSection: "← Hãy thử phần này!",
        trendUp: "Điểm số đang cải thiện (5 lần gần nhất)",
        trendDown: "Điểm số giảm — hãy tập trung vào phần yếu",
        todayTitle: "Mẹo hôm nay",
        recommended: "Đề xuất",
        estimatedTime: "Ước tính:",
        minutes: "phút",
        allDone: "Bạn đã làm thử tất cả bài thi!",
        reminder: {
            firstTime: "Bắt đầu bài thi thử TOPIK đầu tiên của bạn!",
            good: "Chuỗi làm bài tốt! Hãy giữ vững phong độ.",
            warn: "{{count}} ngày kể từ lần luyện tập cuối — hãy giữ sự tập trung!",
            danger: "Đã {{count}} ngày trôi qua — kiến thức có thể bị phai mờ!"
        }
    },
    mn: {
        statsTitle: "Миний статистик",
        avgScore: "Дундаж оноо",
        passRate: "Тэнцэх хувь",
        breakdown: "Хичээлийн задаргаа",
        notTried: "Туршиж үзээгүй",
        subjectAttempts_one: "{{count}} оролдлого",
        subjectAttempts_other: "{{count}} оролдлого",
        tryThisSection: "← Энэ хэсгийг туршаад үзээрэй!",
        trendUp: "Сүүлийн 5 оролдлогын оноо сайжирч байна",
        trendDown: "Оноо буурч байна — сул талдаа анхаарлаа хандуулаарай",
        todayTitle: "Өнөөдрийн зөвлөгөө",
        recommended: "Санал болгож буй",
        estimatedTime: "Тооцсон хугацаа:",
        minutes: "мин",
        allDone: "Та боломжтой бүх шалгалтыг өгсөн байна!",
        reminder: {
            firstTime: "Анхны TOPIK загвар шалгалтаа эхлүүлээрэй!",
            good: "Сайн байна! Эрч хүчээ хадгалаарай.",
            warn: "Хамгийн сүүлд давтсанаас хойш {{count}} өдөр өнгөрлөө — анхаарлаа төвлөрүүлээрэй!",
            danger: "{{count}} өдөр өнгөрлөө — ой санамж муудсан байж магадгүй!"
        }
    }
};

for (const lang of langs) {
    const filePath = path.join(localesDir, `${lang}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // They should be added under "topikLobby"
    if (!data.topikLobby) data.topikLobby = {};

    Object.assign(data.topikLobby, additions[lang]);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`Updated ${lang}.json`);
}
