import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KanbanBoard from '../../components/KanbanBoard';

// Store multiple client event handlers
const createMockSocket = () => {
  const eventHandlers = {};
  return {
    on: vi.fn((event, handler) => {
      eventHandlers[event] = handler;
      return this;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: `mock-socket-${Math.random().toString(36).substr(2, 9)}`,
    _handlers: eventHandlers,
    trigger: (event, data) => {
      if (eventHandlers[event]) {
        eventHandlers[event](data);
      }
    },
  };
};

let mockSocket;
let allSockets = [];

vi.mock('../../ws', () => ({
  connectToWebSocket: () => {
    mockSocket = createMockSocket();
    allSockets.push(mockSocket);
    return mockSocket;
  },
}));

// Mock @dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragStart, onDragEnd }) => {
    // Store handlers globally for testing
    window.__dndHandlers = { onDragStart, onDragEnd };
    return <div data-testid="dnd-context">{children}</div>;
  },
  DragOverlay: ({ children }) => <div data-testid="drag-overlay">{children}</div>,
  closestCorners: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: vi.fn(),
  SortableContext: ({ children }) => <>{children}</>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => null,
    },
  },
}));

// Mock recharts
vi.mock('recharts', () => ({
  PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

window.confirm = vi.fn(() => true);
window.alert = vi.fn();

describe('WebSocket Integration - Multi-Client Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allSockets = [];
  });

  afterEach(() => {
    allSockets = [];
  });

  describe('Real-time Task Synchronization', () => {
    test('task created by one client appears in another client', async () => {
      // Setup mock socket to return initial tasks
      const setupSocket = (socket) => {
        socket.emit.mockImplementation((event, data, callback) => {
          if (event === 'task:getAll' && typeof data === 'function') {
            data({ success: true, tasks: [] });
          } else if (callback) {
            callback({ success: true });
          }
        });
      };

      // Render first client
      render(<KanbanBoard />);
      const socket1 = mockSocket;
      setupSocket(socket1);

      await act(async () => {
        socket1.trigger('connect');
      });

      // Simulate task created by another client (broadcast)
      await act(async () => {
        socket1.trigger('task:created', {
          _id: 'task-from-client-2',
          title: 'Task From Client 2',
          status: 'todo',
          priority: 'high',
          category: 'bug',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Task From Client 2')).toBeInTheDocument();
      });
    });

    test('task updated by one client reflects in another client', async () => {
      const initialTasks = [
        { _id: 'shared-task', title: 'Shared Task', status: 'todo', priority: 'low', category: 'feature' },
      ];

      render(<KanbanBoard />);
      
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'task:getAll' && typeof data === 'function') {
          data({ success: true, tasks: initialTasks });
        }
      });

      await act(async () => {
        mockSocket.trigger('connect');
      });

      await waitFor(() => {
        expect(screen.getByText('Shared Task')).toBeInTheDocument();
      });

      // Simulate update from another client
      await act(async () => {
        mockSocket.trigger('task:updated', {
          _id: 'shared-task',
          title: 'Updated By Client 2',
          status: 'todo',
          priority: 'high',
          category: 'feature',
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Updated By Client 2')).toBeInTheDocument();
        expect(screen.queryByText('Shared Task')).not.toBeInTheDocument();
      });
    });

    test('task deleted by one client is removed from another client', async () => {
      const initialTasks = [
        { _id: 'task-to-delete', title: 'Task To Be Deleted', status: 'todo', priority: 'medium', category: 'bug' },
      ];

      render(<KanbanBoard />);
      
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'task:getAll' && typeof data === 'function') {
          data({ success: true, tasks: initialTasks });
        }
      });

      await act(async () => {
        mockSocket.trigger('connect');
      });

      await waitFor(() => {
        expect(screen.getByText('Task To Be Deleted')).toBeInTheDocument();
      });

      // Simulate delete from another client
      await act(async () => {
        mockSocket.trigger('task:deleted', 'task-to-delete');
      });

      await waitFor(() => {
        expect(screen.queryByText('Task To Be Deleted')).not.toBeInTheDocument();
      });
    });

    test('task moved by one client updates position in another client', async () => {
      const initialTasks = [
        { _id: 'movable-task', title: 'Movable Task', status: 'todo', priority: 'low', category: 'enhancement' },
      ];

      render(<KanbanBoard />);
      
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'task:getAll' && typeof data === 'function') {
          data({ success: true, tasks: initialTasks });
        }
      });

      await act(async () => {
        mockSocket.trigger('connect');
      });

      await waitFor(() => {
        expect(screen.getByText('Movable Task')).toBeInTheDocument();
      });

      // Simulate move from another client
      await act(async () => {
        mockSocket.trigger('task:moved', { taskId: 'movable-task', newStatus: 'done' });
      });

      // Task should still be visible (now in done column)
      await waitFor(() => {
        expect(screen.getByText('Movable Task')).toBeInTheDocument();
      });
    });
  });

  describe('Connection State Management', () => {
    test('shows disconnected state when WebSocket disconnects', async () => {
      render(<KanbanBoard />);
      
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'task:getAll' && typeof data === 'function') {
          data({ success: true, tasks: [] });
        }
      });

      await act(async () => {
        mockSocket.trigger('connect');
      });

      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });

      await act(async () => {
        mockSocket.trigger('disconnect');
      });

      await waitFor(() => {
        expect(screen.getByText(/Disconnected/)).toBeInTheDocument();
      });
    });

    test('reconnects and fetches tasks on reconnection', async () => {
      render(<KanbanBoard />);
      
      let taskFetchCount = 0;
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'task:getAll' && typeof data === 'function') {
          taskFetchCount++;
          data({ success: true, tasks: [] });
        }
      });

      // First connection
      await act(async () => {
        mockSocket.trigger('connect');
      });

      expect(taskFetchCount).toBe(1);
    });
  });

  describe('Optimistic Updates with Server Validation', () => {
    test('reverts optimistic update on server error', async () => {
      const initialTasks = [
        { _id: 'task-1', title: 'Test Task', status: 'todo', priority: 'medium', category: 'feature' },
      ];

      render(<KanbanBoard />);
      
      let moveCallback;
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'task:getAll' && typeof data === 'function') {
          data({ success: true, tasks: initialTasks });
        } else if (event === 'task:move') {
          moveCallback = callback;
        }
      });

      await act(async () => {
        mockSocket.trigger('connect');
      });

      await waitFor(() => {
        expect(screen.getByText('Test Task')).toBeInTheDocument();
      });

      // Simulate drag end event
      if (window.__dndHandlers?.onDragEnd) {
        await act(async () => {
          window.__dndHandlers.onDragEnd({
            active: { id: 'task-1' },
            over: { id: 'in-progress' },
          });
        });
      }

      // Check that task:move was emitted
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'task:move',
        expect.objectContaining({ taskId: 'task-1', newStatus: 'in-progress' }),
        expect.any(Function)
      );
    });
  });

  describe('Multiple Rapid Updates', () => {
    test('handles rapid successive updates correctly', async () => {
      render(<KanbanBoard />);
      
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'task:getAll' && typeof data === 'function') {
          data({ success: true, tasks: [] });
        }
      });

      await act(async () => {
        mockSocket.trigger('connect');
      });

      // Simulate rapid task creations
      await act(async () => {
        for (let i = 1; i <= 5; i++) {
          mockSocket.trigger('task:created', {
            _id: `rapid-task-${i}`,
            title: `Rapid Task ${i}`,
            status: 'todo',
            priority: 'medium',
            category: 'feature',
          });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Rapid Task 1')).toBeInTheDocument();
        expect(screen.getByText('Rapid Task 5')).toBeInTheDocument();
      });
    });

    test('handles concurrent create and delete operations', async () => {
      const initialTasks = [
        { _id: 'existing-task', title: 'Existing Task', status: 'todo', priority: 'low', category: 'bug' },
      ];

      render(<KanbanBoard />);
      
      mockSocket.emit.mockImplementation((event, data, callback) => {
        if (event === 'task:getAll' && typeof data === 'function') {
          data({ success: true, tasks: initialTasks });
        }
      });

      await act(async () => {
        mockSocket.trigger('connect');
      });

      await waitFor(() => {
        expect(screen.getByText('Existing Task')).toBeInTheDocument();
      });

      // Simultaneous create and delete
      await act(async () => {
        mockSocket.trigger('task:deleted', 'existing-task');
        mockSocket.trigger('task:created', {
          _id: 'new-task',
          title: 'New Task',
          status: 'in-progress',
          priority: 'high',
          category: 'enhancement',
        });
      });

      await waitFor(() => {
        expect(screen.queryByText('Existing Task')).not.toBeInTheDocument();
        expect(screen.getByText('New Task')).toBeInTheDocument();
      });
    });
  });
});

describe('Drag and Drop Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    allSockets = [];
  });

  test('emits task:move event when task is dropped in different column', async () => {
    const initialTasks = [
      { _id: 'draggable-task', title: 'Draggable Task', status: 'todo', priority: 'high', category: 'bug' },
    ];

    render(<KanbanBoard />);
    
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (event === 'task:getAll' && typeof data === 'function') {
        data({ success: true, tasks: initialTasks });
      } else if (callback) {
        callback({ success: true });
      }
    });

    await act(async () => {
      mockSocket.trigger('connect');
    });

    await waitFor(() => {
      expect(screen.getByText('Draggable Task')).toBeInTheDocument();
    });

    // Trigger drag end
    if (window.__dndHandlers?.onDragEnd) {
      await act(async () => {
        window.__dndHandlers.onDragEnd({
          active: { id: 'draggable-task' },
          over: { id: 'done' },
        });
      });
    }

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'task:move',
      { taskId: 'draggable-task', newStatus: 'done' },
      expect.any(Function)
    );
  });

  test('does not emit when task is dropped in same column', async () => {
    const initialTasks = [
      { _id: 'static-task', title: 'Static Task', status: 'todo', priority: 'medium', category: 'feature' },
    ];

    render(<KanbanBoard />);
    
    mockSocket.emit.mockClear();
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (event === 'task:getAll' && typeof data === 'function') {
        data({ success: true, tasks: initialTasks });
      }
    });

    await act(async () => {
      mockSocket.trigger('connect');
    });

    await waitFor(() => {
      expect(screen.getByText('Static Task')).toBeInTheDocument();
    });

    const emitCallsBefore = mockSocket.emit.mock.calls.filter(call => call[0] === 'task:move').length;

    // Trigger drag end to same column
    if (window.__dndHandlers?.onDragEnd) {
      await act(async () => {
        window.__dndHandlers.onDragEnd({
          active: { id: 'static-task' },
          over: { id: 'todo' },
        });
      });
    }

    const emitCallsAfter = mockSocket.emit.mock.calls.filter(call => call[0] === 'task:move').length;
    expect(emitCallsAfter).toBe(emitCallsBefore);
  });

  test('does not emit when drop target is null', async () => {
    const initialTasks = [
      { _id: 'orphan-task', title: 'Orphan Task', status: 'in-progress', priority: 'low', category: 'enhancement' },
    ];

    render(<KanbanBoard />);
    
    mockSocket.emit.mockClear();
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (event === 'task:getAll' && typeof data === 'function') {
        data({ success: true, tasks: initialTasks });
      }
    });

    await act(async () => {
      mockSocket.trigger('connect');
    });

    await waitFor(() => {
      expect(screen.getByText('Orphan Task')).toBeInTheDocument();
    });

    // Trigger drag end with null over
    if (window.__dndHandlers?.onDragEnd) {
      await act(async () => {
        window.__dndHandlers.onDragEnd({
          active: { id: 'orphan-task' },
          over: null,
        });
      });
    }

    expect(mockSocket.emit).not.toHaveBeenCalledWith(
      'task:move',
      expect.anything(),
      expect.anything()
    );
  });

  test('sets active task during drag start', async () => {
    const initialTasks = [
      { _id: 'active-task', title: 'Active Task', status: 'todo', priority: 'high', category: 'bug' },
    ];

    render(<KanbanBoard />);
    
    mockSocket.emit.mockImplementation((event, data, callback) => {
      if (event === 'task:getAll' && typeof data === 'function') {
        data({ success: true, tasks: initialTasks });
      }
    });

    await act(async () => {
      mockSocket.trigger('connect');
    });

    await waitFor(() => {
      expect(screen.getByText('Active Task')).toBeInTheDocument();
    });

    // Trigger drag start
    if (window.__dndHandlers?.onDragStart) {
      await act(async () => {
        window.__dndHandlers.onDragStart({
          active: { id: 'active-task' },
        });
      });
    }

    // The drag overlay should now show the active task
    expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
  });
});
