import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, Sparkles, Loader2 } from 'lucide-react';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { createPortal } from 'react-dom';

interface RejoiceModalProps {
  shareId: string;
  onClose: () => void;
  onViewCommunity?: () => void;
  onPractice?: (chantTitle?: string) => void;
}

export const RejoiceModal: React.FC<RejoiceModalProps> = ({ shareId, onClose, onViewCommunity, onPractice }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejoicing, setRejoicing] = useState(false);
  const [rejoiced, setRejoiced] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, 'shared_merits', shareId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setData({ 
            id: docSnap.id, 
            isCommunity: !!data.isCommunity, // If we want to flag it
            ...data,
            rejoiceCount: data.rejoiceCount || 0
          });
        } else {
          setError('该功德记录不存在或已被删除。');
        }
      } catch (err) {
        console.error(err);
        setError('获取数据失败，请稍后再试。');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [shareId]);

  const handleRejoice = async () => {
    if (rejoicing || rejoiced || !data) return;
    setRejoicing(true);
    try {
      const docRef = doc(db, 'shared_merits', shareId);
      await updateDoc(docRef, {
        rejoiceCount: increment(1)
      });
      
      setData((prev: any) => ({ ...prev, rejoiceCount: (prev.rejoiceCount || 0) + 1 }));
      setRejoiced(true);
      setShowSparkles(true);
      setTimeout(() => setShowSparkles(false), 2000);
    } catch (err) {
      console.error(err);
      alert('随喜失败，请稍后再试。');
    } finally {
      setRejoicing(false);
    }
  };

  const handleClose = () => {
    onClose();
    const url = new URL(window.location.href);
    url.searchParams.delete('rejoice');
    window.history.replaceState({}, '', url.toString());
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-surface rounded-3xl w-full max-w-md shadow-float border border-line overflow-hidden relative max-h-[90vh] flex flex-col"
        >
          {showSparkles && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1 }}
              >
                <Sparkles className="w-32 h-32 text-gold" />
              </motion.div>
            </div>
          )}

          <div className="flex justify-between items-center p-6 pb-2 shrink-0">
            <h3 className="text-xl font-bold font-serif text-ink">随喜赞叹</h3>
            <button onClick={handleClose} className="p-2 text-ink-3 hover:text-ink rounded-full hover:bg-surface-2 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 pt-4 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                <p className="text-sm text-ink-2">正在加载功德记录...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-ink-2">
                {error}
              </div>
            ) : data ? (
              <div className="space-y-6">
                <div className="bg-surface-2 rounded-2xl p-6 text-center border border-line">
                  <div className="w-16 h-16 bg-accent-mist rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-accent" />
                  </div>
                  <p className="text-sm text-ink-2 mb-2">
                    <span className="font-bold text-ink">{data.userName}</span> 完成了
                  </p>
                  <h4 className="text-2xl font-serif font-bold text-accent mb-4">
                    {data.title || `${data.chant || data.type} ${data.count ? data.count + '次' : ''}`}
                  </h4>
                  {(data.description || data.dedication) && (
                    <div className="bg-surface p-4 rounded-xl text-sm text-ink-2 italic border border-line">
                      "{data.description || data.dedication}"
                    </div>
                  )}
                  <div className="mt-4 text-xs text-ink-3">
                    {new Date(data.timestamp).toLocaleString()}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {rejoiced ? (
                    <button
                      onClick={() => {
                        handleClose();
                        if (onViewCommunity) onViewCommunity();
                      }}
                      className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all bg-accent text-on-accent hover:bg-accent-hover"
                    >
                      <Heart className="w-5 h-5 fill-current" />
                      已随喜，前往共修大厅
                    </button>
                  ) : (
                    <button
                      onClick={handleRejoice}
                      disabled={rejoicing}
                      className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all bg-accent text-on-accent hover:bg-accent-hover"
                    >
                      {rejoicing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Heart className="w-5 h-5" />
                          随喜赞叹 ({data.rejoiceCount})
                        </>
                      )}
                    </button>
                  )}
                  
                  {rejoiced ? (
                    <button
                      onClick={() => {
                        handleClose();
                        if (onPractice) onPractice(data.title || data.chant || data.type);
                      }}
                      className="w-full py-3 text-sm text-ink-2 hover:text-ink transition-colors"
                    >
                      开启我的修行之旅
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          handleClose();
                          if (onPractice) onPractice(data.title || data.chant || data.type);
                        }}
                        className="w-full py-3 text-sm text-ink-2 hover:text-ink transition-colors"
                      >
                        我也要修行
                      </button>
                      {data.isCommunity && onViewCommunity && (
                        <button
                          onClick={() => {
                            handleClose();
                            onViewCommunity();
                          }}
                          className="w-full py-3 text-sm text-accent hover:text-accent-hover transition-colors font-bold"
                        >
                          在社区中查看此功德
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};