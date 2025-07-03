import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const API_BASE_URL = "http://localhost:3000/api";

const TransactionDashboard = () => {
  const [selectedMonth, setSelectedMonth] = useState("march");
  const [transactions, setTransactions] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statistics, setStatistics] = useState({
    totalSaleAmount: 0,
    totalSoldItems: 0,
    totalNotSoldItems: 0,
  });
  const [barChartData, setBarChartData] = useState([]);
  const [pieChartData, setPieChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];

  const COLORS = [
    "#9B5DE5", // purple
    "#FEE440", // yellow
    "#3A0CA3", // dark purple
    "#F15BB5", // pinkish purple
    "#00BBF9", // cyan
    "#7209B7", // purple
  ];

  // fetch logic unchanged...
  const fetchTransactions = async (page = 1, search = "") => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/transactions?month=${selectedMonth}&search=${search}&page=${page}&perPage=10`
      );
      const data = await response.json();

      setTransactions(data.data || []);

      const totalPages = data.perPage
        ? Math.ceil(data.total / data.perPage)
        : 1;

      setTotalPages(totalPages);
      setCurrentPage(data.page || page);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
    setLoading(false);
  };

  const fetchStatistics = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/statistics?month=${selectedMonth}`
      );
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const fetchBarChartData = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/bar-chart?month=${selectedMonth}`
      );
      const data = await response.json();

      const chartData = Object.entries(data).map(([range, count]) => ({
        range,
        count,
      }));
      setBarChartData(chartData);
    } catch (error) {
      console.error("Error fetching bar chart data:", error);
    }
  };

  const fetchPieChartData = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/pie-chart?month=${selectedMonth}`
      );
      const data = await response.json();

      const pieData = data.map((item) => ({
        category: item.category,
        count: item.count,
      }));

      setPieChartData(pieData);
    } catch (error) {
      console.error("Error fetching pie chart data:", error);
    }
  };

  const initializeDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/init`);
      const data = await response.json();
      alert(data.message);
      fetchAllData();
    } catch (error) {
      console.error("Error initializing database:", error);
      alert("Error initializing database");
    }
    setLoading(false);
  };

  const fetchAllData = () => {
    fetchTransactions(1, searchText);
    fetchStatistics();
    fetchBarChartData();
    fetchPieChartData();
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
    setCurrentPage(1);
    setSearchText("");
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchText(value);
    setCurrentPage(1);
    fetchTransactions(1, value);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      fetchTransactions(currentPage - 1, searchText);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      fetchTransactions(currentPage + 1, searchText);
    }
  };

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line
  }, [selectedMonth]);

  return (
    <div className="min-h-screen bg-black text-yellow-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-purple-400 mb-8">
          Transaction Dashboard
        </h1>

        {/* Initialize Button */}
        <div className="mb-6">
          <button
            onClick={initializeDatabase}
            disabled={loading}
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold transition disabled:opacity-50"
          >
            {loading ? "Initializing..." : "Initialize Database"}
          </button>
        </div>

        {/* Month Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-purple-300 mb-2">
            Select Month:
          </label>
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="bg-gray-800 text-yellow-50 border border-purple-500 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {month.charAt(0).toUpperCase() + month.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 p-6 rounded-lg shadow border border-purple-700">
            <h3 className="text-lg font-semibold text-purple-300 mb-2">
              Total Sale Amount
            </h3>
            <p className="text-3xl font-bold text-yellow-400">
              ${statistics.totalSaleAmount?.toFixed(2) || 0}
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg shadow border border-purple-700">
            <h3 className="text-lg font-semibold text-purple-300 mb-2">
              Total Sold Items
            </h3>
            <p className="text-3xl font-bold text-yellow-400">
              {statistics.totalSoldItems || 0}
            </p>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg shadow border border-purple-700">
            <h3 className="text-lg font-semibold text-purple-300 mb-2">
              Total Not Sold Items
            </h3>
            <p className="text-3xl font-bold text-yellow-400">
              {statistics.totalNotSoldItems || 0}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-gray-900 rounded-lg shadow border border-purple-700 mb-8">
          <div className="p-6 border-b border-purple-700">
            <h2 className="text-xl font-semibold text-purple-300 mb-4">
              Transactions
            </h2>
            <div className="flex justify-between items-center">
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchText}
                onChange={handleSearch}
                className="bg-gray-800 text-yellow-50 border border-purple-500 rounded-md px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                  className="bg-purple-600 hover:bg-purple-700 text-yellow-50 px-4 py-2 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-yellow-200">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                  className="bg-purple-600 hover:bg-purple-700 text-yellow-50 px-4 py-2 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-purple-800">
                <tr>
                  {["ID","Title","Description","Price","Category","Sold","Date"].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-3 text-left text-xs font-semibold text-yellow-100 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-700">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-purple-700 hover:text-yellow-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-50">{transaction.id}</td>
                    <td className="px-6 py-4 text-sm text-yellow-50 max-w-xs truncate">{transaction.title}</td>
                    <td className="px-6 py-4 text-sm text-yellow-50 max-w-xs truncate">{transaction.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-50">
                      ${transaction.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-50">{transaction.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        transaction.sold
                          ? "bg-yellow-400 text-black"
                          : "bg-gray-700 text-yellow-50"
                      }`}>
                        {transaction.sold ? "Sold" : "Not Sold"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-50">
                      {new Date(transaction.dateOfSale).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-900 p-6 rounded-lg shadow border border-purple-700">
            <h2 className="text-xl font-semibold text-purple-300 mb-4">
              Price Range Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#8884d8" />
                <XAxis dataKey="range" tick={{ fill: "#FEE440", fontSize: 12 }} />
                <YAxis tick={{ fill: "#FEE440" }} />
                <Tooltip contentStyle={{ background: "#3A0CA3", color: "#FEE440" }} />
                <Legend wrapperStyle={{ color: "#FEE440" }} />
                <Bar dataKey="count" fill="#9B5DE5" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-900 p-6 rounded-lg shadow border border-purple-700">
            <h2 className="text-xl font-semibold text-purple-300 mb-4">
              Category Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, count }) => `${category}: ${count}`}
                  outerRadius={80}
                  fill="#9B5DE5"
                  dataKey="count"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#3A0CA3", color: "#FEE440" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDashboard;
