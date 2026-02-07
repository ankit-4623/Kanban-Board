import mongoose from "mongoose";
import dns from "node:dns/promises";
dns.setServers(["8.8.8.8", "1.1.1.1"]);


const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("Database connected");
  } catch (error) {
    console.log(error);
  }
};

export default connectDB;