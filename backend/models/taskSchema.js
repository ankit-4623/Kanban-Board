import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  category: { type: String, enum: ["bug", "feature", "enhancement"], default: "feature" },
  status: { type: String, enum: ["todo", "in-progress", "done"], default: "todo" },
  attachment: { type: String },
}, { timestamps: true });

const Task = mongoose.model("Task", taskSchema);

export default Task;