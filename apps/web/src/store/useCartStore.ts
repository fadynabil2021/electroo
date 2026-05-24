'use strict';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartModifier {
  optionId: string;
  optionNameEn: string;
  optionNameAr: string;
  groupNameEn: string;
  groupNameAr: string;
  additionalPrice: number;
}

export interface CartItem {
  id: string; // Unique row ID
  menuItemId: string;
  nameEn: string;
  nameAr: string;
  price: number; // Unit price including modifiers
  basePrice: number;
  quantity: number;
  modifiers: CartModifier[];
  notes?: string;
}

export interface CouponState {
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY';
  value: number;
  minOrderAmount?: number;
}

interface CartStore {
  items: CartItem[];
  coupon: CouponState | null;
  fulfillmentType: 'DELIVERY' | 'PICKUP' | 'DINE_IN';
  setFulfillmentType: (type: 'DELIVERY' | 'PICKUP' | 'DINE_IN') => void;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  applyCoupon: (coupon: CouponState) => void;
  removeCoupon: () => void;
  clearCart: () => void;
  getTotals: () => {
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    tax: number;
    discount: number;
    total: number;
  };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      fulfillmentType: 'DELIVERY',

      setFulfillmentType: (type) => set({ fulfillmentType: type }),

      addItem: (newItem) => {
        const items = get().items;
        
        // Find if item with same ID and modifiers exists
        const existingIndex = items.findIndex(
          (item) =>
            item.menuItemId === newItem.menuItemId &&
            JSON.stringify(item.modifiers) === JSON.stringify(newItem.modifiers)
        );

        if (existingIndex > -1) {
          const updatedItems = [...items];
          updatedItems[existingIndex].quantity += newItem.quantity;
          set({ items: updatedItems });
        } else {
          const id = `${newItem.menuItemId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          set({ items: [...items, { ...newItem, id }] });
        }
      },

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity } : item
          ),
        }));
      },

      applyCoupon: (coupon) => set({ coupon }),

      removeCoupon: () => set({ coupon: null }),

      clearCart: () => set({ items: [], coupon: null }),

      getTotals: () => {
        const { items, coupon, fulfillmentType } = get();
        
        const subtotal = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        let deliveryFee = fulfillmentType === 'DELIVERY' ? 15 : 0;
        let discount = 0;

        if (coupon) {
          if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
            // Coupon no longer valid due to subtotal drops
          } else {
            if (coupon.type === 'PERCENTAGE') {
              discount = parseFloat((subtotal * (coupon.value / 100)).toFixed(2));
            } else if (coupon.type === 'FIXED_AMOUNT') {
              discount = coupon.value;
            } else if (coupon.type === 'FREE_DELIVERY') {
              deliveryFee = 0;
            }
          }
        }

        if (discount > subtotal) {
          discount = subtotal;
        }

        const serviceFee = 5; // Flat 5 EGP
        const taxableAmount = Math.max(0, subtotal + serviceFee - discount);
        const tax = parseFloat((taxableAmount * 0.14).toFixed(2)); // 14% VAT
        const total = parseFloat(
          (subtotal + deliveryFee + serviceFee + tax - discount).toFixed(2)
        );

        return {
          subtotal,
          deliveryFee,
          serviceFee,
          tax,
          discount,
          total: total > 0 ? total : 0,
        };
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
