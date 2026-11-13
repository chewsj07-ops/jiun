export type RitualStepId =
  | 'breathing'
  | 'homage'
  | 'pureMouth'
  | 'repentance'
  | 'vow'
  | 'openingSutra'
  | 'chantingGuide'
  | 'dedicationClosing';

export type RitualScope = 'all' | '经典';

export type RitualMode = 'full' | 'brief';
export type RitualRunMode = RitualMode | 'direct';
export type HomageStyle = 'bow1' | 'prostrate3';
export type PureMouthReps = 1 | 3 | 7;

export type DedicationTargetType = 'self' | 'family' | 'all' | 'person';

export interface RitualStep {
  id: RitualStepId;
  title: string;
  guidance: string;
  verse?: string;
  pinyin?: string;
  tips?: string[];
  defaultRepetitions: number;
  why: string;
  scope: RitualScope;
}

export const RITUAL_DEDICATION_DEFAULT_VERSE =
  '愿以此功德，普及于一切，我等与众生，皆共成佛道。';

export const RITUAL_DEDICATION_DEFAULT_PINYIN =
  'yuàn yǐ cǐ gōng dé，pǔ jí yú yí qiè，wǒ děng yǔ zhòng shēng，jiē gòng chéng fó dào。';

export const RITUAL_STEPS: RitualStep[] = [
  {
    id: 'breathing',
    title: '调身调息',
    guidance: '放下手边的事，关掉通知。端身正坐，背直肩松，双手合掌或放在膝上。',
    defaultRepetitions: 3,
    why: '身安则心安。先让身体静下来，念诵时心才容易收摄。',
    scope: 'all',
  },
  {
    id: 'homage',
    title: '礼佛',
    guidance: '面向佛像，或观想佛在面前，至诚合掌。',
    defaultRepetitions: 1,
    why: '礼佛是放下我慢，以恭敬心开始。恭敬一分，得益一分。',
    scope: 'all',
  },
  {
    id: 'pureMouth',
    title: '净口业真言',
    guidance: '轻声或默念净口业真言，每念完一遍轻点画面。',
    verse: '唵　修唎修唎　摩诃修唎　修修唎　萨婆诃',
    pinyin: 'ǎn　xiū lì xiū lì　mó hē xiū lì　xiū xiū lì　sà pó hē',
    defaultRepetitions: 3,
    why: '念经之前先清净口业，提醒自己：这张口今天要用来念诵，也要少说恶语、妄语。',
    scope: 'all',
  },
  {
    id: 'repentance',
    title: '忏悔',
    guidance: '至诚念诵忏悔偈，照见而不自责。',
    verse: '往昔所造诸恶业，皆由无始贪嗔痴，从身语意之所生，一切我今皆忏悔。',
    pinyin:
      'wǎng xī suǒ zào zhū è yè，jiē yóu wú shǐ tān chēn chī，cóng shēn yǔ yì zhī suǒ shēng，yí qiè wǒ jīn jiē chàn huǐ。',
    defaultRepetitions: 1,
    why: '忏悔不是自责，而是看见、承认、愿意改过。心里的结松开了，念诵才容易相应。',
    scope: 'all',
  },
  {
    id: 'vow',
    title: '发愿',
    guidance: '发四弘誓愿，安立这一座念诵的方向。',
    verse: '众生无边誓愿度，烦恼无尽誓愿断，法门无量誓愿学，佛道无上誓愿成。',
    pinyin:
      'zhòng shēng wú biān shì yuàn dù，fán nǎo wú jìn shì yuàn duàn，fǎ mén wú liàng shì yuàn xué，fó dào wú shàng shì yuàn chéng。',
    defaultRepetitions: 1,
    why: '以愿导行。有了愿，念诵就有了方向，不是为了数字。',
    scope: 'all',
  },
  {
    id: 'openingSutra',
    title: '开经偈',
    guidance: '以珍惜、求解的心诵读开经偈。',
    verse: '无上甚深微妙法，百千万劫难遭遇，我今见闻得受持，愿解如来真实义。',
    pinyin:
      'wú shàng shèn shēn wēi miào fǎ，bǎi qiān wàn jié nán zāo yù，wǒ jīn jiàn wén dé shòu chí，yuàn jiě rú lái zhēn shí yì。',
    defaultRepetitions: 1,
    why: '提醒自己，能遇到佛法很难得。以珍惜、求解的心来读，而不是赶着念完。',
    scope: '经典',
  },
  {
    id: 'chantingGuide',
    title: '念诵要点',
    guidance: '念诵时摄心一处，字字清楚入耳。',
    tips: [
      '心口一致：口念出、耳听清、心知道，三者合一。',
      '字字分明：不快不慢，一声木鱼配一字或一句，宁慢勿乱。',
      '出声、轻声、默念都可以；夜里或人多时，可以只动嘴唇不出声。',
      '念着念着走神了，不必责备自己，觉察到了，就把心带回到声音上。',
    ],
    defaultRepetitions: 1,
    why: '念诵重在摄心，而非赶速度。宁可慢而清楚，不要快而散乱。',
    scope: 'all',
  },
  {
    id: 'dedicationClosing',
    title: '回向与结束',
    guidance: '念诵圆满，将这一座的清净功德回向出去。',
    verse: RITUAL_DEDICATION_DEFAULT_VERSE,
    pinyin: RITUAL_DEDICATION_DEFAULT_PINYIN,
    defaultRepetitions: 1,
    why: '回向是把小小的心量打开，不将功德据为己有，与家人和一切众生分享。',
    scope: 'all',
  },
];

export const DEDICATION_TARGET_OPTIONS: {
  id: DedicationTargetType;
  label: string;
}[] = [
  { id: 'self', label: '自己' },
  { id: 'family', label: '家人' },
  { id: 'all', label: '一切众生' },
  { id: 'person', label: '特定的人' },
];

export function formatSpecialDedicationLine(targetLabel: string): string {
  const clean = targetLabel.trim();
  if (!clean) return '';
  return `特别回向给：${clean}，愿其身心安乐，离苦得乐。`;
}
