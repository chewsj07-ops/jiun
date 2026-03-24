import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Howl } from 'howler';
import { db, auth } from '../../firebase';
import { doc, setDoc, collection } from 'firebase/firestore';

// Unified Style Constants
const containerClass = "h-screen flex flex-col items-center justify-center p-8 bg-[#fdfcf8] text-[#3d3d3d]";
const intenseContainerClass = "h-screen flex flex-col items-center justify-center p-8 bg-[#1a1a1a] text-[#e0e0e0]";
const headingClass = "text-3xl font-serif font-medium mb-10";
const buttonClass = "w-full max-w-sm py-5 bg-[#5A5A40] text-white rounded-3xl font-medium hover:bg-[#4a4a35] transition-all shadow-lg";
const secondaryButtonClass = "w-full max-w-sm py-5 border border-[#5A5A40] text-[#5A5A40] rounded-3xl font-medium hover:bg-[#5A5A40]/5 transition-all";

// 1. 【明镜台】 (The Mirror)
const HomeBlock = ({ onNext }: { onNext: () => void }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={containerClass}>
    <h1 className="text-4xl font-serif font-light mb-3">VowZen</h1>
    <p className="text-sm text-[#8a8a7a] mb-20 tracking-[0.2em] uppercase">先安住，再前行</p>
    <div className="grid grid-cols-2 gap-5 w-full max-w-sm mb-16">
      {['平静一下', '有点压力', '很混乱', '很累'].map(s => (
        <button key={s} className="p-7 bg-white rounded-[2rem] shadow-sm border border-[#5A5A40]/5 hover:border-[#5A5A40]/20 transition-all">{s}</button>
      ))}
    </div>
    <button onClick={onNext} className={buttonClass}>开始 3 分钟安住</button>
  </motion.div>
);

// 2. 【轻体验】 (Light Experience)
const LightExperienceBlock = ({ onNext }: { onNext: () => void }) => (
  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className={containerClass}>
    <p className="text-2xl font-serif italic mb-16 px-6 leading-relaxed">「不用改变什么，先陪自己一口气。」</p>
    <textarea className="w-full max-w-sm h-40 p-8 rounded-[2rem] border border-[#5A5A40]/10 bg-white mb-16 focus:ring-2 focus:ring-[#5A5A40]/10 outline-none shadow-inner" placeholder="此刻，你心里最真实的一句话是？" />
    <button onClick={onNext} className={buttonClass}>继续</button>
  </motion.div>
);

// 3. 【转折页】 (Turning Point)
const TurningPointBlock = ({ onNext, onFilter }: { onNext: () => void, onFilter: () => void }) => (
  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className={containerClass + " text-center"}>
    <p className="text-xl mb-20 leading-relaxed font-serif px-4">「很多人来到这里，只是想轻松一下。<br/>但也有人，从这里开始改变人生的方向。」</p>
    <button onClick={onNext} className={secondaryButtonClass + " mb-6"}>继续放松</button>
    <button onClick={onFilter} className={buttonClass}>🌱 我想更了解自己</button>
  </motion.div>
);

// 4. 【觉醒漏斗】 (Awakening Funnel)
const AwakeningFunnelBlock = ({ onNext }: { onNext: () => void }) => (
  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={intenseContainerClass + " text-center"}>
    <p className="text-xl mb-10 font-serif opacity-90">「你现在的状态，不是偶然，是你过去的因。」</p>
    <p className="text-xl mb-20 font-serif opacity-90">「如果不改变因，人生只会重复。」</p>
    <button onClick={onNext} className="w-full max-w-sm py-5 bg-[#8b3a3a] text-white rounded-3xl font-medium hover:bg-[#7a3232] transition-all shadow-lg">🔥 面对</button>
  </motion.div>
);

// 5. 【发愿系统】 (Vow System)
const VowSystemBlock = ({ onNext, setVowText }: { onNext: () => void, setVowText: (text: string) => void }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={containerClass}>
    <h2 className={headingClass}>写下你的愿</h2>
    <textarea 
      className="w-full max-w-sm h-48 p-8 rounded-[2rem] border border-[#5A5A40]/10 bg-white mb-16 focus:ring-2 focus:ring-[#5A5A40]/10 outline-none shadow-inner" 
      placeholder="不求好命，只修好因。" 
      onChange={(e) => setVowText(e.target.value)}
    />
    <button onClick={onNext} className={buttonClass}>我愿意为此负责</button>
  </motion.div>
);

// 6. 【修行工具页】 (Practice Tools)
const PracticeToolsBlock = ({ onNext }: { onNext: () => void }) => {
  const [phase, setPhase] = useState('吸气');
  const [scale, setScale] = useState(1);

  React.useEffect(() => {
    // Initialize Howl with a placeholder meditation audio
    const sound = new Howl({
      src: ['https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg'], // Placeholder audio
      loop: true,
      volume: 0.5,
    });
    sound.play();

    const startTime = Date.now();
    const interval = setInterval(() => {
      const t = Math.floor((Date.now() - startTime) / 1000) % 19;
      
      let newPhase = '吸气';
      if (t < 4) newPhase = '吸气';
      else if (t < 11) newPhase = '屏息';
      else newPhase = '呼气';
      setPhase(newPhase);

      let newScale = 1;
      if (t < 4) newScale = 1 + (t / 4) * 0.5;
      else if (t < 11) newScale = 1.5;
      else newScale = 1.5 - ((t - 11) / 8) * 0.5;
      setScale(newScale);
      
      console.log(`Breathing Debug: t=${t}, phase=${newPhase}, scale=${newScale}`);
    }, 100);
    return () => {
      clearInterval(interval);
      sound.stop();
    };
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={containerClass}>
      <h2 className="text-4xl font-serif font-light mb-16">
        {phase}
      </h2>
      <motion.div 
        animate={{ scale: scale }}
        transition={{ duration: 0.1, ease: "linear" }}
        className="w-32 h-32 bg-[#5A5A40]/10 rounded-full mb-20"
      />
      <button onClick={onNext} className={buttonClass}>完成修行</button>
    </motion.div>
  );
};


// 7. 【复盘系统】 (Reflection)
const ReflectionBlock = ({ onFinish, vowId }: { onFinish: () => void, vowId: string }) => {
  const [reflection, setReflection] = useState('');

  const saveReflection = async () => {
    if (!auth.currentUser) return;
    const sessionId = Date.now().toString();
    await setDoc(doc(db, 'sessions', sessionId), {
      sessionId,
      vowId,
      duration: 10,
      actualDuration: 10,
      isCompleted: true,
      reflection
    });
    onFinish();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={containerClass}>
      <h2 className={headingClass}>今日复盘</h2>
      <p className="mb-12 text-[#5A5A40] font-serif">「今天，你有没有更接近你的愿？」</p>
      <textarea 
        className="w-full max-w-sm h-48 p-8 rounded-[2rem] border border-[#5A5A40]/10 bg-white mb-16 focus:ring-2 focus:ring-[#5A5A40]/10 outline-none shadow-inner" 
        placeholder="做到了什么，没做到什么，一句觉察..." 
        onChange={(e) => setReflection(e.target.value)}
      />
      <button onClick={saveReflection} className={buttonClass}>结束并记录因果</button>
    </motion.div>
  );
};

export const VowZenApp = () => {
  const [block, setBlock] = useState(1);
  const [vowText, setVowText] = useState('');
  const [currentVowId, setCurrentVowId] = useState('');

  const saveVow = async () => {
    if (!auth.currentUser) return;
    const vowId = Date.now().toString();
    setCurrentVowId(vowId);
    await setDoc(doc(db, 'vows', vowId), {
      vowId,
      userId: auth.currentUser.uid,
      vowText,
      target: 'self',
      status: 'active'
    });
    setBlock(6);
  };

  return (
    <AnimatePresence mode="wait">
      {block === 1 && <HomeBlock key="1" onNext={() => setBlock(2)} />}
      {block === 2 && <LightExperienceBlock key="2" onNext={() => setBlock(3)} />}
      {block === 3 && <TurningPointBlock key="3" onNext={() => setBlock(1)} onFilter={() => setBlock(4)} />}
      {block === 4 && <AwakeningFunnelBlock key="4" onNext={() => setBlock(5)} />}
      {block === 5 && <VowSystemBlock key="5" onNext={saveVow} setVowText={setVowText} />}
      {block === 6 && <PracticeToolsBlock key="6" onNext={() => setBlock(7)} />}
      {block === 7 && <ReflectionBlock key="7" vowId={currentVowId} onFinish={() => setBlock(1)} />}
    </AnimatePresence>
  );
};
