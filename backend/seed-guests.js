const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("./src/lib/db");
const User = require("./src/models/User");
const { StreamChat } = require("stream-chat");

dotenv.config();

const seedGuests = async () => {
  try {
    await connectDB();
    
    if (!process.env.STREAM_API_KEY || !process.env.STREAM_SECRET_KEY) {
      throw new Error("STREAM_API_KEY and STREAM_SECRET_KEY must be set in .env");
    }
    const streamClient = StreamChat.getInstance(process.env.STREAM_API_KEY, process.env.STREAM_SECRET_KEY);
    
    console.log("Wiping existing guest users...");
    await User.deleteMany({ email: { $in: ["guest1@streamsync.com", "guest2@streamsync.com"] } });

    console.log("Creating Guest 1...");
    const guest1 = new User({
      fullName: "John Doe (Guest 1)",
      email: "guest1@streamsync.com",
      password: "guest123",
      profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=guest1",
      isOnboarded: true,
      bio: "I'm a guest user testing out StreamSync.",
      nativeLanguage: "English",
      learningLanguage: "Spanish",
    });

    console.log("Creating Guest 2...");
    const guest2 = new User({
      fullName: "Jane Smith (Guest 2)",
      email: "guest2@streamsync.com",
      password: "guest123",
      profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=guest2",
      isOnboarded: true,
      bio: "I'm a guest user testing out StreamSync.",
      nativeLanguage: "Spanish",
      learningLanguage: "English",
    });

    await guest1.save();
    await guest2.save();

    console.log("Linking guests as friends...");
    guest1.friends.push(guest2._id);
    guest2.friends.push(guest1._id);

    await guest1.save();
    await guest2.save();

    console.log("Adding guests to GetStream...");
    await streamClient.upsertUsers([
      { id: guest1._id.toString(), name: guest1.fullName },
      { id: guest2._id.toString(), name: guest2.fullName },
    ]);

    console.log("Guest users seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding guests:", error);
    process.exit(1);
  }
};

seedGuests();
