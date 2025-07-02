const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
const Transaction = require("./models/Transaction");

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect("mongodb+srv://khatalnikita2003:W3LQtGeNsYrU4oDF@cluster-proj-db.rbit1ru.mongodb.net/?retryWrites=true&w=majority&appName=cluster-proj-db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB connected successfully!");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});
// ---------- API TO SEED DB ----------
app.get("/api/init", async (req, res) => {
  try {
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    await Transaction.deleteMany({});
    await Transaction.insertMany(response.data);
    res.json({ message: "Database initialized!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to initialize DB" });
  }
});

// ---------- LIST TRANSACTIONS ----------
app.get("/api/transactions", async (req, res) => {
  try {
    const { month, search = "", page = 1, perPage = 2 } = req.query;

    const regex = new RegExp(search, "i");

    // Create month filter
    const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;

    const filter = {
      $expr: {
        $eq: [{ $month: "$dateOfSale" }, monthNumber],
      },
      $or: [
        { title: regex },
        { description: regex },
        { price: isNaN(search) ? null : parseFloat(search) },
      ],
    };

    const transactions = await Transaction.find(
      search ? filter : { $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] } }
    )
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage));

    const total = await Transaction.countDocuments(
      search ? filter : { $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] } }
    );

    res.json({
      data: transactions,
      total,
      page: parseInt(page),
      perPage: parseInt(perPage),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// ---------- STATISTICS ----------
app.get("/api/statistics", async (req, res) => {
  try {
    const { month } = req.query;
    const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;

    const soldItems = await Transaction.aggregate([
      {
        $match: {
          sold: true,
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
        },
      },
      {
        $group: {
          _id: null,
          totalSaleAmount: { $sum: "$price" },
          count: { $sum: 1 },
        },
      },
    ]);

    const notSoldCount = await Transaction.countDocuments({
      sold: false,
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
    });

    res.json({
      totalSaleAmount: soldItems[0]?.totalSaleAmount || 0,
      totalSoldItems: soldItems[0]?.count || 0,
      totalNotSoldItems: notSoldCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// ---------- BAR CHART ----------
app.get("/api/bar-chart", async (req, res) => {
  try {
    const { month } = req.query;
    const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;

    const priceRanges = [
      [0, 100],
      [101, 200],
      [201, 300],
      [301, 400],
      [401, 500],
      [501, 600],
      [601, 700],
      [701, 800],
      [801, 900],
      [901, Infinity],
    ];

    const pipeline = [];

    for (const [min, max] of priceRanges) {
      pipeline.push({
        $facet: {
          [`${min}-${max === Infinity ? "above" : max}`]: [
            {
              $match: {
                price: {
                  $gte: min,
                  ...(max !== Infinity && { $lte: max }),
                },
                $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
              },
            },
            { $count: "count" },
          ],
        },
      });
    }

    const result = await Transaction.aggregate(pipeline);

    const response = {};

    for (const obj of result) {
      const key = Object.keys(obj)[0];
      response[key] = obj[key][0]?.count || 0;
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bar chart data" });
  }
});

// ---------- PIE CHART ----------
app.get("/api/pie-chart", async (req, res) => {
  try {
    const { month } = req.query;
    const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;

    const result = await Transaction.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(result.map(item => ({
      category: item._id,
      count: item.count,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pie chart data" });
  }
});

// ---------- DASHBOARD ----------
app.get("/api/dashboard", async (req, res) => {
  try {
    const { month } = req.query;

    const [
      transactionsRes,
      statistics,
      barChart,
      pieChart,
    ] = await Promise.all([
      axios.get(`http://localhost:3000/api/transactions?month=${month}`),
      axios.get(`http://localhost:3000/api/statistics?month=${month}`),
      axios.get(`http://localhost:3000/api/bar-chart?month=${month}`),
      axios.get(`http://localhost:3000/api/pie-chart?month=${month}`),
    ]);

    res.json({
      transactions: transactionsRes.data,
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
