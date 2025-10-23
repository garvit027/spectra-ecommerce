import React, { useEffect, useState } from "react"; // Removed useMemo
import { useParams, useNavigate } from "react-router-dom";
import {
  Star, StarHalf, Heart, Share2, ShoppingCart, Plus, Minus,
  Truck, Shield, RotateCcw, CheckCircle, ChevronRight, ZoomIn, X, Zap, ThumbsUp, Flag
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { api, API_URL } from "../api/client"; // Removed getToken
import { useAuth } from "../context/authContext";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dispatch: cartDispatch } = useCart();
  const { user, loading: authLoading } = useAuth(); // Get user from context

  // ... (keep existing state variables: product, related, loading, err, etc.) ...
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeTab, setActiveTab] = useState("description");
  const [isWishlisted, setIsWishlisted] = useState(false);

  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: "", images: [] });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [helpfulBusy, setHelpfulBusy] = useState({});


    useEffect(() => {
        console.log("ProductDetail: Re-rendered. Current context user:", user);
    }, [user]);


  // ... (keep renderStars, useEffect fetch product, toggleWishlist, addToCart functions) ...
    // stars
  const renderStars = (rating, size = 16) => {
    const stars = [];
    const full = Math.floor(rating || 0);
    const half = (rating || 0) % 1 >= 0.5;
    for (let i = 0; i < full; i++) stars.push(<Star key={`f${i}`} size={size} className="fill-yellow-400 text-yellow-400" />);
    if (half) stars.push(<StarHalf key="half" size={size} className="fill-yellow-400 text-yellow-400" />);
    for (let i = 0; i < 5 - full - (half ? 1 : 0); i++) stars.push(<Star key={`e${i}`} size={size} className="text-gray-300" />);
    return stars;
  };

  // fetch product + related
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); // Product loading state
      setErr(null);
      try {
        const res = await fetch(`${API_URL}/api/products/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        setProduct(data);
        setSelectedVariant(data?.variants?.[0] || null);

        // Fetch related products
        try {
          const relatedRes = await fetch(`${API_URL}/api/products/${id}/related`);
          if (relatedRes.ok) {
            setRelated(await relatedRes.json());
          } else if (data?.category) {
            // Fallback: fetch by category if /related fails
            const categoryRes = await fetch(`${API_URL}/api/products?category=${encodeURIComponent(data.category)}&limit=7`); // Limit results
            if (categoryRes.ok) {
              const categoryProducts = await categoryRes.json();
              setRelated(
                (Array.isArray(categoryProducts) ? categoryProducts : categoryProducts.products || [])
                .filter(p => String(p._id) !== String(id))
                .slice(0, 6) // Ensure only 6 related are shown
              );
            }
          }
        } catch (relatedErr) {
            console.warn("Could not fetch related products:", relatedErr);
            setRelated([]); // Ensure related is an array even on error
        }

      } catch (e) {
        console.error("Failed to fetch product:", e);
        setErr(e.message || "Failed to fetch product");
        setProduct(null); // Clear product on error
      } finally {
        if (mounted) setLoading(false); // Done loading product
      }
    })();
    return () => { mounted = false; };
  }, [id]); // Only re-run if product ID changes

  // wishlist (local demo)
  const toggleWishlist = () => setIsWishlisted(w => !w);

  // add to cart
  const addToCart = () => {
    if (!product || (product.stock ?? product.stockCount ?? 0) < quantity) {
        alert("Cannot add to cart. Check stock availability.");
        return;
    };
    cartDispatch({
      type: "ADD_TO_CART",
      payload: {
        _id: product._id || product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0],
        qty: quantity,
        variant: selectedVariant?.name || null,
        stock: product.stock ?? product.stockCount ?? 0,
        seller: product.seller?._id || product.seller,
      },
    });
    alert(`${quantity} x ${product.name} added to cart!`); // Simple confirmation
  };

  // ---
  // ✅ UPDATED BUY NOW FUNCTION
  // ---
  const buyNow = () => {
    // 1. Check if user is logged in
    if (!user) {
      console.log("Buy Now: No user found, navigating to login.");
      // Redirect to login, but pass the current product page as the return destination
      navigate(`/login?redirect=/product/${id}`);
      return;
    }

    // 2. Check stock
    if (!product || (product.stock ?? product.stockCount ?? 0) < quantity) {
      alert("Insufficient stock to purchase."); // Use a more user-friendly notification later
      return;
    }

    // 3. Prepare data to pass to the checkout page
    const checkoutData = {
      productId: product._id,
      quantity: quantity,
      variant: selectedVariant, // Pass the selected variant object or null
      price: product.price, // Pass current price
      name: product.name,
      image: product.images?.[0],
      sellerId: product.seller?._id || product.seller,
    };

    console.log("Buy Now: Navigating to Buy Now Checkout with data:", checkoutData);

    // 4. Navigate to the new Buy Now checkout page, passing data via state
    navigate('/buy-now-checkout', { state: checkoutData });
  };
  // --- END OF UPDATED BUY NOW ---

  // ... (keep handleReviewImage, removeReviewImage, submitReview, toggleHelpful, inc, dec functions) ...
    // review images (local previews)
  const handleReviewImage = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // Simple validation (e.g., max 3 images, max 2MB each)
    if (reviewForm.images.length + files.length > 3) {
        alert("You can upload a maximum of 3 images per review.");
        return;
    }
     const maxSize = 2 * 1024 * 1024; // 2MB
     for (const file of files) {
         if (file.size > maxSize) {
             alert(`File ${file.name} is too large (max 2MB).`);
             return;
         }
     }

    // Create temporary URLs for preview
    const urls = files.map(f => URL.createObjectURL(f));
    // In a real app, you'd upload files here and store URLs/IDs
    setReviewForm((prev) => ({ ...prev, images: [...prev.images, ...urls].slice(0, 3) })); // Store URLs, limit to 3
     // Remember to revoke Object URLs when component unmounts or images are removed to prevent memory leaks
     // URL.revokeObjectURL(url);
  };

   const removeReviewImage = (indexToRemove) => {
        setReviewForm(prev => {
            const newImages = prev.images.filter((_, index) => index !== indexToRemove);
            // Optionally revoke URL.revokeObjectURL(prev.images[indexToRemove]);
            return { ...prev, images: newImages };
        });
    };

  const submitReview = async () => {
    if (!user?.token) {
      navigate("/login");
      return;
    }
    if (!reviewForm.rating || reviewForm.rating < 1 || reviewForm.rating > 5) {
        alert("Please select a rating between 1 and 5 stars.");
        return;
    }
     if (!reviewForm.comment.trim()) {
        alert("Please enter your review comment.");
        return;
    }

    setSubmittingReview(true);
    try {
        // In a real app, upload images stored in reviewForm.images (which might be File objects or data URLs)
        // Get back the hosted image URLs
        const uploadedImageUrls = reviewForm.images; // Placeholder: use the preview URLs for now

      const res = await fetch(`${API_URL}/api/products/${id}/reviews`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}` // Use live token
        },
        body: JSON.stringify({
          rating: reviewForm.rating,
          comment: reviewForm.comment,
          images: uploadedImageUrls, // Send hosted URLs
        }),
      });

      if (res.status === 401) throw new Error("Unauthorized");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Failed to add review (Status: ${res.status})`);

      // Assuming the backend returns the updated product with the new review
      setProduct(data);
      setReviewForm({ rating: 0, comment: "", images: [] }); // Reset form
      setActiveTab("reviews"); // Switch to reviews tab
      alert("Review submitted successfully!");

    } catch (e) {
      console.error("Failed to submit review:", e);
       if (e.message === "Unauthorized") {
           alert("Your session may have expired. Please log in again to submit your review.");
           // Optional: logout();
       } else {
          alert(`Failed to add review: ${e.message}`);
       }
    } finally {
      setSubmittingReview(false);
    }
  };

  const toggleHelpful = async (reviewId) => {
    if (!user?.token) {
      navigate("/login");
      return;
    }
    setHelpfulBusy((b) => ({ ...b, [reviewId]: true }));
    try {
      const res = await fetch(`${API_URL}/api/products/${id}/reviews/${reviewId}/helpful`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${user.token}` }, // Use live token
      });

      if (res.status === 401) throw new Error("Unauthorized");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `Failed to mark helpful (Status: ${res.status})`);

      // Update the specific review in the product state
      setProduct((p) => {
        if (!p || !p.reviews) return p;
        const updatedReviews = p.reviews.map(r =>
            r._id === reviewId ? { ...r, helpful: data.helpful, voters: data.voters } : r // Assuming backend sends updated voters too
        );
        return { ...p, reviews: updatedReviews };
      });

    } catch (e) {
      console.error("Failed to mark review helpful:", e);
       if (e.message === "Unauthorized") {
           alert("Your session may have expired. Please log in again.");
           // Optional: logout();
       } else {
          alert(`Error: ${e.message}`);
       }
    } finally {
      setHelpfulBusy((b) => ({ ...b, [reviewId]: false }));
    }
  };

  // Increment/Decrement Quantity
  const inc = () => {
    const maxStock = product?.stock ?? product?.stockCount ?? 0;
    setQuantity((q) => Math.min(q + 1, maxStock));
  };
  const dec = () => setQuantity((q) => Math.max(1, q - 1));


  // ... (keep loading/error checks and JSX rendering) ...
     // Loading state for auth check AND product fetch
   if (authLoading || loading) {
       return (
           <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
               <p className="text-lg text-gray-600">Loading product details...</p>
           </div>
       );
   }

  // Error state after loading is complete
  if (err || !product) {
       return (
            <div className="p-8 text-center text-red-600">
                <p>❌ {err || "Product not found or failed to load."}</p>
                 <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                    Go Home
                </button>
            </div>
       );
   }

  // --- Render component ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50 to-purple-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-600">
            <li><button onClick={() => navigate('/')} className="hover:text-purple-600">Home</button></li>
            <li><ChevronRight size={16} /></li>
            {product.category && (
              <>
                <li><button onClick={() => navigate(`/search?category=${encodeURIComponent(product.category)}`)} className="hover:text-purple-600">{product.category}</button></li>
                <li><ChevronRight size={16} /></li>
              </>
            )}
            <li aria-current="page" className="text-purple-600 font-medium truncate max-w-[200px] sm:max-w-xs">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative bg-white rounded-2xl p-4 shadow-md overflow-hidden aspect-square">
              <img
                src={product.images?.[selectedImage] || 'https://placehold.co/600x600/E5E7EB/4B5563?text=No+Image'}
                alt={product.name}
                className="w-full h-full object-contain rounded-xl cursor-zoom-in transition-transform duration-300 hover:scale-105"
                onClick={() => setZoomedImage(product.images?.[selectedImage])}
                 onError={(e) => e.target.src = 'https://placehold.co/600x600/E5E7EB/4B5563?text=Load+Error'}
              />
              <button
                aria-label="Zoom image"
                className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                onClick={() => setZoomedImage(product.images?.[selectedImage])}
              >
                <ZoomIn size={20} className="text-gray-700" />
              </button>
              {product.discount > 0 && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs sm:text-sm font-semibold shadow">
                  {product.discount}% OFF
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
                <div className="flex space-x-3 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                    <button
                    key={index}
                    aria-label={`View image ${index + 1}`}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                        selectedImage === index ? "border-purple-600 shadow-md scale-105" : "border-gray-200 hover:border-gray-400"
                    }`}
                    >
                    <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`} // ✅ Removed "image"
                        className="w-full h-full object-cover"
                         onError={(e) => e.target.src = 'https://placehold.co/80x80/E5E7EB/4B5563?text=Err'}
                         />
                    </button>
                ))}
                </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-600 font-semibold text-sm uppercase tracking-wide">{product.brand || "Generic"}</span>
                <div className="flex space-x-2">
                  <button
                    aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    onClick={toggleWishlist}
                    className={`p-2 rounded-full border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${isWishlisted ? "bg-red-50 border-red-200 text-red-500 hover:bg-red-100" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-red-500 hover:border-gray-300"}`}
                  >
                    <Heart size={20} className={isWishlisted ? "fill-current" : ""} />
                  </button>
                  <button aria-label="Share product" className="p-2 rounded-full border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-purple-600 hover:border-gray-300 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">{product.name}</h1>

              {/* Rating */}
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex items-center space-x-0.5">{renderStars(product.rating, 18)}</div>
                <span className="font-semibold text-gray-900">{(product.rating || 0).toFixed(1)}</span>
                <a href="#reviews" onClick={(e) => { e.preventDefault(); setActiveTab('reviews'); document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-sm text-gray-500 hover:text-purple-600 hover:underline">({(product.numReviews || 0).toLocaleString()} reviews)</a>
              </div>

              {/* Price */}
              <div className="flex items-baseline space-x-3 mb-6">
                <span className="text-3xl font-bold text-gray-900">₹{(product.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                {product.originalPrice > product.price && (
                  <>
                    <span className="text-lg text-gray-500 line-through">₹{(product.originalPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                      SAVE ₹{Math.max(0, (product.originalPrice || 0) - (product.price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Stock */}
            <div className={`flex items-center space-x-2 text-sm font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
               {product.stock > 0 ? <CheckCircle size={16} /> : <X size={16}/>}
              <span>
                {product.stock > 0 ? `In Stock (${product.stock} left)` : 'Out of Stock'}
              </span>
            </div>


            {/* Variants */}
            {product.variants?.length > 0 && (
              <div className="pt-2">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Color: <span className="font-normal">{selectedVariant?.name || product.variants[0]?.name}</span>
                </h4>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id || variant.name}
                      aria-label={`Select color ${variant.name}`}
                      onClick={() => setSelectedVariant(variant)}
                      disabled={!variant.inStock}
                      className={`w-8 h-8 rounded-full border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
                        selectedVariant?.id === variant.id || selectedVariant?.name === variant.name
                          ? "border-purple-600 ring-2 ring-purple-600 ring-offset-1 scale-110" // Enhanced selected state
                          : "border-gray-300 hover:border-gray-500"
                      } ${!variant.inStock ? "opacity-40 cursor-not-allowed relative after:content-[''] after:absolute after:inset-0 after:bg-gray-400 after:opacity-50 after:rounded-full" : "cursor-pointer"}`} // Added visual indication for disabled
                      style={{ backgroundColor: variant.color }}
                      title={`${variant.name}${!variant.inStock ? ' (Out of stock)' : ''}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Qty & CTA */}
            <div className="space-y-4 pt-4">
               {product.stock > 0 && ( // Only show quantity selector if in stock
                   <div className="flex items-center space-x-4">
                        <label htmlFor="quantity-input" className="font-semibold text-gray-900 text-sm">Quantity:</label>
                        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                        <button
                            id="quantity-decrease"
                            aria-label="Decrease quantity"
                            onClick={dec}
                            className="p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={quantity <= 1}
                        >
                            <Minus size={16} />
                        </button>
                        <input
                            id="quantity-input"
                            type="number"
                            aria-label="Current quantity"
                            value={quantity}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                    setQuantity(Math.max(1, Math.min(val, product.stock)));
                                } else if (e.target.value === '') {
                                     setQuantity(1); // Reset to 1 if cleared, or handle differently
                                }
                            }}
                            min="1"
                            max={product.stock}
                            className="w-12 px-1 py-1.5 text-center font-semibold border-l border-r border-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                        <button
                            id="quantity-increase"
                            aria-label="Increase quantity"
                            onClick={inc}
                            className="p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={quantity >= product.stock}
                        >
                            <Plus size={16} />
                        </button>
                        </div>
                    </div>
                )}

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={addToCart}
                  disabled={product.stock <= 0} // Disable if out of stock
                  className="w-full sm:flex-1 bg-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-purple-700 transition-colors duration-150 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart size={20} />
                  <span>{product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
                </button>
                <button
                  onClick={buyNow}
                  disabled={product.stock <= 0} // Disable if out of stock
                  className="w-full sm:flex-1 bg-orange-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-orange-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {product.stock > 0 ? 'Buy Now' : 'Out of Stock'}
                </button>
              </div>
            </div>

            {/* Features (Optional display) */}
            {product.features?.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Zap size={16} className="text-purple-600 mr-2" />
                  Key Features
                </h4>
                <ul className="space-y-1.5 pl-1">
                  {product.features.map((f, i) => (
                    <li key={i} className="flex items-start text-sm text-gray-700">
                      <CheckCircle size={14} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Services */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <Truck className="text-green-500 flex-shrink-0" size={20} />
                <div>
                  <div className="font-medium">Free Delivery</div>
                  <div className="text-gray-500 text-xs">Est. 2-3 days</div>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <RotateCcw className="text-blue-500 flex-shrink-0" size={20} />
                <div>
                  <div className="font-medium">Easy Returns</div>
                  <div className="text-gray-500 text-xs">Within 30 days</div>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                <Shield className="text-purple-500 flex-shrink-0" size={20} />
                <div>
                  <div className="font-medium">Warranty</div>
                  <div className="text-gray-500 text-xs">1 Year</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div id="reviews" className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
          {/* Tab Headers */}
          <div className="flex flex-wrap space-x-4 sm:space-x-6 border-b border-gray-200 mb-6">
            {["description", "reviews", "specifications"].map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`tabpanel-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 sm:px-2 font-medium capitalize transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 rounded-t-md ${
                  activeTab === tab ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-600 hover:text-gray-900 border-b-2 border-transparent"
                }`}
              >
                {tab}
                 {tab === 'reviews' && ` (${product.numReviews || 0})`}
              </button>
            ))}
          </div>

          {/* Tab Panels */}
          <div>
            {/* Description Panel */}
            <div id="tabpanel-description" role="tabpanel" aria-labelledby="tab-description" hidden={activeTab !== "description"}>
               <h3 className="text-lg font-semibold mb-3 sr-only">Description</h3>
              <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 leading-relaxed space-y-4">
                {/* Use dangerouslySetInnerHTML only if description contains trusted HTML */}
                {/* <div dangerouslySetInnerHTML={{ __html: product.description }} /> */}
                {/* Otherwise, render as plain text or handle markdown */}
                 {product.description?.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                ))}

                {product.descriptionImages?.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4">
                    {product.descriptionImages.map((img, i) => (
                      <img key={i} src={img} alt={`Product detail ${i+1}`} className="rounded-lg object-cover shadow-sm border border-gray-100" /> // ✅ Removed "image"
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reviews Panel */}
            <div id="tabpanel-reviews" role="tabpanel" aria-labelledby="tab-reviews" hidden={activeTab !== "reviews"}>
               <h3 className="text-lg font-semibold mb-4 sr-only">Reviews</h3>
              <div className="space-y-6">
                 {/* Summary */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border rounded-xl bg-gray-50">
                    <div className="flex items-center space-x-4">
                        <div className="text-4xl font-bold text-gray-900">{(product.rating || 0).toFixed(1)}</div>
                        <div>
                            <div className="flex items-center space-x-1 mb-1">{renderStars(product.rating, 20)}</div>
                            <div className="text-sm text-gray-600">Based on {(product.numReviews || 0).toLocaleString()} reviews</div>
                        </div>
                    </div>
                    {/* Placeholder for rating distribution bars if needed */}
                </div>

                {/* Write Review Form */}
                <div className="border rounded-xl p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Write a review</h4>
                  {!user ? (
                    <button onClick={() => navigate("/login?redirect=/product/" + id)} className="w-full sm:w-auto bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                      Login to write a review
                    </button>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); submitReview(); }} className="space-y-3">
                       {/* Rating Selector */}
                       <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Your Rating:</label>
                            <div className="flex items-center space-x-1 sm:space-x-2">
                            {[1, 2, 3, 4, 5].map((r) => (
                                <button
                                type="button"
                                key={r}
                                onClick={() => setReviewForm((f) => ({ ...f, rating: r }))}
                                className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-1"
                                title={`${r} star${r > 1 ? 's' : ''}`}
                                aria-label={`Rate ${r} out of 5 stars`}
                                aria-pressed={r === reviewForm.rating}
                                >
                                <Star size={22} className={`transition-colors duration-150 ${r <= reviewForm.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-gray-400"}`} />
                                </button>
                            ))}
                            {reviewForm.rating > 0 && <span className="ml-2 text-sm text-gray-600 font-medium">{reviewForm.rating}/5</span>}
                            </div>
                       </div>
                       {/* Comment Textarea */}
                       <div>
                            <label htmlFor="review-comment" className="sr-only">Your Review:</label>
                            <textarea
                                id="review-comment"
                                className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                                rows={3}
                                placeholder="Share details of your experience with this product..."
                                value={reviewForm.comment}
                                onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                                required
                            />
                       </div>
                       {/* Image Upload */}
                       <div>
                            <label htmlFor="review-images" className="text-sm font-medium text-gray-700 mb-1 block">Add Photos (optional, max 3):</label>
                            <input
                                id="review-images"
                                type="file"
                                accept="image/jpeg, image/png, image/webp" // Specify accepted types
                                multiple
                                onChange={handleReviewImage}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
                                disabled={reviewForm.images.length >= 3 || submittingReview}
                             />
                             {/* Image Previews */}
                            {reviewForm.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                {reviewForm.images.map((url, i) => (
                                    <div key={i} className="relative w-16 h-16 group">
                                    <img src={url} alt={`Review preview ${i+1}`} className="w-full h-full rounded object-cover border border-gray-200" />
                                     <button
                                        type="button"
                                        onClick={() => removeReviewImage(i)}
                                        className="absolute top-0 right-0 m-0.5 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-red-600"
                                        aria-label={`Remove image ${i+1}`}
                                     >
                                        <X size={12} strokeWidth={3}/>
                                     </button>
                                    </div>
                                ))}
                                </div>
                            )}
                       </div>
                       {/* Submit Button */}
                       <button
                            type="submit"
                            disabled={submittingReview || !reviewForm.rating || !reviewForm.comment.trim()}
                            className="w-full sm:w-auto bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        >
                            {submittingReview ? "Submitting..." : "Submit Review"}
                        </button>
                    </form>
                  )}
                </div>

                {/* Existing Reviews List */}
                <div className="space-y-6 pt-4">
                  {(product.reviews || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((rev) => ( // Sort newest first
                    <article key={rev._id} className="border-t border-gray-100 pt-6 first:border-t-0 first:pt-0">
                      <div className="flex items-start justify-between mb-2">
                         {/* Author Info */}
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                            {(rev.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 text-sm">{rev.name || "Anonymous User"}</span>
                              {/* Add logic for 'Verified Purchase' if available */}
                              {/* <CheckCircle size={14} className="text-green-500" title="Verified Purchase" /> */}
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="flex items-center space-x-0.5">{renderStars(rev.rating, 14)}</div>
                              <span className="text-xs text-gray-500" title={new Date(rev.createdAt).toLocaleString()}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                         {/* Optional: Report Button */}
                         <button className="text-gray-400 hover:text-red-600 text-xs flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-red-500 rounded p-1" aria-label={`Report review by ${rev.name || 'User'}`}>
                             <Flag size={14} /> <span className="hidden sm:inline">Report</span>
                         </button>
                      </div>

                      {/* Review Content */}
                      <p className="text-gray-700 text-sm leading-relaxed mb-3">{rev.comment}</p>

                      {/* Review Images */}
                      {rev.images?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {rev.images.map((img, i) => (
                             // Could wrap images in a button to open a larger view/modal
                            <img
                                key={i}
                                src={img}
                                alt={`Review ${i+1} by ${rev.name || 'User'}`} // ✅ Removed "image"
                                className="w-16 h-16 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                loading="lazy" // Lazy load review images
                                onClick={() => {/* Open image modal? */}}
                            />
                          ))}
                        </div>
                      )}

                     {/* Helpful Button */}
                      <div className="flex items-center space-x-4 text-xs">
                        <button
                          disabled={!!helpfulBusy[rev._id] || !user} // Disable if not logged in
                          onClick={() => toggleHelpful(rev._id)}
                          className={`flex items-center space-x-1 transition-colors duration-150 rounded p-1 focus:outline-none focus:ring-1 focus:ring-purple-500 ${helpfulBusy[rev._id] ? "text-gray-400 cursor-wait" : "text-gray-600 hover:text-purple-600"} ${!user ? 'cursor-not-allowed opacity-60' : ''}`}
                          aria-label={`Mark review by ${rev.name || 'User'} as helpful. Current count: ${rev.helpful || 0}`}
                          title={!user ? "Login to mark helpful" : ""}
                        >
                          <ThumbsUp size={14} />
                          <span>Helpful ({rev.helpful || 0})</span>
                           {/* Add indicator if current user found it helpful */}
                           {user && rev.voters?.includes(user._id) && <span className="text-purple-600 ml-1">(Voted)</span>}
                        </button>
                      </div>
                    </article>
                  ))}
                  {/* No Reviews Message */}
                  {!product.reviews?.length && (
                    <div className="text-sm text-gray-500 text-center py-4">Be the first to share your thoughts on this product!</div>
                  )}
                </div>
              </div>
            </div>

            {/* Specifications Panel */}
            <div id="tabpanel-specifications" role="tabpanel" aria-labelledby="tab-specifications" hidden={activeTab !== "specifications"}>
                <h3 className="text-lg font-semibold mb-4 sr-only">Specifications</h3>
                {Object.keys(product.specifications || {}).length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        {Object.entries(product.specifications).map(([key, value]) => (
                            <div key={key} className="flex justify-between border-b border-gray-100 py-2">
                                <dt className="text-gray-600">{key}</dt>
                                <dd className="font-medium text-gray-800 text-right">{value}</dd>
                            </div>
                         ))}
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">No specifications provided for this product.</div>
                )}
            </div>
          </div>
        </div>

         {/* Seller Info Section */}
        {product.seller && ( // Check if seller data is populated
          <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8 mb-8 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sold and Shipped by</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                {/* Placeholder for Seller Avatar/Logo */}
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                  {(product.seller.name || "S").charAt(0).toUpperCase()}
                </div>
                <div>
                   {/* Seller Name and Verification */}
                   <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-gray-900">{product.seller.name || 'Unknown Seller'}</span>
                       {/* Add verification logic based on seller status if available */}
                       {product.seller.isVerified && <CheckCircle size={16} className="text-green-500 flex-shrink-0" title="Verified Seller"/>}
                  </div>
                   {/* Seller Rating/Response Time (Example) */}
                   <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                       {/* Add seller rating if available */}
                       {/* <span>⭐ 4.5</span> | */}
                       <span>Responds within hours</span>
                   </div>
                </div>
              </div>
               {/* Visit Store Button */}
               {/* Link to a dedicated seller store page if you have one */}
               <button onClick={() => alert('Navigate to seller store page (if implemented)')} className="w-full sm:w-auto bg-purple-100 text-purple-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                  Visit Store
              </button>
            </div>
          </div>
        )}


        {/* Related Products Section */}
        {related && related.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8 border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">You might also like</h3>
             {/* Use a responsive grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
                {related.map((item) => (
                 <div key={item._id} className="group cursor-pointer flex flex-col h-full" onClick={() => navigate(`/product/${item._id}`)}>
                    {/* Image Container */}
                    <div className="relative overflow-hidden rounded-xl mb-3 aspect-square bg-gray-100">
                      <img
                        src={item.images?.[0] || 'https://placehold.co/300x300/E5E7EB/4B5563?text=No+Image'}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-in-out"
                         onError={(e) => e.target.src = 'https://placehold.co/300x300/E5E7EB/4B5563?text=Error'}
                         loading="lazy"
                      />
                    </div>
                     {/* Text Content */}
                     <div className="flex flex-col flex-grow mt-auto">
                        <h4 className="font-medium text-sm text-gray-800 mb-1 group-hover:text-purple-600 transition-colors line-clamp-2 leading-snug">
                            {item.name}
                        </h4>
                        {/* Rating (Optional) */}
                        {item.rating > 0 && <div className="flex items-center space-x-1 mb-1">{renderStars(item.rating || 0, 12)}</div>}
                         {/* Price */}
                         <div className="mt-auto">
                            <span className="text-base font-bold text-gray-900">₹{(item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                             {/* Optional: Discount Price */}
                            {item.originalPrice > item.price && <span className="ml-2 text-xs text-gray-500 line-through">₹{item.originalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                        </div>
                    </div>
                  </div>
                ))}
            </div>
            </div>
        )}
      </div> {/* End Max Width Container */}

      {/* Zoom Modal */}
      {zoomedImage && (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="zoom-modal-title"
            className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setZoomedImage(null)} // Close on overlay click
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()} /* Prevent closing when clicking image */>
            <h2 id="zoom-modal-title" className="sr-only">Zoomed Product View</h2> {/* ✅ Improved alt */}
            <button
                aria-label="Close image zoom"
                onClick={() => setZoomedImage(null)}
                className="absolute -top-2 -right-2 sm:top-2 sm:right-2 z-10 p-1.5 bg-white/80 text-gray-700 rounded-full shadow-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <X size={20} strokeWidth={2.5}/>
            </button>
            <img
                src={zoomedImage}
                alt={`Zoomed view of ${product.name}`} // ✅ Improved alt
                className="block max-w-full max-h-[90vh] object-contain rounded-lg shadow-xl"
            />
          </div>
        </div>
      )}
    </div> // End Root Div
  );
};

export default ProductDetail;

