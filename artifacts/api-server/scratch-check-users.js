import mongoose from "mongoose";

const mongoUri = "mongodb+srv://uidbypass:uidbypass@cluster0.igrfjw8.mongodb.net/?appName=Cluster0";

async function main() {
  await mongoose.connect(mongoUri);
  console.log("Connected to Mongo Atlas");
  
  const users = await mongoose.connection.db.collection("users").find({}).toArray();
  console.log("Users in DB:");
  users.forEach(u => {
    console.log(`Username: ${u.username}, DisplayName: ${u.displayName}, Avatar length: ${u.avatar?.length || 0}`);
  });
  
  const chats = await mongoose.connection.db.collection("chatmessages").find({}).toArray();
  console.log("Chats in DB:");
  chats.forEach(c => {
    console.log(`Sender: ${c.username}, msg: ${c.message}, Avatar length: ${c.avatar?.length || 0}`);
  });

  await mongoose.disconnect();
}

main().catch(err => console.error(err));
