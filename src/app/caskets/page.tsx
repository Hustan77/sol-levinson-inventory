"use client";

import React, { useEffect, useState } from "react";
import ArrivalModal from "../components/ArrivalModal";

interface Casket {
  id: number;
  name: string;
  poNumber?: string;
}

export default function CasketsPage() {
  const [caskets, setCaskets] = useState<Casket[]>([]);
  const [isArrivalModalOpen, setIsArrivalModalOpen] = useState(false);
  const [selectedCasket, setSelectedCasket] = useState<Casket | null>(null);

  const fetchCaskets = async () => {
    const res = await fetch("/api/caskets");
    const data = await res.json();
    setCaskets(data);
  };

  useEffect(() => {
    fetchCaskets();
  }, []);

  const handleArrivalSuccess = () => {
    fetchCaskets();
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Caskets</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {caskets.map((casket) => (
          <div
            key={casket.id}
            className="border rounded-lg p-4 shadow hover:shadow-lg transition"
          >
            <h2 className="font-semibold text-lg">{casket.name}</h2>
            <p className="text-sm text-gray-500">
              PO#: {casket.poNumber || "N/A"}
            </p>
            <button
              onClick={() => {
                setSelectedCasket(casket);
                setIsArrivalModalOpen(true);
              }}
              className="mt-3 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Mark as Arrived
            </button>
          </div>
        ))}
      </div>

      <ArrivalModal
        isOpen={isArrivalModalOpen}
        onClose={() => setIsArrivalModalOpen(false)}
        casket={selectedCasket || undefined}
        onSuccess={handleArrivalSuccess}
      />
    </div>
  );
}
