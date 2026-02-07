import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { connectToWebSocket } from '../ws';
import Column from './Column';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import TaskProgressChart from './TaskProgressChart';
import './KanbanBoard.css';

const COLUMNS = ['todo', 'in-progress', 'done'];

function KanbanBoard() {
  const [tasks, setTasks] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  
  useEffect(() => {
    const socketInstance = connectToWebSocket();
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);

 
      socketInstance.emit('task:getAll', (response) => {
        // console.log(response)
        if (response.success) {
          setTasks(response.tasks);
        }
        setIsLoading(false);
      });

 // Real-time event listeners
    socketInstance.on('task:created', (task) => {
      setTasks((prev) => [task, ...prev]);
    });

    socketInstance.on('task:updated', (updatedTask) => {
      // console.log(updatedTask)
      setTasks((prev) =>
        prev.map((t) => (t._id === updatedTask._id ? updatedTask : t))
      );
    });

    socketInstance.on('task:moved', ({ taskId, newStatus }) => {
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
    });

    socketInstance.on('task:deleted', (taskId) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    });

    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

   

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Get tasks for a specific column
  const getTasksByStatus = useCallback(
    (status) => tasks.filter((task) => task.status === status),
    [tasks]
  );

  // Handle drag start
  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);
    setActiveTask(task);
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id;
    const task = tasks.find((t) => t._id === taskId);

    // Determine the new status based on where the task was dropped
    let newStatus = over.id;

    // If dropped on another task, get that task's status
    if (!COLUMNS.includes(over.id)) {
      const overTask = tasks.find((t) => t._id === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    // Only update if status changed
    if (task && task.status !== newStatus && COLUMNS.includes(newStatus)) {
      setIsSyncing(true);

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );

      // Send to server
      socket?.emit('task:move', { taskId, newStatus }, (response) => {
        setIsSyncing(false);
        if (!response.success) {
          // Revert on error
          setTasks((prev) =>
            prev.map((t) => (t._id === taskId ? { ...t, status: task.status } : t))
          );
          console.error('Failed to move task:', response.error);
        }
      });
    }
  };

  // Handle task creation
  const handleCreateTask = (taskData) => {
    setIsSyncing(true);
    socket?.emit('task:create', taskData, (response) => {
      setIsSyncing(false);
      if (response.success) {
        setShowForm(false);
      } else {
        alert('Failed to create task: ' + response.error);
      }
    });
  };

  // Handle task update
  const handleUpdateTask = (taskData) => {
    if (!editingTask) return;

    setIsSyncing(true);
    socket?.emit(
      'task:update',
      { taskId: editingTask._id, updates: taskData },
      (response) => {
        setIsSyncing(false);
        if (response.success) {
          setEditingTask(null);
          setShowForm(false);
        } else {
          alert('Failed to update task: ' + response.error);
        }
      }
    );
  };

  // Handle task deletion
  const handleDeleteTask = (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    setIsSyncing(true);
    socket?.emit('task:delete', taskId, (response) => {
      setIsSyncing(false);
      if (!response.success) {
        alert('Failed to delete task: ' + response.error);
      }
    });
  };

  // Handle edit task
  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  // Handle form submit
  const handleFormSubmit = (taskData) => {
    if (editingTask) {
      handleUpdateTask(taskData);
    } else {
      handleCreateTask(taskData);
    }
  };

  // Handle form cancel
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  if (isLoading) {
    return (
      <div className="kanban-loading">
        <div className="spinner"></div>
        <p>Loading Kanban Board...</p>
      </div>
    );
  }

  return (
    <div className="kanban-container">     
      <div className="kanban-header">
        <div className="header-left">
          <h2>Kanban Board</h2>
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
        <div className="header-right">
          {isSyncing && (
            <span className="sync-indicator">
              <div className="spinner-small"></div>
              Syncing...
            </span>
          )}
          <button className="btn-add-task" onClick={() => setShowForm(true)}>
            + New Task
          </button>
        </div>
      </div>

      {/* Task Progress Chart */}
      <TaskProgressChart tasks={tasks} />

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {COLUMNS.map((columnId) => (
            <Column
              key={columnId}
              id={columnId}
              tasks={getTasksByStatus(columnId)}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Form Modal */}
      {showForm && (
        <TaskForm
          task={editingTask}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );
}

export default KanbanBoard;
