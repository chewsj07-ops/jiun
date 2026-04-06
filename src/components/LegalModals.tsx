import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, X } from 'lucide-react';

export const LegalModals = () => {
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'ai' | 'deletion' | null>(null);

  useEffect(() => {
    const handleOpenPrivacy = () => setActiveModal('privacy');
    const handleOpenTerms = () => setActiveModal('terms');
    const handleOpenAI = () => setActiveModal('ai');
    const handleOpenDeletion = () => setActiveModal('deletion');

    window.addEventListener('open-privacy-modal', handleOpenPrivacy);
    window.addEventListener('open-terms-modal', handleOpenTerms);
    window.addEventListener('open-ai-modal', handleOpenAI);
    window.addEventListener('open-deletion-modal', handleOpenDeletion);

    // Check URL for direct links
    const path = window.location.pathname;
    if (path === '/privacy' || path === '/privacy.html') {
      setActiveModal('privacy');
    } else if (path === '/terms' || path === '/terms.html') {
      setActiveModal('terms');
    }

    return () => {
      window.removeEventListener('open-privacy-modal', handleOpenPrivacy);
      window.removeEventListener('open-terms-modal', handleOpenTerms);
      window.removeEventListener('open-ai-modal', handleOpenAI);
      window.removeEventListener('open-deletion-modal', handleOpenDeletion);
    };
  }, []);

  const closeModal = () => setActiveModal(null);

  if (!activeModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={closeModal}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[32px] p-6 sm:p-8 shadow-xl max-w-2xl w-full border border-zen-accent/10 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-zen-ink flex items-center gap-2">
              <Book className="w-5 h-5 text-zen-accent" />
              {activeModal === 'privacy' && 'Privacy Policy (隐私政策)'}
              {activeModal === 'terms' && 'Terms of Service (使用条款)'}
              {activeModal === 'ai' && 'AI Usage Policy (AI使用说明)'}
              {activeModal === 'deletion' && 'Data Deletion Policy (数据删除政策)'}
            </h2>
            <button
              onClick={closeModal}
              className="p-2 hover:bg-zen-bg rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-zen-accent/50" />
            </button>
          </div>

          <div className="prose prose-sm prose-stone max-w-none text-zen-ink/80 space-y-4">
            {activeModal === 'privacy' && (
              <>
                <p className="text-xs text-zen-accent/60">Last Updated (最后更新): 2026-03-11</p>
                <p>Vowzen (愿禅助手) ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your information when you use the Vowzen application and related services.</p>
                <p>Vowzen（愿禅助手）（以下简称“我们”）致力于保护您的隐私。本隐私政策说明在您使用 Vowzen 应用程序及相关服务时，我们如何收集、使用、存储和保护您的信息。</p>
                
                <p>Vowzen is an application platform for <strong>meditation, awareness, reflection, and spiritual growth</strong>. We understand that the content users input can be highly personal, so protecting this data is our core principle.</p>
                <p>Vowzen 是一个用于 <strong>冥想、觉察、反思与身心成长</strong> 的应用平台。我们理解用户输入的内容可能具有高度个人性，因此保护这些数据是我们的核心原则。</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">1. Information We Collect (我们收集的信息)</h3>
                <h4 className="text-xs font-bold text-zen-ink mt-4 mb-1">Account Information (账户信息)</h4>
                <p>When you register an account, we may collect (当您注册账户时，我们可能收集):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Email address (电子邮件地址)</li>
                  <li>Username / display name (用户名/昵称)</li>
                  <li>Encrypted password (加密的密码)</li>
                </ul>
                <p>Passwords are never stored in plain text. (密码不会以明文存储。)</p>

                <h4 className="text-xs font-bold text-zen-ink mt-4 mb-1">User Content (用户内容)</h4>
                <p>Users can record the following in the app (用户可以在应用中记录):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Thought observations (念头觉察)</li>
                  <li>Meditation records (禅修记录)</li>
                  <li>Gratitude or good deeds (感恩或善行)</li>
                  <li>Dedications or vows (回向或发愿)</li>
                  <li>Practice progress (修行进度)</li>
                </ul>
                <p>This content belongs to the user's personal reflection data and is only used for app functionality. (这些内容属于用户个人反思数据，仅用于应用功能。)</p>

                <h4 className="text-xs font-bold text-zen-ink mt-4 mb-1">Technical Information (技术信息)</h4>
                <p>The system may collect (系统可能收集):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Device type (设备类型)</li>
                  <li>IP address (IP地址)</li>
                  <li>App usage logs (应用使用日志)</li>
                  <li>Error reports (错误报告)</li>
                </ul>
                <p>Used for system security and performance optimization. (用于系统安全与性能优化。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">2. How We Use Information (我们如何使用信息)</h3>
                <p>We use information for (我们使用信息用于):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Creating user accounts (创建用户账户)</li>
                  <li>Saving practice records (保存修行记录)</li>
                  <li>Cross-device synchronization (跨设备同步)</li>
                  <li>AI reflection assistance (AI反思辅助)</li>
                  <li>Improving app experience (改进应用体验)</li>
                  <li>Customer support (客户支持)</li>
                  <li>Security monitoring (安全监控)</li>
                </ul>
                <p><strong>Vowzen does not sell user data. (Vowzen 不会出售用户数据。)</strong></p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">3. AI Processing (AI 处理)</h3>
                <p>Some features use AI technology to generate reflections or suggestions. (部分功能使用 AI 技术生成反思或建议。)</p>
                <p>User input content may be sent to secure AI services for processing to generate responses. (用户输入内容可能被发送至安全 AI 服务处理，以生成回应。)</p>
                <p>User data will not be used to train public AI models unless explicit authorization is obtained. (用户数据不会被用于训练公开 AI 模型，除非获得明确授权。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">4. Data Ownership (数据所有权)</h3>
                <p>All practice records belong to the user. (所有修行记录属于用户本人。)</p>
                <p>Users have the following rights (用户拥有以下权利):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>View data (查看数据)</li>
                  <li>Modify data (修改数据)</li>
                  <li>Export data (导出数据)</li>
                  <li>Delete data (删除数据)</li>
                  <li>Delete account (删除账户)</li>
                </ul>
                <p>After account deletion, personal data will be removed from the system within a reasonable time. (账户删除后，个人数据将在合理时间内从系统中移除。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">5. Data Security (数据安全)</h3>
                <p>We use industry-standard security measures (我们采用行业标准安全措施):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>HTTPS encryption (HTTPS 加密)</li>
                  <li>Secure authentication (安全认证)</li>
                  <li>Encrypted password storage (加密密码存储)</li>
                  <li>Restricted internal access (限制内部访问)</li>
                </ul>
                <p>While we strive to protect data, internet transmission cannot guarantee absolute security. (虽然我们尽力保护数据，但互联网传输无法保证绝对安全。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">6. Backup Protection (备份保护)</h3>
                <p>To prevent data loss, the system performs regular backups. (为了防止数据丢失，系统会进行定期备份。)</p>
                <p>Backup data is only used for system recovery. (备份数据仅用于恢复系统。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">7. Data Sharing (数据共享)</h3>
                <p>Vowzen does not sell user information. (Vowzen 不出售用户信息。)</p>
                <p>We may share limited data with technical service providers, such as (我们可能与技术服务提供商共享有限数据，例如):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Cloud servers (云服务器)</li>
                  <li>Security monitoring (安全监控)</li>
                  <li>Data analysis tools (数据分析工具)</li>
                </ul>
                <p>These service providers must comply with data protection obligations. (这些服务提供商必须遵守数据保护义务。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">8. Children (儿童)</h3>
                <p>Vowzen is not intended for users <strong>under 13 years old</strong>. (Vowzen 不适用于 <strong>13岁以下用户</strong>。)</p>
                <p>If data from minors is found, it will be deleted promptly. (若发现未成年人数据，将及时删除。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">9. International Transfer (国际传输)</h3>
                <p>Vowzen operates in Malaysia. Data may be stored on secure servers in different regions. (Vowzen 在马来西亚运营。数据可能存储在不同地区的安全服务器。)</p>
                <p>By using this service, you consent to data processing. (使用本服务即表示同意数据处理。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">10. Your Rights (您的权利)</h3>
                <p>You have the right to (您有权):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Access data (访问数据)</li>
                  <li>Correct data (更正数据)</li>
                  <li>Delete data (删除数据)</li>
                  <li>Export data (导出数据)</li>
                </ul>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">11. Policy Updates (政策更新)</h3>
                <p>We may update this policy. (我们可能更新本政策。)</p>
                <p>Major changes will be notified to users through the app. (重大变更将通过应用通知用户。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">12. Contact & Data Deletion (联系我们与数据删除)</h3>
                <p>To request the deletion of your account and associated data, please click the link below or email us directly:</p>
                <p className="mt-2">
                  <a href="mailto:vowzen91@gmail.com?subject=Account%20and%20Data%20Deletion%20Request" className="text-zen-accent hover:underline font-bold">
                    Request Account and Data Deletion (申请删除账户与数据)
                  </a>
                </p>
                <p className="mt-2">Email: <a href="mailto:vowzen91@gmail.com" className="text-zen-accent hover:underline">vowzen91@gmail.com</a></p>

                <div className="mt-8 p-4 bg-zen-bg/50 rounded-xl border border-zen-accent/10">
                  <h4 className="font-bold text-zen-ink mb-2">App Store / Google Play Compliance (应用商店合规)</h4>
                  <p className="text-sm mb-2">Vowzen complies with common app store privacy requirements (Vowzen 符合应用商店常见隐私要求):</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>User data is accessible (用户数据可访问)</li>
                    <li>User data is deletable (用户数据可删除)</li>
                    <li>Data is not sold (不出售数据)</li>
                    <li>AI usage is disclosed (AI使用说明)</li>
                    <li>Secure encrypted communication (安全加密通信)</li>
                  </ul>
                </div>

                <div className="mt-4 p-4 bg-zen-bg/50 rounded-xl border border-zen-accent/10">
                  <h4 className="font-bold text-zen-ink mb-2">Spiritual Privacy Principle (核心隐私原则)</h4>
                  <p className="text-sm mb-2">Vowzen insists on the following (Vowzen 坚持):</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>No selling of data (不出售)</li>
                    <li>No use for advertising (不用于广告)</li>
                    <li>No public sharing (不公开分享)</li>
                  </ul>
                  <p className="text-sm mt-2">These records belong to the user's personal growth journey. (这些记录属于用户个人成长过程。)</p>
                </div>
              </>
            )}

            {activeModal === 'terms' && (
              <>
                <p className="text-xs text-zen-accent/60">Last Updated (最后更新): 2026-03-11</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">1. Acceptance (接受条款)</h3>
                <p>By using Vowzen, you agree to these terms. (使用 Vowzen 即表示您同意本条款。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">2. Service Description (服务描述)</h3>
                <p>Vowzen is an application tool for (Vowzen 是一个用于):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Meditation (冥想)</li>
                  <li>Self-awareness (自我觉察)</li>
                  <li>Reflection recording (反思记录)</li>
                  <li>Psychological growth (心理成长)</li>
                </ul>
                <p>This app does not provide medical or psychological treatment advice. (本应用不提供医疗或心理治疗建议。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">3. User Responsibility (用户责任)</h3>
                <p>Users must (用户需):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Provide authentic information (提供真实信息)</li>
                  <li>Protect account security (保护账户安全)</li>
                  <li>Use the service legally (合法使用服务)</li>
                </ul>
                <p>Posting illegal or harmful content is prohibited. (禁止发布非法或有害内容。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">4. User Content (用户内容)</h3>
                <p>User input content belongs to the user. (用户输入内容归用户所有。)</p>
                <p>Users authorize Vowzen to store data to provide the service. (用户授权 Vowzen 存储数据以提供服务。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">5. AI Responses (AI 回复)</h3>
                <p>AI responses are for reflection reference only and do not constitute professional advice. (AI回复仅供反思参考，不构成专业建议。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">6. Termination (终止)</h3>
                <p>Users can delete their accounts at any time. (用户可随时删除账户。)</p>
                <p>Accounts violating the terms may be suspended. (违反条款的账户可能被暂停。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">7. Limitation of Liability (责任限制)</h3>
                <p>Vowzen provides services "as is". (Vowzen 按“现状”提供服务。)</p>
                <p>We are not liable for indirect losses. (我们不对间接损失承担责任。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">8. Governing Law (管辖法律)</h3>
                <p>These terms are governed by the laws of Malaysia. (本条款受马来西亚法律管辖。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">9. Contact (联系我们)</h3>
                <p><a href="mailto:vowzen91@gmail.com" className="text-zen-accent hover:underline">vowzen91@gmail.com</a></p>
              </>
            )}

            {activeModal === 'ai' && (
              <>
                <p>Vowzen uses AI to provide (Vowzen 使用 AI 提供):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Reflection prompts (反思提示)</li>
                  <li>Emotional awareness (情绪觉察)</li>
                  <li>Practice reminders (修行提醒)</li>
                </ul>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">AI System (AI系统):</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Does not save long-term user content (不保存长期用户内容)</li>
                  <li>Does not sell user data (不出售用户数据)</li>
                  <li>Does not provide medical diagnosis (不提供医疗诊断)</li>
                </ul>
                <p>AI answers are for reference only. (AI回答仅供参考。)</p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">Contact (联系我们)</h3>
                <p><a href="mailto:vowzen91@gmail.com" className="text-zen-accent hover:underline">vowzen91@gmail.com</a></p>
              </>
            )}

            {activeModal === 'deletion' && (
              <>
                <p>Users can (用户可以):</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Delete a single record (删除单条记录)</li>
                  <li>Delete all data (删除全部数据)</li>
                  <li>Delete account (删除账户)</li>
                </ul>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">After deleting the account (删除账户后):</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Data in the main database is deleted (主数据库数据删除)</li>
                  <li>Backup data is deleted within a reasonable period (备份数据在合理周期内删除)</li>
                </ul>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">Request Deletion (申请删除)</h3>
                <p>To request the deletion of your account and associated data, please click the link below:</p>
                <p className="mt-2 mb-4">
                  <a href="mailto:vowzen91@gmail.com?subject=Account%20and%20Data%20Deletion%20Request" className="text-zen-accent hover:underline font-bold">
                    Request Account and Data Deletion (申请删除账户与数据)
                  </a>
                </p>

                <h3 className="text-sm font-bold text-zen-ink mt-6 mb-2">Contact (联系我们)</h3>
                <p><a href="mailto:vowzen91@gmail.com" className="text-zen-accent hover:underline">vowzen91@gmail.com</a></p>
              </>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-zen-accent/10 flex justify-end">
            <button
              onClick={closeModal}
              className="px-6 py-2.5 bg-zen-accent text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            >
              I Agree (我同意)
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};