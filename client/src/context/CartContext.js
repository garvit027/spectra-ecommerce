import React, { createContext, useContext, useReducer, useEffect } from 'react';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const newItem = action.payload;
      const existingItem = state.items.find((item) => item._id === newItem._id);
      
      const newItems = existingItem
        ? state.items.map((item) =>
            item._id === existingItem._id
              ? { ...item, quantity: item.quantity + newItem.qty }
              : item
          )
        : [...state.items, { ...newItem, quantity: newItem.qty }];

      return {
        ...state,
        items: newItems,
        totalCount: state.totalCount + newItem.qty,
      };
    }

    case 'REMOVE_FROM_CART': {
      const itemToRemove = state.items.find((item) => item._id === action.payload);
      if (!itemToRemove) return state;

      return {
        ...state,
        items: state.items.filter((item) => item._id !== action.payload),
        totalCount: state.totalCount - itemToRemove.quantity,
      };
    }

    case 'UPDATE_QUANTITY': {
      let totalCountAdjustment = 0;
      const updatedItems = state.items.map((item) => {
        if (item._id === action.payload.id) {
          totalCountAdjustment = action.payload.quantity - item.quantity;
          return { ...item, quantity: action.payload.quantity };
        }
        return item;
      });

      return {
        ...state,
        items: updatedItems,
        totalCount: state.totalCount + totalCountAdjustment,
      };
    }
    
    case 'CLEAR_CART':
      return { items: [], totalCount: 0 };
    
    case 'LOAD_CART':
      return action.payload;

    default:
      return state;
  }
};

const initialState = {
  items: [],
  totalCount: 0
};

export const CartProvider = ({ children }) => {
  // Initialize state from localStorage or use the initial state
  const [state, dispatch] = useReducer(cartReducer, initialState, (init) => {
    try {
      const savedCart = localStorage.getItem('cart');
      return savedCart ? JSON.parse(savedCart) : init;
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      return init;
    }
  });

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [state]);

  return (
    <CartContext.Provider value={{ cartItems: state.items, totalCount: state.totalCount, dispatch }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  // We expose cartItems and totalCount directly for easier use
  return context;
};