// src/components/NavbarWrapper.js
import React from "react";
import Navbar from "./Navbar";
import { useCart } from "../context/CartContext"; // Adjust path to your actual CartContext

function NavbarWrapper(props) {
  const { state: cartState } = useCart();

  // Derive cart count safely
  const cartCount = cartState?.totalCount ?? cartState?.items?.length ?? 0;

  return (
    <Navbar
      {...props}
      cartCount={cartCount}
    />
  );
}

export default NavbarWrapper;