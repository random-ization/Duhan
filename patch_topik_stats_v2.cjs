const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'public', 'locales');
const langs = ['en', 'zh', 'vi', 'mn'];

const additions = {
    en: { totalAttempts: 'Attempts', writing: 'Writing' },
    zh: { totalAttempts: '作答次数', writing: '写作' },
    vi: { totalAttempts: 'Số lần thi', writing: 'Viết' },
    mn: { totalAttempts: 'Оролдлогууд', writing: 'Бичих' }
};

for (const lang of langs) {
    const filePath = path.join(localesDir, `${lang}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (data.dashboard && data.dashboard.topik) {
        Object.assign(data.dashboard.topik, additions[lang]);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`Updated ${lang}.json`);
    }
}
