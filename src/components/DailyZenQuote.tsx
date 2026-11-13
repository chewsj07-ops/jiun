import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, Copy, Check, Share2, Bell, X, Compass, Feather } from 'lucide-react';
import { safeStorage } from '../utils/safeStorage';

interface ZenQuote {
  id: number;
  quote: string;
  source: string;
  explanation: string;
  practiceTip: string;
}

const ZEN_QUOTES: ZenQuote[] = [
  {
    id: 1,
    quote: "若人欲了知，三世一切佛，应观法界性，一切唯心造。",
    source: "《华严经》",
    explanation: "万物境界皆由心生。心净则国土净，境随心转。",
    practiceTip: "今日行住坐卧，觉察内心的起心动念，不随境转。"
  },
  {
    id: 2,
    quote: "菩提本无树，明镜亦非台。本来无一物，何处惹尘埃。",
    source: "六祖慧能大师",
    explanation: "自性清净无染，无需刻意执着扫除，识自本心即可解脱。",
    practiceTip: "遇到不顺意之事时，深呼吸三次，观照烦恼本空。"
  },
  {
    id: 3,
    quote: "照见五蕴皆空，度一切苦厄。",
    source: "《般若波罗蜜多心经》",
    explanation: "洞悉色受想行识皆是因缘和合而生，不执著幻相，痛苦自消。",
    practiceTip: "在情绪升起时，默默对自己说：这也是因缘生灭，无常迁流。"
  },
  {
    id: 4,
    quote: "吾心似秋月，碧潭清皎洁。无物堪比伦，教我如何说。",
    source: "唐·寒山子",
    explanation: "明心见性时的安宁与澄澈，如同秋夜清辉倒映寒潭，言语道断。",
    practiceTip: "禅修坐定中，放下对错思量，任心月孤明。"
  },
  {
    id: 5,
    quote: "行亦禅，坐亦禅，语默动静体安然。",
    source: "永嘉玄觉禅师《证道歌》",
    explanation: "禅不在形式，穿衣吃饭、开口静默处处皆是道场。",
    practiceTip: "吃饭时专心吃饭，行走时留心脚下每一步接触大地的触感。"
  },
  {
    id: 6,
    quote: "物忌全胜，事忌全美，人忌全盛。留有余地，方见从容。",
    source: "弘一法师格言",
    explanation: "知止与谦逊是护持福德的要诀，圆满不必求全。",
    practiceTip: "今天说话做事留三分余地，待人宽容，退步原来是向前。"
  },
  {
    id: 7,
    quote: "应无所住而生其心。",
    source: "《金刚经》",
    explanation: "做事尽心尽力，但不执着于结果与赞毁，心无挂碍。",
    practiceTip: "尽本分做好手头事，对赞叹不狂喜，对批评不怀嗔。"
  },
  {
    id: 8,
    quote: "自依止，法依止，莫异依止。",
    source: "《长阿含经》",
    explanation: "皈依自性与正法，做自己的明灯，不向外盲从攀缘。",
    practiceTip: "回归内在的安稳，相信内在具足的自性清净。"
  }
];

export const DailyZenQuote: React.FC<{ variant?: 'mist' | 'card' }> = ({ variant = 'card' }) => {
  // Determine daily index based on calendar day
  const getDayIndex = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear % ZEN_QUOTES.length;
  };

  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = safeStorage.getItem('zen_quote_idx');
    return saved !== null ? parseInt(saved, 10) % ZEN_QUOTES.length : getDayIndex();
  });

  const [copied, setCopied] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(() => {
    return safeStorage.getItem('zen_quote_notification') === 'true';
  });

  const currentQuote = ZEN_QUOTES[currentIndex];

  const handleNext = () => {
    const next = (currentIndex + 1) % ZEN_QUOTES.length;
    setCurrentIndex(next);
    safeStorage.setItem('zen_quote_idx', next.toString());
  };

  const handleCopy = () => {
    const text = `【每日禅语】\n"${currentQuote.quote}"\n—— ${currentQuote.source}\n\n💡 领悟：${currentQuote.explanation}\n🌱 今日践行：${currentQuote.practiceTip}\n（来自 愿禅助手 Vowzen）`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleDailyNotification = async () => {
    if (!notificationEnabled) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotificationEnabled(true);
          safeStorage.setItem('zen_quote_notification', 'true');
          new Notification('愿禅助手 · 正念提醒已开启', {
            body: `今日禅语："${currentQuote.quote}"`,
            icon: '/assets/aistudio/logo_f2d0c65b.png'
          });
        }
      }
    } else {
      setNotificationEnabled(false);
      safeStorage.setItem('zen_quote_notification', 'false');
    }
  };

  return (
    <>
      {variant === 'mist' ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center text-center"
        >
          <p className="font-serif font-medium text-[21px] sm:text-[25px] leading-[1.55] text-ink max-w-[18em] mx-auto text-balance">
            {currentQuote.quote}
          </p>
          <p className="text-caption mt-2.5">
            —— {currentQuote.source}
          </p>
          <div className="mt-2 flex items-center justify-center gap-3 opacity-55 hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleNext}
              title="换一句"
              className="p-1.5 rounded-full text-ink-2 hover:text-accent transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              title="复制禅语"
              className="p-1.5 rounded-full text-ink-2 hover:text-accent transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setShowCardModal(true)}
              title="查看释义与分享"
              className="p-1.5 rounded-full text-ink-2 hover:text-accent transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-surface p-6 border border-line transition-colors">
          {/* Subtle decorative lotus/zen background watermark */}
          <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-accent-mist/60 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-4 right-4 text-accent/10 pointer-events-none select-none">
            <Feather className="w-16 h-16 opacity-30" />
          </div>

          {/* Top Header */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-mist text-accent">
                <Compass className="w-4 h-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest text-ink-2">
                每日禅语 · 正念微省
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleNext}
                title="换一句领悟"
                className="p-1.5 rounded-xl text-ink-3 hover:text-accent hover:bg-accent-mist transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopy}
                title="复制禅语"
                className="p-1.5 rounded-xl text-ink-3 hover:text-accent hover:bg-accent-mist transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowCardModal(true)}
                title="分享禅卡"
                className="p-1.5 rounded-xl text-ink-3 hover:text-accent hover:bg-accent-mist transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Quote Content */}
          <div className="relative z-10 space-y-3">
            <p className="text-title text-ink leading-relaxed tracking-wide">
              “{currentQuote.quote}”
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-serif text-accent tracking-wider">
                —— {currentQuote.source}
              </span>
              <button
                onClick={toggleDailyNotification}
                className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                  notificationEnabled 
                    ? 'bg-accent text-on-accent' 
                    : 'bg-accent-mist text-accent hover:bg-surface-2'
                }`}
              >
                <Bell className="w-3 h-3" />
                <span>{notificationEnabled ? '每日提醒中' : '开启晨起正念'}</span>
              </button>
            </div>

            {/* Practice Reflection Note */}
            <div className="mt-3 pt-3 border-t border-line text-xs text-ink-2 leading-relaxed bg-surface-2 p-3 rounded-2xl">
              <span className="font-bold text-accent">今日践行：</span>
              <span>{currentQuote.practiceTip}</span>
            </div>
          </div>
        </div>
      )}

      {/* Zen Card Share Modal */}
      <AnimatePresence>
        {showCardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="relative w-full max-w-sm rounded-3xl bg-surface p-8 shadow-float border border-line text-center"
            >
              <button
                onClick={() => setShowCardModal(false)}
                className="absolute top-4 right-4 p-2 text-ink-3 hover:text-ink rounded-full"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 bg-accent text-on-accent rounded-full flex items-center justify-center mx-auto mb-6 font-serif text-xl font-bold">
                愿
              </div>

              <div className="border-t border-b border-line py-6 my-4">
                <p className="text-title text-ink leading-loose tracking-wider">
                  {currentQuote.quote}
                </p>
                <p className="mt-4 font-serif text-sm text-accent">
                  —— {currentQuote.source}
                </p>
              </div>

              <p className="text-xs text-ink-2 leading-relaxed mb-6">
                {currentQuote.explanation}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 bg-accent hover:bg-accent-hover text-on-accent py-3 rounded-2xl text-xs font-bold transition-colors"
                >
                  {copied ? '已复制到剪贴板' : '复制禅语文字'}
                </button>
                <button
                  onClick={() => setShowCardModal(false)}
                  className="px-4 py-3 bg-surface-2 border border-line text-ink rounded-2xl text-xs font-medium hover:bg-accent-mist transition-colors"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
