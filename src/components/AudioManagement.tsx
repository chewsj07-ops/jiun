import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Trash2, Plus, UserPlus, Edit2, Check, X } from 'lucide-react';

export const AudioManagement = () => {
  const [audios, setAudios] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('禅修');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminUid, setNewAdminUid] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingAudioId, setEditingAudioId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const CATEGORIES = ['诵经', '禅修', '持咒', '轻音乐', '开示', '其他'];

  useEffect(() => {
    checkAdminStatus();
    fetchAudios();
    fetchAdmins();
  }, [auth.currentUser]);

  const checkAdminStatus = async () => {
    if (!auth.currentUser) return;
    if (auth.currentUser.email === 'chewsj07@gmail.com') {
      setIsAdmin(true);
      return;
    }
    const adminDoc = await getDoc(doc(db, 'admins', auth.currentUser.uid));
    setIsAdmin(adminDoc.exists());
  };

  const fetchAudios = async () => {
    const q = query(collection(db, 'audioResources'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    setAudios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchAdmins = async () => {
    const snapshot = await getDocs(collection(db, 'admins'));
    setAdmins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleAddAudio = async () => {
    if (!title || !audioUrl) {
      alert('请填写标题和音频链接');
      return;
    }
    try {
      await addDoc(collection(db, 'audioResources'), {
        title,
        audioUrl,
        description,
        category,
        createdAt: new Date().toISOString()
      });
      setTitle('');
      setAudioUrl('');
      setDescription('');
      setCategory('禅修');
      fetchAudios();
      alert('音频添加成功');
    } catch (error) {
      handleFirestoreError(error, 'create', 'audioResources');
    }
  };

  const handleEditAudio = async (id: string) => {
    try {
      await updateDoc(doc(db, 'audioResources', id), {
        title: editTitle,
        description: editDescription
      });
      setEditingAudioId(null);
      fetchAudios();
      alert('音频更新成功');
    } catch (error) {
      handleFirestoreError(error, 'update', 'audioResources/' + id);
    }
  };

  const startEdit = (audio: any) => {
    setEditingAudioId(audio.id);
    setEditTitle(audio.title);
    setEditDescription(audio.description || '');
  };

  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    alert('操作失败，请查看控制台日志');
    throw new Error(JSON.stringify(errInfo));
  };

  const handleDeleteAudio = async (id: string) => {
    await deleteDoc(doc(db, 'audioResources', id));
    fetchAudios();
  };

  const handleAddAdmin = async () => {
    if (!newAdminUid || !newAdminEmail) return;
    await setDoc(doc(db, 'admins', newAdminUid), {
      uid: newAdminUid,
      email: newAdminEmail
    });
    setNewAdminUid('');
    setNewAdminEmail('');
    fetchAdmins();
  };

  const handleDeleteAdmin = async (id: string) => {
    await deleteDoc(doc(db, 'admins', id));
    fetchAdmins();
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-zen-accent/10">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-zen-ink">添加音频资源</h2>
        <div className="space-y-3 sm:space-y-4">
          <input className="w-full p-2.5 sm:p-3 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50" placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="w-full p-2.5 sm:p-3 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50" placeholder="音频链接 (Firebase Storage URL)" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} />
          <input className="w-full p-2.5 sm:p-3 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50" placeholder="描述" value={description} onChange={(e) => setDescription(e.target.value)} />
          <select className="w-full p-2.5 sm:p-3 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50 bg-white" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <button className="flex items-center justify-center w-full p-3 bg-zen-accent text-white rounded-xl font-bold hover:opacity-90 transition-opacity" onClick={handleAddAudio}><Plus className="w-4 h-4 mr-2" /> 添加音频</button>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-zen-accent/10">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-zen-ink">当前音频资源</h2>
        <ul className="space-y-3">
          {audios.map(audio => (
            <li key={audio.id} className="flex flex-col p-3 sm:p-4 border border-zen-accent/10 rounded-xl bg-zen-bg/30">
              {editingAudioId === audio.id ? (
                <div className="space-y-3">
                  <input className="w-full p-2 border border-zen-accent/20 rounded-lg text-sm" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <input className="w-full p-2 border border-zen-accent/20 rounded-lg text-sm" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                  <div className="flex gap-2 justify-end">
                    <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" onClick={() => handleEditAudio(audio.id)}><Check className="w-4 h-4" /></button>
                    <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors" onClick={() => setEditingAudioId(null)}><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm sm:text-base text-zen-ink truncate">{audio.title}</div>
                    <div className="text-xs sm:text-sm text-zen-ink/60 line-clamp-2">{audio.description}</div>
                  </div>
                  <div className="flex gap-1 sm:gap-2 shrink-0">
                    <button className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" onClick={() => startEdit(audio)}><Edit2 className="w-4 h-4" /></button>
                    <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" onClick={() => handleDeleteAudio(audio.id)}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-zen-accent/10">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-zen-ink">管理员管理</h2>
        <div className="space-y-3 sm:space-y-4 mb-6">
          <input className="w-full p-2.5 sm:p-3 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50" placeholder="管理员 UID" value={newAdminUid} onChange={(e) => setNewAdminUid(e.target.value)} />
          <input className="w-full p-2.5 sm:p-3 border border-zen-accent/20 rounded-xl text-sm focus:outline-none focus:border-zen-accent/50" placeholder="管理员邮箱" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} />
          <button className="flex items-center justify-center w-full p-3 bg-zen-accent text-white rounded-xl font-bold hover:opacity-90 transition-opacity" onClick={handleAddAdmin}><UserPlus className="w-4 h-4 mr-2" /> 添加管理员</button>
        </div>
        <ul className="space-y-3">
          {admins.map(admin => (
            <li key={admin.id} className="flex justify-between items-center p-3 sm:p-4 border border-zen-accent/10 rounded-xl bg-zen-bg/30">
              <span className="text-sm sm:text-base text-zen-ink truncate mr-2">{admin.email} <span className="text-xs text-zen-ink/50 hidden sm:inline">({admin.uid})</span></span>
              <button className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0" onClick={() => handleDeleteAdmin(admin.id)}><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};