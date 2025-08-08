"use client";

import React, { useEffect, useState } from "react";
import ArrivalModal from "../components/ArrivalModal";

interface Urn {
  id: number;
  name: string;
  poNumber?: string;
}

export default function UrnsPage() {
  const [urns, setUrns] = useState<Urn[]>([]);
  const [isArrivalModalOpen, setIsArrivalModalOpen] = useState(false);
  const [selectedUrn, setSelectedUrn] = useState<Urn | null>(null);

  const fetchUrns = async () => {
    const res = await fetch("/api/urns");
    const data = await res.json();
    setUrns(data);
  };

  useEffect(() => {
    fetchUrns();
  }, []);

  const handleArrivalSuccess = () => {
    fetchUrns();
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Urns</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {urns.map((urn) => (
          <div
            key={urn.id}
            className="border rounded-lg p-4 shadow hover:shadow-lg transition"
          >
            <h2 className="font-semibold text-lg">{urn.name}</h2>
            <p className="text-sm text-gray-500">
              PO#: {urn.poNumber || "N/A"}
            </p>
            <button
              onClick={() => {
                setSelectedUrn(urn);
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
        urn={selectedUrn || undefined}
        onSuccess={handleArrivalSuccess}
      />
    </div>
  );
}
