import React from 'react';

const HAN_CHAR_REGEX = /\p{Script=Han}/u;
const PINYIN_PUNCT_REGEX =
  /[，。、；：！？「」『』（）()【】《》“”‘’.,;:!?/·—\-~～…\n\r\t　]+/g;

export function tokenizePinyin(text: string): string[] {
  return text
    .replace(PINYIN_PUNCT_REGEX, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export interface RubyRenderResult {
  aligned: boolean;
  nodes: React.ReactNode;
  fallbackPinyin?: string;
}

export function alignParagraphToRuby(
  contentPara: string,
  pinyinPara?: string,
  rtClassName = 'text-[0.48em] text-ink-3 font-sans font-normal leading-none select-none'
): RubyRenderResult {
  if (!pinyinPara || !pinyinPara.trim()) {
    return { aligned: false, nodes: contentPara };
  }

  const chars = Array.from(contentPara);
  const hanCount = chars.filter((ch) => HAN_CHAR_REGEX.test(ch)).length;
  if (hanCount === 0) {
    return { aligned: false, nodes: contentPara };
  }

  const fullTokens = tokenizePinyin(pinyinPara);
  let matchedTokens: string[] | null = null;

  if (fullTokens.length === hanCount) {
    matchedTokens = fullTokens;
  } else {
    const firstLine = pinyinPara.split('\n')[0]?.trim();
    if (firstLine) {
      const firstLineTokens = tokenizePinyin(firstLine);
      if (firstLineTokens.length === hanCount) {
        matchedTokens = firstLineTokens;
      }
    }
  }

  if (!matchedTokens) {
    return {
      aligned: false,
      nodes: contentPara,
      fallbackPinyin: pinyinPara.trim(),
    };
  }

  let tokenIdx = 0;
  const nodes = chars.map((ch, idx) => {
    if (HAN_CHAR_REGEX.test(ch)) {
      const py = matchedTokens![tokenIdx++];
      return (
        <ruby key={idx} className="mx-[0.04em]">
          {ch}
          <rt className={rtClassName}>{py}</rt>
        </ruby>
      );
    }
    return <React.Fragment key={idx}>{ch}</React.Fragment>;
  });

  return { aligned: true, nodes };
}
