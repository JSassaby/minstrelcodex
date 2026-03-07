import { useState, useEffect, useCallback } from 'react';
import { db, type NoteRecord } from '@minstrelcodex/core';

interface NotesPanelProps {
  visible: boolean;
  projectId: string;
  onClose: () => void;
}

const uiFont = "var(--font-ui, 'Space Grotesk', sans-serif)";

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const pillBtn = (active: boolean): React.CSSProperties => ({
  padding: '4px 12px',
  borderRadius: '6px',
  border: active ? '1.5px solid var(--terminal-accent)' : '1px solid var(--terminal-border)',
  background: active ? 'var(--terminal-accent)' : 'transparent',
  color: active ? 'var(--terminal-bg)' : 'var(--terminal-text)',
  cursor: 'pointer',
  fontFamily: uiFont,
  fontSize: '11px',
  fontWeight: active ? '600' : '400',
  opacity: active ? 1 : 0.65,
  transition: 'all 0.1s',
  whiteSpace: 'nowrap' as const,
});

export default function NotesPanel({ visible, projectId, onClose }: NotesPanelProps) {
  const [tab, setTab] = useState<'character' | 'place'>('character');
  const [entries, setEntries] = useState<NoteRecord[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<NoteRecord>>({});
  const [addingNew, setAddingNew] = useState(false);

  // Load entries when projectId or tab changes
  useEffect(() => {
    if (!visible) return;
    db.notes
      .where('projectId').equals(projectId || '__global__')
      .and(n => n.type === tab)
      .sortBy('name')
      .then(setEntries)
      .catch(console.error);
  }, [visible, projectId, tab]);

  const reload = useCallback(() => {
    db.notes
      .where('projectId').equals(projectId || '__global__')
      .and(n => n.type === tab)
      .sortBy('name')
      .then(setEntries)
      .catch(console.error);
  }, [projectId, tab]);

  const saveEntry = useCallback(async (entry: NoteRecord) => {
    await db.notes.put(entry);
    reload();
  }, [reload]);

  const deleteEntry = useCallback(async (id: string) => {
    await db.notes.delete(id);
    if (expandedId === id) setExpandedId(null);
    reload();
  }, [reload, expandedId]);

  const startEdit = (entry: NoteRecord) => {
    setEditingId(entry.id);
    setDraft({ name: entry.name, description: entry.description, body: entry.body });
    setExpandedId(entry.id);
  };

  const commitEdit = async (entry: NoteRecord) => {
    await saveEntry({ ...entry, name: draft.name || entry.name, description: draft.description ?? entry.description, body: draft.body ?? entry.body });
    setEditingId(null);
    setDraft({});
  };

  const startNew = () => {
    setAddingNew(true);
    setDraft({ name: '', description: '', body: '' });
  };

  const commitNew = async () => {
    if (!draft.name?.trim()) { setAddingNew(false); setDraft({}); return; }
    const entry: NoteRecord = {
      id: newId(),
      projectId: projectId || '__global__',
      type: tab,
      name: draft.name.trim(),
      description: draft.description?.trim() || '',
      body: draft.body?.trim() || '',
    };
    await saveEntry(entry);
    setAddingNew(false);
    setDraft({});
    setExpandedId(entry.id);
  };

  const filtered = entries.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.body.toLowerCase().includes(q);
  });

  if (!visible) return null;

  return (
    <div style={{
      width: '300px',
      flexShrink: 0,
      borderRight: '1px solid var(--terminal-border)',
      background: 'var(--terminal-bg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: uiFont,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid var(--terminal-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', color: 'var(--terminal-accent)', opacity: 0.9 }}>
          NOTES
        </span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button onClick={startNew} title="Add entry" style={{ background: 'none', border: 'none', color: 'var(--terminal-accent)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px', opacity: 0.8 }}>+</button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--terminal-text)', cursor: 'pointer', opacity: 0.5, fontSize: '14px', padding: '0 2px' }}>×</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--terminal-border)', display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button style={pillBtn(tab === 'character')} onClick={() => { setTab('character'); setExpandedId(null); setEditingId(null); }}>Characters</button>
        <button style={pillBtn(tab === 'place')} onClick={() => { setTab('place'); setExpandedId(null); setEditingId(null); }}>Places</button>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--terminal-border)', flexShrink: 0 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${tab === 'character' ? 'characters' : 'places'}…`}
          style={{
            width: '100%', background: 'var(--terminal-surface)', border: '1px solid var(--terminal-border)',
            color: 'var(--terminal-text)', padding: '5px 9px', fontSize: '12px', fontFamily: uiFont,
            outline: 'none', borderRadius: '5px', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Add new form */}
      {addingNew && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--terminal-border)', background: 'var(--terminal-surface)', flexShrink: 0 }}>
          <input
            autoFocus
            value={draft.name ?? ''}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Name *"
            onKeyDown={e => { if (e.key === 'Enter') commitNew(); if (e.key === 'Escape') { setAddingNew(false); setDraft({}); } }}
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--terminal-border)', color: 'var(--terminal-text)', padding: '4px 0', fontSize: '13px', fontFamily: uiFont, outline: 'none', boxSizing: 'border-box', marginBottom: '6px', fontWeight: '600' }}
          />
          <input
            value={draft.description ?? ''}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            placeholder="One-line description"
            onKeyDown={e => { if (e.key === 'Enter') commitNew(); if (e.key === 'Escape') { setAddingNew(false); setDraft({}); } }}
            style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--terminal-border)', color: 'var(--terminal-text)', padding: '4px 0', fontSize: '12px', fontFamily: uiFont, outline: 'none', boxSizing: 'border-box', opacity: 0.7, marginBottom: '8px' }}
          />
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setAddingNew(false); setDraft({}); }} style={{ ...pillBtn(false), fontSize: '10px' }}>Cancel</button>
            <button onClick={commitNew} style={{ ...pillBtn(true), fontSize: '10px' }}>Add</button>
          </div>
        </div>
      )}

      {/* Entry list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && !addingNew && (
          <div style={{ padding: '24px 14px', fontSize: '12px', opacity: 0.4, textAlign: 'center' }}>
            {search ? 'No matches' : `No ${tab === 'character' ? 'characters' : 'places'} yet.\nClick + to add one.`}
          </div>
        )}

        {filtered.map(entry => {
          const isExpanded = expandedId === entry.id;
          const isEditing = editingId === entry.id;

          return (
            <div
              key={entry.id}
              style={{
                borderBottom: '1px solid var(--terminal-border)',
                background: isExpanded ? 'var(--terminal-surface)' : 'transparent',
              }}
            >
              {/* Entry header row */}
              <div
                style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</div>
                  {entry.description && (
                    <div style={{ fontSize: '11px', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>{entry.description}</div>
                  )}
                </div>
                <span style={{ opacity: 0.3, fontSize: '10px', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
              </div>

              {/* Expanded area */}
              {isExpanded && (
                <div style={{ padding: '0 14px 12px' }}>
                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={draft.name ?? entry.name}
                        onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                        style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--terminal-accent)', color: 'var(--terminal-text)', padding: '4px 0', fontSize: '13px', fontFamily: uiFont, outline: 'none', boxSizing: 'border-box', marginBottom: '6px', fontWeight: '600' }}
                      />
                      <input
                        value={draft.description ?? entry.description}
                        onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                        placeholder="One-line description"
                        style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--terminal-border)', color: 'var(--terminal-text)', padding: '4px 0', fontSize: '12px', fontFamily: uiFont, outline: 'none', boxSizing: 'border-box', opacity: 0.7, marginBottom: '8px' }}
                      />
                      <textarea
                        value={draft.body ?? entry.body}
                        onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                        placeholder="Notes…"
                        rows={5}
                        style={{ width: '100%', background: 'var(--terminal-bg)', border: '1px solid var(--terminal-border)', color: 'var(--terminal-text)', padding: '7px 9px', fontSize: '12px', fontFamily: uiFont, outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: '8px', lineHeight: 1.5 }}
                      />
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => { setEditingId(null); setDraft({}); }} style={{ ...pillBtn(false), fontSize: '10px' }}>Cancel</button>
                        <button onClick={() => commitEdit(entry)} style={{ ...pillBtn(true), fontSize: '10px' }}>Save</button>
                      </div>
                    </>
                  ) : (
                    <>
                      {entry.body && (
                        <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '8px' }}>
                          {entry.body}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button onClick={() => deleteEntry(entry.id)} style={{ ...pillBtn(false), fontSize: '10px', opacity: 0.45 }}>Delete</button>
                        <button onClick={() => startEdit(entry)} style={{ ...pillBtn(false), fontSize: '10px' }}>Edit</button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Project indicator */}
      <div style={{ padding: '6px 14px', borderTop: '1px solid var(--terminal-border)', fontSize: '10px', opacity: 0.35, flexShrink: 0 }}>
        {projectId || 'No project open'}
      </div>
    </div>
  );
}
