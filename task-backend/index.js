const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const transactionRouter = require("./controllers/transactionController");

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect("", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected successfully!");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});

// Use transaction routes
app.use("/", transactionRouter);

app.listen(3000, () => console.log("Server running on port 3000"));
