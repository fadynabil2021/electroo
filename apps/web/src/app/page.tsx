'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useCartStore, CartItem, CartModifier } from '../store/useCartStore';
import { api } from '../utils/api';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import {
  ShoppingBag,
  User as UserIcon,
  Settings,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  X,
  Plus,
  Minus,
  Sparkles,
  DollarSign,
  Briefcase,
  Layers,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Check,
  Download,
  Eye,
  LogOut
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Home() {
  const { locale, setLocale, t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'customer' | 'admin' | 'rider'>('customer');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Cart store
  const cart = useCartStore();
  const { subtotal, deliveryFee, serviceFee, tax, discount, total } = cart.getTotals();

  // Socket
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  // States: Menu Catalog
  const [menu, setMenu] = useState<any>({ categories: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loadingMenu, setLoadingMenu] = useState(true);

  // States: Customization Modal
  const [customizingItem, setCustomizingItem] = useState<any>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<CartModifier[]>([]);
  const [customizationQty, setCustomizationQty] = useState(1);
  const [customizationNotes, setCustomizationNotes] = useState('');

  // States: Checkout
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'payment'>('cart');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('+2010');
  const [guestEmail, setGuestEmail] = useState('');
  const [addressLabel, setAddressLabel] = useState('Home');
  const [fullAddress, setFullAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'CARD' | 'FAWRY'>('CASH_ON_DELIVERY');
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // States: Order Tracking
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [trackingRiderLocation, setTrackingRiderLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showConfettiOnSuccess, setShowConfettiOnSuccess] = useState(false);

  // States: Admin Panel
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [onlineRiders, setOnlineRiders] = useState<any[]>([]);
  const [adminSelectedOrder, setAdminSelectedOrder] = useState<any>(null);
  
  // States: Rider Panel
  const [riderOnline, setRiderOnline] = useState(false);
  const [riderOrders, setRiderOrders] = useState<any[]>([]);
  const [riderLocationSimInterval, setRiderLocationSimInterval] = useState<any>(null);
  const [riderGpsCoords, setRiderGpsCoords] = useState({ lat: 31.2001, lng: 29.9187 });

  // States: Auth Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('+2010');
  const [authRole, setAuthRole] = useState<'CUSTOMER' | 'ADMIN' | 'RIDER'>('CUSTOMER');
  const [authError, setAuthError] = useState('');

  // Load menu catalog & user profile
  useEffect(() => {
    loadMenuCatalog();
    const user = api.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    // Register PWA Service Worker for offline capability
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (reg) => console.log('Service Worker registered successfully:', reg.scope),
        (err) => console.error('Service Worker registration failed:', err)
      );
    }
  }, []);

  // Connect to websocket server
  useEffect(() => {
    socketRef.current = io('http://localhost:3011/events', {
      transports: ['websocket', 'polling'],
      auth: { token: typeof window !== 'undefined' ? localStorage.getItem('access_token') : '' },
    });

    socketRef.current.on('connect', () => {
      console.log('WebSocket connected');
    });

    // Listen to order updates
    socketRef.current.on('order:status_updated', (data: any) => {
      console.log('Order status update received:', data);
      
      // Update active tracking order if matching
      if (activeOrder && activeOrder.id === data.orderId) {
        api.fetchOrderDetail(data.orderId).then((updatedOrder) => {
          setActiveOrder(updatedOrder);
          if (updatedOrder.status === 'DELIVERED') {
            triggerConfetti();
          }
        });
      }

      // Reload admin orders
      if (activeTab === 'admin') {
        loadAdminData();
      }
    });

    // Listen to rider location updates
    socketRef.current.on('rider_location', (loc: any) => {
      console.log('Rider location update:', loc);
      setTrackingRiderLocation({ latitude: loc.latitude, longitude: loc.longitude });
    });

    // Admin listener for new orders
    socketRef.current.on('order:new', (data: any) => {
      console.log('New order received:', data);
      // Play a bell alert sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-84.wav');
        audio.play();
      } catch (err) {}
      
      if (activeTab === 'admin') {
        loadAdminData();
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [activeOrder, activeTab]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  const loadMenuCatalog = async () => {
    try {
      setLoadingMenu(true);
      const res = await api.fetchMenu();
      setMenu(res);
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) {
      loadMenuCatalog();
      return;
    }
    try {
      setLoadingMenu(true);
      const items = await api.searchMenu(searchQuery);
      // Format to mock category structure for uniform display
      setMenu({
        categories: [
          {
            id: 'search_results',
            nameEn: 'Search Results',
            nameAr: 'نتائج البحث',
            menuItems: items,
          },
        ],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMenu(false);
    }
  };

  // Auth Operations
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        const res = await api.login({ email: authEmail, password: authPassword });
        setCurrentUser(res.user);
        triggerConfetti();
      } else {
        const res = await api.register({
          name: authName,
          email: authEmail,
          phone: authPhone,
          password: authPassword,
          role: authRole,
        });
        setCurrentUser(res.user);
        triggerConfetti();
      }
      setShowAuthModal(false);
      // Re-initialize socket authentication
      if (socketRef.current) {
        socketRef.current.disconnect();
        (socketRef.current as any).auth = { token: localStorage.getItem('access_token') };
        socketRef.current.connect();
      }
      // If admin, load admin data immediately
      if (authRole === 'ADMIN' || authRole === 'RIDER') {
        setActiveTab(authRole === 'ADMIN' ? 'admin' : 'rider');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setActiveTab('customer');
  };

  // Modifier Customization
  const handleOpenCustomize = (item: any) => {
    setCustomizingItem(item);
    setCustomizationQty(1);
    setCustomizationNotes('');
    
    // Select defaults
    const defaults: CartModifier[] = [];
    if (item.modifierGroups) {
      item.modifierGroups.forEach((group: any) => {
        const defOpt = group.options.find((o: any) => o.isDefault);
        if (defOpt) {
          defaults.push({
            optionId: defOpt.id,
            optionNameEn: defOpt.nameEn,
            optionNameAr: defOpt.nameAr,
            groupNameEn: group.nameEn,
            groupNameAr: group.nameAr,
            additionalPrice: Number(defOpt.additionalPrice),
          });
        }
      });
    }
    setSelectedModifiers(defaults);
  };

  const handleSelectModifier = (group: any, option: any) => {
    const isSingle = group.maxSelection === 1;
    const modifier: CartModifier = {
      optionId: option.id,
      optionNameEn: option.nameEn,
      optionNameAr: option.nameAr,
      groupNameEn: group.nameEn,
      groupNameAr: group.nameAr,
      additionalPrice: Number(option.additionalPrice),
    };

    if (isSingle) {
      // Remove previous modifiers from same group
      const filtered = selectedModifiers.filter(m => m.groupNameEn !== group.nameEn);
      setSelectedModifiers([...filtered, modifier]);
    } else {
      const exists = selectedModifiers.find(m => m.optionId === option.id);
      if (exists) {
        setSelectedModifiers(selectedModifiers.filter(m => m.optionId !== option.id));
      } else {
        const groupSelectedCount = selectedModifiers.filter(m => m.groupNameEn === group.nameEn).length;
        if (groupSelectedCount < group.maxSelection) {
          setSelectedModifiers([...selectedModifiers, modifier]);
        }
      }
    }
  };

  const handleAddToCartCustomized = () => {
    const modifierPrice = selectedModifiers.reduce((sum, m) => sum + m.additionalPrice, 0);
    const unitPrice = Number(customizingItem.basePrice) + modifierPrice;

    cart.addItem({
      menuItemId: customizingItem.id,
      nameEn: customizingItem.nameEn,
      nameAr: customizingItem.nameAr,
      price: unitPrice,
      basePrice: Number(customizingItem.basePrice),
      quantity: customizationQty,
      modifiers: selectedModifiers,
      notes: customizationNotes,
    });

    setCustomizingItem(null);
  };

  // Coupons
  const handleApplyCoupon = async () => {
    setCouponError('');
    setCouponSuccess('');
    try {
      const coupon = await api.validateCoupon(couponCode, subtotal);
      cart.applyCoupon({
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : undefined,
      });
      setCouponSuccess(t('cart.couponCode') + ' applied!');
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon');
    }
  };

  // Checkout & Order Placement
  const handlePlaceOrder = async () => {
    try {
      const orderData = {
        fulfillmentType: cart.fulfillmentType,
        couponCode: cart.coupon?.code || null,
        paymentMethod,
        guestName: currentUser ? currentUser.name : guestName || 'Guest Customer',
        guestPhone: currentUser ? currentUser.phone : guestPhone,
        guestEmail: currentUser ? currentUser.email : guestEmail || 'guest@alexfood.com',
        guestAddress: cart.fulfillmentType === 'DELIVERY' ? {
          label: addressLabel,
          fullAddress,
          landmark,
          latitude: '31.2001',
          longitude: '29.9187',
        } : null,
        items: cart.items.map(it => ({
          menuItemId: it.menuItemId,
          quantity: it.quantity,
          notes: it.notes,
          modifiers: it.modifiers.map(m => ({ optionId: m.optionId })),
        })),
      };

      const placed = await api.placeOrder(orderData);
      
      // If COD, go straight to tracking. If card/Fawry, initiate payment
      if (paymentMethod === 'CASH_ON_DELIVERY') {
        cart.clearCart();
        setIsCheckingOut(false);
        setActiveOrder(placed);
        // Connect websocket to order room
        if (socketRef.current) {
          socketRef.current.emit('join_order_room', { orderId: placed.id });
        }
        triggerConfetti();
      } else {
        // Card/Fawry flow - call initiate
        const paymentRes = await api.initiatePayment(placed.id);
        alert(`Redirecting to simulated checkout gateway (Order ID: ${placed.id})...`);
        // Complete the mock payment immediately in development
        await api.simulatePayment(placed.id, true);
        const paidOrder = await api.fetchOrderDetail(placed.id);
        
        cart.clearCart();
        setIsCheckingOut(false);
        setActiveOrder(paidOrder);
        
        if (socketRef.current) {
          socketRef.current.emit('join_order_room', { orderId: paidOrder.id });
        }
        triggerConfetti();
      }
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    }
  };

  // Admin Operations
  const loadAdminData = async () => {
    try {
      const ordersRes = await api.adminFetchOrders();
      setAdminOrders(ordersRes);

      const analyticsRes = await api.adminFetchAnalytics();
      setAnalytics(analyticsRes);

      const ridersRes = await api.adminFetchRiders();
      setOnlineRiders(ridersRes.filter((r: any) => r.isOnline));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin') {
      loadAdminData();
      if (socketRef.current) {
        socketRef.current.emit('join_admin_room');
      }
    } else if (activeTab === 'rider') {
      loadRiderData();
    }
  }, [activeTab]);

  const handleAdminAssignRider = async (orderId: string, riderId: string) => {
    try {
      await api.adminAssignRider(orderId, riderId);
      loadAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAdminUpdateStatus = async (orderId: string, status: string) => {
    try {
      await api.adminUpdateOrderStatus(orderId, status, 'Admin Update');
      loadAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvContent: any = await api.adminExportReportsCsv();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `orders-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('CSV Export failed');
    }
  };

  // Rider Dashboard Operations
  const loadRiderData = async () => {
    try {
      const orders = await api.riderFetchAssignedOrders();
      setRiderOrders(orders);
      
      try {
        const rProfile = await api.getRiderProfile();
        setRiderOnline(rProfile.isOnline);
      } catch (_) {
        // Not yet a rider or not authenticated
      }
    } catch (err) {}
  };

  const handleToggleRiderShift = async () => {
    try {
      const newStatus = !riderOnline;
      await api.riderToggleShift(newStatus);
      setRiderOnline(newStatus);
      loadAdminData();
    } catch (err) {}
  };

  const handleRiderUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.riderUpdateStatus(orderId, newStatus);
      loadRiderData();
      
      if (newStatus === 'OUT_FOR_DELIVERY') {
        // Start GPS Simulation broadcast
        startGpsSimulation(orderId);
      } else if (newStatus === 'DELIVERED') {
        stopGpsSimulation();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startGpsSimulation = (orderId: string) => {
    stopGpsSimulation();
    
    // Smouha Alexandria coordinates path simulator
    let step = 0;
    const path = [
      { lat: 31.2001, lng: 29.9187 },
      { lat: 31.2023, lng: 29.9205 },
      { lat: 31.2045, lng: 29.9221 },
      { lat: 31.2062, lng: 29.9238 },
      { lat: 31.2085, lng: 29.9262 },
      { lat: 31.2104, lng: 29.9288 }, // Destination
    ];

    const timer = setInterval(async () => {
      if (step >= path.length) {
        clearInterval(timer);
        return;
      }
      const coords = path[step];
      setRiderGpsCoords(coords);
      
      // Update location on API
      await api.riderUpdateLocation(coords.lat, coords.lng);
      
      // Broadcast via socket
      if (socketRef.current) {
        socketRef.current.emit('rider_location_update', {
          orderId,
          latitude: coords.lat,
          longitude: coords.lng,
        });
      }
      step++;
    }, 4000); // Send coordinates every 4 seconds

    setRiderLocationSimInterval(timer);
  };

  const stopGpsSimulation = () => {
    if (riderLocationSimInterval) {
      clearInterval(riderLocationSimInterval);
      setRiderLocationSimInterval(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      {/* Upper Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-gray-100 px-4 py-3 sm:px-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-white p-2 rounded-xl flex items-center justify-center shadow-md">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-amber-500 font-sans">
            {locale === 'ar' ? 'أليكس فود 🍽️' : 'Alex Food 🍽️'}
          </span>
        </div>

        {/* Dynamic Role Switcher */}
        <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-full gap-1 shadow-inner">
          <button
            onClick={() => setActiveTab('customer')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'customer'
                ? 'bg-amber-500 text-white shadow'
                : 'text-gray-600 hover:text-amber-500'
            }`}
          >
            {locale === 'ar' ? 'العملاء' : 'Customer Portal'}
          </button>
          <button
            onClick={() => {
              if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') {
                setActiveTab('admin');
              } else {
                setAuthRole('ADMIN');
                setAuthMode('login');
                setShowAuthModal(true);
              }
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'admin'
                ? 'bg-amber-500 text-white shadow'
                : 'text-gray-600 hover:text-amber-500'
            }`}
          >
            {locale === 'ar' ? 'لوحة تحكم الإدارة' : 'Admin Panel'}
          </button>
          <button
            onClick={() => {
              if (currentUser?.role === 'RIDER') {
                setActiveTab('rider');
              } else {
                setAuthRole('RIDER');
                setAuthMode('login');
                setShowAuthModal(true);
              }
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'rider'
                ? 'bg-amber-500 text-white shadow'
                : 'text-gray-600 hover:text-amber-500'
            }`}
          >
            {locale === 'ar' ? 'كابتن الديلفري' : 'Rider Portal'}
          </button>
        </div>

        {/* Language & Profile actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
            className="px-3 py-1.5 border border-amber-200 text-amber-600 text-xs font-semibold rounded-lg hover:bg-amber-50 transition"
          >
            {t('common.language')}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700 hidden sm:inline">{currentUser.name}</span>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthMode('login');
                setShowAuthModal(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
            >
              <UserIcon className="w-3.5 h-3.5" />
              {t('common.login')}
            </button>
          )}
        </div>
      </header>

      {/* Mobile Role Bar */}
      <div className="flex md:hidden bg-amber-50 p-2 gap-1 border-b border-amber-100 justify-around text-center">
        <button
          onClick={() => setActiveTab('customer')}
          className={`flex-1 py-1 rounded text-xs font-bold ${
            activeTab === 'customer' ? 'bg-amber-500 text-white' : 'text-amber-700'
          }`}
        >
          {locale === 'ar' ? 'المنيو' : 'Menu'}
        </button>
        <button
          onClick={() => {
            if (currentUser?.role === 'ADMIN') {
              setActiveTab('admin');
            } else {
              setAuthRole('ADMIN');
              setShowAuthModal(true);
            }
          }}
          className={`flex-1 py-1 rounded text-xs font-bold ${
            activeTab === 'admin' ? 'bg-amber-500 text-white' : 'text-amber-700'
          }`}
        >
          {locale === 'ar' ? 'الإدارة' : 'Admin'}
        </button>
        <button
          onClick={() => {
            if (currentUser?.role === 'RIDER') {
              setActiveTab('rider');
            } else {
              setAuthRole('RIDER');
              setShowAuthModal(true);
            }
          }}
          className={`flex-1 py-1 rounded text-xs font-bold ${
            activeTab === 'rider' ? 'bg-amber-500 text-white' : 'text-amber-700'
          }`}
        >
          {locale === 'ar' ? 'الديلفري' : 'Rider'}
        </button>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* CUSTOMER TAB VIEW */}
        {activeTab === 'customer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Main Menu Feed (Cols 1-8) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Active Order Banner if present */}
              {activeOrder && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-emerald-950 text-sm">
                        {t('checkout.orderSuccess')} ({activeOrder.orderNumber})
                      </h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        {t('tracking.status')}: <span className="font-bold">{t(`tracking.statuses.${activeOrder.status}`)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        // Scroll to tracking view or modal
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      {t('tracking.title')}
                    </button>
                    <button
                      onClick={() => setActiveOrder(null)}
                      className="text-emerald-500 hover:text-emerald-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Home Hero Sliding Banner */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
                <div className="relative z-10 max-w-md flex flex-col gap-3">
                  <span className="bg-amber-400/30 text-amber-100 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full w-max">
                    {locale === 'ar' ? '🔥 الأفضل مبيعاً في الإسكندرية' : '🔥 Best Seller in Alexandria'}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight Cairo font-sans">
                    {locale === 'ar' ? 'سمك قاروص سنجاري إسكندراني طازج!' : 'Fresh Mediterranean Sea Bass Singari!'}
                  </h2>
                  <p className="text-xs text-amber-50 leading-relaxed font-sans">
                    {locale === 'ar' ? 'طواجن بحرية ومأكولات شعبية محضرة بأجود الزيوت والتوابل البلدية.' : 'Savory seafood and local specialties cooked with authentic Egyptian aromatic spices.'}
                  </p>
                  <button 
                    onClick={() => {
                      const item = menu.categories.flatMap((c: any) => c.menuItems).find((i: any) => i?.slug === 'branzo');
                      if (item) handleOpenCustomize(item);
                    }}
                    className="bg-white text-orange-600 px-5 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-amber-50 transition w-max mt-2"
                  >
                    {locale === 'ar' ? 'اطلبها الآن 180 ج.م' : 'Order Now 180 EGP'}
                  </button>
                </div>
                {/* Visual abstract overlay */}
                <div className="absolute right-0 bottom-0 opacity-15 text-9xl">🐟</div>
              </div>

              {/* Search & Category Navigation */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <form onSubmit={handleSearch} className="relative w-full sm:max-w-xs flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('common.search')}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-amber-500 outline-none pl-9"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3" />
                </form>

                {/* Categories Scroll */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none pb-1 sm:pb-0">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-amber-500 text-white shadow'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {locale === 'ar' ? 'الكل' : 'All'}
                  </button>
                  {menu.categories.map((cat: any) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                        selectedCategory === cat.slug
                          ? 'bg-amber-500 text-white shadow'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {locale === 'ar' ? cat.nameAr : cat.nameEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Catalog Feed */}
              {loadingMenu ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse flex flex-col gap-3">
                      <div className="bg-gray-200 h-28 rounded-xl w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {menu.categories
                    .filter((c: any) => selectedCategory === 'all' || c.slug === selectedCategory)
                    .map((cat: any) => (
                      <div key={cat.id} className="flex flex-col gap-4">
                        <h3 className="text-md font-bold text-gray-900 border-b border-gray-100 pb-2 Cairo flex items-center gap-2">
                          <span className="w-1.5 h-4 bg-amber-500 rounded-full"></span>
                          {locale === 'ar' ? cat.nameAr : cat.nameEn}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {cat.menuItems?.map((item: any) => (
                            <div
                              key={item.id}
                              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between gap-4"
                            >
                              <div className="flex gap-4">
                                {/* Mock food icons/divs since no real images for MVP */}
                                <div className="w-20 h-20 bg-amber-50 rounded-xl flex items-center justify-center text-3xl shrink-0">
                                  {item.slug === 'koshary' && '🥣'}
                                  {item.slug === 'hawawshi' && '🫓'}
                                  {item.slug === 'branzo' && '🐟'}
                                  {item.slug === 'sayadiya-rice' && '🍚'}
                                  {item.slug === 'umm-ali' && '🍮'}
                                  {item.slug === 'roz-bel-laban' && '🍧'}
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-sm text-gray-900 font-sans">
                                      {locale === 'ar' ? item.nameAr : item.nameEn}
                                    </h4>
                                    {item.isFeatured && (
                                      <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                        POPULAR
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                    {locale === 'ar' ? item.descriptionAr : item.descriptionEn}
                                  </p>
                                </div>
                              </div>

                              <div className="flex justify-between items-center border-t border-gray-50 pt-3 mt-1">
                                <span className="font-extrabold text-sm text-amber-600">
                                  {item.basePrice} <span className="text-[10px] font-medium text-gray-500">{t('common.egp')}</span>
                                </span>

                                <button
                                  onClick={() => handleOpenCustomize(item)}
                                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1 shadow transition"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  {t('menu.addToCart')}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Real-time Order Tracking Map Simulator */}
              {activeOrder && activeOrder.status !== 'DELIVERED' && activeOrder.status !== 'CANCELLED' && (
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-md flex flex-col gap-4 mt-8">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-500" />
                      {t('tracking.title')} ({activeOrder.orderNumber})
                    </h3>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full">
                      {t(`tracking.statuses.${activeOrder.status}`)}
                    </span>
                  </div>

                  {/* Dynamic Progress Timeline */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-gray-400 mt-2">
                    <div className={['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(activeOrder.status) ? 'text-amber-500' : ''}>
                      <span>1. Confirmed</span>
                    </div>
                    <div className={['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(activeOrder.status) ? 'text-amber-500' : ''}>
                      <span>2. Preparing</span>
                    </div>
                    <div className={['READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(activeOrder.status) ? 'text-amber-500' : ''}>
                      <span>3. Ready</span>
                    </div>
                    <div className={['OUT_FOR_DELIVERY', 'DELIVERED'].includes(activeOrder.status) ? 'text-amber-500 animate-pulse' : ''}>
                      <span>4. On the Way</span>
                    </div>
                  </div>

                  {/* Visual Map Simulator */}
                  <div className="relative w-full h-48 bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden mt-2 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-70"></div>
                    
                    {/* Simulated Alexandria map roads/parks */}
                    <div className="absolute top-1/4 left-10 w-2/3 h-2 bg-slate-200 rounded-full rotate-12"></div>
                    <div className="absolute top-1/2 left-20 w-1/2 h-2 bg-slate-200 rounded-full -rotate-6"></div>
                    <div className="absolute top-12 right-12 w-28 h-28 rounded-full border-4 border-slate-100 opacity-20"></div>

                    {/* Smouha Branch (Kitchen/Store location) */}
                    <div className="absolute top-1/3 left-1/4 text-center">
                      <div className="bg-amber-500 text-white p-2 rounded-full shadow-md animate-bounce">
                        🏠
                      </div>
                      <span className="text-[9px] font-bold text-gray-600 block mt-1">Smouha Kitchen</span>
                    </div>

                    {/* Customer Destination Location */}
                    <div className="absolute top-1/2 right-1/4 text-center">
                      <div className="bg-red-500 text-white p-2 rounded-full shadow-md">
                        📍
                      </div>
                      <span className="text-[9px] font-bold text-gray-600 block mt-1">Delivery Destination</span>
                    </div>

                    {/* Active Rider Scooter Icon (moves based on location state) */}
                    {activeOrder.status === 'OUT_FOR_DELIVERY' && (
                      <div 
                        className="absolute text-3xl transition-all duration-1000"
                        style={{
                          left: trackingRiderLocation 
                            ? `${((trackingRiderLocation.longitude - 29.9187) / 0.0101) * 50 + 25}%`
                            : '40%',
                          top: trackingRiderLocation 
                            ? `${((31.2104 - trackingRiderLocation.latitude) / 0.0103) * 50 + 33}%`
                            : '42%'
                        }}
                      >
                        🛵
                      </div>
                    )}
                  </div>

                  {activeOrder.status === 'OUT_FOR_DELIVERY' ? (
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-xs flex items-center gap-2">
                      <Sparkles className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                      <span>{t('tracking.riderAssigned')}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 text-center italic">{t('tracking.noRiderYet')}</span>
                  )}
                </div>
              )}

            </div>

            {/* PERSISTED CART & CHECKOUT SIDEBAR (Cols 9-12) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-md flex flex-col gap-4">
                
                {/* Tab selector for delivery type */}
                {!isCheckingOut && (
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    <button
                      onClick={() => cart.setFulfillmentType('DELIVERY')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        cart.fulfillmentType === 'DELIVERY'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {t('common.delivery')}
                    </button>
                    <button
                      onClick={() => cart.setFulfillmentType('PICKUP')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        cart.fulfillmentType === 'PICKUP'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      {t('common.pickup')}
                    </button>
                  </div>
                )}

                {/* Cart details or Checkout flow */}
                {!isCheckingOut ? (
                  <>
                    <h3 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-amber-500" />
                      {t('cart.title')} ({cart.items.length})
                    </h3>

                    {cart.items.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400">
                        {t('cart.empty')}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
                        {cart.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-start gap-2 border-b border-gray-50 pb-2.5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-xs text-gray-900">
                                {locale === 'ar' ? item.nameAr : item.nameEn}
                              </span>
                              {item.modifiers.length > 0 && (
                                <span className="text-[9px] text-gray-400">
                                  {item.modifiers.map(m => locale === 'ar' ? m.optionNameAr : m.optionNameEn).join(', ')}
                                </span>
                              )}
                              {item.notes && (
                                <span className="text-[9px] text-amber-600 italic">"{item.notes}"</span>
                              )}
                              <span className="text-[10px] font-bold text-amber-600 mt-1">
                                {item.price * item.quantity} {t('common.egp')}
                              </span>
                            </div>
                            
                            <div className="flex items-center bg-gray-50 rounded-lg p-1 gap-2 border border-gray-100 shrink-0">
                              <button
                                onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                                className="p-0.5 hover:bg-amber-100 text-gray-600 rounded"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold px-1">{item.quantity}</span>
                              <button
                                onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                                className="p-0.5 hover:bg-amber-100 text-gray-600 rounded"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Totals & Coupon block */}
                    {cart.items.length > 0 && (
                      <div className="flex flex-col gap-3 pt-3 border-t border-gray-100">
                        
                        {/* Coupon validation form */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            placeholder={t('cart.couponCode')}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                          />
                          <button
                            onClick={handleApplyCoupon}
                            className="bg-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-amber-600 transition"
                          >
                            {t('cart.apply')}
                          </button>
                        </div>
                        {couponError && <p className="text-[10px] text-red-500 font-bold">{couponError}</p>}
                        {couponSuccess && <p className="text-[10px] text-emerald-600 font-bold">{couponSuccess}</p>}

                        {/* Calculations */}
                        <div className="flex flex-col gap-1.5 text-xs text-gray-600 border-t border-gray-50 pt-2.5">
                          <div className="flex justify-between">
                            <span>{t('cart.subtotal')}</span>
                            <span>{subtotal} {t('common.egp')}</span>
                          </div>
                          {cart.fulfillmentType === 'DELIVERY' && (
                            <div className="flex justify-between">
                              <span>{t('cart.deliveryFee')}</span>
                              <span>{deliveryFee} {t('common.egp')}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span>{t('cart.serviceFee')}</span>
                            <span>{serviceFee} {t('common.egp')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('cart.tax')}</span>
                            <span>{tax} {t('common.egp')}</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-emerald-600 font-semibold">
                              <span>{t('cart.discount')}</span>
                              <span>-{discount} {t('common.egp')}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-gray-100 pt-2 text-sm font-bold text-gray-900">
                            <span>{t('cart.total')}</span>
                            <span className="text-amber-600">{total} {t('common.egp')}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setIsCheckingOut(true)}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs w-full py-3 rounded-xl shadow-md transition mt-2"
                        >
                          {t('cart.checkout')}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  // CHECKOUT STATE
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h3 className="font-bold text-sm text-gray-900">{t('checkout.title')}</h3>
                      <button onClick={() => setIsCheckingOut(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Guest Checkout inputs */}
                    {!currentUser && (
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('checkout.guestDetails')}</span>
                        <input
                          type="text"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder={t('checkout.fullName')}
                          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder={t('checkout.phone')}
                          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    )}

                    {/* Delivery addresses snapshot */}
                    {cart.fulfillmentType === 'DELIVERY' && (
                      <div className="flex flex-col gap-2.5 border-t border-gray-100 pt-2.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('checkout.deliveryDetails')}</span>
                        <input
                          type="text"
                          value={addressLabel}
                          onChange={(e) => setAddressLabel(e.target.value)}
                          placeholder={t('checkout.addressLabel')}
                          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <textarea
                          value={fullAddress}
                          onChange={(e) => setFullAddress(e.target.value)}
                          placeholder={t('checkout.fullAddress')}
                          rows={2}
                          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                        ></textarea>
                      </div>
                    )}

                    {/* Payment methods selector */}
                    <div className="flex flex-col gap-2 border-t border-gray-100 pt-2.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('checkout.paymentMethod')}</span>
                      
                      <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          value="CASH_ON_DELIVERY"
                          checked={paymentMethod === 'CASH_ON_DELIVERY'}
                          onChange={() => setPaymentMethod('CASH_ON_DELIVERY')}
                          className="accent-amber-500"
                        />
                        <span className="text-xs">{t('checkout.cashOnDelivery')}</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer">
                        <input
                          type="radio"
                          name="payment"
                          value="CARD"
                          checked={paymentMethod === 'CARD'}
                          onChange={() => setPaymentMethod('CARD')}
                          className="accent-amber-500"
                        />
                        <span className="text-xs">{t('checkout.cardPayment')}</span>
                      </label>
                    </div>

                    <div className="flex justify-between border-t border-gray-100 pt-3 text-sm font-bold text-gray-900 mt-2">
                      <span>{t('cart.total')}</span>
                      <span className="text-amber-600">{total} {t('common.egp')}</span>
                    </div>

                    <button
                      onClick={handlePlaceOrder}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs w-full py-3 rounded-xl shadow-md transition mt-2"
                    >
                      {t('checkout.placeOrder')}
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ADMIN TAB VIEW */}
        {activeTab === 'admin' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Header / Stats panel */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-md font-bold text-gray-900 Cairo">{t('admin.dashboard')}</h2>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('admin.exportCsv')}
                </button>
              </div>
            </div>

            {/* Analytics Widgets */}
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('admin.revenue')}</span>
                    <h3 className="text-xl font-extrabold text-amber-600 mt-1">{analytics.totalRevenue} EGP</h3>
                  </div>
                  <div className="bg-amber-50 text-amber-500 p-3 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('admin.totalOrders')}</span>
                    <h3 className="text-xl font-extrabold text-gray-900 mt-1">{analytics.totalOrders}</h3>
                  </div>
                  <div className="bg-amber-50 text-amber-500 p-3 rounded-xl">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('admin.aov')}</span>
                    <h3 className="text-xl font-extrabold text-gray-900 mt-1">{analytics.averageOrderValue} EGP</h3>
                  </div>
                  <div className="bg-amber-50 text-amber-500 p-3 rounded-xl">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>
              </div>
            )}

            {/* Live order board (Kanban columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Placed Columns */}
              <div className="bg-gray-100/60 border border-gray-200/50 p-4 rounded-2xl flex flex-col gap-3 min-h-[300px]">
                <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider flex items-center justify-between border-b border-gray-200 pb-2">
                  <span>🆕 PLACED</span>
                  <span className="bg-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {adminOrders.filter(o => o.status === 'PLACED').length}
                  </span>
                </h4>
                
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px]">
                  {adminOrders.filter(o => o.status === 'PLACED').map(order => (
                    <div key={order.id} className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-amber-600">{order.orderNumber}</span>
                        <span className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <span className="text-[11px] text-gray-700 font-medium">Customer: {order.guestName || order.user?.name}</span>
                      <span className="text-xs font-bold text-gray-900">{order.totalAmount} EGP</span>
                      
                      <div className="flex items-center gap-1.5 mt-1 pt-2 border-t border-gray-50">
                        <button
                          onClick={() => handleAdminUpdateStatus(order.id, 'CONFIRMED')}
                          className="flex-1 bg-amber-500 text-white font-bold text-[10px] py-1 rounded hover:bg-amber-600 transition"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleAdminUpdateStatus(order.id, 'CANCELLED')}
                          className="bg-gray-50 text-gray-500 border border-gray-200 font-bold text-[10px] px-2 py-1 rounded hover:bg-gray-100 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preparing Columns */}
              <div className="bg-gray-100/60 border border-gray-200/50 p-4 rounded-2xl flex flex-col gap-3 min-h-[300px]">
                <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider flex items-center justify-between border-b border-gray-200 pb-2">
                  <span>🍳 PREPARING</span>
                  <span className="bg-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {adminOrders.filter(o => ['CONFIRMED', 'PREPARING'].includes(o.status)).length}
                  </span>
                </h4>
                
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px]">
                  {adminOrders.filter(o => ['CONFIRMED', 'PREPARING'].includes(o.status)).map(order => (
                    <div key={order.id} className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-amber-600">{order.orderNumber}</span>
                        <span className="text-gray-400 text-[10px]">{order.status}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1 pt-2 border-t border-gray-50">
                        {order.status === 'CONFIRMED' ? (
                          <button
                            onClick={() => handleAdminUpdateStatus(order.id, 'PREPARING')}
                            className="flex-1 bg-amber-500 text-white font-bold text-[10px] py-1 rounded hover:bg-amber-600 transition"
                          >
                            Start Preparation
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAdminUpdateStatus(order.id, 'READY')}
                            className="flex-1 bg-amber-500 text-white font-bold text-[10px] py-1 rounded hover:bg-amber-600 transition"
                          >
                            Mark Ready
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ready Columns */}
              <div className="bg-gray-100/60 border border-gray-200/50 p-4 rounded-2xl flex flex-col gap-3 min-h-[300px]">
                <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider flex items-center justify-between border-b border-gray-200 pb-2">
                  <span>📦 READY</span>
                  <span className="bg-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {adminOrders.filter(o => o.status === 'READY').length}
                  </span>
                </h4>
                
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px]">
                  {adminOrders.filter(o => o.status === 'READY').map(order => (
                    <div key={order.id} className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm flex flex-col gap-2">
                      <span className="font-bold text-xs text-amber-600">{order.orderNumber}</span>
                      
                      {/* Assign Rider dropdown */}
                      <div className="flex flex-col gap-1.5 mt-2">
                        <label className="text-[10px] font-bold text-gray-400">ASSIGN RIDER</label>
                        <select
                          onChange={(e) => handleAdminAssignRider(order.id, e.target.value)}
                          className="bg-gray-50 border border-gray-200 rounded p-1 text-xs outline-none"
                          defaultValue=""
                        >
                          <option value="" disabled>Select online rider...</option>
                          {onlineRiders.map((r: any) => (
                            <option key={r.id} value={r.id}>{r.user.name}</option>
                          ))}
                        </select>
                      </div>

                      {order.fulfillmentType !== 'DELIVERY' && (
                        <button
                          onClick={() => handleAdminUpdateStatus(order.id, 'DELIVERED')}
                          className="bg-emerald-600 text-white font-bold text-[10px] py-1 rounded hover:bg-emerald-700 transition mt-1"
                        >
                          Complete Pickup
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Columns */}
              <div className="bg-gray-100/60 border border-gray-200/50 p-4 rounded-2xl flex flex-col gap-3 min-h-[300px]">
                <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider flex items-center justify-between border-b border-gray-200 pb-2">
                  <span>🛵 DELIVERING</span>
                  <span className="bg-gray-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                    {adminOrders.filter(o => o.status === 'OUT_FOR_DELIVERY').length}
                  </span>
                </h4>
                
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[400px]">
                  {adminOrders.filter(o => o.status === 'OUT_FOR_DELIVERY').map(order => (
                    <div key={order.id} className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm flex flex-col gap-2">
                      <span className="font-bold text-xs text-amber-600">{order.orderNumber}</span>
                      <span className="text-[11px] text-gray-500">Rider: {order.rider?.user?.name || 'Assigned'}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* RIDER PORTAL VIEW */}
        {activeTab === 'rider' && (
          <div className="flex flex-col gap-6 max-w-md mx-auto animate-fade-in">
            <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-md flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm text-gray-900">{t('rider.dashboard')}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {t('rider.shiftStatus')}: <span className={`font-bold ${riderOnline ? 'text-emerald-600' : 'text-red-500'}`}>
                    {riderOnline ? t('rider.online') : t('rider.offline')}
                  </span>
                </p>
              </div>

              <button
                onClick={handleToggleRiderShift}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow transition ${
                  riderOnline 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {riderOnline ? t('rider.offline') : t('rider.online')}
              </button>
            </div>

            {/* Rider assigned shipments */}
            <div className="flex flex-col gap-4">
              <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider">{t('rider.assignedOrders')}</h3>

              {riderOrders.length === 0 ? (
                <div className="bg-white p-8 border border-gray-100 rounded-2xl text-center text-xs text-gray-400">
                  {t('rider.noOrders')}
                </div>
              ) : (
                riderOrders.map(order => (
                  <div key={order.id} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                      <span className="font-extrabold text-xs text-amber-600">{order.orderNumber}</span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{order.status}</span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs text-gray-600">
                      <span>👤 {order.guestName || 'Customer'}</span>
                      <span>📞 {order.guestPhone || 'No Phone'}</span>
                      <span>📍 {order.deliveryAddress?.fullAddress || 'Alexandria address'}</span>
                    </div>

                    {/* Progress action button */}
                    <div className="flex flex-col gap-2 mt-2">
                      {order.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleRiderUpdateStatus(order.id, 'PREPARING')}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 rounded-xl transition"
                        >
                          {t('rider.markPrepared')}
                        </button>
                      )}
                      {order.status === 'PREPARING' && (
                        <button
                          onClick={() => handleRiderUpdateStatus(order.id, 'READY')}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 rounded-xl transition"
                        >
                          {t('rider.markReady')}
                        </button>
                      )}
                      {order.status === 'READY' && (
                        <button
                          onClick={() => handleRiderUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 rounded-xl transition"
                        >
                          {t('rider.markOut')}
                        </button>
                      )}
                      {order.status === 'OUT_FOR_DELIVERY' && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleRiderUpdateStatus(order.id, 'DELIVERED')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition shadow"
                          >
                            {t('rider.markDelivered')}
                          </button>
                          
                          {/* Simulated location helper */}
                          <div className="border border-gray-100 p-2.5 rounded-xl text-center bg-gray-50 flex items-center justify-between">
                            <span className="text-[10px] text-gray-500">Broadcasting GPS Location: {riderGpsCoords.lat.toFixed(4)}, {riderGpsCoords.lng.toFixed(4)}</span>
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* FOOTER NAV BAR */}
      <footer className="bg-white border-t border-gray-100 p-4 text-center text-xs text-gray-400">
        <span>© {new Date().getFullYear()} Alex Food. Alexandria, Egypt. All rights reserved.</span>
      </footer>

      {/* ITEM CUSTOMIZATION MODAL (SHEET OVERLAY) */}
      {customizingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl flex flex-col justify-between gap-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-sm text-gray-900 font-sans">
                {locale === 'ar' ? customizingItem.nameAr : customizingItem.nameEn}
              </h3>
              <button onClick={() => setCustomizingItem(null)} className="p-1 hover:bg-gray-50 rounded-full text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto">
              {/* Image / Icon container */}
              <div className="w-full h-32 bg-amber-50 rounded-2xl flex items-center justify-center text-5xl">
                {customizingItem.slug === 'koshary' && '🥣'}
                {customizingItem.slug === 'hawawshi' && '🫓'}
                {customizingItem.slug === 'branzo' && '🐟'}
                {customizingItem.slug === 'sayadiya-rice' && '🍚'}
                {customizingItem.slug === 'umm-ali' && '🍮'}
                {customizingItem.slug === 'roz-bel-laban' && '🍧'}
              </div>

              {/* Modifier options selector */}
              {customizingItem.modifierGroups?.map((group: any) => (
                <div key={group.id} className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                    <span>{locale === 'ar' ? group.nameAr : group.nameEn}</span>
                    <span className="text-amber-500 font-semibold">{group.isRequired ? t('menu.required') : t('menu.optional')}</span>
                  </span>

                  <div className="flex flex-col gap-2">
                    {group.options.map((opt: any) => {
                      const isSelected = selectedModifiers.some(m => m.optionId === opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectModifier(group, opt)}
                          className={`flex justify-between items-center p-3 border rounded-xl text-xs font-medium transition ${
                            isSelected 
                              ? 'border-amber-500 bg-amber-50/50 text-amber-800' 
                              : 'border-gray-100 hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          <span>{locale === 'ar' ? opt.nameAr : opt.nameEn}</span>
                          <span className="font-bold">
                            {Number(opt.additionalPrice) > 0 ? `+${opt.additionalPrice} EGP` : 'Free'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Extra instructions */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SPECIAL NOTES</span>
                <input
                  type="text"
                  value={customizationNotes}
                  onChange={(e) => setCustomizationNotes(e.target.value)}
                  placeholder="E.g. No onions, extra spicy..."
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none"
                />
              </div>
            </div>

            {/* Bottom action bar */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 gap-4">
              <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl p-1 gap-3">
                <button
                  onClick={() => setCustomizationQty(Math.max(1, customizationQty - 1))}
                  className="p-1 hover:bg-amber-100 text-gray-600 rounded"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xs font-extrabold px-1.5">{customizationQty}</span>
                <button
                  onClick={() => setCustomizationQty(customizationQty + 1)}
                  className="p-1 hover:bg-amber-100 text-gray-600 rounded"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCartCustomized}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-3.5 rounded-xl shadow-md transition"
              >
                {t('menu.addToCart')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTHENTICATION TRIGGER MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl flex flex-col gap-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-gray-900">
                {authMode === 'login' ? t('common.login') : t('common.register')}
              </h3>
              <button onClick={() => setShowAuthModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuth} className="flex flex-col gap-3">
              {authMode === 'register' && (
                <>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Name"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <input
                    type="text"
                    required
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    placeholder="Phone (+2010XXXXXXXX)"
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </>
              )}
              
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="Email Address"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
              />

              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Password"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
              />

              {authMode === 'register' && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Role</label>
                  <select
                    value={authRole}
                    onChange={(e: any) => setAuthRole(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="CUSTOMER">Customer</option>
                    <option value="ADMIN">Admin</option>
                    <option value="RIDER">Delivery Rider</option>
                  </select>
                </div>
              )}

              {authError && <p className="text-[10px] text-red-500 font-bold">{authError}</p>}

              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2.5 rounded-xl transition shadow mt-1"
              >
                {authMode === 'login' ? t('common.login') : t('common.register')}
              </button>
            </form>

            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-[10px] text-amber-600 font-semibold text-center hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
