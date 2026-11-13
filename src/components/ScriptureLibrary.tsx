import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Book, Search, Plus, Check, Trash2, Star, ChevronDown, ChevronUp,
  Volume2, Sparkles, BookOpen, Download, X, Eye, EyeOff, Info
} from 'lucide-react';
import { Scripture } from '../constants';
import { scriptureDatabaseService } from '../services/scriptureDatabaseService';
import { useTranslation } from '../i18n';
import { cn } from '../lib/utils';

interface ScriptureLibraryProps {
  allScriptures: Scripture[];
  activeScriptureId: string;
  onSelectScripture: (scripture: Scripture, goToFish?: boolean) => void;
  onAddCustomScripture: (scripture: Scripture) => void;
  onDeleteCustomScripture: (id: string) => void;
}

export const ScriptureLibrary: React.FC<ScriptureLibraryProps> = ({
  allScriptures,
  activeScriptureId,
  onSelectScripture,
  onAddCustomScripture,
  onDeleteCustomScripture,
}) => {
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'sutra' | 'mantra' | 'name' | 'favorites' | 'custom'
  >('all');
  const [expandedId, setExpandedId] = useState<string | null>(activeScriptureId || 'heart-sutra');
  const [showPinyin, setShowPinyin] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    scriptureDatabaseService.getFavorites()
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Add custom scripture form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState<'sutra' | 'mantra' | 'name'>('sutra');
  const [newTitle, setNewTitle] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPinyin, setNewPinyin] = useState('');
  const [newExplanation, setNewExplanation] = useState('');

  const filteredScriptures = useMemo(() => {
    const nonMeditation = allScriptures.filter(s => s.category !== 'meditation');
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
    setExpandedId(entry.id);
    setNewTitle('');
    setNewSource('');
    setNewContent('');
    setNewPinyin('');
    setNewExplanation('');
    setShowAddForm(false);
  };

  const categoryLabel = (cat: Scripture['category']) => {
    if (cat === 'sutra') return t('scripture_category_sutra') || '经典';
    if (cat === 'mantra') return t('scripture_category_mantra') || '神咒';
    if (cat === 'name') return t('buddha_name') || '圣号';
    return '禅修';
  };

  const categoryStyle = (cat: Scripture['category']) => {
    if (cat === 'sutra') return 'bg-amber-50 text-amber-800 border-amber-200/60';
    if (cat === 'mantra') return 'bg-purple-50 text-purple-800 border-purple-200/60';
    if (cat === 'name') return 'bg-emerald-50 text-emerald-800 border-emerald-200/60';
    return 'bg-sky-50 text-sky-800 border-sky-200/60';
  };

  const sutraCount = allScriptures.filter(s => s.category === 'sutra').length;
  const mantraCount = allScriptures.filter(s => s.category === 'mantra').length;
  const nameCount = allScriptures.filter(s => s.category === 'name').length;

  return (
    <motion.div
      key="scripture"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="max-w-3xl mx-auto w-full space-y-5 pb-12"
    >
      {/* Top Header & Database Overview */}
      <div className="bg-white rounded-[32px] p-5 sm:p-7 shadow-sm border border-zen-accent/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-zen-accent/10 text-zen-accent flex items-center justify-center shrink-0">
                <Book className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-serif text-zen-ink">
                  佛教经文数据库
                </h2>
                <p className="text-xs text-zen-ink/60">
                  收录 {sutraCount} 部经典 · {mantraCount} 篇神咒 · {nameCount} 尊圣号 · 含原文、拼音与释义
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowPinyin(!showPinyin)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                showPinyin
                  ? "bg-amber-50 text-amber-900 border-amber-200"
                  : "bg-zen-bg/50 text-zen-ink/70 border-zen-accent/10 hover:bg-zen-bg"
              )}
              title="切换拼音显示"
            >
              {showPinyin ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showPinyin ? '显示拼音' : '隐藏拼音'}</span>
            </button>

            <button
              onClick={handleExportDB}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zen-bg/60 hover:bg-zen-bg text-zen-ink border border-zen-accent/10 transition-colors"
              title="导出完整经文数据库 (JSON)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">导出JSON</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zen-accent text-white rounded-xl text-xs font-bold shadow-xs hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>收录经文</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-zen-accent/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索经名、原文、拼音或释义（如：心经、金刚经、阿弥陀佛、五蕴）..."
            className="w-full bg-zen-bg/40 border border-zen-accent/15 rounded-2xl pl-10 pr-10 py-2.5 text-sm text-zen-ink placeholder:text-zen-ink/40 focus:outline-none focus:border-zen-accent/40 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zen-ink/40 hover:text-zen-ink rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: '全部收录' },
            { id: 'sutra', label: '常见经典' },
            { id: 'mantra', label: '真言神咒' },
            { id: 'name', label: '佛菩萨圣号' },
            { id: 'favorites', label: `我的收藏 (${favoriteIds.length})` },
            { id: 'custom', label: '自定义' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                selectedCategory === cat.id
                  ? "bg-zen-accent text-white border-zen-accent shadow-2xs"
                  : "bg-zen-bg/40 text-zen-ink/70 border-zen-accent/10 hover:bg-zen-bg"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add New Scripture Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-zen-accent/15 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base font-serif text-zen-ink">收录新经文 / 咒语</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-1.5 text-zen-ink/40 hover:text-zen-ink rounded-full hover:bg-zen-bg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sutra', label: '经典经文' },
                  { id: 'mantra', label: '真言神咒' },
                  { id: 'name', label: '佛菩萨圣号' },
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setNewCategory(type.id as any)}
                    className={cn(
                      "py-2 rounded-xl text-xs font-bold transition-colors border",
                      newCategory === type.id
                        ? "bg-zen-accent text-white border-zen-accent"
                        : "bg-zen-bg/50 text-zen-accent border-zen-accent/10 hover:border-zen-accent/30"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zen-accent/70 mb-1">
                    标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="如：药师琉璃光如来本愿经（节选）"
                    className="w-full bg-zen-bg/40 border border-zen-accent/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-zen-accent/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zen-accent/70 mb-1">
                    出处 / 译者（选填）
                  </label>
                  <input
                    type="text"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="如：唐·玄奘法师译"
                    className="w-full bg-zen-bg/40 border border-zen-accent/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-zen-accent/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zen-accent/70 mb-1">
                  原文 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="请输入经文、咒语或圣号原文..."
                  rows={4}
                  className="w-full bg-zen-bg/40 border border-zen-accent/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-zen-accent/40 resize-y"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zen-accent/70 mb-1">
                  拼音标注（选填）
                </label>
                <textarea
                  value={newPinyin}
                  onChange={(e) => setNewPinyin(e.target.value)}
                  placeholder="可填写汉语拼音或梵音注音，便于诵读..."
                  rows={2}
                  className="w-full bg-zen-bg/40 border border-zen-accent/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-zen-accent/40 resize-y"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zen-accent/70 mb-1">
                  简要解释（选填）
                </label>
                <textarea
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  placeholder="简要记录经文主旨、背景与修行受用..."
                  rows={2}
                  className="w-full bg-zen-bg/40 border border-zen-accent/15 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-zen-accent/40 resize-y"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-zen-bg text-zen-ink py-2.5 rounded-xl text-sm font-bold hover:bg-zen-accent/10 transition-colors"
                >
                  {t('cancel') || '取消'}
                </button>
                <button
                  onClick={handleAddSubmit}
                  disabled={!newTitle.trim() || !newContent.trim()}
                  className="flex-1 bg-zen-accent text-white py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {t('confirm_add') || '确认收录'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scripture Cards List */}
      {filteredScriptures.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center border border-zen-accent/10 shadow-xs">
          <BookOpen className="w-10 h-10 text-zen-accent/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-zen-ink/70">未找到匹配的经文记录</p>
          <p className="text-xs text-zen-ink/40 mt-1">可以尝试更改搜索词或切换上方分类筛选</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredScriptures.map((scripture) => {
            const isExpanded = expandedId === scripture.id;
            const isActive = activeScriptureId === scripture.id;
            const isFav = favoriteIds.includes(scripture.id);

            return (
              <div
                key={scripture.id}
                className={cn(
                  "bg-white rounded-[28px] shadow-sm border transition-all overflow-hidden",
                  isActive
                    ? "border-zen-accent ring-1 ring-zen-accent/20"
                    : "border-zen-accent/10 hover:border-zen-accent/25"
                )}
              >
                {/* Card Header (Click to expand/collapse) */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : scripture.id)}
                  className="p-5 sm:p-6 cursor-pointer select-none flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={cn(
                          "text-[10px] px-2.5 py-0.5 rounded-full font-bold border",
                          categoryStyle(scripture.category)
                        )}
                      >
                        {categoryLabel(scripture.category)}
                      </span>
                      {scripture.source && (
                        <span className="text-[11px] text-zen-ink/50 font-medium">
                          {scripture.source}
                        </span>
                      )}
                      {scripture.pinyin && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zen-bg text-zen-accent/80 font-semibold">
                          含拼音
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zen-accent text-white font-bold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          当前定课
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h3 className="font-serif font-bold text-base sm:text-lg text-zen-ink">
                        {scripture.title}
                      </h3>
                      {scripture.subtitle && (
                        <span className="text-xs text-zen-accent/60 font-serif">
                          {scripture.subtitle}
                        </span>
                      )}
                    </div>

                    {!isExpanded && (
                      <p className="text-xs text-zen-ink/60 mt-1.5 line-clamp-2 leading-relaxed">
                        {scripture.explanation || scripture.content}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleToggleFavorite(e, scripture.id)}
                      className={cn(
                        "p-2 rounded-full transition-colors",
                        isFav
                          ? "text-amber-500 bg-amber-50"
                          : "text-zen-ink/30 hover:text-amber-500 hover:bg-zen-bg"
                      )}
                      title={isFav ? '取消收藏' : '收藏经文'}
                    >
                      <Star className={cn("w-4 h-4", isFav && "fill-current")} />
                    </button>

                    {(scripture.id.startsWith('custom-') || scripture.isCustom) && (
                      pendingDeleteId === scripture.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              onDeleteCustomScripture(scripture.id);
                              setPendingDeleteId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 transition-colors"
                          >
                            确认删除
                          </button>
                          <button
                            onClick={() => setPendingDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-zen-bg text-zen-ink/70 text-[11px] font-bold hover:bg-zen-accent/10 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDeleteId(scripture.id);
                          }}
                          className="p-2 text-zen-ink/30 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="删除自定义经文"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}

                    <div className="p-2 text-zen-ink/40">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Scripture Detail: Original Text + Pinyin + Explanation */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-zen-accent/10 bg-[#FAF9F5]/60"
                    >
                      <div className="p-5 sm:p-6 space-y-5">
                        {/* Key Takeaway Chip */}
                        {scripture.keyTakeaway && (
                          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60">
                            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-950 leading-relaxed">
                              <span className="font-bold">修行心要：</span>
                              <span className="font-serif">{scripture.keyTakeaway}</span>
                            </div>
                          </div>
                        )}

                        {/* Original Text */}
                        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-zen-accent/10 shadow-2xs">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-zen-accent/70">
                              经文原文
                            </span>
                            {scripture.recommendedCount && (
                              <span className="text-[11px] text-zen-ink/50">
                                建议日诵：{scripture.recommendedCount} 遍
                              </span>
                            )}
                          </div>
                          <p className="text-base sm:text-lg text-zen-ink font-serif leading-loose whitespace-pre-wrap tracking-wide">
                            {scripture.content}
                          </p>
                        </div>

                        {/* Pinyin Section (if applicable and toggled on) */}
                        {showPinyin && scripture.pinyin && (
                          <div className="bg-white/90 rounded-2xl p-4 sm:p-5 border border-zen-accent/10">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-zen-accent/70 mb-2.5">
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>诵读拼音 / 注音</span>
                            </div>
                            <p className="text-xs sm:text-sm text-zen-ink/75 font-mono leading-loose whitespace-pre-wrap">
                              {scripture.pinyin}
                            </p>
                          </div>
                        )}

                        {/* Brief Explanation */}
                        {scripture.explanation && (
                          <div className="bg-emerald-50/40 rounded-2xl p-4 sm:p-5 border border-emerald-200/60">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-800 mb-2">
                              <Info className="w-3.5 h-3.5" />
                              <span>简要解释与受用</span>
                            </div>
                            <p className="text-xs sm:text-sm text-emerald-950/85 leading-relaxed">
                              {scripture.explanation}
                            </p>
                          </div>
                        )}

                        {/* Footer Actions */}
                        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                          <button
                            onClick={() => onSelectScripture(scripture, false)}
                            className={cn(
                              "px-4 py-2.5 rounded-xl text-xs font-bold transition-all border",
                              isActive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-white text-zen-ink border-zen-accent/15 hover:bg-zen-bg"
                            )}
                          >
                            {isActive ? '✓ 已设为当前诵持' : '设为诵持定课'}
                          </button>

                          <button
                            onClick={() => onSelectScripture(scripture, true)}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-zen-accent text-white shadow-xs hover:opacity-90 transition-opacity flex items-center gap-1.5"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>前往木鱼诵经</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
