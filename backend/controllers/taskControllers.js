import Task from "../models/taskSchema.js";

// create
export const createTask = async (req, res) => {
    try {
        const { title, priority, category, status, attachment } = req.body;
        const newTask = await Task.create({ title, priority, category, status, attachment });
        res.status(201).json(newTask);
    } catch (error) {
        console.log(error.message)
        res.status(500).json(`Error creating task: ${error.message}`);
    }
}

// edit
export const editTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, priority, category, status, attachment } = req.body;
        const updatedTask = await Task.findByIdAndUpdate(id, { title, priority, category, status, attachment }, { new: true });
        res.status(200).json(updatedTask);
    } catch (error) {
        console.log(error.message)
        res.status(500).json(`Error updating task: ${error.message}`);
    }
}


// delete
export const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;        
        const deletedTask = await Task.findByIdAndDelete(id);
        res.status(200).json(deletedTask);
    } catch (error) {
        console.log(error.message)
        res.status(500).json(`Error deleting task: ${error.message}`);
    }
}

// get all

export const getAllTasks = async (req, res) => {
    try {
        const tasks = await Task.find();
        res.status(200).json(tasks);
    } catch (error) {
        console.log(error.message)
        res.status(500).json(`Error getting tasks: ${error.message}`);
    }
}