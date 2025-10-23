// src/components/ProductTable.jsx
import React from "react";

function ProductTable({ products, onDelete }) {
  return (
    <div className="p-4 overflow-x-auto">
      <table className="w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Price</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((prod) => (
            <tr key={prod._id} className="border-t">
              <td className="p-2">{prod.name}</td>
              <td className="p-2">₹{prod.price}</td>
              <td className="p-2">
                <button className="text-blue-500 mr-2 hover:underline">Edit</button>
                <button
                  className="text-red-500 hover:underline"
                  onClick={() => onDelete(prod._id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductTable;