import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShieldCheck, X } from 'lucide-react';
import { PRIVACY_MARKDOWN, PRIVACY_VERSION } from '../content/privacyPolicy';

function renderInlineMarkdown(rawText: string): React.ReactNode[] {
  // Split out {{UPCOMING}}, 【待确认...】, **bold**, emails, and crisis hotlines
  const tokenRegex =
    /(\{\{UPCOMING\}\}|【待确认[^】]*】|\*\*[^*]+\*\*|vowzen91@gmail\.com|03-7627 2929|15555|999)/g;
  const parts = rawText.split(tokenRegex);

  return parts.map((part, idx) => {
    if (!part) return null;
    if (part === '{{UPCOMING}}') {
      return (
        <span
          key={`up-${idx}`}
          className="inline-block ml-1.5 px-2 py-0.5 rounded-md bg-surface-2 border border-line text-xs font-medium text-gold align-middle"
        >
          此功能即将上线
        </span>
      );
    }
    if (part.startsWith('【待确认') && part.endsWith('】')) {
      return (
        <span key={`tbc-${idx}`} className="text-gold font-medium">
          {part}
        </span>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`b-${idx}`} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part === 'vowzen91@gmail.com') {
      return (
        <a
          key={`mail-${idx}`}
          href="mailto:vowzen91@gmail.com"
          className="text-accent hover:underline font-medium"
        >
          {part}
        </a>
      );
    }
    if (part === '03-7627 2929' || part === '15555' || part === '999') {
      const tel = part.replace(/\s+/g, '');
      return (
        <a
          key={`tel-${idx}`}
          href={`tel:${tel}`}
          className="text-accent hover:underline font-medium"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={`txt-${idx}`}>{part}</React.Fragment>;
  });
}

type MarkdownBlock =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'hr' }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; text: string };

function parseMarkdown(md: string): MarkdownBlock[] {
  const lines = md.split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed === '---') {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2).trim() });
      i++;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3).trim() });
      i++;
      continue;
    }

    // Markdown table detection
    if (
      trimmed.startsWith('|') &&
      i + 1 < lines.length &&
      lines[i + 1].trim().startsWith('|') &&
      lines[i + 1].includes('---')
    ) {
      const parseCells = (row: string) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());

      const headers = parseCells(trimmed);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(parseCells(lines[i]));
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Unordered list
    if (trimmed.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2).trim());
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, '').trim());
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Paragraph (combine consecutive plain lines)
    const paraLines: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('- ') &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      lines[i].trim() !== '---'
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'p', text: paraLines.join('\n') });
  }

  return blocks;
}

export const PrivacyPolicyView: React.FC<{
  isOpen?: boolean;
  onClose?: () => void;
}> = ({ isOpen: controlledOpen, onClose: controlledClose }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  useEffect(() => {
    const handleOpen = () => setInternalOpen(true);
    window.addEventListener('open-privacy-policy', handleOpen);
    window.addEventListener('open-privacy-modal', handleOpen);

    const path = window.location.pathname;
    if (path === '/privacy' || path === '/privacy.html') {
      setInternalOpen(true);
    }

    return () => {
      window.removeEventListener('open-privacy-policy', handleOpen);
      window.removeEventListener('open-privacy-modal', handleOpen);
    };
  }, []);

  const handleClose = () => {
    if (controlledClose) {
      controlledClose();
    } else {
      setInternalOpen(false);
    }
  };

  if (typeof document === 'undefined') return null;

  const blocks = React.useMemo(() => parseMarkdown(PRIVACY_MARKDOWN), []);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[150] bg-paper text-ink flex flex-col"
        >
          {/* Top Bar */}
          <header className="sticky top-0 z-10 bg-surface/90 backdrop-blur-md border-b border-line px-4 sm:px-6 h-14 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink py-1.5 pr-3 rounded-full transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回</span>
            </button>
            <div className="flex items-center gap-2 text-sm font-serif font-semibold text-ink">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span>隐私说明</span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="关闭"
              className="p-2 text-ink-3 hover:text-ink rounded-full hover:bg-surface-2 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Scrollable Document Body */}
          <div className="flex-1 overflow-y-auto">
            <article className="max-w-[40em] mx-auto px-5 py-8 space-y-5">
              {blocks.map((block, idx) => {
                if (block.type === 'h1') {
                  return (
                    <h1 key={idx} className="text-display text-ink mb-2">
                      {renderInlineMarkdown(block.text)}
                    </h1>
                  );
                }

                if (block.type === 'h2') {
                  return (
                    <h2 key={idx} className="text-title text-ink pt-4 pb-1 border-b border-line">
                      {renderInlineMarkdown(block.text)}
                    </h2>
                  );
                }

                if (block.type === 'hr') {
                  return <hr key={idx} className="border-line my-4" />;
                }

                if (block.type === 'table') {
                  return (
                    <div
                      key={idx}
                      className="overflow-x-auto rounded-2xl border border-line bg-surface my-3"
                    >
                      <table className="w-full text-left border-collapse min-w-[460px]">
                        <thead>
                          <tr className="bg-surface-2 border-b border-line">
                            {block.headers.map((header, hIdx) => (
                              <th
                                key={hIdx}
                                className="px-4 py-3 text-xs font-semibold text-ink border-r last:border-r-0 border-line"
                              >
                                {renderInlineMarkdown(header)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {block.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className="border-b last:border-b-0 border-line align-top"
                            >
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className="px-4 py-3 text-[15px] leading-[1.65] text-ink-2 border-r last:border-r-0 border-line"
                                >
                                  {renderInlineMarkdown(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }

                if (block.type === 'ul') {
                  return (
                    <ul key={idx} className="list-disc pl-5 space-y-2.5 text-[16px] leading-[1.75] text-ink-2">
                      {block.items.map((item, itemIdx) => (
                        <li key={itemIdx}>{renderInlineMarkdown(item)}</li>
                      ))}
                    </ul>
                  );
                }

                if (block.type === 'ol') {
                  return (
                    <ol key={idx} className="list-decimal pl-5 space-y-2.5 text-[16px] leading-[1.75] text-ink-2">
                      {block.items.map((item, itemIdx) => (
                        <li key={itemIdx}>{renderInlineMarkdown(item)}</li>
                      ))}
                    </ol>
                  );
                }

                return (
                  <p
                    key={idx}
                    className="text-[16px] leading-[1.75] text-ink-2 whitespace-pre-line"
                  >
                    {renderInlineMarkdown(block.text)}
                  </p>
                );
              })}

              <footer className="pt-8 pb-6 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-caption">版本：{PRIVACY_VERSION}</span>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 rounded-full bg-accent text-on-accent hover:bg-accent-hover text-sm font-medium transition-colors"
                >
                  我已了解
                </button>
              </footer>
            </article>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
