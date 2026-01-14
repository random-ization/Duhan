import json
import os

def set_deep(d, keys, value):
    for key in keys[:-1]:
        d = d.setdefault(key, {})
    d[keys[-1]] = value

def update_locales():
    locales_dir = 'locales'
    langs = ['en', 'zh', 'vi', 'mn']
    
    new_keys_flat = {
        # Vocab Common & Module
        "vocab.flashcard": {"en": "Flashcard", "zh": "单词卡", "vi": "Thẻ từ", "mn": "Үгсийн карт"},
        "vocab.quiz": {"en": "Quiz", "zh": "测验", "vi": "Trắc nghiệm", "mn": "Шалгалт"},
        "vocab.match": {"en": "Match", "zh": "配对", "vi": "Ghép cặp", "mn": "Хослох"},
        "vocab.quickStudy": {"en": "Quick Study", "zh": "速记", "vi": "Học nhanh", "mn": "Түргэн сурах"},
        "vocab.currentScope": {"en": "Current Scope", "zh": "当前范围", "vi": "Phạm vi hiện tại", "mn": "Одоогийн хамрах хүрээ"},
        "vocab.allUnits": {"en": "All Units", "zh": "全部单元", "vi": "Tất cả các bài", "mn": "Бүх бүлгүүд"},
        "vocab.unit": {"en": "Unit", "zh": "单元", "vi": "Bài", "mn": "Бүлэг"},
        "vocab.mastery": {"en": "Mastery", "zh": "掌握度", "vi": "Độ thông thạo", "mn": "Эзэмшилт"},
        "vocab.noWords": {"en": "No Words", "zh": "暂无单词", "vi": "Không có từ", "mn": "Үг байхгүй"},
        "vocab.noWordsDesc": {"en": "No vocabulary content added yet.", "zh": "尚未添加词汇内容。", "vi": "Chưa có nội dung từ vựng nào.", "mn": "Үгсийн санг нэмээгүй байна."},
        "vocab.settings": {"en": "Settings", "zh": "设置", "vi": "Cài đặt", "mn": "Тохиргоо"},
        "vocab.autoPlay": {"en": "Auto Play Audio", "zh": "自动播放发音", "vi": "Tự động phát âm thanh", "mn": "Дуу автоматаар тоглуулах"},
        "vocab.cardFront": {"en": "Card Front", "zh": "卡片正面", "vi": "Mặt trước thẻ", "mn": "Картын нүүр"},
        "vocab.koreanFront": {"en": "Korean Front", "zh": "韩语显示在正面", "vi": "Tiếng Hàn mặt trước", "mn": "Солонгос хэл нүүрэн талд"},
        "vocab.meaningFront": {"en": "Meaning Front", "zh": "含义显示在正面", "vi": "Nghĩa mặt trước", "mn": "Утга нүүрэн талд"},
        "vocab.sessionComplete": {"en": "Session Complete!", "zh": "本次学习完成！", "vi": "Hoàn thành buổi học!", "mn": "Сургалт дууслаа!"},
        "vocab.wordsUnit": {"en": "words", "zh": "个单词", "vi": "từ", "mn": "үг"},
        "vocab.remembered": {"en": "Remembered", "zh": "认识", "vi": "Đã nhớ", "mn": "Мэднэ"},
        "vocab.forgot": {"en": "Forgot", "zh": "没记住", "vi": "Quên", "mn": "Мэдэхгүй"},
        "vocab.restart": {"en": "Restart", "zh": "重新开始", "vi": "Bắt đầu lại", "mn": "Дахин эхлүүлэх"},
        "vocab.flip": {"en": "Flip", "zh": "翻转", "vi": "Lật", "mn": "Эргүүлэх"},
        "vocab.shortcuts": {"en": "Shortcuts", "zh": "快捷键", "vi": "Phím tắt", "mn": "Товчлуур"},
        "vocab.redSheet": {"en": "Red Sheet", "zh": "红膜模式", "vi": "Chế độ tấm đỏ", "mn": "Улаан хальс"},
        "vocab.loop": {"en": "Loop", "zh": "循环", "vi": "Lặp lại", "mn": "Давтах"},
        "vocab.stop": {"en": "Stop", "zh": "停止", "vi": "Dừng", "mn": "Зогсоох"},
        "vocab.noExample": {"en": "Example pending", "zh": "暂无例句", "vi": "Đang cập nhật ví dụ", "mn": "Жишээ байхгүй"},
        "vocab.reveal": {"en": "Click to reveal", "zh": "点击显示", "vi": "Nhấn để hiển thị", "mn": "Дарж харах"},
        
        # Vocab Book (SRS)
        "vocab.new": {"en": "New", "zh": "新", "vi": "Mới", "mn": "Шинэ"},
        "vocab.learning": {"en": "Learning", "zh": "学习中", "vi": "Đang học", "mn": "Суралцаж буй"},
        "vocab.review": {"en": "Review", "zh": "复习", "vi": "Ôn tập", "mn": "Давтах"},
        "vocab.dueNow": {"en": "Due Now", "zh": "待复习", "vi": "Cần ôn tập", "mn": "Давтах ёстой"},
        "vocab.totalWords": {"en": "Total", "zh": "总计", "vi": "Tổng số", "mn": "Нийт"},
        "vocab.search": {"en": "Search words...", "zh": "搜索生词...", "vi": "Tìm kiếm từ...", "mn": "Үг хайх..."},
        "vocab.noMatch": {"en": "No results", "zh": "未找到匹配项", "vi": "Không tìm thấy kết quả", "mn": "Илэрц олдсонгүй"},
        "vocab.noDueNow": {"en": "No words due", "zh": "没有待复习的生词", "vi": "Không có từ cần ôn tập", "mn": "Давтах үг байхгүй"},
        "vocab.srsDesc": {"en": "Words you pick as 'Don't know' will appear here", "zh": "学习中选择“不认识”的单词会出现在这里", "vi": "Những từ bạn chọn 'Không biết' sẽ xuất hiện ở đây", "mn": "'Мэдэхгүй' гэж тэмдэглэсэн үгс энд харагдана"},
        "vocab.streak": {"en": "streak", "zh": "次", "vi": "lần", "mn": "удаа"},
        "vocab.streakCount": {"en": "{count} streak", "zh": "连续 {count} 次", "vi": "{count} lần liên tiếp", "mn": "{count} удаа дараалан"},
        "vocab.daysLater": {"en": "{count}d later", "zh": "{count}天后", "vi": "{count} ngày sau", "mn": "{count} өдрийн дараа"},
        "vocab.hoursLater": {"en": "{count}h later", "zh": "{count}小时后", "vi": "{count} giờ sau", "mn": "{count} цагийн дараа"},
        "vocab.hanja": {"en": "Hanja", "zh": "汉字", "vi": "Hán tự", "mn": "Хятад ханз"},
        
        # Vocab Match
        "vocab.matchTitle": {"en": "Perfect Match!", "zh": "完美配对！", "vi": "Ghép cặp hoàn hảo!", "mn": "Төгс хослол!"},
        "vocab.matchDesc": {"en": "You matched all words!", "zh": "你成功匹配了所有单词！", "vi": "Bạn đã ghép được tất cả các từ!", "mn": "Та бүх үгийг амжилттай хослууллаа!"},
        "vocab.time": {"en": "Time", "zh": "用时", "vi": "Thời gian", "mn": "Хугацаа"},
        "vocab.moves": {"en": "Moves", "zh": "步数", "vi": "Số bước", "mn": "Нүүдэл"},
        "vocab.pairs": {"en": "Pairs", "zh": "对", "vi": "Cặp", "mn": "Хос"},
        "vocab.minWordsMatch": {"en": "Need at least {count} words to start matching game", "zh": "需要至少 {count} 个单词才能开始配对游戏", "vi": "Cần ít nhất {count} từ để bắt đầu trò chơi ghép cặp", "mn": "Хослох тоглоомыг эхлүүлэхийн тулд дор хаяж {count} үг шаардлагатай"},
        
        # POS (Vocabulary)
        "vocab.pos.verb_t": {"en": "Transitive Verb", "zh": "及物动词", "vi": "Tha động từ", "mn": "Тусах үйл үг"},
        "vocab.pos.verb_i": {"en": "Intransitive Verb", "zh": "不及物动词", "vi": "Tự động từ", "mn": "Эс тусах үйл үг"},
        "vocab.pos.adj": {"en": "Adjective", "zh": "形容词", "vi": "Tính từ", "mn": "Тэмдэг нэр"},
        "vocab.pos.noun": {"en": "Noun", "zh": "名词", "vi": "Danh từ", "mn": "Нэр үг"},
        "vocab.pos.adv": {"en": "Adverb", "zh": "副词", "vi": "Trạng từ", "mn": "Дайвар үг"},
        "vocab.pos.particle": {"en": "Particle", "zh": "助词", "vi": "Trợ từ", "mn": "Нөхцөл"}
    }
    
    for lang in langs:
        path = os.path.join(locales_dir, f'{lang}.json')
        if not os.path.exists(path):
            continue
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for key, translations in new_keys_flat.items():
            keys = key.split('.')
            val = translations.get(lang, translations.get('en'))
            set_deep(data, keys, val)
            
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Updated {path}")

if __name__ == "__main__":
    update_locales()
