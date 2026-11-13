const BOUNDARY_CHARS = '阿芭擦搭蛾发噶哈击喀垃妈拿哦啪期然撒塌挖昔压匝';
const BOUNDARY_INITIALS = 'ABCDEFGHJKLMNOPQRSTWXYZ';

const POLYPHONE_INITIALS: Record<string, string> = {
  般: 'b',
  若: 'r',
  阿: 'a',
  弥: 'm',
  陀: 't',
  南: 'n',
  无: 'm',
  观: 'g',
  世: 's',
  音: 'y',
  菩: 'p',
  萨: 's',
  地: 'd',
  藏: 'z',
  药: 'y',
  师: 's',
  大: 'd',
  悲: 'b',
  咒: 'z',
  心: 'x',
  经: 'j',
  金: 'j',
  刚: 'g',
  往: 'w',
  生: 's',
  准: 'z',
  提: 't',
  六: 'l',
  字: 'z',
  明: 'm',
  吉: 'j',
  祥: 'x',
  普: 'p',
  门: 'm',
  品: 'p',
  贤: 'x',
  行: 'x',
  愿: 'y',
  觉: 'j',
  佛: 'f',
  说: 's',
  释: 's',
  迦: 'j',
  牟: 'm',
  尼: 'n',
  忏: 'c',
  悔: 'h',
  回: 'h',
  向: 'x',
  偈: 'j',
  七: 'q',
  灭: 'm',
  定: 'd',
  业: 'y',
  真: 'z',
  言: 'y',
  长: 'c',
  禅: 'c',
  修: 'x',
  文: 'w',
  殊: 's',
  利: 'l',
  八: 'b',
  正: 'z',
  灌: 'g',
  顶: 'd',
  号: 'h',
  圣: 's',
};

let collator: Intl.Collator | null = null;
function getPinyinCollator(): Intl.Collator | null {
  if (collator) return collator;
  try {
    collator = new Intl.Collator('zh-CN-u-co-pinyin');
    return collator;
  } catch {
    return null;
  }
}

export function getCharPinyinInitial(ch: string): string {
  if (!ch) return '';
  if (/[a-zA-Z0-9]/.test(ch)) return ch.toLowerCase();
  if (POLYPHONE_INITIALS[ch]) return POLYPHONE_INITIALS[ch];

  const c = getPinyinCollator();
  if (!c) return '';

  // Check if it falls within CJK Unified Ideographs
  if (!/[\u4e00-\u9fff]/.test(ch)) return '';

  for (let i = BOUNDARY_CHARS.length - 1; i >= 0; i--) {
    if (c.compare(ch, BOUNDARY_CHARS[i]) >= 0) {
      return BOUNDARY_INITIALS[i].toLowerCase();
    }
  }
  return '';
}

export function getPinyinInitials(text: string): string {
  if (!text) return '';
  let result = '';
  for (const ch of text) {
    result += getCharPinyinInitial(ch);
  }
  return result;
}

export function matchesScriptureQuery(
  query: string,
  title: string,
  subtitle?: string,
  source?: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (title.toLowerCase().includes(q)) return true;
  if (subtitle && subtitle.toLowerCase().includes(q)) return true;
  if (source && source.toLowerCase().includes(q)) return true;

  const titleInitials = getPinyinInitials(title);
  if (titleInitials.includes(q)) return true;

  if (subtitle) {
    const subInitials = getPinyinInitials(subtitle);
    if (subInitials.includes(q)) return true;
  }

  return false;
}
