import mongoose from "mongoose";
import { config } from "./config";

async function check() {
  await mongoose.connect(config.MONGODB_URI);
  const db = mongoose.connection.db;
  const admin = await db?.collection("users").findOne({ role: "admin" });
  console.log("Admin in DB:", admin);
  process.exit(0);
}
check();
