import express from "express";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/dbConnect.js";
import cors from "cors";
import dotenv from "dotenv";
import taskRoutes from "./routes/taskRoutes.js";
import axios from "axios";
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Connect to database
await connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/tasks", taskRoutes);


// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);


  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
  });

  socket.on('task:getAll', async (callback) => {
    try {
      const response = await axios.get(`${process.env.BackendURL}/api/tasks`);
      if (response.status === 200) {
        callback({ success: true, tasks: response.data });
      } else {
        callback({ success: false, tasks: [], error: 'Failed to fetch tasks' });
      }
    } catch (error) {
      console.error('Error fetching tasks:', error.message);
      callback({ success: false, tasks: [], error: error.message });
    }
  });

// Create task event
socket.on('task:create', async (taskData,callback) => {
   const response = await axios.post(`${process.env.BackendURL}/api/tasks`, taskData);
   callback({ success: response.status === 201 });
    if (response.status === 201) {
        io.emit('task:created', response.data);
    } else {
        io.emit('error', 'Failed to create task');
    }
});

// Move task event
socket.on('task:move',async({taskId,newStatus},callback)=>{
    try {
        const response = await axios.put(`${process.env.BackendURL}/api/tasks/${taskId}`, { status: newStatus });
        callback({ success: response.status === 200 });
        if(response.status === 200){
          io.emit('task:moved', { taskId, newStatus });
        }
        else{
          io.emit('error', 'Failed to move task');
        }
    } catch (error) {
      console.log(`Error moving task: ${error.message}`);
      callback({ success: false, error: error.message });    
    }
})

// update task event
socket.on('task:update',async({taskId,updates},callback)=>{
  try {
    const response = await axios.put(`${process.env.BackendURL}/api/tasks/${taskId}`, updates);
   callback({success: response.status === 200 });
   if (response.status===200) {
    io.emit('task:updated',response.data);
   }
   else{
    io.emit('error', 'Failed to update task');
   }
  } catch (error) {
    console.log(`Error updating task: ${error.message}`);
    callback({ success: false, error: error.message });
  }
})

// delete task event
socket.on('task:delete',async(taskId,callback)=>{
  try {
    const response = await axios.delete(`${process.env.BackendURL}/api/tasks/${taskId}`);
    callback({ success: response.status === 200 });
    if (response.status === 200) {
      io.emit('task:deleted', taskId);
    } else {
      io.emit('error', 'Failed to delete task');
    }
  } catch (error) {
    console.log(`Error deleting task: ${error.message}`);
    callback({ success: false, error: error.message });
  }

});

});
const PORT = process.env.PORT
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
