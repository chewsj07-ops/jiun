import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  ChevronLeft,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { Scripture } from '../constants';
import { scriptureDatabaseService } from '../services/scriptureDatabaseService';
import { useTranslation } from '../i18n';
import { cn } from '../lib/utils';
import { safeStorage } from '../utils/safeStorage';

interface ScriptureLibraryProps {
  allScriptures: Scripture[];
  activeScriptureId: string;
  onSelectScripture: (scripture: Scripture, goToFish?: boolean) => void;
  onAddCustomScripture: (scripture: Scripture) => void;
  onDeleteCustomScripture: (id: string) => void;
  onImmersiveChange?: (immersive: boolean) => void;
}

const HAN_CHAR_REGEX = /\p{Script=Han}/u;
const PINYIN_PUNCT_REGEX = /[，。、；：！？「」『』（）()【】《》“”‘’.,;:!?/·—\-~～…\n\r\t]+/g;

function tokenizePinyin(text: string): string[] {
  return text
    .replace(PINYIN_PUNCT_REGEX, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

interface RubyRenderResult {
  aligned: boolean;
  nodes: React.ReactNode;
  fallbackPinyin?: string;
}

function alignParagraphToRuby(
  contentPara: string,
  pinyinPara?: string
): RubyRenderResult {
  if (!pinyinPara || !pinyinPara.trim()) {
    return { aligned: false, nodes: contentPara };
  }

  const chars = Array.from(contentPara);
  const hanCount = chars.filter((ch) => HAN_CHAR_REGEX.test(ch)).length;
  if (hanCount === 0) {
    return { aligned: false, nodes: contentPara };
  }

  // Try direct paragraph match first; if multi-line annotation exists (e.g. "（梵音：...）"), try first line
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
        <ruby key={idx} className="mx-[0.03em]">
          {ch}
          <rt className="text-[0.5em] text-ink-3 font-sans font-normal leading-none select-none">
            {py}
          </rt>
        </ruby>
      );
    }
    return <React.Fragment key={idx}>{ch}</React.Fragment>;
  });

  return { aligned: true, nodes };
}

export const ScriptureLibrary: React.FC<ScriptureLibraryProps> = ({
  allScriptures,
  activeScriptureId,
  onSelectScripture,
  onAddCustomScripture,
  onDeleteCustomScripture,
  onImmersiveChange,
}) => {
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'sutra' | 'mantra' | 'name' | 'favorites' | 'custom'
  >('all');
  const [readingId, setReadingId] = useState<string | null>(null);

  const [showPinyin, setShowPinyin] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem('zen_scripture_show_pinyin');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [showExplanation, setShowExplanation] = useState<boolean>(true);

  const [readerFontSize, setReaderFontSize] = useState<number>(() => {
    try {
      const saved = safeStorage.getItem('zen_scripture_font_size');
      const parsed = saved ? parseInt(saved, 10) : 19;
      return Number.isFinite(parsed) ? Math.min(24, Math.max(17, parsed)) : 19;
    } catch {
      return 19;
    }
  });

  useEffect(() => {
    try {
      safeStorage.setItem('zen_scripture_font_size', String(readerFontSize));
    } catch {
      // ignore
    }
  }, [readerFontSize]);

  useEffect(() => {
    try {
      safeStorage.setItem('zen_scripture_show_pinyin', String(showPinyin));
    } catch {
      // ignore
    }
  }, [showPinyin]);

  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    scriptureDatabaseService.getFavorites()
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Add custom scripture form modal
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState<'sutra' | 'mantra' | 'name'>('sutra');
  const [newTitle, setNewTitle] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPinyin, setNewPinyin] = useState('');
  const [newExplanation, setNewExplanation] = useState('');

  // Reader scroll-direction immersive handling
  const [readerChromeHidden, setReaderChromeHidden] = useState(false);
  const readerScrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef<number>(0);

  const readingScripture = useMemo(
    () => (readingId ? allScriptures.find((s) => s.id === readingId) || null : null),
    [allScriptures, readingId]
  );

  // Restore global immersive when closing reader or unmounting
  useEffect(() => {
    if (!readingScripture) {
      setReaderChromeHidden(false);
      onImmersiveChange?.(false);
    }
  }, [readingScripture, onImmersiveChange]);

  useEffect(() => {
    return () => {
      onImmersiveChange?.(false);
    };
  }, [onImmersiveChange]);

  const handleReaderScroll = () => {
    const el = readerScrollRef.current;
    if (!el) return;
    const currentTop = el.scrollTop;
    const delta = currentTop - lastScrollTopRef.current;

    if (currentTop > 36 && delta > 6) {
      setReaderChromeHidden(true);
      onImmersiveChange?.(true);
    } else if (delta < -6 || currentTop <= 16) {
      setReaderChromeHidden(false);
      onImmersiveChange?.(false);
    }

    lastScrollTopRef.current = currentTop;
  };

  const filteredScriptures = useMemo(() => {
    const nonMeditation = allScriptures.filter((s) => s.category !== 'meditation');
    return scriptureDatabaseService.searchScriptures(
      nonMeditation,
      searchQuery,
      selectedCategory,
      favoriteIds
    );
  }, [allScriptures, searchQuery, selectedCategory, favoriteIds]);

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = scriptureDatabaseService.toggleFavorite(id);
    setFavoriteIds(updated);
  };

  const handleExportDB = () => {
    const json = scriptureDatabaseService.exportDatabaseJSON(allScriptures);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VowZen_佛教经文数据库_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddSubmit = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const entry: Scripture = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      source: newSource.trim() || '自定义收录',
      category: newCategory,
      content: newContent.trim(),
      pinyin: newPinyin.trim() || undefined,
      explanation: newExplanation.trim() || undefined,
      isCustom: true,
    };
    onAddCustomScripture(entry);
    setNewTitle('');
    setNewSource('');
    setNewContent('');
    setNewPinyin('');
    setNewExplanation('');
    setShowAddForm(false);
    setReadingId(entry.id);
  };

  const categoryLabel = (cat: Scripture['category']) => {
    if (cat === 'sutra') return t('scripture_category_sutra') || '经典';
    if (cat === 'mantra') return '持咒';
    if (cat === 'name') return t('buddha_name') || '圣号';
    return '禅修';
  };

  const readerParagraphs = useMemo(() => {
    if (!readingScripture) return [];
    const contentParas = readingScripture.content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const pinyinParas = readingScripture.pinyin
      ? readingScripture.pinyin
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

    return contentParas.map((para, idx) => ({
      id: idx,
      content: para,
      pinyin: pinyinParas[idx],
    }));
  }, [readingScripture]);

  const explanationBlockRef = useRef<HTMLDivElement>(null);

  return (
    <div className="max-w-2xl mx-auto w-full pb-12">
      {/* Top Display Header & More Menu (⋯) */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <h1 className="text-display text-ink">经藏</h1>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMoreMenu((v) => !v)}
            aria-label="更多操作"
            className="w-10 h-10 rounded-full flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <MoreHorizontal size={20} strokeWidth={1.5} />
          </button>

          <AnimatePresence>
            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowMoreMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 top-11 z-40 w-44 rounded-2xl bg-surface border border-line shadow-float py-1.5 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowAddForm(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                  >
                    <Plus size={16} strokeWidth={1.5} className="text-accent" />
                    <span>自定义收录</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      handleExportDB();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                  >
                    <Download size={16} strokeWidth={1.5} className="text-accent" />
                    <span>JSON 导出</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Sticky Search Input */}
      <div className="sticky top-0 z-20 bg-paper/95 backdrop-blur-sm py-2">
        <div className="h-12 rounded-xl bg-surface-2 px-4 flex items-center gap-3 border border-line focus-within:border-accent transition-colors">
          <Search size={18} strokeWidth={1.5} className="text-ink-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索经名、原文、拼音或释义..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-2 focus:outline-none min-w-0"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="清除搜索"
              className="w-7 h-7 rounded-full flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface transition-colors shrink-0"
            >
              <X size={15} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs (single horizontal scrolling row, hidden scrollbar) */}
      <div className="flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { id: 'all', label: '全部' },
          { id: 'sutra', label: '经典' },
          { id: 'mantra', label: '持咒' },
          { id: 'name', label: '圣号' },
          { id: 'favorites', label: `收藏 (${favoriteIds.length})` },
          { id: 'custom', label: '自定义' },
        ].map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={cn(
                'px-4 h-9 rounded-full text-sm transition-colors whitespace-nowrap shrink-0 border flex items-center justify-center',
                isSelected
                  ? 'bg-accent-mist text-accent border-transparent font-medium'
                  : 'text-ink-2 border-line hover:text-ink hover:border-line-strong'
              )}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Book-Catalog Style List */}
      {filteredScriptures.length === 0 ? (
        <div className="py-16 text-center">
          <BookOpen className="w-9 h-9 text-ink-3 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-ink-2">未找到匹配的经文目录</p>
          <p className="text-caption mt-1">可更改搜索词或切换上方分类</p>
        </div>
      ) : (
        <div className="divide-y divide-line border-t border-line mt-1">
          {filteredScriptures.map((scripture) => {
            const isFav = favoriteIds.includes(scripture.id);
            const isActive = activeScriptureId === scripture.id;
            const isCustom = scripture.id.startsWith('custom-') || scripture.isCustom;
            const metaLine = [
              scripture.source,
              categoryLabel(scripture.category),
              isActive ? '当前定课' : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <div
                key={scripture.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  lastScrollTopRef.current = 0;
                  setReaderChromeHidden(false);
                  setReadingId(scripture.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    lastScrollTopRef.current = 0;
                    setReaderChromeHidden(false);
                    setReadingId(scripture.id);
                  }
                }}
                className="py-4 flex items-center justify-between gap-4 cursor-pointer group focus:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="text-title text-ink group-hover:text-accent transition-colors truncate">
                    {scripture.title}
                  </h2>
                  <p className="text-caption mt-1 truncate">{metaLine}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isCustom &&
                    (pendingDeleteId === scripture.id ? (
                      <div
                        className="flex items-center gap-1.5 mr-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteCustomScripture(scripture.id);
                            setPendingDeleteId(null);
                          }}
                          className="px-2.5 h-8 rounded-full bg-accent text-on-accent text-xs font-medium"
                        >
                          删除
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="px-2.5 h-8 rounded-full bg-surface-2 text-ink-2 text-xs"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteId(scripture.id);
                        }}
                        aria-label="删除自定义经文"
                        className="w-10 h-10 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
                      >
                        <Trash2 size={17} strokeWidth={1.5} />
                      </button>
                    ))}

                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(e, scripture.id)}
                    aria-label={isFav ? '取消收藏' : '收藏经文'}
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                      isFav
                        ? 'text-accent'
                        : 'text-ink-3 hover:text-ink-2 hover:bg-surface-2'
                    )}
                  >
                    <Star
                      size={18}
                      strokeWidth={1.5}
                      className={cn(isFav && 'fill-current')}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Scripture Modal / Sheet */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%', opacity: 0.9 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.9 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-surface border border-line shadow-float p-6 max-h-[88dvh] overflow-y-auto space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            >
              <div className="w-10 h-1 rounded-full bg-line-strong mx-auto sm:hidden" />
              <div className="flex items-center justify-between">
                <h3 className="text-title text-ink">自定义收录经文</h3>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  aria-label="关闭"
                  className="w-9 h-9 rounded-full flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface-2"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sutra', label: '经典经文' },
                  { id: 'mantra', label: '真言持咒' },
                  { id: 'name', label: '佛菩萨圣号' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setNewCategory(type.id as any)}
                    className={cn(
                      'h-9 rounded-full text-xs font-medium transition-colors border',
                      newCategory === type.id
                        ? 'bg-accent-mist text-accent border-transparent'
                        : 'bg-surface-2 text-ink-2 border-line hover:text-ink'
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption mb-1">标题 *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="如：药师琉璃光如来本愿经"
                    className="w-full h-11 bg-surface-2 border border-line rounded-xl px-3.5 text-sm text-ink focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-caption mb-1">出处 / 译者（选填）</label>
                  <input
                    type="text"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="如：唐·玄奘法师译"
                    className="w-full h-11 bg-surface-2 border border-line rounded-xl px-3.5 text-sm text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-caption mb-1">原文 *</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="请输入经文、咒语或圣号原文..."
                  rows={4}
                  className="w-full bg-surface-2 border border-line rounded-xl p-3.5 text-sm text-ink focus:outline-none focus:border-accent resize-y"
                />
              </div>

              <div>
                <label className="block text-caption mb-1">拼音标注（选填）</label>
                <textarea
                  value={newPinyin}
                  onChange={(e) => setNewPinyin(e.target.value)}
                  placeholder="按字以空格分隔拼音，可逐字对齐标注在上方..."
                  rows={2}
                  className="w-full bg-surface-2 border border-line rounded-xl p-3.5 text-sm text-ink focus:outline-none focus:border-accent resize-y"
                />
              </div>

              <div>
                <label className="block text-caption mb-1">释义与受用（选填）</label>
                <textarea
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  placeholder="简要记录经文主旨与修行受用..."
                  rows={2}
                  className="w-full bg-surface-2 border border-line rounded-xl p-3.5 text-sm text-ink focus:outline-none focus:border-accent resize-y"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 h-11 rounded-full bg-surface-2 text-ink-2 text-sm font-medium hover:text-ink transition-colors"
                >
                  {t('cancel') || '取消'}
                </button>
                <button
                  type="button"
                  onClick={handleAddSubmit}
                  disabled={!newTitle.trim() || !newContent.trim()}
                  className="flex-1 h-11 rounded-full bg-accent text-on-accent text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-40"
                >
                  {t('confirm_add') || '确认收录'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full-Screen Scripture Reader */}
      <AnimatePresence>
        {readingScripture && (
          <motion.div
            key={readingScripture.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 bg-paper"
          >
            <div
              ref={readerScrollRef}
              onScroll={handleReaderScroll}
              onClick={() => {
                if (readerChromeHidden) {
                  setReaderChromeHidden(false);
                  onImmersiveChange?.(false);
                }
              }}
              className="w-full h-full overflow-y-auto"
            >
            {/* Reader Top Bar (scroll down hides with immersive, scroll up restores) */}
            <header
              className={cn(
                'sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-paper/90 backdrop-blur-md transition-all duration-300 ease-[var(--ease-zen)]',
                readerChromeHidden
                  ? 'opacity-0 -translate-y-full pointer-events-none'
                  : 'opacity-100 translate-y-0'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  onImmersiveChange?.(false);
                  setReadingId(null);
                }}
                aria-label="返回经藏"
                className="h-10 px-2 -ml-1 rounded-full flex items-center gap-1 text-ink-2 hover:text-ink hover:bg-surface-2 transition-colors"
              >
                <ChevronLeft size={20} strokeWidth={1.5} />
                <span className="text-sm">经藏</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleToggleFavorite(e, readingScripture.id)}
                aria-label={
                  favoriteIds.includes(readingScripture.id) ? '取消收藏' : '收藏经文'
                }
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                  favoriteIds.includes(readingScripture.id)
                    ? 'text-accent'
                    : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                )}
              >
                <Star
                  size={19}
                  strokeWidth={1.5}
                  className={cn(favoriteIds.includes(readingScripture.id) && 'fill-current')}
                />
              </button>
            </header>

            {/* Reading Body */}
            <article className="max-w-[34em] mx-auto px-6 pt-6 pb-36">
              <header className="text-center">
                <h1 className="text-display text-ink text-balance">
                  {readingScripture.title}
                </h1>
                {(readingScripture.source || readingScripture.recommendedCount) && (
                  <p className="text-caption mt-2.5">
                    {[
                      readingScripture.source,
                      readingScripture.recommendedCount
                        ? `建议日诵 ${readingScripture.recommendedCount} 遍`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                <div className="w-12 h-px bg-accent-soft mx-auto my-8" />
              </header>

              {/* Paragraphs with optional inline <ruby> Pinyin */}
              <div
                className="text-reading text-ink"
                style={{
                  fontSize: `${readerFontSize}px`,
                  lineHeight: showPinyin && readingScripture.pinyin ? 2.45 : 2,
                }}
              >
                {readerParagraphs.map((para) => {
                  const rubyResult = showPinyin
                    ? alignParagraphToRuby(para.content, para.pinyin)
                    : null;

                  return (
                    <div key={para.id} className="mb-[1.5em] indent-0">
                      <p className="whitespace-pre-wrap indent-0">
                        {rubyResult && rubyResult.aligned ? rubyResult.nodes : para.content}
                      </p>
                      {showPinyin &&
                        rubyResult &&
                        !rubyResult.aligned &&
                        rubyResult.fallbackPinyin && (
                          <p className="text-sm text-ink-2 leading-relaxed mt-2 whitespace-pre-wrap indent-0 font-sans">
                            {rubyResult.fallbackPinyin}
                          </p>
                        )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation & Key Takeaway Section */}
              {showExplanation &&
                (readingScripture.keyTakeaway || readingScripture.explanation) && (
                  <div
                    ref={explanationBlockRef}
                    className="mt-10 space-y-4"
                  >
                    {readingScripture.keyTakeaway && (
                      <section className="bg-surface-2 rounded-2xl p-5 border-l-2 border-accent">
                        <h2 className="text-title text-ink mb-2">修行心要</h2>
                        <p className="text-[16px] leading-relaxed text-ink font-serif">
                          {readingScripture.keyTakeaway}
                        </p>
                      </section>
                    )}

                    {readingScripture.explanation && (
                      <section className="bg-surface-2 rounded-2xl p-5 border-l-2 border-accent">
                        <h2 className="text-title text-ink mb-2">释义与受用</h2>
                        <p className="text-[15px] leading-[1.8] text-ink">
                          {readingScripture.explanation}
                        </p>
                      </section>
                    )}
                  </div>
                )}
            </article>

            {/* Bottom Floating Toolbar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'fixed bottom-5 left-1/2 -translate-x-1/2 z-50 mb-[env(safe-area-inset-bottom)] transition-all duration-300 ease-[var(--ease-zen)]',
                readerChromeHidden
                  ? 'opacity-0 translate-y-6 pointer-events-none'
                  : 'opacity-100 translate-y-0'
              )}
            >
              <div className="h-12 px-2 rounded-full bg-surface/90 backdrop-blur-md border border-line shadow-float flex items-center gap-1 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() =>
                    setReaderFontSize((s) => Math.max(17, s - 1))
                  }
                  disabled={readerFontSize <= 17}
                  aria-label="减小字号"
                  className="h-9 px-2.5 rounded-full text-xs font-medium text-ink-2 hover:text-ink hover:bg-surface-2 disabled:opacity-35 transition-colors"
                >
                  A−
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setReaderFontSize((s) => Math.min(24, s + 1))
                  }
                  disabled={readerFontSize >= 24}
                  aria-label="增大字号"
                  className="h-9 px-2.5 rounded-full text-xs font-medium text-ink-2 hover:text-ink hover:bg-surface-2 disabled:opacity-35 transition-colors"
                >
                  A+
                </button>

                <div className="w-px h-4 bg-line mx-0.5" />

                <button
                  type="button"
                  onClick={() => setShowPinyin((v) => !v)}
                  className={cn(
                    'h-9 px-3 rounded-full text-xs font-medium transition-colors',
                    showPinyin
                      ? 'bg-accent-mist text-accent'
                      : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                  )}
                >
                  拼音
                </button>

                <button
                  type="button"
                  onClick={() => setShowExplanation((v) => !v)}
                  className={cn(
                    'h-9 px-3 rounded-full text-xs font-medium transition-colors',
                    showExplanation
                      ? 'bg-accent-mist text-accent'
                      : 'text-ink-2 hover:text-ink hover:bg-surface-2'
                  )}
                >
                  释义
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onImmersiveChange?.(false);
                    setReadingId(null);
                    onSelectScripture(readingScripture, true);
                  }}
                  className="h-9 px-4 ml-1 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-xs font-medium transition-colors"
                >
                  开始诵读
                </button>
              </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
