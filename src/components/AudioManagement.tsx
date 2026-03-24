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
    <div className="space-y-6 p-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">添加音频资源</h2>
        <div className="space-y-4">
          <input className="w-full p-2 border rounded" placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="w-full p-2 border rounded" placeholder="音频链接 (Firebase Storage URL)" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} />
          <input className="w-full p-2 border rounded" placeholder="描述" value={description} onChange={(e) => setDescription(e.target.value)} />
          <select className="w-full p-2 border rounded" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <button className="flex items-center justify-center w-full p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700" onClick={handleAddAudio}><Plus className="w-4 h-4 mr-2" /> 添加音频</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">当前音频资源</h2>
        <ul className="space-y-2">
          {audios.map(audio => (
            <li key={audio.id} className="flex flex-col p-2 border rounded">
              {editingAudioId === audio.id ? (
                <div className="space-y-2">
                  <input className="w-full p-1 border rounded" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <input className="w-full p-1 border rounded" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                  <div className="flex gap-2">
                    <button className="p-1 text-green-500 hover:bg-green-50 rounded" onClick={() => handleEditAudio(audio.id)}><Check className="w-4 h-4" /></button>
                    <button className="p-1 text-gray-500 hover:bg-gray-50 rounded" onClick={() => setEditingAudioId(null)}><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold">{audio.title}</div>
                    <div className="text-sm text-gray-500">{audio.description}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-blue-500 hover:bg-blue-50 rounded" onClick={() => startEdit(audio)}><Edit2 className="w-4 h-4" /></button>
                    <button className="p-2 text-red-500 hover:bg-red-50 rounded" onClick={() => handleDeleteAudio(audio.id)}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">管理员管理</h2>
        <div className="space-y-4 mb-4">
          <input className="w-full p-2 border rounded" placeholder="管理员 UID" value={newAdminUid} onChange={(e) => setNewAdminUid(e.target.value)} />
          <input className="w-full p-2 border rounded" placeholder="管理员邮箱" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} />
          <button className="flex items-center justify-center w-full p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700" onClick={handleAddAdmin}><UserPlus className="w-4 h-4 mr-2" /> 添加管理员</button>
        </div>
        <ul className="space-y-2">
          {admins.map(admin => (
            <li key={admin.id} className="flex justify-between items-center p-2 border rounded">
              <span>{admin.email} ({admin.uid})</span>
              <button className="p-2 text-red-500 hover:bg-red-50 rounded" onClick={() => handleDeleteAdmin(admin.id)}><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
