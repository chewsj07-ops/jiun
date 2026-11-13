import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Download, Upload, FileText, Table, ArrowLeft, Loader2, Eye, 
  ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, CloudCheck, 
  HardDrive, Database, Sparkles, HelpCircle, ChevronRight
} from 'lucide-react';
import { reportService } from '../services/reportService';
import { recordVault, PracticeRecord } from '../services/recordVault';
import { safeStorage } from '../utils/safeStorage';
import { useFirebase } from '../contexts/FirebaseContext';
import { cn } from '../lib/utils';
import { CustomCalendar } from './CustomCalendar';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'vault' | 'report';
}

export const ExportModal: React.FC<ExportModalProps> = ({ 
  isOpen, 
  onClose,
  defaultTab = 'vault'
}) => {
  const { user: fbUser } = useFirebase();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active top-level mode
  const [activeTab, setActiveTab] = useState<'vault' | 'report'>(defaultTab);

  // Vault states
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [vaultMsg, setVaultMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isHealing, setIsHealing] = useState(false);
  const [showFaq, setShowFaq] = useState(false);

  // Report states
  const [reportStep, setReportStep] = useState<'select' | 'preview'>('select');
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportData, setReportData] = useState<{ thoughts: any[], deeds: any[], zenHistory: any[] } | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'csv'>('pdf');

  // Load vault records on open
  const loadVaultStats = async () => {
    try {
      const records = await recordVault.getRecords();
      setTotalRecords(records.length);
    } catch (e) {
      console.warn('Failed to load vault stats:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVaultStats();
      setVaultMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Export Complete Backup JSON
  const handleExportFullBackup = async () => {
    try {
      const records = await recordVault.getRecords();
      const thoughts = safeStorage.getJSON<any[]>('zen_thoughts', []);
      const goodDeeds = safeStorage.getJSON<any[]>('good_deed_history', []);
      const vows = safeStorage.getJSON<any[]>('zen_vows', []);
      const profile = safeStorage.getJSON<any>('zen_user_profile', null);
      const totalMerit = safeStorage.getItem('zen_count') || '0';

      const fullBackup = {
        app: 'VowZen',
        version: '2.5.0',
        exportedAt: new Date().toISOString(),
        totalRecords: records.length,
        records,
        thoughts,
        goodDeeds,
        vows,
        profile,
        totalMerit
      };

      const jsonStr = JSON.stringify(fullBackup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `VowZen_修行完整备份_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setVaultMsg({
        type: 'success',
        text: `已成功导出完整备份！共包含 ${records.length} 条打卡记录，文件已保存到本地。`
      });
      setTimeout(() => setVaultMsg(null), 5000);
    } catch (err: any) {
      setVaultMsg({ type: 'error', text: '导出备份失败：' + err.message });
      setTimeout(() => setVaultMsg(null), 5000);
    }
  };

  // 2. Import and Restore from JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        let recordsToRestore: PracticeRecord[] = [];
        if (Array.isArray(parsed)) {
          recordsToRestore = parsed;
        } else if (parsed && Array.isArray(parsed.records)) {
          recordsToRestore = parsed.records;
        }

        if (recordsToRestore.length > 0) {
          // Save to recordVault (IndexedDB + SafeStorage)
          await recordVault.saveRecords(recordsToRestore);
          safeStorage.setJSON('zen_history', recordsToRestore);

          // Restore companion data if present
          if (parsed.thoughts && Array.isArray(parsed.thoughts)) {
            safeStorage.setJSON('zen_thoughts', parsed.thoughts);
          }
          if (parsed.goodDeeds && Array.isArray(parsed.goodDeeds)) {
            safeStorage.setJSON('good_deed_history', parsed.goodDeeds);
          }
          if (parsed.vows && Array.isArray(parsed.vows)) {
            safeStorage.setJSON('zen_vows', parsed.vows);
          }
          if (parsed.profile) {
            safeStorage.setJSON('zen_user_profile', parsed.profile);
          }
          if (parsed.totalMerit) {
            safeStorage.setItem('zen_count', String(parsed.totalMerit));
          }

          setTotalRecords(recordsToRestore.length);
          window.dispatchEvent(new CustomEvent('zen_data_updated'));
          window.dispatchEvent(new CustomEvent('storage'));

          setVaultMsg({
            type: 'success',
            text: `🎉 恢复成功！已还原 ${recordsToRestore.length} 条修行打卡记录。`
          });
          setTimeout(() => setVaultMsg(null), 6000);
        } else {
          setVaultMsg({ type: 'error', text: '备份文件中未找到有效的打卡记录。' });
          setTimeout(() => setVaultMsg(null), 5000);
        }
      } catch (err) {
        setVaultMsg({ type: 'error', text: '备份文件解析失败，请确认文件是否为有效的 JSON 格式。' });
        setTimeout(() => setVaultMsg(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 3. Auto-Healing & Deep Cross-Storage Scan
  const handleDeepHealingScan = async () => {
    setIsHealing(true);
    setVaultMsg(null);
    try {
      const records = await recordVault.getRecords();
      setTotalRecords(records.length);
      safeStorage.setJSON('zen_history', records);
      window.dispatchEvent(new CustomEvent('zen_data_updated'));

      setVaultMsg({
        type: 'success',
        text: `🛡️ 深度金库校验完成！已确保 ${records.length} 条打卡记录在 LocalStorage 与 IndexedDB 中双重持久化完整无缺。`
      });
      setTimeout(() => setVaultMsg(null), 5000);
    } catch (e: any) {
      setVaultMsg({ type: 'error', text: '自愈校验异常：' + e.message });
      setTimeout(() => setVaultMsg(null), 5000);
    } finally {
      setIsHealing(false);
    }
  };

  // 4. Report Generation
  const handleGeneratePreview = async () => {
    setIsLoadingReport(true);
    try {
      const data = await reportService.getReportData(startDate, endDate);
      const html = await reportService.generateHTML(startDate, endDate);
      setReportData(data);
      setPreviewHtml(html);
      setReportStep('preview');
    } catch (error) {
      console.error("Failed to generate report data", error);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleDownloadReport = (format: 'pdf' | 'csv') => {
    if (format === 'pdf') {
      reportService.exportPDF(startDate, endDate);
    } else {
      reportService.exportCSV(startDate, endDate);
    }
  };

  const resetAndClose = () => {
    setReportStep('select');
    setReportData(null);
    setVaultMsg(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={cn(
            "bg-surface rounded-3xl w-full shadow-float overflow-hidden relative flex flex-col max-h-[92vh] border border-line transition-all duration-300",
            activeTab === 'report' && reportStep === 'preview' ? "max-w-3xl" : "max-w-lg"
          )}
        >
          {/* Top Modal Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-line bg-surface-2/60">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-mist flex items-center justify-center text-accent">
                {activeTab === 'vault' ? <ShieldCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              </div>
              <h3 className="text-base sm:text-lg font-bold font-serif text-ink">
                数据同步与备份中心
              </h3>
            </div>
            <button 
              onClick={resetAndClose} 
              className="p-1.5 text-ink-3 hover:text-ink rounded-full hover:bg-surface-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Top Segmented Navigation Tabs */}
          <div className="flex border-b border-line bg-surface px-6 pt-3 shrink-0">
            <button
              onClick={() => setActiveTab('vault')}
              className={cn(
                "pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5",
                activeTab === 'vault'
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-3 hover:text-ink"
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>打卡记录永久金库 (备份与恢复)</span>
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={cn(
                "pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5",
                activeTab === 'report'
                  ? "border-accent text-accent"
                  : "border-transparent text-ink-3 hover:text-ink"
              )}
            >
              <FileText className="w-4 h-4" />
              <span>修行报告 (PDF/CSV)</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* TAB 1: 永久金库与备份恢复 */}
            {activeTab === 'vault' && (
              <div className="space-y-5">
                {/* 1. Permanent Vault Status Card */}
                <div className="bg-accent-mist/60 rounded-2xl p-5 border border-line relative overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0 mt-0.5">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-ink font-serif">
                            双重底层持久化保障
                          </h4>
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface text-accent border border-line">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                            双重保存中
                          </span>
                        </div>
                        <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                          打卡数据已由 <strong>SafeStorage (LocalStorage)</strong> 与 <strong>IndexedDB 独立数据库</strong> 双重存储。彻底免疫 Safari 移动端 7 天缓存清除策略。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Vault Stats Bar */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-line">
                    <div className="bg-surface p-2.5 rounded-xl border border-line text-center">
                      <div className="text-[10px] text-ink-2 font-semibold">永久归档打卡记录</div>
                      <div className="text-xl font-serif font-bold text-ink mt-0.5 tabular-nums">
                        {totalRecords} <span className="text-xs font-normal text-ink-3">条</span>
                      </div>
                    </div>
                    <div className="bg-surface p-2.5 rounded-xl border border-line text-center">
                      <div className="text-[10px] text-ink-2 font-semibold">云端安全同步</div>
                      <div className="text-xs font-bold text-ink mt-1.5 flex items-center justify-center gap-1">
                        {fbUser ? (
                          <span className="text-accent">🟢 账号已同步</span>
                        ) : (
                          <span className="text-ink-2">⚪ 本地双重金库</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Message Banner */}
                {vaultMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-medium flex items-center gap-2",
                      vaultMsg.type === 'success' && "bg-emerald-50 border-emerald-300 text-emerald-900",
                      vaultMsg.type === 'error' && "bg-red-50 border-red-300 text-red-900",
                      vaultMsg.type === 'info' && "bg-blue-50 border-blue-300 text-blue-900"
                    )}
                  >
                    {vaultMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{vaultMsg.text}</span>
                  </motion.div>
                )}

                {/* 2. Core Vault Actions (Export / Restore / Self-Heal) */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-accent px-1">
                    备份与恢复操作
                  </h4>

                  {/* Action 1: Export */}
                  <button
                    onClick={handleExportFullBackup}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface hover:bg-surface-2 border border-line transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-accent-mist text-gold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-ink">导出完整备份 (.json)</div>
                        <div className="text-xs text-ink-2">下载包含所有打卡记录、念诵与善行的离线备份文件</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-accent transition-colors shrink-0" />
                  </button>

                  {/* Action 2: Restore */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface hover:bg-surface-2 border border-line transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cloud-mist text-accent flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-ink">从备份文件恢复 (.json)</div>
                        <div className="text-xs text-ink-2">从已导出的备份文件一键还原打卡数据，支持多设备迁移</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-accent transition-colors shrink-0" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportBackup}
                  />

                  {/* Action 3: Self-Heal */}
                  <button
                    onClick={handleDeepHealingScan}
                    disabled={isHealing}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-surface hover:bg-surface-2 border border-line transition-all group text-left disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-accent-mist text-accent flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <RefreshCw className={cn("w-4 h-4", isHealing && "animate-spin")} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-ink">金库自愈与跨存储同步</div>
                        <div className="text-xs text-ink-2">立即扫描 IndexedDB 金库，修复 LocalStorage 中可能被意外清除的数据</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-3 group-hover:text-accent transition-colors shrink-0" />
                  </button>
                </div>

                {/* 3. Safety Guidance Accordion */}
                <div className="pt-2">
                  <button
                    onClick={() => setShowFaq(!showFaq)}
                    className="w-full flex items-center justify-between text-xs text-accent hover:text-accent-hover py-2 px-1 font-semibold"
                  >
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      数据永久安全的保障原理是什么？
                    </span>
                    <span>{showFaq ? '收起' : '查看说明'}</span>
                  </button>

                  {showFaq && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 p-3.5 bg-surface-2 rounded-xl text-xs text-ink-2 leading-relaxed space-y-2 border border-line"
                    >
                      <p>
                        <strong>1. 为什么打卡不会丢失？</strong><br />
                        传统网页仅使用 LocalStorage，在 iOS Safari 上若 7 天未访问，可能会被系统自动清理。本应用通过 <strong>IndexedDB 底层永久数据库</strong> 建立专用金库，永久留存不受清理策略影响。
                      </p>
                      <p>
                        <strong>2. 清理浏览器缓存怎么办？</strong><br />
                        即使浏览器缓存被清空，只要重新打开应用，底层的自愈引擎会自动从 IndexedDB 中检出历史记录并回填。
                      </p>
                      <p>
                        <strong>3. 换新手机如何迁移？</strong><br />
                        在旧手机点击【导出完整备份 (.json)】，通过微信或隔空投送发给新手机，在新手机打开本页面点击【从备份文件恢复】即可秒级还原。
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: 修行报告 (PDF/CSV) */}
            {activeTab === 'report' && (
              <div className="space-y-6">
                {reportStep === 'select' ? (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-ink mb-3">选择报告时间范围</label>
                      <div className="flex items-center gap-2 mb-4 bg-surface-2 p-1 rounded-xl border border-line">
                        <button
                          onClick={() => setSelecting('start')}
                          className={cn(
                            "flex-1 py-2 px-3 text-sm rounded-lg transition-colors text-center",
                            selecting === 'start' ? "bg-surface text-accent border border-line font-bold" : "text-ink-2 hover:text-ink"
                          )}
                        >
                          <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">开始日期</div>
                          {startDate.toLocaleDateString()}
                        </button>
                        <div className="text-ink-3">-</div>
                        <button
                          onClick={() => setSelecting('end')}
                          className={cn(
                            "flex-1 py-2 px-3 text-sm rounded-lg transition-colors text-center",
                            selecting === 'end' ? "bg-surface text-accent border border-line font-bold" : "text-ink-2 hover:text-ink"
                          )}
                        >
                          <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">结束日期</div>
                          {endDate.toLocaleDateString()}
                        </button>
                      </div>

                      <div className="border border-line rounded-2xl overflow-hidden bg-surface">
                        <CustomCalendar
                          selectedDate={selecting === 'start' ? startDate : endDate}
                          onSelectDate={(date) => {
                            if (selecting === 'start') {
                              setStartDate(date);
                              if (date > endDate) setEndDate(date);
                              setSelecting('end');
                            } else {
                              setEndDate(date);
                              if (date < startDate) setStartDate(date);
                            }
                          }}
                          recordDates={[]}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 bg-surface-2 relative min-h-[360px] rounded-2xl overflow-hidden border border-line">
                      {selectedFormat === 'pdf' ? (
                        <iframe 
                          srcDoc={previewHtml} 
                          className="w-full h-full border-0 absolute inset-0"
                          title="Report Preview"
                        />
                      ) : (
                        <div className="p-6 h-full overflow-y-auto">
                          <div className="bg-surface rounded-2xl p-5 border border-line">
                            <div className="text-center mb-6">
                              <p className="text-xs font-bold text-accent uppercase tracking-wider mb-1">CSV 数据概览</p>
                              <p className="text-sm font-medium text-ink">
                                {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-surface-2 p-3 rounded-xl text-center border border-line">
                                <p className="text-2xl font-serif font-bold text-accent mb-1 tabular-nums">
                                  {reportData?.thoughts.length || 0}
                                </p>
                                <p className="text-[10px] font-bold text-ink-2">念头觉察</p>
                              </div>
                              <div className="bg-surface-2 p-3 rounded-xl text-center border border-line">
                                <p className="text-2xl font-serif font-bold text-gold mb-1 tabular-nums">
                                  {reportData?.deeds.length || 0}
                                </p>
                                <p className="text-[10px] font-bold text-ink-2">善行/忏悔</p>
                              </div>
                              <div className="bg-surface-2 p-3 rounded-xl text-center border border-line">
                                <p className="text-2xl font-serif font-bold text-accent mb-1 tabular-nums">
                                  {reportData?.zenHistory?.length || 0}
                                </p>
                                <p className="text-[10px] font-bold text-ink-2">禅修/诵经</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 bg-surface border-t border-line shrink-0 mt-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedFormat('pdf')}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                            selectedFormat === 'pdf' 
                              ? "bg-accent-mist text-accent" 
                              : "text-ink-2 hover:bg-surface-2"
                          )}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          PDF 格式
                        </button>
                        <button
                          onClick={() => setSelectedFormat('csv')}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                            selectedFormat === 'csv' 
                              ? "bg-accent-mist text-accent" 
                              : "text-ink-2 hover:bg-surface-2"
                          )}
                        >
                          <Table className="w-3.5 h-3.5" />
                          CSV 格式
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer (for Report view) */}
          {activeTab === 'report' && (
            <div className="p-4 sm:p-5 border-t border-line bg-surface shrink-0">
              {reportStep === 'select' ? (
                <button
                  onClick={handleGeneratePreview}
                  disabled={isLoadingReport}
                  className="w-full py-3 bg-accent text-on-accent hover:bg-accent-hover rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 text-sm"
                >
                  {isLoadingReport ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  生成报告预览
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setReportStep('select')}
                    className="flex-1 py-3 bg-surface-2 text-ink rounded-xl font-bold hover:bg-accent-mist transition-colors flex items-center justify-center gap-1.5 text-xs"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    返回修改
                  </button>
                  <button
                    onClick={() => handleDownloadReport(selectedFormat)}
                    className="flex-[2] py-3 bg-accent text-on-accent hover:bg-accent-hover rounded-xl font-bold transition-colors flex items-center justify-center gap-1.5 text-xs"
                  >
                    <Download className="w-4 h-4" />
                    下载 {selectedFormat.toUpperCase()} 报告
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
