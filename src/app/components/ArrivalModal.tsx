"use client";

import React, { useState } from "react";

type ItemType = "casket" | "urn";

interface ArrivalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  casket?: {
    id: number;
    name: string;
    poNumber?: string;
  };
  urn?: {
    id: number;
    name: string;
    poNumber?: string;
  };
}

export default function ArrivalModal({
  isOpen,
  onClose,
  onSuccess,
  casket,
  urn
}: ArrivalModalProps) {
  const [arrivalDate, setArrivalDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const itemType: ItemType = casket ? "casket" : "urn";
  const item = casket || urn;

  if (!item) return null;

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const endpoint =
        itemType === "casket"
          ? `/api/caskets/${item.id}/arrive`
          : `/api/urns/${item.id}/arrive`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arrivalDate })
      });

      if (!res.ok) {
        throw new Error("Failed to mark arrival");
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error marking item as arrived");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <h2 className="text-2xl font-bold mb-4">
          Mark {itemType === "casket" ? "Casket" : "Urn"} as Arrived
        </h2>
        <p className="mb-4">Item: <strong>{item.name}</strong></p>

        <label className="block mb-2 text-sm font-medium text-gray-700">
          Arrival Date
        </label>
        <input
          type="date"
          value={arrivalDate}
          onChange={(e) => setArrivalDate(e.target.value)}
          className="w-full border border-gray-300 rounded p-2 mb-4"
        />

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
            disabled={isSubmitting || !arrivalDate}
          >
            {isSubmitting ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
