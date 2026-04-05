import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cryptoService } from './cryptoService';

import { ALL_EMOTIONS } from '../components/ThoughtCollector';

export const reportService = {
  async getDecryptedThoughts() {
    const saved = localStorage.getItem('zen_thoughts');
    if (!saved) return [];
    
    try {
      const parsed = JSON.parse(saved);
      const decryptedThoughts = await Promise.all(parsed.map(async (t: any) => {
        if (t.isEncrypted && t.iv) {
          try {
            const decryptedContent = await cryptoService.decrypt(t.content_encrypted, t.iv);
            try {
              const content = JSON.parse(decryptedContent);
              return {
                ...t,
                event: content.event || '',
                action: content.action || '',
                result: content.result || '',
                learning: content.learning || '',
                vow: content.vow || ''
              };
            } catch (e) {
              return t;
            }
          } catch (e) {
            console.error("Failed to decrypt thought", t.id, e);
            return {
              ...t,
              event: '（内容无法解密）',
              action: '',
              result: '',
              learning: '',
              vow: ''
            };
          }
        }
        return t;
      }));
      return decryptedThoughts;
    } catch (e) {
      console.error("Failed to parse thoughts", e);
      return [];
    }
  },

  getGoodDeeds() {
    const saved = localStorage.getItem('good_deed_history');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Filter out automatic chanting/meditation entries
      return parsed.filter((d: any) => {
        if (!d.content) return true;
        const isChanting = d.content.includes('念诵') || d.content.includes('禅修');
        return !isChanting;
      });
    } catch (e) {
      return [];
    }
  },

  getZenHistory() {
    const saved = localStorage.getItem('zen_history');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  },

  async getReportData(startDate?: Date, endDate?: Date) {
    let thoughts = await this.getDecryptedThoughts();
    let deeds = this.getGoodDeeds();
    let zenHistory = this.getZenHistory();

    if (startDate && endDate) {
      const start = startDate.getTime();
      const end = endDate.getTime() + 86400000; // Include the whole end day
      thoughts = thoughts.filter((t: any) => {
        const time = new Date(t.timestamp || t.id).getTime();
        return time >= start && time < end;
      });
      deeds = deeds.filter((d: any) => {
        const time = new Date(d.date || d.timestamp).getTime();
        return time >= start && time < end;
      });
      zenHistory = zenHistory.filter((z: any) => {
        const time = new Date(z.endTime || z.id).getTime();
        return time >= start && time < end;
      });
    }
    return { thoughts, deeds, zenHistory };
  },

  async exportCSV(startDate?: Date, endDate?: Date) {
    let thoughts = await this.getDecryptedThoughts();
    let deeds = this.getGoodDeeds();
    let zenHistory = this.getZenHistory();

    if (startDate && endDate) {
      const start = startDate.getTime();
      const end = endDate.getTime() + 86400000; // Include the whole end day
      thoughts = thoughts.filter((t: any) => {
        const time = new Date(t.timestamp || t.id).getTime();
        return time >= start && time < end;
      });
      deeds = deeds.filter((d: any) => {
        const time = new Date(d.date || d.timestamp).getTime();
        return time >= start && time < end;
      });
      zenHistory = zenHistory.filter((z: any) => {
        const time = new Date(z.endTime || z.id).getTime();
        return time >= start && time < end;
      });
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for Excel UTF-8 support
    
    csvContent += "类型,时间,内容,感悟/结果\n";
    
    thoughts.forEach((t: any) => {
      const date = new Date(t.timestamp || t.id).toLocaleString();
      const mappedEmotions = t.emotions.map((id: string) => id === 'wronged' ? '委屈' : ALL_EMOTIONS.find((e: any) => e.id === id)?.label || id);
      const content = `[情绪: ${mappedEmotions.join(',')}] ${t.event}`.replace(/"/g, '""');
      const result = `${t.action} -> ${t.learning}`.replace(/"/g, '""');
      csvContent += `"念头觉察","${date}","${content}","${result}"\n`;
    });

    deeds.forEach((d: any) => {
      const date = new Date(d.date || d.timestamp).toLocaleString();
      const typeStr = d.type === 'repentance' ? '忏悔' : '善行';
      const category = d.result?.category || d.category || typeStr;
      const merit = d.result?.merit || d.merit || 5;
      const content = `${category}: ${d.content || d.description || d.title || ''}`.replace(/"/g, '""');
      const result = `功德 ${merit > 0 ? '+' : ''}${merit}`.replace(/"/g, '""');
      csvContent += `"日行一善","${date}","${content}","${result}"\n`;
    });

    zenHistory.forEach((z: any) => {
      const date = new Date(z.endTime || z.id).toLocaleString();
      const typeStr = z.type || '禅修/诵经';
      const durationOrCount = z.type === '禅修' ? `${z.count} 分钟` : `${z.count} 遍`;
      const content = `${z.chant || '修行'} (${durationOrCount})`.replace(/"/g, '""');
      const result = `回向: ${z.dedication || '无'}`.replace(/"/g, '""');
      csvContent += `"${typeStr}","${date}","${content}","${result}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `禅心修行报告_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  async exportPDF(startDate?: Date, endDate?: Date) {
    this.exportHTMLPrint(startDate, endDate);
  },

  async generateHTML(startDate?: Date, endDate?: Date) {
    let thoughts = await this.getDecryptedThoughts();
    let deeds = this.getGoodDeeds();
    let zenHistory = this.getZenHistory();

    if (startDate && endDate) {
      const start = startDate.getTime();
      const end = endDate.getTime() + 86400000; // Include the whole end day
      thoughts = thoughts.filter((t: any) => {
        const time = new Date(t.timestamp || t.id).getTime();
        return time >= start && time < end;
      });
      deeds = deeds.filter((d: any) => {
        const time = new Date(d.date || d.timestamp).getTime();
        return time >= start && time < end;
      });
      zenHistory = zenHistory.filter((z: any) => {
        const time = new Date(z.endTime || z.id).getTime();
        return time >= start && time < end;
      });
    }

    const periodString = startDate && endDate 
      ? `统计区间：${startDate.toLocaleDateString()} 至 ${endDate.toLocaleDateString()}`
      : '统计区间：全部记录';

    const html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>禅心修行报告</title>
        <style>
          body { font-family: 'Noto Serif SC', 'Songti SC', serif; color: #333; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; color: #8B5A2B; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
          .period-info { text-align: center; color: #666; margin-bottom: 5px; font-size: 1.1em; }
          .time-info { text-align: center; color: #888; margin-bottom: 40px; font-size: 0.9em; }
          h2 { color: #556B2F; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .record { margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid #8B5A2B; }
          .record-date { font-size: 0.85em; color: #888; margin-bottom: 5px; }
          .record-title { font-weight: bold; margin-bottom: 5px; }
          .record-content { font-size: 0.95em; color: #555; }
          .guidance { margin-top: 10px; padding: 10px; background: #f0f4f8; border-radius: 4px; font-size: 0.9em; color: #4a5568; }
          @media print {
            body { padding: 0; }
            .record { page-break-inside: avoid; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <h1>禅心修行报告</h1>
        <p class="period-info">${periodString}</p>
        <p class="time-info">生成时间：${new Date().toLocaleString()}</p>
        
        <h2>念头觉察记录 (${thoughts.length} 条)</h2>
        ${thoughts.map((t: any) => `
          <div class="record">
            <div class="record-date">${new Date(t.timestamp || t.id).toLocaleString()}</div>
            <div class="record-title">情绪：${t.emotions.map((id: string) => id === 'wronged' ? '委屈' : ALL_EMOTIONS.find((e: any) => e.id === id)?.label || id).join('、')}</div>
            <div class="record-content">
              <strong>事件：</strong>${t.event || '无'}<br>
              <strong>转念：</strong>${t.action || '无'}<br>
              <strong>感悟：</strong>${t.learning || '无'}
            </div>
            ${t.guidance ? `<div class="guidance"><strong>导师点评：</strong><br>${t.guidance.replace(/\n/g, '<br>')}</div>` : ''}
          </div>
        `).join('')}

        <h2>日行一善记录 (${deeds.length} 条)</h2>
        ${deeds.map((d: any) => {
          const typeStr = d.type === 'repentance' ? '忏悔' : '善行';
          const category = d.result?.category || d.category || typeStr;
          const merit = d.result?.merit || d.merit || 5;
          const content = d.content || d.description || d.title || '无';
          const guidance = d.result?.guidance || '';
          const borderColor = d.type === 'repentance' ? '#8B0000' : '#556B2F';
          
          return `
          <div class="record" style="border-left-color: ${borderColor};">
            <div class="record-date">${new Date(d.date || d.timestamp).toLocaleString()}</div>
            <div class="record-title">${category} (${merit > 0 ? '+' : ''}${merit} 功德)</div>
            <div class="record-content">
              <strong>内容记录：</strong>${content}
            </div>
            ${guidance ? `<div class="guidance"><strong>导师点评：</strong><br>${guidance.replace(/\n/g, '<br>')}</div>` : ''}
          </div>
        `}).join('')}

        <h2>禅修与诵经记录 (${zenHistory.length} 条)</h2>
        ${zenHistory.map((z: any) => {
          const typeStr = z.type || '禅修/诵经';
          const durationOrCount = z.type === '禅修' ? `${z.count} 分钟` : `${z.count} 遍`;
          const borderColor = z.type === '禅修' ? '#4682B4' : '#DAA520';
          
          return `
          <div class="record" style="border-left-color: ${borderColor};">
            <div class="record-date">${new Date(z.endTime || z.id).toLocaleString()}</div>
            <div class="record-title">${typeStr}：${z.chant || '修行'}</div>
            <div class="record-content">
              <strong>时长/次数：</strong>${durationOrCount}<br>
              <strong>回向：</strong>${z.dedication || '无'}<br>
              <strong>发愿：</strong>${z.vow || '无'}
            </div>
          </div>
        `}).join('')}
        
        <div class="no-print" style="text-align: center; margin-top: 40px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
          <button onclick="window.print()" style="background: #8B4513; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-size: 16px; cursor: pointer; font-weight: bold;">打印 / 保存为PDF</button>
        </div>
      </body>
      </html>
    `;
    return html;
  },

  async exportHTMLPrint(startDate?: Date, endDate?: Date) {
    const html = await this.generateHTML(startDate, endDate);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `禅心修行报告_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}; 
