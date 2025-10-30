import React, { useState } from "react";
import EnhancedFamilyTree from "../components/EnhancedFamilyTree";
import VisualFamilyTree from "../VisualFamilyTree";
import CardFamilyTreePage from "../CardFamilyTreePage";

const FamilyTreePage = () => {
  // Show CardFamilyTree by default (new hierarchical tree)
  const [selectedTree, setSelectedTree] = useState("card");

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="container mx-auto px-4">
        {/* Page Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Gogte Family Tree
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore your family heritage through our interactive family tree with dynamic relationships.
            Click on any member to see all their relationships highlighted across the entire tree.
          </p>
        </div>

        {/* Dropdown to select tree type */}
        <div className="flex justify-center mb-4">
          <select
            value={selectedTree}
            onChange={(e) => setSelectedTree(e.target.value)}
            className="border border-amber-400 rounded-lg px-6 py-3 text-lg font-semibold bg-white shadow-md hover:border-orange-500 focus:outline-none focus:ring-4 focus:ring-amber-300 transition duration-200 ease-in-out"
            style={{
              minWidth: "300px",
              color: "#b45309",
              boxShadow: "0 2px 8px rgba(255, 193, 7, 0.08)",
              cursor: "pointer",
            }}
          >
            <option value="card">Hierarchical Card Tree (NEW)</option>
            <option value="enhanced">Enhanced Family Tree</option>
            <option value="dynamic">Dynamic Family Tree</option>
          </select>
        </div>

        {/* Render selected tree */}
        <div className="pb-8">
          {selectedTree === "dynamic" ? (
            <VisualFamilyTree />
          ) : selectedTree === "enhanced" ? (
            <EnhancedFamilyTree />
          ) : (
            <CardFamilyTreePage />
          )}
        </div>
      </div>
    </div>
  );
};

export default FamilyTreePage;

