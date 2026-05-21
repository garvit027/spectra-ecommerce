import React from 'react';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';

const OrderTimeline = ({ status }) => {
  const stages = [
    { id: 'pending', label: 'Order Placed', icon: Clock },
    { id: 'processing', label: 'Processing', icon: Package },
    { id: 'shipped', label: 'Shipped', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle },
  ];

  // Determine current active step index
  const currentIndex = stages.findIndex(s => s.id === status);
  // If status is cancelled, we might just handle it separately or treat it as an error state.
  const isCancelled = status === 'cancelled';

  return (
    <div className="w-full py-6 px-4">
      {isCancelled ? (
        <div className="text-center p-4 bg-red-50 text-red-600 rounded-lg font-medium">
          This order has been cancelled.
        </div>
      ) : (
        <div className="flex items-center justify-between relative max-w-3xl mx-auto">
          {/* Progress Bar Background */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 rounded"></div>
          
          {/* Active Progress Bar */}
          <div 
            className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-purple-600 rounded transition-all duration-500 ease-in-out"
            style={{ width: `${currentIndex >= 0 ? (currentIndex / (stages.length - 1)) * 100 : 0}%` }}
          ></div>

          {/* Steps */}
          {stages.map((stage, index) => {
            const isActive = index <= currentIndex;
            const isCurrent = index === currentIndex;
            const Icon = stage.icon;

            return (
              <div key={stage.id} className="relative z-10 flex flex-col items-center">
                <div 
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-4 transition-colors duration-300 ${
                    isActive ? 'bg-purple-600 border-purple-100 text-white shadow-md' : 'bg-white border-gray-200 text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="mt-3 text-xs sm:text-sm text-center">
                  <span className={`${isCurrent ? 'text-purple-700 font-bold' : isActive ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                    {stage.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderTimeline;
