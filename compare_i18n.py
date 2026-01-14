import json
import os

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_keys(d, prefix=''):
    keys = set()
    for k, v in d.items():
        if isinstance(v, dict):
            keys.update(get_keys(v, prefix + k + '.'))
        else:
            keys.add(prefix + k)
    return keys

en = load_json('locales/en.json')
zh = load_json('locales/zh.json')
vi = load_json('locales/vi.json')
mn = load_json('locales/mn.json')

en_keys = get_keys(en)
zh_keys = get_keys(zh)
vi_keys = get_keys(vi)
mn_keys = get_keys(mn)

def report_missing(lang_name, lang_keys, en_keys):
    missing = en_keys - lang_keys
    print(f"--- Missing keys in {lang_name} ({len(missing)}) ---")
    for k in sorted(list(missing)):
        print(k)

report_missing('zh', zh_keys, en_keys)
report_missing('vi', vi_keys, en_keys)
report_missing('mn', mn_keys, en_keys)
