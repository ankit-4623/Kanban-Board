import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = {
  'todo': '#6366f1',
  'in-progress': '#f59e0b',
  'done': '#10b981',
};

const LABELS = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'done': 'Done',
};

function TaskProgressChart({ tasks }) {
  // Count tasks by status
  const tasksByStatus = {
    'todo': tasks.filter((t) => t.status === 'todo').length,
    'in-progress': tasks.filter((t) => t.status === 'in-progress').length,
    'done': tasks.filter((t) => t.status === 'done').length,
  };

  const totalTasks = tasks.length;
  const completionPercentage = totalTasks > 0
    ? Math.round((tasksByStatus['done'] / totalTasks) * 100)
    : 0;

  // Data for bar chart
  const barData = [
    { name: 'To Do', count: tasksByStatus['todo'], fill: COLORS['todo'] },
    { name: 'In Progress', count: tasksByStatus['in-progress'], fill: COLORS['in-progress'] },
    { name: 'Done', count: tasksByStatus['done'], fill: COLORS['done'] },
  ];

  // Data for pie chart
  const pieData = [
    { name: 'To Do', value: tasksByStatus['todo'] },
    { name: 'In Progress', value: tasksByStatus['in-progress'] },
    { name: 'Done', value: tasksByStatus['done'] },
  ].filter((d) => d.value > 0);

  if (totalTasks === 0) {
    return (
      <div className="chart-container">
        <h3>Task Progress</h3>
        <p className="no-tasks-message">No tasks to display</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>Task Progress</h3>

      <div className="completion-summary">
        <div className="completion-circle" style={{
          background: `conic-gradient(${COLORS['done']} ${completionPercentage}%, #e5e7eb ${completionPercentage}%)`,
        }}>
          <div className="completion-inner">
            <span className="completion-percentage">{completionPercentage}%</span>
            <span className="completion-label">Complete</span>
          </div>
        </div>
        <div className="completion-stats">
          <p><strong>{totalTasks}</strong> total tasks</p>
          <p><strong>{tasksByStatus['done']}</strong> completed</p>
          <p><strong>{tasksByStatus['todo'] + tasksByStatus['in-progress']}</strong> remaining</p>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-section">
          <h4>Tasks by Status</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8">
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-section">
          <h4>Distribution</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[Object.keys(LABELS).find((k) => LABELS[k] === entry.name)]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default TaskProgressChart;
