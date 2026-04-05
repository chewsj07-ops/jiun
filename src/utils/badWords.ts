export const badWordsList = [
  // 暴力/杀害/威胁 (Violence/Murder/Threats)
  '杀人', '砍人', '去死', '弄死你', '杀全家', '同归于尽', '自杀', '割腕', '跳楼', '喝农药', '寻死', '报复社会', '炸弹', '恐怖袭击', '强奸', '轮奸', '打死', '砍死', '捅死', '分尸', '碎尸', '灭门',
  'suicide', 'kill', 'murder', 'rape', 'terrorist', 'bomb', 'assassinate', 'massacre', 'slaughter',
  
  // 色情/不雅 (Pornography/Indecent)
  '色情', '做爱', '操你', '肏', '干你娘', '傻逼', '牛逼', '妈逼', '婊子', '荡妇', '妓女', '嫖娼', '卖淫', '乱伦', '强暴', '性交', '阴茎', '阴道', '乳房', '裸聊', '黄片', 'av女优', '三级片', '迷奸',
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'whore', 'slut', 'porn', 'incest', 'pedophile', 'nude', 'sex', 'blowjob', 'handjob', 'tits', 'boobs',
  
  // 侮辱/网络暴力/政治敏感 (Insults/Cyberbullying)
  '脑残', '弱智', '智障', '死全家', '狗杂种', '杂种', '畜生', '废物', '贱人', '贱货', '死妈', '孤儿', '你妈死了', '绿茶婊', '白痴', '神经病', '变态',
  'retard', 'idiot', 'moron', 'asshole', 'bastard', 'motherfucker', 'nigger', 'chink', 'faggot', 'dyke', 'tranny',
];

export const containsBadWords = (text: string): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  for (const word of badWordsList) {
    if (lowerText.includes(word.toLowerCase())) {
      return true;
    }
  }
  return false;
};