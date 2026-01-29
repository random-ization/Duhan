import React, { useMemo } from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

interface KeyboardHintsProps {
  nextJamo?: string | null;
  targetChar?: string;
  hasError?: boolean; // When true, highlight backspace
}

// Map Jamo to English layout keys (Standard 2-Set)
// Map Jamo to English layout keys (Standard 2-Set)
// Uses Compatibility Jamo (U+3131 - U+318E) which is what normalizeKorean returns
// Map Jamo to English layout keys (Standard 2-Set)
// Uses Explicit Unicode Compatibility Jamo (U+3131 - U+318E) as IDs
const JAMO_TO_KEY_MAP: Record<string, string> = {
  // Consonants (Ja-eum)
  '\u3131': 'r', // ㄱ
  '\u3132': 'R', // ㄲ
  '\u3134': 's', // ㄴ
  '\u3137': 'e', // ㄷ
  '\u3138': 'E', // ㄸ
  '\u3139': 'f', // ㄹ
  '\u3141': 'a', // ㅁ
  '\u3142': 'q', // ㅂ
  '\u3143': 'Q', // ㅃ
  '\u3145': 't', // ㅅ
  '\u3146': 'T', // ㅆ
  '\u3147': 'd', // ㅇ
  '\u3148': 'w', // ㅈ
  '\u3149': 'W', // ㅉ
  '\u314A': 'c', // ㅊ
  '\u314B': 'z', // ㅋ
  '\u314C': 'x', // ㅌ
  '\u314D': 'v', // ㅍ
  '\u314E': 'g', // ㅎ

  // Vowels (Mo-eum)
  '\u314F': 'k', // ㅏ
  '\u3150': 'o', // ㅐ
  '\u3151': 'i', // ㅑ
  '\u3152': 'O', // ㅒ
  '\u3153': 'j', // ㅓ
  '\u3154': 'p', // ㅔ
  '\u3155': 'u', // ㅕ
  '\u3156': 'P', // ㅖ
  '\u3157': 'h', // ㅗ
  '\u3158': 'h', // ㅘ (starts with h)
  '\u3159': 'h', // ㅙ (starts with h)
  '\u315A': 'h', // ㅚ (starts with h)
  '\u315B': 'y', // ㅛ
  '\u315C': 'n', // ㅜ
  '\u315D': 'n', // ㅝ (starts with n)
  '\u315E': 'n', // ㅞ (starts with n)
  '\u315F': 'n', // ㅟ (starts with n)
  '\u3160': 'b', // ㅠ
  '\u3161': 'm', // ㅡ
  '\u3162': 'm', // ㅢ (starts with m)
  '\u3163': 'l', // ㅣ

  // FALLBACKS (Just in case specific raw inputs slip through, map U+11xx as well)
  // Initials
  '\u1100': 'r',
  '\u1101': 'R',
  '\u1102': 's',
  '\u1103': 'e',
  '\u1104': 'E',
  '\u1105': 'f',
  '\u1106': 'a',
  '\u1107': 'q',
  '\u1108': 'Q',
  '\u1109': 't',
  '\u110A': 'T',
  '\u110B': 'd',
  '\u110C': 'w',
  '\u110D': 'W',
  '\u110E': 'c',
  '\u110F': 'z',
  '\u1110': 'x',
  '\u1111': 'v',
  '\u1112': 'g',
  // Medials
  '\u1161': 'k',
  '\u1162': 'o',
  '\u1163': 'i',
  '\u1164': 'O',
  '\u1165': 'j',
  '\u1166': 'p',
  '\u1167': 'u',
  '\u1168': 'P',
  '\u1169': 'h',
  '\u116A': 'h',
  '\u116B': 'h',
  '\u116C': 'h',
  '\u116D': 'y',
  '\u116E': 'n',
  '\u116F': 'n',
  '\u1170': 'n',
  '\u1171': 'n',
  '\u1172': 'b',
  '\u1173': 'm',
  '\u1174': 'm',
  '\u1175': 'l',
  // Finals
  '\u11A8': 'r',
  '\u11A9': 'R',
  '\u11AA': 'r',
  '\u11AB': 's',
  '\u11AC': 's',
  '\u11AD': 's',
  '\u11AE': 'e',
  '\u11AF': 'f',
  '\u11B0': 'f',
  '\u11B1': 'f',
  '\u11B2': 'f',
  '\u11B3': 'f',
  '\u11B4': 'f',
  '\u11B5': 'f',
  '\u11B6': 'f',
  '\u11B7': 'a',
  '\u11B8': 'q',
  '\u11B9': 'q',
  '\u11BA': 't',
  '\u11BB': 'T',
  '\u11BC': 'd',
  '\u11BD': 'w',
  '\u11BE': 'c',
  '\u11BF': 'z',
  '\u11C0': 'x',
  '\u11C1': 'v',
  '\u11C2': 'g',
};

// Map for displaying Hangul on the keys
const DISPLAY_MAP: Record<string, string> = {
  q: 'ㅂ',
  w: 'ㅈ',
  e: 'ㄷ',
  r: 'ㄱ',
  t: 'ㅅ',
  y: 'ㅛ',
  u: 'ㅕ',
  i: 'ㅑ',
  o: 'ㅐ',
  p: 'ㅔ',
  a: 'ㅁ',
  s: 'ㄴ',
  d: 'ㅇ',
  f: 'ㄹ',
  g: 'ㅎ',
  h: 'ㅗ',
  j: 'ㅓ',
  k: 'ㅏ',
  l: 'ㅣ',
  z: 'ㅋ',
  x: 'ㅌ',
  c: 'ㅊ',
  v: 'ㅍ',
  b: 'ㅠ',
  n: 'ㅜ',
  m: 'ㅡ',
  Q: 'ㅃ',
  W: 'ㅉ',
  E: 'ㄸ',
  R: 'ㄲ',
  T: 'ㅆ',
  O: 'ㅒ',
  P: 'ㅖ',
};

export const KeyboardHints: React.FC<KeyboardHintsProps> = ({ nextJamo, targetChar, hasError }) => {
  const keysToHighlight = useMemo(() => {
    // If there's an error, highlight backspace
    if (hasError) {
      return '{bksp}';
    }

    // Handle space
    if (targetChar === ' ') {
      return '{space}';
    }

    // Handle common punctuation
    if (targetChar === '.') return '.';
    if (targetChar === ',') return ',';
    if (targetChar === '?') return '{shiftleft} {shiftright} /';
    if (targetChar === '!') return '{shiftleft} {shiftright} 1';

    if (!nextJamo) return '';

    const key = JAMO_TO_KEY_MAP[nextJamo];
    if (!key) {
      return '';
    }

    const keys: string[] = [];

    // If key is UpperCase, it means SHIFT + Key
    if (key === key.toUpperCase() && key !== key.toLowerCase()) {
      keys.push(key.toLowerCase());
      keys.push('{shiftleft}');
      keys.push('{shiftright}');
    } else {
      keys.push(key);
    }

    return keys.join(' ');
  }, [nextJamo, targetChar, hasError]);

  return (
    <div className="w-full mx-auto opacity-100 transition-opacity">
      {/* Styles are now handled globally in TypingPage.tsx for consistency */}
      <Keyboard
        physicalKeyboardHighlight={false}
        layout={{
          default: [
            '` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
            '{tab} q w e r t y u i o p [ ] \\',
            "{capslock} a s d f g h j k l ; ' {enter}",
            '{shiftleft} z x c v b n m , . / {shiftright}',
            '{space}',
          ],
        }}
        display={{
          ...DISPLAY_MAP,
          '{bksp}': '⌫',
          '{enter}': '⏎',
          '{shiftleft}': '⇧',
          '{shiftright}': '⇧',
          '{tab}': 'Tab',
          '{space}': ' ',
          '{capslock}': 'Caps',
        }}
        buttonTheme={[
          {
            class: 'active-key-highlight',
            buttons: keysToHighlight,
          },
        ]}
      />
    </div>
  );
};
