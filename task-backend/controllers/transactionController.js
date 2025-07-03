const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
const Transaction = require("./models/Transaction");

const app = express();
app.use(cors());
app.use(express.json());


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

    const query = search
      ? filter
      : { $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] } };

    const transactions = await Transaction.find(query)
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage));

    const total = await Transaction.countDocuments(query);

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

    const facetStage = {};

    for (const [min, max] of priceRanges) {
      const rangeKey = `${min}-${max === Infinity ? "above" : max}`;
      facetStage[rangeKey] = [
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
      ];
    }

    const pipeline = [
      {
        $facet: facetStage,
      },
    ];

    const result = await Transaction.aggregate(pipeline);

    const response = {};
    const facetResult = result[0];

    for (const [min, max] of priceRanges) {
      const rangeKey = `${min}-${max === Infinity ? "above" : max}`;
      response[rangeKey] = facetResult[rangeKey][0]?.count || 0;
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bar chart data" });
  }
});

// ---------- SIMPLE BAR CHART ----------
app.get("/api/bar-chart-simple", async (req, res) => {
  try {
    const { month } = req.query;
    const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;

    const priceRanges = [
      { min: 0, max: 100, label: "0-100" },
      { min: 101, max: 200, label: "101-200" },
      { min: 201, max: 300, label: "201-300" },
      { min: 301, max: 400, label: "301-400" },
      { min: 401, max: 500, label: "401-500" },
      { min: 501, max: 600, label: "501-600" },
      { min: 601, max: 700, label: "601-700" },
      { min: 701, max: 800, label: "701-800" },
      { min: 801, max: 900, label: "801-900" },
      { min: 901, max: Infinity, label: "901-above" },
    ];

    const response = {};

    for (const range of priceRanges) {
      const query = {
        $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
        price: {
          $gte: range.min,
          ...(range.max !== Infinity && { $lte: range.max }),
        },
      };

      const count = await Transaction.countDocuments(query);
      response[range.label] = count;
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bar chart data" });
  }
});

// ---------- BAR CHART BUCKET ----------
app.get("/api/bar-chart-bucket", async (req, res) => {
  try {
    const { month } = req.query;
    const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;

    const pipeline = [
      {
        $match: {
          $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
        },
      },
      {
        $bucket: {
          groupBy: "$price",
          boundaries: [0, 101, 201, 301, 401, 501, 601, 701, 801, 901],
          default: "901-above",
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ];

    const result = await Transaction.aggregate(pipeline);

    const response = {};
    const rangeLabels = [
      "0-100",
      "101-200",
      "201-300",
      "301-400",
      "401-500",
      "501-600",
      "601-700",
      "701-800",
      "801-900",
      "901-above",
    ];

    rangeLabels.forEach((label) => {
      response[label] = 0;
    });

    result.forEach((bucket, index) => {
      if (bucket._id === "901-above") {
        response["901-above"] = bucket.count;
      } else {
        response[rangeLabels[index]] = bucket.count;
      }
    });

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

    res.json(
      result.map((item) => ({
        category: item._id,
        count: item.count,
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pie chart data" });
  }
});

// ---------- DASHBOARD ----------
app.get("/api/dashboard", async (req, res) => {
  try {
    const { month } = req.query;

    const [transactionsRes, statistics, barChart, pieChart] =
      await Promise.all([
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
