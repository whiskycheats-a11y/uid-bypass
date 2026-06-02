const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://uidbypass:uidbypass@cluster0.igrfjw8.mongodb.net/?appName=Cluster0";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const db = mongoose.connection.db;

  const users = await db.collection('users').find({}).toArray();
  console.log("--- USERS ---");
  for (const u of users) {
    console.log(`Username: ${u.username}`);
    console.log(`Role: ${u.role}`);
    console.log(`DisplayName: ${u.displayName}`);
    console.log(`Avatar length: ${u.avatar ? u.avatar.length : 0}`);
    console.log(`Avatar preview: ${u.avatar ? u.avatar.slice(0, 100) : 'none'}`);
    console.log("-------------");
  }

  const chats = await db.collection('chatmessages').find({}).sort({createdAt: -1}).limit(5).toArray();
  console.log("--- CHATS ---");
  for (const c of chats) {
    console.log(`User: ${c.username}`);
    console.log(`DisplayName: ${c.displayName}`);
    console.log(`Avatar length: ${c.avatar ? c.avatar.length : 0}`);
    console.log(`Msg: ${c.message}`);
    console.log("-------------");
  }

  await mongoose.disconnect();
}

run().catch(console.error);
