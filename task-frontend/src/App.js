import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import TransactionDashboard from "./components/TransactionDashboard";
import './App.css';

function App() {
  return (
    <div className="App">
    
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TransactionDashboard />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
