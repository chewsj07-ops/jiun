import React, { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Loader2, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from '../i18n';
import { sendZenAssistantMessage } from '../services/aiPracticeService';
import { practiceService } from '../services/practiceService';
import { containsSafetyPauseKeywords } from '../data/offlineGuidance';
import { SafetyNetCard } from './vow/SafetyNetCard';

interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const STARTER_TOPICS = [
  '静坐总走神怎么办？',
  '越修越急，总觉得没进步',
  '打坐时看到光影或有感应',
  '如何把修行带进工作和家庭？',
];

export const ZenAssistant: React.FC<{
  user?: any;
  onLevelUp?: (msg: string) => void;
}> = () => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSafetyAlert, setShowSafetyAlert] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('zen_assistant_history');
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('zen_assistant_history', JSON.stringify(messages));
    } catch {
      // ignore storage quota errors
    }
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showSafetyAlert]);

  const sendMessageText = async (rawText: string) => {
    const userMsg = rawText.trim();
    if (!userMsg || isLoading) return;

    setInput('');
    const now = new Date().toLocaleString();
    const updatedHistory: AssistantMessage[] = [
      ...messages,
      { role: 'user', content: userMsg, timestamp: now },
    ];
    setMessages(updatedHistory);

    // Principle #6 (Highest Priority): Physical & mental safety first
    if (containsSafetyPauseKeywords(userMsg)) {
      setShowSafetyAlert(true);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '先谢谢你愿意把这些告诉我。遇到持续恐慌、失眠、创伤记忆涌现、幻觉或想伤害自己的念头时，**请先暂停打坐和禅修练习**。\n\n这些情况**不是「业障」也不是「修行进步」**，禅修不能代替医疗。请尽快联系医生、心理专业人士，或拨打下方当地支持热线，让自己先被稳稳接住。',
          timestamp: new Date().toLocaleString(),
        },
      ]);
      return;
    }

    setShowSafetyAlert(false);
    const settings = practiceService.getSettings();
    if (!settings.aiEnabled) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '愿禅助手的 AI 对话陪伴当前未开启。你可以前往「设置 › 愿禅助手 AI 陪伴」打开开关，随时回来聊聊。',
          timestamp: new Date().toLocaleString(),
        },
      ]);
      return;
    }

    setIsLoading(true);
    try {
      const replyText = await sendZenAssistantMessage({
        message: userMsg,
        history: messages,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            replyText.trim() ||
            '刚才网络稍微走神了。你可以先慢下来做三次深呼吸，再把想说的话发给我一次。',
          timestamp: new Date().toLocaleString(),
        },
      ]);
    } catch (error) {
      console.error('ZenAssistant error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: t('zen_master_error'),
          timestamp: new Date().toLocaleString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[520px] bg-surface rounded-2xl border border-line overflow-hidden">
      <div className="p-4 border-b border-line bg-surface-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-accent shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ink truncate">
              愿禅助手
            </h3>
            <p className="text-[11px] text-ink-3 truncate">
              温和、踏实的修行陪伴 · 走稳中道，不盲修
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setShowSafetyAlert(false);
            }}
            className="text-xs text-ink-3 hover:text-ink transition-colors shrink-0"
          >
            清空记录
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="py-6 space-y-5">
            <div className="text-center px-4 space-y-2">
              <p className="text-sm text-ink leading-relaxed">
                合十。我是愿禅助手，一个陪你踏实修行的同伴。
              </p>
              <p className="text-xs text-ink-2 leading-relaxed">
                打坐坐不住、念经起烦恼，或遇到境界与取舍困惑，都可以说说。修行不在追求玄妙，而在安稳地用在生活里。
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 px-2">
              {STARTER_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => sendMessageText(topic)}
                  className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-accent-mist border border-line text-xs text-ink-2 hover:text-accent transition-colors text-left"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent text-on-accent'
                  : 'bg-surface-2 text-ink border border-line'
              }`}
            >
              <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:my-1.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
            <span className="text-[10px] text-ink-3 mt-1 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {showSafetyAlert && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-accent px-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>身心安全第一：建议先暂停禅修并寻求专业支持</span>
            </div>
            <SafetyNetCard
              onMeditate={() =>
                window.dispatchEvent(
                  new CustomEvent('open-meditation-preset', {
                    detail: { duration: 3 },
                  })
                )
              }
            />
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-2 p-3 rounded-2xl border border-line">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            </div>
          </div>
        )}
        <div ref={scrollEndRef} />
      </div>

      <div className="p-3.5 border-t border-line flex gap-2 bg-surface">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              sendMessageText(input);
            }
          }}
          placeholder={t('ask_zen_master')}
          className="flex-1 bg-surface-2 border border-line rounded-full px-4 py-2 text-sm text-ink placeholder:text-ink-3 focus:ring-1 focus:ring-accent outline-none"
        />
        <button
          type="button"
          onClick={() => sendMessageText(input)}
          disabled={isLoading || !input.trim()}
          aria-label="发送"
          className="bg-accent hover:bg-accent-hover text-on-accent p-2.5 rounded-full transition-colors disabled:opacity-45"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
