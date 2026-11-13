export interface OfflineGuidanceEntry {
  group: string;
  positive?: boolean;
  keywords: string[];
  observe: string;
  reflect: string;
  act: string;
  compassion: string;
  verse: string;
  vow: string;
}

export interface MatchedGuidance {
  group: string;
  positive: boolean;
  observe: string;
  reflect: string;
  act: string;
  compassion: string;
  verse: string;
  vow: string;
}

export const OFFLINE_GUIDANCE: OfflineGuidanceEntry[] = [
  {
    group: '不安与恐惧',
    keywords: ['焦虑', '不安', '担心', '恐惧', '压力', '紧张', '害怕', '慌', '惊'],
    observe: '此刻心像被绷紧的弦，正在替还没发生的事提前用力。',
    reflect: '（关于{事件}）恐惧常常来自想抓紧无法完全掌控的未来。念头在跑，但此时此刻的呼吸仍在，身体仍然稳稳坐在这里。',
    act: '先不急着解决明天的事。把双脚踩实地面，慢慢呼气四秒，再轻轻吸气四秒，做三次，只照顾这一分钟。',
    compassion: '愿此刻慌张的自己被温柔接住，不必独自扛下所有未知。',
    verse: '凡所有相，皆是虚妄；心定一分，风波自减一分。',
    vow: '愿我在不安升起时，仍记得回到这一呼一吸之中。',
  },
  {
    group: '愤怒与烦躁',
    keywords: ['生气', '愤怒', '烦躁', '恼火', '气愤', '火大', '暴躁', '恼', '烦'],
    observe: '胸口有一股热气往上涌，像是心里重要的边界或期待被触动了。',
    reflect: '（关于{事件}）愤怒往往是保护自己的盔甲，底下藏着在意或委屈。情绪本身没有错，只是它来得太急，容易让我们只看见眼前的刺。',
    act: '先别急着回应或做决定。去喝半杯温水，或者把手放在心口，等这股火气自己慢慢落下来。',
    compassion: '愿我允许自己有生气的权利，也不必用这把火伤到自己。',
    verse: '一念瞋心起，百万障门开；缓一拍看它，火自成清凉。',
    vow: '愿我在情绪涌动时，为自己留出一拍停顿的慈悲。',
  },
  {
    group: '委屈与难过',
    keywords: ['委屈', '悲伤', '难过', '伤心', '失望', '无助', '哭', '心酸', '失落'],
    observe: '心里沉甸甸的，好像有话想说却说不出来，或者付出没有被看见。',
    reflect: '（关于{事件}）感到难过，说明你对人、对事都是认真用过心的。眼泪与低落不是软弱，而是心在诚实地消化失去与落差。',
    act: '今天不必勉强自己打起精神。像照顾一个疲惫的好朋友那样，盖好被子、洗个热水澡，允许自己安静地难过一会儿。',
    compassion: '愿我即使不被外界立刻理解，也能先好好站在自己这一边。',
    verse: '如莲生淤泥，不被泥所染；苦会流过心，不会永远停留。',
    vow: '愿我温柔对待自己的泪水与脆弱，如同对待一切受苦的生命。',
  },
  {
    group: '羞愧与自责',
    keywords: ['羞愧', '懊悔', '自责', '愧疚', '内疚', '后悔', '丢脸', '抱歉'],
    observe: '有个严厉的声音正在反复挑剔自己，觉得“都是我不够好”。',
    reflect: '（关于{事件}）会感到愧疚，恰恰说明你在乎原则、也有善意。但把“一件事没做好”等同于“整个人不好”，只会让自己困在过去出不来。',
    act: '对着镜子或心里对自己说一句：“当时的我已经用尽那时的能力了。”如果有需要弥补的地方，列出一件明天能做的小事就够了。',
    compassion: '愿我像原谅一个刚学步的孩子那样，允许自己有不完美的地方。',
    verse: '往昔所造诸恶业，觉照当下即清净；昨日之错，作今日之师。',
    vow: '愿我在反省中生起智慧，而不是在责备里消耗自己。',
  },
  {
    group: '嫉妒与比较',
    keywords: ['嫉妒', '羡慕', '比较', '不甘', '眼红', '自卑'],
    observe: '看见别人拥有的，心里忽然酸了一下，转头开始怀疑自己是不是落后了。',
    reflect: '（关于{事件}）比较的心总是盯着别人的花期，却忘了每一棵树生长的土壤和时节都不同。羡慕其实在提醒你：你真正渴望的是什么。',
    act: '把视线从别人的窗口收回来，写下今天自己手里已经握住的三件小事——哪怕只是一顿安稳的饭、一口顺畅的气。',
    compassion: '愿我看见别人的光芒时不自贬，也看见自己正在走的路。',
    verse: '随喜他人的福德，即是庄严自己的心田。',
    vow: '愿我常怀随喜之心，安心耕耘属于自己的因缘。',
  },
  {
    group: '孤独与疏离',
    keywords: ['孤独', '孤单', '寂寞', '疏离', '不被理解', '空虚', '没人懂'],
    observe: '周围或许热闹，心里面却像隔着一层玻璃，觉得没有真正靠近的人。',
    reflect: '（关于{事件}）每个人生命深处都有一段独自走的路，孤独有时是灵魂渴望真实连接、却暂时没遇到频率相近的人。',
    act: '不必立刻去讨好热闹。给一个信赖的人发一句简单的问候，或走出门看看树影和云，感受自己依然在这个世界之中。',
    compassion: '愿独处时的我，也能成为自己最安稳、最真诚的陪伴。',
    verse: '独坐幽篁里，心与天地通；不依外境暖，自性本具足。',
    vow: '愿我在孤单时依然对自己温柔，也愿世间孤独的心都能被轻轻看见。',
  },
  {
    group: '疲惫与无力',
    keywords: ['疲惫', '累', '乏力', '倦怠', '撑不住', '麻木', '耗竭'],
    observe: '力气像是被一点一点抽空了，连多说一句话都觉得吃力。',
    reflect: '（关于{事件}）身体和心都在用疲惫发出善意的信号：不是你不够努力，是你已经撑得太久、太满，该停下来歇一歇了。',
    act: '今晚什么宏大的计划都先放一边。放下手机早点闭眼，或者只是发呆十分钟——休息本身就是此刻最重要的修行。',
    compassion: '愿我允许自己有“什么也不做”的一天，不再用忙乱证明价值。',
    verse: '行到水穷处，坐看云起时；歇下即是道，无为亦是修。',
    vow: '愿我学会倾听身心的累，用休息代替硬撑。',
  },
  {
    group: '迷茫与困惑',
    keywords: ['困惑', '迷茫', '不知所措', '纠结', '犹豫', '矛盾', '怀疑'],
    observe: '站在岔路口前左右衡量，好像哪边都有顾虑，心里迟迟落不了地。',
    reflect: '（关于{事件}）迷茫常常发生在旧的答案不再适用、新的路还没走出来之间。暂时的不清楚不是退步，而是重新看清方向的酝酿。',
    act: '不必一下子看清整条路。只选出“接下来二十四小时”最明确、也最问心无愧的一小步，做完再看下一步。',
    compassion: '愿我接纳暂时的未知与缓慢，相信路会在脚下慢慢展开。',
    verse: '莫问前程几许，但看脚下步履；心清则明，步稳则远。',
    vow: '愿我在迷雾之中不慌张，踏实走好眼前的这一步。',
  },
  {
    group: '贪求与执着',
    keywords: ['执着', '放不下', '渴望', '贪求', '得不到', '强求', '不舍', '抓紧'],
    observe: '心紧紧攥着某个人、某件事或某个结果，生怕松手就会落空。',
    reflect: '（关于{事件}）手握得太紧，反而接不住新的礼物。执着让我们把所有注意力押在一个点上，忘了因缘从来是流动的。',
    act: '做一次摊开手掌的动作：吸气时微微握拳，呼气时慢慢松开十指，感受那份松开后的空气与余地。',
    compassion: '愿我有勇气去爱与付出，也有智慧在因缘转弯时轻轻松手。',
    verse: '应无所住而生其心；松手不是失去，而是给自在留出空间。',
    vow: '愿我练习拿得起、放得下，在变化之中保持清明。',
  },
  {
    group: '喜悦与感恩',
    positive: true,
    keywords: [
      '平静',
      '喜悦',
      '感恩',
      '满足',
      '充满希望',
      '希望',
      '自信',
      '轻松',
      '充满爱',
      '宽容',
      '专注',
      '开心',
      '快乐',
      '欣慰',
      '欢喜',
      '安稳',
    ],
    observe: '此刻心田是明亮而柔和的，有一份轻盈与暖意正在悄悄展开。',
    reflect: '（关于{事件}）美好的感受像微风，常常容易一晃而过。停下来细细品味并感恩，是在为心积累面对风雨时的底气与光亮。',
    act: '记住现在呼吸顺畅、嘴角松弛的感觉，在心里默默向所有促成这份美好的人与事道一声谢。',
    compassion: '愿这份清净与欢喜不止停留在自己身上，也能化作待人接物的温柔。',
    verse: '春有百花秋有月，若无闲事挂心头，便是人间好时节。',
    vow: '愿我把今日的欢喜与感恩回向一切有情，愿众生皆得安乐。',
  },
  {
    group: '通用',
    keywords: [],
    observe: '无论此刻心里翻涌着什么，你已经愿意停下来看它一眼了。',
    reflect: '（关于{事件}）能被看见的念头，就已经不再完全控制你。情绪像天上的云，生起、变化、散去，而天空始终宽广安静。',
    act: '把手轻轻贴在胸口，跟着呼吸数三下——吸气知道自己在吸气，呼气知道自己在呼气，不评判，只是陪着自己。',
    compassion: '愿此时此刻的我，在一切起伏之中都能被温柔对待。',
    verse: '念起不随，念止不追；但行当下，莫问其余。',
    vow: '愿我常保觉察之心，以慈悲与清明安住每一个当下。',
  },
];

const CRISIS_CHINESE_KEYWORDS = [
  '想死',
  '自杀',
  '不想活',
  '活着没意思',
  '结束生命',
  '伤害自己',
  '自残',
  '割腕',
  '跳楼',
];

const CRISIS_ENGLISH_KEYWORDS = [
  'suicide',
  'kill myself',
  'self-harm',
  'end my life',
];

const SAFETY_PAUSE_CHINESE_KEYWORDS = [
  '持续恐慌',
  '恐慌发作',
  '失眠',
  '整夜睡不着',
  '创伤',
  '与现实脱离',
  '解离',
  '幻听',
  '幻视',
];

const SAFETY_PAUSE_OTHER_KEYWORDS = [
  'panic attack',
  'severe panic',
  'insomnia',
  'trauma',
  'dissociation',
  'hallucination',
  'hearing voices',
  'seeing things',
  'serangan panik',
  'halusinasi',
  'bunuh diri',
  'cedera diri',
];

export function containsCrisisKeywords(...texts: Array<string | undefined | null>): boolean {
  const combined = texts.filter(Boolean).join(' ');
  if (!combined.trim()) return false;

  for (const kw of CRISIS_CHINESE_KEYWORDS) {
    if (combined.includes(kw)) return true;
  }

  const lower = combined.toLowerCase();
  for (const kw of CRISIS_ENGLISH_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }

  return false;
}

export function containsSafetyPauseKeywords(...texts: Array<string | undefined | null>): boolean {
  if (containsCrisisKeywords(...texts)) return true;
  const combined = texts.filter(Boolean).join(' ');
  if (!combined.trim()) return false;

  for (const kw of SAFETY_PAUSE_CHINESE_KEYWORDS) {
    if (combined.includes(kw)) return true;
  }

  const lower = combined.toLowerCase();
  for (const kw of SAFETY_PAUSE_OTHER_KEYWORDS) {
    if (lower.includes(kw)) return true;
  }

  return false;
}

export function formatReflectWithEvent(reflectTemplate: string, eventText?: string): string {
  const trimmed = (eventText || '').trim();
  if (!trimmed) {
    return reflectTemplate.replace(/（关于\{事件\}）/g, '');
  }
  const truncated = trimmed.length > 20 ? `${trimmed.slice(0, 20)}……` : trimmed;
  return reflectTemplate.replace(/\{事件\}/g, truncated);
}

export function matchOfflineGuidance(params: {
  emotionLabels?: string[];
  freeText?: string;
  eventText?: string;
}): MatchedGuidance {
  const labels = params.emotionLabels || [];
  const freeText = (params.freeText || '').trim();
  const haystack = `${labels.join(' ')} ${freeText}`.toLowerCase();

  const negativeGroups = OFFLINE_GUIDANCE.filter((g) => !g.positive && g.group !== '通用');
  const positiveGroups = OFFLINE_GUIDANCE.filter((g) => Boolean(g.positive));
  const fallbackGroup = OFFLINE_GUIDANCE.find((g) => g.group === '通用')!;

  const matchesGroup = (entry: OfflineGuidanceEntry) =>
    entry.keywords.some((kw) => haystack.includes(kw.toLowerCase()));

  // Negative emotions always take priority over positive emotions
  const matched =
    negativeGroups.find(matchesGroup) ||
    positiveGroups.find(matchesGroup) ||
    fallbackGroup;

  return {
    group: matched.group,
    positive: Boolean(matched.positive),
    observe: matched.observe,
    reflect: formatReflectWithEvent(matched.reflect, params.eventText),
    act: matched.act,
    compassion: matched.compassion,
    verse: matched.verse,
    vow: matched.vow,
  };
}
