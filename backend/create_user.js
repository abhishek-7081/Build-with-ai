import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { User } from "./models/User.js";

dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/delhi_civic_navigator";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    // Check if user exists
    const existing = await User.findOne({ phone: "123456789" });
    if (existing) {
      console.log("User 123456789 already exists. Re-creating password...");
      existing.password = await bcrypt.hash("Abhishek@1", 10);
      existing.name = "Abhishek";
      await existing.save();
      console.log("Updated existing user successfully.");
    } else {
      const hashedPassword = await bcrypt.hash("Abhishek@1", 10);
      const user = new User({
        name: "Abhishek",
        phone: "123456789",
        password: hashedPassword
      });
      await user.save();
      console.log("Created user Abhishek successfully.");
    }
  } catch (error) {
    console.error("Database operation failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();


// remove this file later too
