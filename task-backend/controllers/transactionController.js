const axios = require("axios");
const Transaction = require("../models/Transaction");

exports.initializeDB = async (req, res) => {
  try {
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );

    await Transaction.deleteMany({});
    await Transaction.insertMany(response.data);
    res.json({ message: "Database initialized successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Initialization failed" });
  }
};

exports.getTransactions = async (req, res) => {
  const { month, search = "", page = 1, perPage = 10 } = req.query;
  try {
    const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;

    const regex = new RegExp(search, "i");

    const baseFilter = {
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
    };

    const filter = search
      ? {
          ...baseFilter,
          $or: [
            { title: regex },
            { description: regex },
            { price: isNaN(search) ? null : parseFloat(search) },
          ],
        }
      : baseFilter;

    const transactions = await Transaction.find(filter)
      .skip((page - 1) * perPage)
      .limit(Number(perPage));

    const total = await Transaction.countDocuments(filter);

    res.json({
      data: transactions,
      total,
      page: Number(page),
      perPage: Number(perPage),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get transactions" });
  }
};

exports.getStatistics = async (req, res) => {
  const { month } = req.query;
  try {
    const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;

    const soldStats = await Transaction.aggregate([
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
          totalSoldItems: { $sum: 1 },
        },
      },
    ]);

    const notSoldItems = await Transaction.countDocuments({
      sold: false,
      $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
    });

    res.json({
      totalSaleAmount: soldStats[0]?.totalSaleAmount || 0,
      totalSoldItems: soldStats[0]?.totalSoldItems || 0,
      totalNotSoldItems: notSoldItems,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get statistics" });
  }
};

exports.getBarChart = async (req, res) => {
  const { month } = req.query;
  try {
    const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;

    const ranges = [
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

    const result = {};
    for (let [min, max] of ranges) {
      const count = await Transaction.countDocuments({
        price: {
          $gte: min,
          ...(max !== Infinity && { $lte: max }),
        },
        $expr: { $eq: [{ $month: "$dateOfSale" }, monthNumber] },
      });

      result[`${min}-${max === Infinity ? "above" : max}`] = count;
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get bar chart" });
  }
};

exports.getPieChart = async (req, res) => {
  const { month } = req.query;
  try {
    const monthNumber = new Date(`${month} 1, 2000`).getMonth() + 1;

    const categories = await Transaction.aggregate([
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

    res.json(categories.map((c) => ({ category: c._id, count: c.count })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get pie chart" });
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const { month } = req.query;
    const [
      transactions,
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
      transactions: transactions.data,
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get dashboard" });
  }
};
