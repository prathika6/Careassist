import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Plus, X, ChevronLeft, Heart } from 'lucide-react';
import { format } from 'date-fns';

export default function MemoryVault() {
  const { profile, patientRecord } = useAuth();
  const toast = useToast();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const mode = patientRecord?.age_mode || 'adult';

  const [form, setForm] = useState({
    title: '',
    description: '',
    memory_date: '',
    image_url: '',
    tags: '',
  });

  useEffect(() => {
    if (patientRecord?.id) loadMemories();
  }, [patientRecord]);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memory_vault')
        .select('*, added_by_profile:added_by(full_name)')
        .eq('patient_id', patientRecord.id)
        .order('memory_date', { ascending: false });
      if (error) throw error;
      setMemories(data || []);
    } catch (err) {
      toast.error('Could not load memories');
    } finally {
      setLoading(false);
    }
  };

  const saveMemory = async () => {
    if (!form.title.trim()) { toast.error('Please add a title for this memory'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('memory_vault').insert({
        patient_id: patientRecord.id,
        added_by: profile.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        memory_date: form.memory_date || null,
        image_url: form.image_url.trim() || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      });
      if (error) throw error;
      toast.success('Memory saved to your vault! 📸');
      setShowAdd(false);
      setForm({ title: '', description: '', memory_date: '', image_url: '', tags: '' });
      loadMemories();
    } catch (err) {
      toast.error('Could not save memory');
    } finally {
      setSaving(false);
    }
  };

  const deleteMemory = async (id) => {
    if (!window.confirm('Remove this memory from the vault?')) return;
    try {
      const { error } = await supabase.from('memory_vault').delete().eq('id', id);
      if (error) throw error;
      toast.success('Memory removed');
      setSelected(null);
      loadMemories();
    } catch {
      toast.error('Could not remove memory');
    }
  };

  const EMOJIS = ['🌸', '🌟', '🎂', '🎄', '🌊', '🏡', '💐', '🎓', '👨‍👩‍👧', '🌺', '🎉', '💍'];
  const getEmoji = (title) => EMOJIS[title.charCodeAt(0) % EMOJIS.length];

  if (selected) {
    return (
      <div>
        <button className="btn btn-ghost mb-4" onClick={() => setSelected(null)}>
          <ChevronLeft size={16} /> Back to Vault
        </button>
        <div className="card" style={{ maxWidth: 600 }}>
          {selected.image_url ? (
            <img src={selected.image_url} alt={selected.title}
              style={{ width: '100%', height: 280, objectFit: 'cover', borderRadius: 16, marginBottom: 20 }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div style={{
              width: '100%', height: 200, borderRadius: 16, marginBottom: 20,
              background: 'linear-gradient(135deg, #fed7aa, #fde68a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64
            }}>
              {getEmoji(selected.title)}
            </div>
          )}
          <h2 style={{ fontFamily: 'Lora, serif', fontSize: 24, marginBottom: 8 }}>
            {selected.title}
          </h2>
          {selected.memory_date && (
            <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>
              📅 {format(new Date(selected.memory_date), 'MMMM d, yyyy')}
            </div>
          )}
          {selected.description && (
            <p style={{ color: '#374151', lineHeight: 1.8, fontSize: mode === 'elder' ? 17 : 15, marginBottom: 16 }}>
              {selected.description}
            </p>
          )}
          {selected.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {selected.tags.map(tag => (
                <span key={tag} className="badge badge-coral">#{tag}</span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#d1d5db' }}>
              Added by {selected.added_by_profile?.full_name || 'Family'}
            </span>
            <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}
              onClick={() => deleteMemory(selected.id)}>
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="page-title">
              {mode === 'child' ? '🌟 My Memory Book' : mode === 'elder' ? '🌸 Memory Vault' : '📸 Memory Vault'}
            </h2>
            <p className="page-subtitle">
              {mode === 'child' ? 'All your happiest moments, saved forever! ✨' :
               mode === 'elder' ? 'A treasure chest of your precious memories 🌼' :
               'Your cherished memories, always with you'}
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Add Memory
          </button>
        </div>
      </div>

      {loading ? <div className="loading-spinner" /> : (
        <>
          {memories.length === 0 ? (
            <div className="card empty-state">
              <div style={{ fontSize: 56 }}>📸</div>
              <p className="empty-state-text">
                {mode === 'child' ? 'No memories yet! Add your first happy moment! 🌟' :
                 mode === 'elder' ? 'Your memory vault is empty. Add your first precious memory! 🌸' :
                 'Your memory vault is empty. Add your first memory!'}
              </p>
              <button className="btn btn-primary mt-4" onClick={() => setShowAdd(true)}>
                <Plus size={16} /> Add First Memory
              </button>
            </div>
          ) : (
            <div className="memory-grid">
              {memories.map(mem => (
                <div key={mem.id} className="memory-item" onClick={() => setSelected(mem)}>
                  {mem.image_url ? (
                    <img src={mem.image_url} alt={mem.title} className="memory-img"
                      onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="memory-placeholder" style={{ display: mem.image_url ? 'none' : 'flex' }}>
                    {getEmoji(mem.title)}
                  </div>
                  <div className="memory-info">
                    <div style={{ fontWeight: 700, fontSize: mode === 'elder' ? 16 : 14, color: '#111827' }}>
                      {mem.title}
                    </div>
                    {mem.memory_date && (
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        {format(new Date(mem.memory_date), 'MMM d, yyyy')}
                      </div>
                    )}
                    {mem.description && (
                      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4,
                        overflow: 'hidden', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {mem.description}
                      </p>
                    )}
                    {mem.tags?.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {mem.tags.slice(0, 2).map(tag => (
                          <span key={tag} style={{
                            fontSize: 10, background: '#fff9f0', color: '#c2410c',
                            padding: '2px 8px', borderRadius: 20, fontWeight: 600
                          }}>#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Memory Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="modal-title" style={{ marginBottom: 0 }}>
                {mode === 'child' ? '🌟 Add a Happy Memory' :
                 mode === 'elder' ? '🌸 Add a Precious Memory' :
                 '📸 Add a Memory'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Memory Title *</label>
              <input type="text" className="form-input"
                placeholder={mode === 'child' ? "What is this memory called?" :
                             mode === 'elder' ? "What would you like to name this memory?" :
                             "Give this memory a title"}
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Memory Date</label>
              <input type="date" className="form-input"
                value={form.memory_date}
                onChange={e => setForm(prev => ({ ...prev, memory_date: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {mode === 'child' ? 'Tell me about it! 🌈' : 'Description'}
              </label>
              <textarea className="form-input form-textarea"
                placeholder={mode === 'child' ? "What happened? Who was there?" :
                             mode === 'elder' ? "Share the story of this special memory..." :
                             "Describe this memory..."}
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Image URL (optional)</label>
              <input type="url" className="form-input"
                placeholder="https://... (link to a photo)"
                value={form.image_url}
                onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))}
              />
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Paste a link to a photo. Supabase Storage upload coming in v1.1.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Tags (comma separated)</label>
              <input type="text" className="form-input"
                placeholder="family, birthday, summer"
                value={form.tags}
                onChange={e => setForm(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-outline flex-1" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="btn btn-primary flex-1" onClick={saveMemory} disabled={saving}>
                {saving ? 'Saving...' : '💾 Save Memory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
