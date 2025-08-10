
// components/NSETabs.tsx
"use client";

import React, { useState } from "react";
import CryptoTable from "./CryptoTable";

const NSETabs = () => {
  const [activeMainTab, setActiveMainTab] = useState<"crypto" | "nse">("crypto");

  return (
    <div className="w-full">
      {/* MAIN TABS */}
      <div className="flex justify-center mb-4 space-x-6">
        <button
          className={`px-4 py-2 rounded-full ${activeMainTab === "crypto" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveMainTab("crypto")}
        >
          CRYPTO
        </button>
        <button
          className={`px-4 py-2 rounded-full ${activeMainTab === "nse" ? "bg-green-600 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveMainTab("nse")}
        >
          NSE
        </button>
      </div>

      {/* TABLE CONTENT */}
      {activeMainTab === "crypto" ? (
  <CryptoTable timeframe="15m" />
<CryptoTable timeframe="1h" />
<CryptoTable timeframe="4h" />
<CryptoTable timeframe="1d" />
) : (
  <div className="text-center text-gray-600 py-20">📊 NSE Table Coming Soon...</div>
)}

    </div>
  );
};

export default NSETabs;


