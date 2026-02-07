import React, { useState, useEffect } from 'react';
import Select from 'react-select';

const priorityOptions = [
  { value: 'low', label: 'Low', color: '#4caf50' },
  { value: 'medium', label: 'Medium', color: '#ff9800' },
  { value: 'high', label: 'High', color: '#f44336' },
];

const categoryOptions = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'enhancement', label: 'Enhancement' },
];

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const customStyles = {
  control: (base) => ({
    ...base,
    minHeight: '38px',
    borderColor: '#e2e8f0',
    '&:hover': { borderColor: '#6366f1' },
  }),
  option: (base, { data }) => ({
    ...base,
    color: data.color || '#333',
  }),
  singleValue: (base, { data }) => ({
    ...base,
    color: data.color || '#333',
  }),
};

function TaskForm({ task, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    priority: 'medium',
    category: 'feature',
    status: 'todo',
    attachment: '',
  });
  const [filePreview, setFilePreview] = useState(null);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        priority: task.priority || 'medium',
        category: task.category || 'feature',
        status: task.status || 'todo',
        attachment: task.attachment || '',
      });
      if (task.attachment) {
        setFilePreview(task.attachment);
      }
    }
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (field) => (option) => {
    setFormData((prev) => ({ ...prev, [field]: option.value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create a local URL for preview (simulated backend storage)
      const fileUrl = URL.createObjectURL(file);
      setFilePreview(fileUrl);
      setFormData((prev) => ({ ...prev, attachment: fileUrl }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }
    onSubmit(formData);
  };

  const clearAttachment = () => {
    setFilePreview(null);
    setFormData((prev) => ({ ...prev, attachment: '' }));
  };

  return (
    <div className="modal-overlay">
      <div className="task-form-modal">
        <h3>{task ? 'Edit Task' : 'Create New Task'}</h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter task title"
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <Select
                options={priorityOptions}
                value={priorityOptions.find((o) => o.value === formData.priority)}
                onChange={handleSelectChange('priority')}
                styles={customStyles}
                isSearchable={false}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <Select
                options={categoryOptions}
                value={categoryOptions.find((o) => o.value === formData.category)}
                onChange={handleSelectChange('category')}
                styles={customStyles}
                isSearchable={false}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Status</label>
            <Select
              options={statusOptions}
              value={statusOptions.find((o) => o.value === formData.status)}
              onChange={handleSelectChange('status')}
              styles={customStyles}
              isSearchable={false}
            />
          </div>

          <div className="form-group">
            <label>Attachment</label>
            <input
              type="file"
              id="attachment"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileChange}
              className="file-input"
            />

            {filePreview && (
              <div className="file-preview">
                {filePreview.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                filePreview.startsWith('blob:') ? (
                  <img src={filePreview} alt="Preview" className="preview-image" />
                ) : (
                  <span className="preview-file">📎 File attached</span>
                )}
                <button type="button" onClick={clearAttachment} className="btn-clear">
                  ✕ Remove
                </button>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskForm;
