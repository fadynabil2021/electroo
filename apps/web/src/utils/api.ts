'use strict';

const API_BASE = 'http://localhost:3011/api/v1';

async function request(path: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as any;

  // Add authorization token if available in localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errBody;
    try {
      errBody = await response.json();
    } catch {
      errBody = { detail: 'Request failed' };
    }
    throw new Error(errBody.detail || errBody.message || 'Request failed');
  }

  // Handle CSV attachment for export
  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('text/csv')) {
    return response.text();
  }

  return response.json();
}

export const api = {
  // Auth
  async login(credentials: any) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.accessToken) {
      localStorage.setItem('access_token', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    return res;
  },

  async register(data: any) {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.accessToken) {
      localStorage.setItem('access_token', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    return res;
  },

  async requestOtp(phone: string) {
    return request('/auth/phone/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  async verifyOtp(phone: string, otp: string) {
    const res = await request('/auth/phone/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
    if (res.accessToken) {
      localStorage.setItem('access_token', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
    }
    return res;
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  getCurrentUser() {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Menu
  async fetchMenu() {
    return request('/menu');
  },

  async searchMenu(q: string) {
    return request(`/menu/search?q=${encodeURIComponent(q)}`);
  },

  // Orders
  async placeOrder(orderData: any) {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async fetchOrderDetail(orderId: string) {
    return request(`/orders/${orderId}`);
  },

  async cancelOrder(orderId: string, reason: string) {
    return request(`/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async validateCoupon(code: string, subtotal: number) {
    return request('/orders/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    });
  },

  // Payments
  async initiatePayment(orderId: string) {
    return request(`/payments/initiate/${orderId}`, {
      method: 'POST',
    });
  },

  async simulatePayment(orderId: string, success: boolean) {
    return request('/payments/simulate', {
      method: 'POST',
      body: JSON.stringify({ orderId, success }),
    });
  },

  // Admin CRUD & Ops
  async adminFetchOrders(status?: string) {
    return request(`/admin/orders${status ? `?status=${status}` : ''}`);
  },

  async adminUpdateOrderStatus(orderId: string, status: string, note?: string) {
    return request(`/admin/orders/${orderId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    });
  },

  async adminAssignRider(orderId: string, riderId: string) {
    return request(`/admin/orders/${orderId}/assign-rider`, {
      method: 'POST',
      body: JSON.stringify({ riderId }),
    });
  },

  async adminFetchUsers() {
    return request('/admin/users');
  },

  async adminUpdateUserStatus(userId: string, isActive: boolean) {
    return request(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    });
  },

  async adminFetchRiders() {
    return request('/admin/riders');
  },

  async adminFetchAnalytics() {
    return request('/admin/reports/summary');
  },

  async adminExportReportsCsv() {
    return request('/admin/reports/export');
  },

  async adminCreateCategory(data: any) {
    return request('/admin/menu/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async adminCreateMenuItem(data: any) {
    return request('/admin/menu/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async adminFetchCoupons() {
    return request('/admin/coupons');
  },

  async adminCreateCoupon(data: any) {
    return request('/admin/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Rider Dashboard
  async riderFetchAssignedOrders() {
    return request('/riders/orders');
  },

  async riderUpdateLocation(latitude: number, longitude: number) {
    return request('/riders/location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
  },

  async riderUpdateStatus(orderId: string, status: string, note?: string) {
    return request(`/riders/orders/${orderId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    });
  },

  async riderToggleShift(isOnline: boolean) {
    return request('/riders/status', {
      method: 'POST',
      body: JSON.stringify({ isOnline }),
    });
  },

  async getRiderProfile() {
    return request('/riders/profile');
  }
};
