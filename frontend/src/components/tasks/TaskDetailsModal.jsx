import { useState, useEffect, useCallback } from 'react';
import api, { getTaskAttachments, uploadTaskAttachment, deleteAttachment } from '../../services/api.js';

const TABS = ['Details', 'Comments', 'Attachments', 'History'];

const statusLabel = (s) =>
  ({ TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' }[s] || s);

function priorityBadgeStyle(priority) {
  switch (priority) {
    case 'HIGH':   return { bg: 'var(--danger-light)',  color: 'var(--danger)',  dot: 'var(--danger)' };
    case 'MEDIUM': return { bg: 'var(--warning-light)', color: 'var(--warning)', dot: 'var(--warning)' };
    case 'LOW':    return { bg: 'var(--success-light)', color: 'var(--success)', dot: 'var(--success)' };
    default:       return { bg: 'var(--border)',        color: 'var(--text-muted)', dot: 'var(--text-muted)' };
  }
}

function statusBadgeClass(status) {
  return { TODO: 'badge-todo', IN_PROGRESS: 'badge-progress', DONE: 'badge-done' }[status] || '';
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'DONE') return false;
  return new Date(dueDate) < new Date();
}

// ── Comment input ─────────────────────────────────────────────────────────
function CommentsTab() {
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState('');
  const rawUser = localStorage.getItem('user');
  let user = { name: 'You' };
  try { if (rawUser) user = JSON.parse(rawUser); } catch (_) {}

  const post = () => {
    if (!input.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: Date.now(),
        author: user.name,
        text: input.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: 'Today',
      },
    ]);
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
          No comments yet. Be the first to comment.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {comments.map((c) => (
            <div key={c.id} style={{
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{c.author}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.date} · {c.time}</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{c.text}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="form-control"
          placeholder="Add a comment…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && post()}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary btn-sm" onClick={post} disabled={!input.trim()}>
          Post
        </button>
      </div>
    </div>
  );
}

// ── Attachments Tab ───────────────────────────────────────────────────────
function AttachmentsTab({ taskId }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (taskId) {
      fetchAttachments();
    }
  }, [taskId]);

  const fetchAttachments = async () => {
    try {
      const { data } = await getTaskAttachments(taskId);
      setAttachments(data);
    } catch (err) {
      console.error('Failed to fetch attachments:', err);
      setError('Failed to load attachments');
    }
  };

  const handleUpload = async (files) => {
    setUploading(true);
    setError('');
    setUploadProgress(0);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        await uploadTaskAttachment(taskId, file);
        // Refetch to get new attachment
        await fetchAttachments();
      } catch (err) {
        console.error('Upload failed:', err);
        setError(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    setUploading(false);
    setUploadProgress(0);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.size > 0);
    if (droppedFiles.length > 0) {
      handleUpload(droppedFiles);
    }
  };

  const handleDelete = async (attachmentId) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      await deleteAttachment(attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete attachment');
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
        onDragLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        style={{
          border: `2px dashed ${uploading ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '32px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition)',
          color: 'var(--text-secondary)',
          background: uploading ? 'var(--accent-light)' : 'var(--bg-secondary)',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 12 }}>📎</div>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Drop files here or click to browse</div>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: uploading ? 12 : 0 }}>
          {uploading ? `Uploading... ${uploadProgress}%` : 'Supports .pdf, .doc, images, up to 10MB'}
        </div>
        {error && (
          <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>
            ⚠ {error}
          </div>
        )}
        {uploading && (
          <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginTop: 12 }}>
            <div style={{ height: '100%', background: 'var(--accent)', width: `${uploadProgress}%`, transition: 'width 0.3s' }} />
          </div>
        )}
      </div>

      {/* Files list */}
      {attachments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
          No attachments yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {attachments.map((attachment) => (
            <div key={attachment.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)',
              padding: '12px 16px', border: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 24, opacity: 0.8 }}>
                {attachment.fileType?.startsWith('image/') ? '🖼️' : attachment.fileType?.includes('pdf') ? '📄' : '📎'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {attachment.fileName}
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  <span>{formatSize(attachment.fileSize || 0)}</span>
                  <span style={{ opacity: 0.8 }}>by {attachment.uploadedBy} · {new Date(attachment.uploadedAt).toLocaleString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <a
                  href={`/api/tasks/attachments/${attachment.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ padding: '4px 12px', fontSize: 12 }}
                >
                  Download
                </a>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(attachment.id)}
                  style={{ padding: '4px 12px', fontSize: 12 }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────
function HistoryTab({ task }) {
  const history = [
    { action: 'Task created', user: task.createdBy || 'Admin', time: task.createdAt || '—' },
    task.status !== 'TODO' && { action: `Status changed to ${statusLabel(task.status)}`, user: 'System', time: '—' },
    task.assignedTo && { action: `Assigned to ${task.assignedTo}`, user: 'Admin', time: '—' },
  ].filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {history.map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
              marginTop: 5, flexShrink: 0,
            }} />
            {i < history.length - 1 && (
              <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 4 }} />
            )}
          </div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{h.action}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              by {h.user} · {h.time !== '—' ? new Date(h.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Detail Row ────────────────────────────────────────────────────────────
function DetailRow({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 110, flexShrink: 0, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: 2 }}>
        {label}
      </div>
      <div style={{ flex: 1, fontSize: 14, color: 'var(--text-secondary)' }}>{children}</div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────
export default function TaskDetailsModal({ task, projects, onClose }) {
  const [activeTab, setActiveTab] = useState('Details');

  const projectName = projects.find((p) => String(p.id) === String(task.projectId))?.name || task.projectId || '—';
  const overdue = isOverdue(task.dueDate, task.status);
  const pStyle = priorityBadgeStyle(task.priority);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <span className={`badge ${statusBadgeClass(task.status)}`}>{statusLabel(task.status)}</span>
              {task.priority && (
                <span className="badge" style={{ background: pStyle.bg, color: pStyle.color }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: pStyle.dot,
                    display: 'inline-block', marginRight: 5 }} />
                  {task.priority}
                </span>
              )}
              {overdue && <span className="badge badge-overdue">Overdue</span>}
            </div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700,
              color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
              {task.title}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)',
          flexShrink: 0, padding: '0 2px' }}>
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '10px 18px', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'var(--transition)', marginBottom: -1,
            }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0 4px' }}>
          {activeTab === 'Details' && (
            <div>
              {task.description && (
                <div style={{ marginBottom: 16, padding: '12px 14px',
                  background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', fontSize: 14, color: 'var(--text-secondary)',
                  lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {task.description}
                </div>
              )}
              <DetailRow label="Assigned To">
                {task.assignedTo
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%',
                        background: 'var(--accent-light)', border: '1px solid var(--border-active)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
                        {String(task.assignedTo)[0]?.toUpperCase()}
                      </span>
                      {task.assignedTo}
                    </span>
                  : <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
              </DetailRow>
              <DetailRow label="Project">
                <span style={{ display: 'inline-block', background: 'var(--purple-light)',
                  color: 'var(--purple)', padding: '2px 10px', borderRadius: 20, fontSize: 13 }}>
                  {projectName}
                </span>
              </DetailRow>
              <DetailRow label="Due Date">
                <span style={{ color: overdue ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: overdue ? 600 : 400 }}>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'}
                  {overdue && ' ⚠ Overdue'}
                </span>
              </DetailRow>
              <DetailRow label="Priority">
                {task.priority
                  ? <span className="badge" style={{ background: pStyle.bg, color: pStyle.color }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: pStyle.dot,
                        display: 'inline-block', marginRight: 5 }} />
                      {task.priority}
                    </span>
                  : <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </DetailRow>
              <DetailRow label="Status">
                <span className={`badge ${statusBadgeClass(task.status)}`}>{statusLabel(task.status)}</span>
              </DetailRow>
            </div>
          )}
          {activeTab === 'Comments' && <CommentsTab />}
          {activeTab === 'History'  && <HistoryTab task={task} />}
{activeTab === 'Attachments' && <AttachmentsTab taskId={task.id} />}
        </div>
      </div>
    </div>
  );
}
