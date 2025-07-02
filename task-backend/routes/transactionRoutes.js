const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/transactionController");

router.get("/init", ctrl.initializeDB);
router.get("/transactions", ctrl.getTransactions);
router.get("/statistics", ctrl.getStatistics);
router.get("/bar-chart", ctrl.getBarChart);
router.get("/pie-chart", ctrl.getPieChart);
router.get("/dashboard", ctrl.getDashboard);

module.exports = router;
