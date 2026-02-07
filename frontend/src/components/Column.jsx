import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import TaskCard from './TaskCard';

const columnStyles = {
  'todo': { headerColor: '#6366f1', label: 'To Do' },
  'in-progress': { headerColor: '#f59e0b', label: 'In Progress' },
  'done': { headerColor: '#10b981', label: 'Done' },
};

function Column({ id, tasks, onEditTask, onDeleteTask }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const { headerColor, label } = columnStyles[id] || { headerColor: '#gray', label: id };

  return (
    <div className={`column ${isOver ? 'column-over' : ''}`}>
      <div className="column-header" style={{ backgroundColor: headerColor }}>
        <h3>{label}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>

      <div ref={setNodeRef} className="column-content">
        <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="empty-column">
            <p>No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Column;
