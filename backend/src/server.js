const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const authRoutes = require("./routes/auth.route");
const usersRoutes = require("./routes/user.route");
const chatRoutes = require("./routes/chat.route");
const connectDB = require("./lib/db");
const path = require("path");

dotenv.config();
const port = process.env.PORT;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chat", chatRoutes);

console.log(__dirname);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "..", "frontend", "dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "frontend", "dist", "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
  connectDB();
});
