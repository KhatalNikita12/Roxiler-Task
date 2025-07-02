import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TransactionDashboard from "./components/TransactionDashboard";
import './App.css';

function App() {
  return (
    <div className="App">
      <h1 className="text-3xl font-bold mb-4">Welcome to the Transaction Dashboard</h1>

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TransactionDashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
