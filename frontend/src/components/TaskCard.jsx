import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const priorityColors = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
};

const categoryLabels = {
  bug: '🐛 Bug',
  feature: '✨ Feature',
  enhancement: '🔧 Enhancement',
};

function TaskCard({ task, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
    >
      <div className="task-header">
        <span
          className="priority-badge"
          style={{ backgroundColor: priorityColors[task.priority] }}
        >
          {task.priority}
        </span>
        <span className="category-badge">{categoryLabels[task.category]}</span>
      </div>

      <h4 className="task-title">{task.title}</h4>

      {task.attachment && (
        <div className="task-attachment">
          {task.attachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
            <img src={task.attachment} alt="Attachment" className="attachment-preview" />
          ) : (
            <a href={task.attachment} target="_blank" rel="noopener noreferrer" className="attachment-link">
              📎 View Attachment
            </a>
          )}
        </div>
      )}

      <div className="task-actions">
        <button
          className="btn-edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
        >
          ✏️
        </button>
        <button
          className="btn-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task._id);
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default TaskCard;
