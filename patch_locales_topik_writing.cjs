const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'public', 'locales');
const langs = ['en', 'zh', 'vi', 'mn'];

const additions = {
    en: {
        loadingExam: "Preparing writing exam...",
        q51Instruction: "Fill in the blank based on the context to make the passage complete and natural.",
        q52Instruction: "Fill in the blank according to the requirements of the prompt.",
        q53Instruction: "Based on the graph below, write an explanatory essay (200-300 characters).",
        q54Instruction: "Write an argumentative essay on the topic below (400-600 characters)."
    },
    zh: {
        loadingExam: "正在准备写作考试…",
        q51Instruction: "请根据上下文填写空白处，使文章内容完整、自然。",
        q52Instruction: "请根据题目要求，补充完整空白处的内容。",
        q53Instruction: "请参考下图，写一篇说明文（最少 200 字，最多 300 字）。",
        q54Instruction: "请就下面的题目写一篇议论文（最少 400 字，最多 600 字）。"
    },
    vi: {
        loadingExam: "Đang chuẩn bị bài thi viết...",
        q51Instruction: "Điền vào chỗ trống dựa vào ngữ cảnh để đoạn văn hoàn chỉnh và tự nhiên.",
        q52Instruction: "Điền vào chỗ trống theo yêu cầu của đề bài.",
        q53Instruction: "Dựa vào biểu đồ dưới đây, viết một bài văn thuyết minh (200-300 chữ).",
        q54Instruction: "Viết một bài văn nghị luận về chủ đề dưới đây (400-600 chữ)."
    },
    mn: {
        loadingExam: "Бичгийн шалгалтад бэлтгэж байна...",
        q51Instruction: "Орчмын утганд тохируулан хоосон зайг бөглөж, эхийг бүрэн, жам ёсны болгоно уу.",
        q52Instruction: "Даалгаврын шаардлагын дагуу хоосон зайг нөхнө үү.",
        q53Instruction: "Доорх графикийг ашиглан тайлбарласан эссэ бичнэ үү (200-300 үсэг).",
        q54Instruction: "Доорх сэдвээр нотлон бичих эссэ бичнэ үү (400-600 үсэг)."
    }
};

for (const lang of langs) {
    const filePath = path.join(localesDir, `${lang}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (data.topikWriting && data.topikWriting.session) {
        Object.assign(data.topikWriting.session, additions[lang]);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`Updated ${lang}.json`);
    } else {
        console.log(`Missing topikWriting.session in ${lang}.json`);
    }
}
