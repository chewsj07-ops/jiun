import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import {
  Check,
  GripVertical,
  Minus,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Scripture } from '../constants';
import { DailyPracticeItem } from '../types/practice';
import {
  getDefaultTargetForCategory,
  getDefaultUnitForCategory,
} from '../services/practiceService';
import { matchesScriptureQuery } from '../utils/pinyinSearch';
import { cn } from '../lib/utils';

type CategoryTab = 'sutra' | 'mantra' | 'name' | 'custom';

const CATEGORY_TABS: { id: CategoryTab; label: string }[] = [
  { id: 'sutra', label: '经典' },
  { id: 'mantra', label: '持咒' },
  { id: 'name', label: '圣号' },
  { id: 'custom', label: '自定义' },
];

interface ScripturePickerSheetProps {
  isOpen: boolean;
  mode?: 'select' | 'add';
  activeScriptureId: string;
  allScriptures: Scripture[];
  dailyPractice: DailyPracticeItem[];
  dailyCounts: Record<string, number>;
  recentIds: string[];
  onClose: () => void;
  onSelect: (scripture: Scripture) => void;
  onLongPressScripture?: (scripture: Scripture) => void;
}

export const ScripturePickerSheet: React.FC<ScripturePickerSheetProps> = ({
  isOpen,
  mode = 'select',
  activeScriptureId,
  allScriptures,
  dailyPractice,
  dailyCounts,
  recentIds,
  onClose,
  onSelect,
  onLongPressScripture,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryTab>('sutra');

  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const practiceScriptures = useMemo(
    () => allScriptures.filter((s) => s.category !== 'meditation'),
    [allScriptures]
  );

  const scriptureById = useMemo(() => {
    const map = new Map<string, Scripture>();
    practiceScriptures.forEach((s) => map.set(s.id, s));
    return map;
  }, [practiceScriptures]);

  const enabledDailyItems = useMemo(() => {
    return dailyPractice
      .filter((item) => item.enabled && scriptureById.has(item.scriptureId))
      .sort((a, b) => a.order - b.order);
  }, [dailyPractice, scriptureById]);

  const recentScriptures = useMemo(() => {
    return recentIds
      .map((id) => scriptureById.get(id))
      .filter((s): s is Scripture => Boolean(s))
      .slice(0, 5);
  }, [recentIds, scriptureById]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return practiceScriptures.filter((s) =>
      matchesScriptureQuery(query, s.title, s.subtitle, s.source)
    );
  }, [practiceScriptures, query]);

  const categoryScriptures = useMemo(() => {
    if (selectedCategory === 'custom') {
      return practiceScriptures.filter((s) => Boolean(s.isCustom));
    }
    return practiceScriptures.filter(
      (s) => !s.isCustom && s.category === selectedCategory
    );
  }, [practiceScriptures, selectedCategory]);

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleRowPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    scripture: Scripture
  ) => {
    if (mode !== 'select' || !onLongPressScripture) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    longPressFiredRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      navigator.vibrate?.(10);
      onLongPressScripture(scripture);
      longPressTimerRef.current = null;
    }, 500);
  };

  const handleRowPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pointerStartRef.current || longPressTimerRef.current === null) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    if (dx > 10 || dy > 10) {
      clearLongPress();
    }
  };

  const handleRowClick = (scripture: Scripture) => {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    onSelect(scripture);
  };

  const renderScriptureRow = (
    scripture: Scripture,
    rightSlot?: React.ReactNode,
    keyPrefix = 'all'
  ) => {
    const isActive = mode === 'select' && scripture.id === activeScriptureId;
    return (
      <button
        key={`${keyPrefix}-${scripture.id}`}
        type="button"
        onPointerDown={(e) => handleRowPointerDown(e, scripture)}
        onPointerMove={handleRowPointerMove}
        onPointerUp={clearLongPress}
        onPointerCancel={clearLongPress}
        onClick={() => handleRowClick(scripture)}
        onContextMenu={(e) => {
          if (mode === 'select' && onLongPressScripture) {
            e.preventDefault();
          }
        }}
        className={cn(
          'w-full px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors select-none',
          isActive
            ? 'bg-accent-mist text-accent font-medium'
            : 'hover:bg-surface-2 text-ink'
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm truncate">{scripture.title}</p>
          {scripture.source && (
            <p className="text-xs text-ink-3 truncate mt-0.5">{scripture.source}</p>
          )}
        </div>
        {rightSlot}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[75] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-2xl rounded-t-3xl bg-surface border-t border-line shadow-float flex flex-col max-h-[85dvh] pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="w-10 h-1 rounded-full bg-line-strong mx-auto mt-3 mb-2 shrink-0" />

            <div className="px-5 pb-3 flex items-center justify-between gap-3 shrink-0">
              <h3 className="text-title text-ink">
                {mode === 'add' ? '加入定课' : '选择经文'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭"
                className="w-9 h-9 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Search bar */}
            <div className="px-5 pb-3 shrink-0">
              <div className="h-11 rounded-xl bg-surface-2 px-3.5 flex items-center gap-2.5 border border-line focus-within:border-accent transition-colors">
                <Search size={16} strokeWidth={1.5} className="text-ink-3 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索经名或拼音首字母（如 xj、dbz）"
                  className="w-full bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="清除搜索"
                    className="text-ink-3 hover:text-ink"
                  >
                    <X size={14} strokeWidth={1.5} />
                  </button>
                )}
              </div>
              {mode === 'select' && (
                <p className="text-[11px] text-ink-3 mt-1.5 px-1">
                  轻点立即切换 · 长按可设定该经定课次数
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
              {query.trim() ? (
                <div className="space-y-1">
                  {searchResults.length === 0 ? (
                    <p className="text-caption text-center py-10">
                      未找到匹配的经文或佛号
                    </p>
                  ) : (
                    searchResults.map((s) => renderScriptureRow(s, null, 'search'))
                  )}
                </div>
              ) : (
                <>
                  {/* Group 1: 我的定课 (shown in select mode) */}
                  {mode === 'select' && enabledDailyItems.length > 0 && (
                    <section className="space-y-1.5">
                      <div className="px-2 text-caption font-medium text-ink-3">
                        我的定课
                      </div>
                      <div className="space-y-1">
                        {enabledDailyItems.map((item) => {
                          const scripture = scriptureById.get(item.scriptureId);
                          if (!scripture) return null;
                          const doneCount = dailyCounts[item.scriptureId] || 0;
                          const isCompleted = doneCount >= item.target;

                          return renderScriptureRow(
                            scripture,
                            isCompleted ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-accent shrink-0">
                                <Check size={14} strokeWidth={2} />
                                <span>圆满</span>
                              </span>
                            ) : (
                              <span className="text-caption tabular-nums shrink-0">
                                {doneCount} / {item.target} {item.unit}
                              </span>
                            ),
                            'daily'
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Group 2: 最近念过 (up to 5, shown in select mode) */}
                  {mode === 'select' && recentScriptures.length > 0 && (
                    <section className="space-y-1.5">
                      <div className="px-2 text-caption font-medium text-ink-3">
                        最近念过
                      </div>
                      <div className="space-y-1">
                        {recentScriptures.map((s) =>
                          renderScriptureRow(s, null, 'recent')
                        )}
                      </div>
                    </section>
                  )}

                  {/* Group 3: 全部 with horizontally scrollable category pills */}
                  <section className="space-y-2.5">
                    {mode === 'select' && (
                      <div className="px-2 text-caption font-medium text-ink-3">
                        全部
                      </div>
                    )}

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {CATEGORY_TABS.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={cn(
                              'h-9 px-4 rounded-full text-sm shrink-0 transition-colors border',
                              isSelected
                                ? 'bg-accent-mist text-accent border-transparent font-medium'
                                : 'border-line text-ink-2 hover:text-ink'
                            )}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-1">
                      {categoryScriptures.length === 0 ? (
                        <p className="text-caption text-center py-8">
                          {selectedCategory === 'custom'
                            ? '暂无自定义经文，可在「经藏」右上角添加'
                            : '此分类暂无内容'}
                        </p>
                      ) : (
                        categoryScriptures.map((s) => {
                          const existing = dailyPractice.find(
                            (d) => d.scriptureId === s.id
                          );
                          return renderScriptureRow(
                            s,
                            mode === 'add' && existing ? (
                              <span className="text-caption text-accent shrink-0">
                                已在定课中
                              </span>
                            ) : null,
                            'all'
                          );
                        })
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface DraggablePracticeRowProps {
  item: DailyPracticeItem;
  scripture: Scripture;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleEnabled: () => void;
  onUpdateItem: (patch: Partial<DailyPracticeItem>) => void;
  onRemove: () => void;
}

const DraggablePracticeRow: React.FC<DraggablePracticeRowProps> = ({
  item,
  scripture,
  isEditing,
  onToggleEdit,
  onToggleEnabled,
  onUpdateItem,
  onRemove,
}) => {
  const dragControls = useDragControls();
  const quickPresets =
    scripture.category === 'sutra' ? [1, 3, 7, 21] : [21, 49, 108, 1080];

  const handleNumberChange = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      onUpdateItem({ target: 1 });
      return;
    }
    onUpdateItem({ target: Math.min(100000, Math.max(1, parsed)) });
  };

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      className="bg-surface-2 border border-line rounded-2xl overflow-hidden"
    >
      <div className="px-3.5 py-3 flex items-center gap-2.5">
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          aria-label="拖动排序"
          className="p-1.5 text-ink-3 hover:text-ink cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <GripVertical size={18} strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={onToggleEdit}
          className="flex-1 min-w-0 text-left py-0.5"
        >
          <div className="text-title !text-[17px] text-ink truncate">
            {scripture.title}
          </div>
          <div className="text-caption mt-0.5">
            目标 {item.target} {item.unit} · 轻点修改
          </div>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={item.enabled}
          aria-label={`启用${scripture.title}定课`}
          onClick={onToggleEnabled}
          className={cn(
            'w-11 h-6 rounded-full transition-colors relative shrink-0',
            item.enabled ? 'bg-accent' : 'bg-line-strong'
          )}
        >
          <span
            className={cn(
              'block w-5 h-5 rounded-full bg-surface shadow-sm transition-transform duration-200',
              item.enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
            )}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-surface"
          >
            <div className="p-4 space-y-4">
              {/* Quick presets */}
              <div className="flex flex-wrap gap-2">
                {quickPresets.map((preset) => {
                  const isSelected = item.target === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onUpdateItem({ target: preset })}
                      className={cn(
                        'h-9 px-3.5 rounded-full text-sm border transition-colors tabular-nums',
                        isSelected
                          ? 'bg-accent-mist text-accent border-transparent font-medium'
                          : 'border-line text-ink-2 hover:text-ink'
                      )}
                    >
                      {preset} {item.unit}
                    </button>
                  );
                })}
              </div>

              {/* Custom stepper + numeric input + unit switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="减少"
                    onClick={() =>
                      onUpdateItem({ target: Math.max(1, item.target - 1) })
                    }
                    className="w-9 h-9 rounded-full bg-surface-2 border border-line flex items-center justify-center text-ink-2 hover:text-ink"
                  >
                    <Minus size={15} strokeWidth={1.5} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={item.target}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    className="w-24 h-9 text-center rounded-xl bg-surface-2 border border-line text-sm font-medium text-ink tabular-nums focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    aria-label="增加"
                    onClick={() =>
                      onUpdateItem({ target: Math.min(100000, item.target + 1) })
                    }
                    className="w-9 h-9 rounded-full bg-surface-2 border border-line flex items-center justify-center text-ink-2 hover:text-ink"
                  >
                    <Plus size={15} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Unit toggle: 遍 / 声 */}
                <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-full border border-line">
                  {(['遍', '声'] as const).map((unitOpt) => (
                    <button
                      key={unitOpt}
                      type="button"
                      onClick={() => onUpdateItem({ unit: unitOpt })}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs transition-colors',
                        item.unit === unitOpt
                          ? 'bg-surface text-accent font-medium shadow-sm'
                          : 'text-ink-2 hover:text-ink'
                      )}
                    >
                      {unitOpt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={onRemove}
                  className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink transition-colors"
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                  <span>移出定课</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleEdit}
                  className="px-4 h-8 rounded-full bg-accent text-on-accent text-xs font-medium"
                >
                  完成
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
};

interface DailyPracticeSettingsSheetProps {
  isOpen: boolean;
  focusScriptureId?: string | null;
  allScriptures: Scripture[];
  dailyPractice: DailyPracticeItem[];
  onClose: () => void;
  onChangeDailyPractice: (items: DailyPracticeItem[]) => void;
  onOpenAddPicker: () => void;
}

export const DailyPracticeSettingsSheet: React.FC<
  DailyPracticeSettingsSheetProps
> = ({
  isOpen,
  focusScriptureId,
  allScriptures,
  dailyPractice,
  onClose,
  onChangeDailyPractice,
  onOpenAddPicker,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const scriptureById = useMemo(() => {
    const map = new Map<string, Scripture>();
    allScriptures.forEach((s) => map.set(s.id, s));
    return map;
  }, [allScriptures]);

  // When opened via long-press on a scripture, ensure it's present & focused for editing
  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      return;
    }
    if (focusScriptureId) {
      const existing = dailyPractice.find(
        (item) => item.scriptureId === focusScriptureId
      );
      if (!existing) {
        const sc = scriptureById.get(focusScriptureId);
        const newItem: DailyPracticeItem = {
          scriptureId: focusScriptureId,
          target: getDefaultTargetForCategory(sc?.category),
          unit: getDefaultUnitForCategory(sc?.category),
          order: dailyPractice.length,
          enabled: true,
        };
        onChangeDailyPractice([...dailyPractice, newItem]);
      }
      setEditingId(focusScriptureId);
    }
  }, [isOpen, focusScriptureId]);

  const handleReorder = (newOrder: DailyPracticeItem[]) => {
    onChangeDailyPractice(
      newOrder.map((item, idx) => ({ ...item, order: idx }))
    );
  };

  const updateItem = (scriptureId: string, patch: Partial<DailyPracticeItem>) => {
    onChangeDailyPractice(
      dailyPractice.map((item) =>
        item.scriptureId === scriptureId ? { ...item, ...patch } : item
      )
    );
  };

  const removeItem = (scriptureId: string) => {
    onChangeDailyPractice(
      dailyPractice
        .filter((item) => item.scriptureId !== scriptureId)
        .map((item, idx) => ({ ...item, order: idx }))
    );
    if (editingId === scriptureId) {
      setEditingId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[75] flex items-end justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-2xl rounded-t-3xl bg-surface border-t border-line shadow-float flex flex-col max-h-[85dvh] pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="w-10 h-1 rounded-full bg-line-strong mx-auto mt-3 mb-2 shrink-0" />

            <div className="px-5 pb-3 border-b border-line flex items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-title text-ink">定课设定</h3>
                <p className="text-caption mt-0.5">
                  可单独设定目标与单位，长按左侧把手拖动排序
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭"
                className="w-9 h-9 rounded-full flex items-center justify-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {dailyPractice.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-sm text-ink-2">还没有设定我的定课</p>
                  <p className="text-caption">
                    点击下方按钮，将常诵的经文或佛号加入每日定课
                  </p>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={dailyPractice}
                  onReorder={handleReorder}
                  className="space-y-2.5"
                >
                  {dailyPractice.map((item) => {
                    const scripture = scriptureById.get(item.scriptureId);
                    if (!scripture) return null;
                    return (
                      <DraggablePracticeRow
                        key={item.scriptureId}
                        item={item}
                        scripture={scripture}
                        isEditing={editingId === item.scriptureId}
                        onToggleEdit={() =>
                          setEditingId((prev) =>
                            prev === item.scriptureId ? null : item.scriptureId
                          )
                        }
                        onToggleEnabled={() =>
                          updateItem(item.scriptureId, {
                            enabled: !item.enabled,
                          })
                        }
                        onUpdateItem={(patch) =>
                          updateItem(item.scriptureId, patch)
                        }
                        onRemove={() => removeItem(item.scriptureId)}
                      />
                    );
                  })}
                </Reorder.Group>
              )}
            </div>

            <div className="px-5 pt-3 border-t border-line bg-surface shrink-0">
              <button
                type="button"
                onClick={onOpenAddPicker}
                className="w-full h-12 rounded-full bg-accent hover:bg-accent-hover text-on-accent text-sm font-medium transition-colors"
              >
                ＋ 加入定课
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
