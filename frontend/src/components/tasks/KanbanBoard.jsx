import { useState, useRef } from 'react';

const COLUMNS = [
  { id: 'TODO',        label: 'To Do',       color: 'var(--accent)',   bg: 'var(--accent-light)' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'var(--warning)',  bg: 'var(--warning-light)' },
  { id: 'DONE',        label: 'Done',        color: 'var(--success)',  bg: 'var(--success-light)' },
];

function priorityDotColor(p) {
  return { HIGH: 'var(--danger)', MEDIUM: 'var(--warning)', LOW: 'var(--success)' }[p] || 'transparent';
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'DONE') return false;
  return new Date(dueDate) < new Date();
}

function KanbanCard({ task, onView, onEdit, isAdmin, isDragging }) {
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      style={{
        background: isDragging ? 'var(--bg-card-hover)' : 'var(--bg-secondary)',
        border: `1px solid ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '14px',
        cursor: 'grab',
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
        opacity: isDragging ? 0.5 : 1,
        userSelect: 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Priority dot + title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        {task.priority && (
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: priorityDotColor(task.priority),
            flexShrink: 0, marginTop: 5,
          }} title={task.priority} />
        )}
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
          lineHeight: 1.4, flex: 1 }}>
          {task.title}
        </div>
      </div>

      {/* Description preview */}
      {task.description && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          lineHeight: 1.5 }}>
          {task.description}
        </div>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {task.assignedTo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%',
              background: 'var(--accent-light)', border: '1px solid var(--border-active)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>
              {String(task.assignedTo)[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.assignedTo}</span>
          </div>
        )}
        {task.dueDate && (
          <span style={{ fontSize: 11, color: overdue ? 'var(--danger)' : 'var(--text-muted)',
            fontWeight: overdue ? 600 : 400 }}>
            {overdue ? '⚠ ' : '📅 '}
            {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <button className="btn btn-outline btn-sm" onClick={() => onView(task)}
          style={{ flex: 1, fontSize: 12, padding: '5px' }}>
          👁 View
        </button>
        {isAdmin && (
          <button className="btn btn-outline btn-sm" onClick={() => onEdit(task)}
            style={{ flex: 1, fontSize: 12, padding: '5px' }}>
            ✏ Edit
          </button>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ tasks, isAdmin, onView, onEdit, onStatusChange }) {
  const [dragOverCol, setDragOverCol] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };

  const handleDrop = (e, colId) => {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData('taskId'));
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== colId) {
      onStatusChange(taskId, colId);
    }
    setDragOverCol(null);
    setDraggingId(null);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
      position: 'relative', zIndex: 1 }}>
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        const isOver = dragOverCol === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={(e) => handleDrop(e, col.id)}
            style={{
              background: isOver ? 'rgba(59,130,246,0.04)' : 'var(--bg-card)',
              border: `1px solid ${isOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              minHeight: 400,
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
          >
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14,
                  color: 'var(--text-primary)' }}>
                  {col.label}
                </span>
              </div>
              <span style={{ background: col.bg, color: col.color, padding: '2px 8px',
                borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                {colTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {colTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 16px',
                  color: 'var(--text-muted)', fontSize: 13,
                  border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
                  {isOver ? '📥 Drop here' : 'No tasks'}
                </div>
              ) : (
                colTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    isAdmin={isAdmin}
                    onView={onView}
                    onEdit={onEdit}
                    isDragging={draggingId === task.id}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
