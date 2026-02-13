"use client";

import { useMemo, useState } from "react";

import { AppShell } from "../../../components/app-shell";
import { productCatalog } from "../../../lib/demo-data";

type ShippingMethod = "standard" | "priority" | "express";

type OrderRecord = {
  id: string;
  customer: string;
  total: number;
  itemCount: number;
};

const couponBook: Record<string, number> = {
  DEMO10: 0.1,
  POWER20: 0.2
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export default function CommerceFlowPage() {
  const [cart, setCart] = useState<Record<string, number>>({ "P-11": 1, "P-14": 1 });
  const [couponInput, setCouponInput] = useState("DEMO10");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>("DEMO10");
  const [shipping, setShipping] = useState<ShippingMethod>("standard");
  const [customerName, setCustomerName] = useState("Jordan Lee");
  const [customerEmail, setCustomerEmail] = useState("jordan@northstar.io");
  const [country, setCountry] = useState("US");
  const [orderCounter, setOrderCounter] = useState(8200);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [couponMessage, setCouponMessage] = useState("Coupon DEMO10 applied.");

  const cartItems = useMemo(
    () =>
      productCatalog
        .filter((product) => cart[product.id] > 0)
        .map((product) => ({ ...product, quantity: cart[product.id] })),
    [cart]
  );

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );
  const discountRate = appliedCoupon ? couponBook[appliedCoupon] ?? 0 : 0;
  const discountAmount = subtotal * discountRate;
  const shippingCost = shipping === "express" ? 24 : shipping === "priority" ? 12 : 0;
  const taxable = Math.max(subtotal - discountAmount, 0);
  const tax = taxable * 0.08;
  const total = taxable + shippingCost + tax;

  function addToCart(productId: string) {
    setCart((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
  }

  function updateQuantity(productId: string, delta: -1 | 1) {
    setCart((current) => {
      const nextQuantity = Math.max((current[productId] ?? 0) + delta, 0);
      return { ...current, [productId]: nextQuantity };
    });
  }

  function applyCoupon() {
    const normalized = couponInput.trim().toUpperCase();
    if (couponBook[normalized]) {
      setAppliedCoupon(normalized);
      setCouponMessage(`Coupon ${normalized} applied.`);
    } else {
      setAppliedCoupon(null);
      setCouponMessage(`Coupon ${normalized || "(empty)"} is invalid.`);
    }
  }

  function clearCart() {
    setCart({});
    setAppliedCoupon(null);
    setCouponMessage("Cart cleared.");
  }

  function completeOrder() {
    if (cartItems.length === 0 || customerName.trim() === "" || customerEmail.trim() === "") {
      setCouponMessage("Add items and customer info before checkout.");
      return;
    }

    const order: OrderRecord = {
      id: `ORD-${orderCounter}`,
      customer: customerName,
      total,
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    };

    setOrders((current) => [order, ...current]);
    setOrderCounter((current) => current + 1);
    setCart({});
    setCouponMessage(`Order ${order.id} completed successfully.`);
  }

  return (
    <AppShell
      title="Commerce Checkout"
      subtitle="Catalog browsing, cart updates, coupon logic, and checkout confirmation."
      activeRoute="/flows/commerce"
    >
      <div className="grid-two">
        <section className="card stack" data-testid="commerce-catalog">
          <div className="space-between">
            <h3>Catalog</h3>
            <span className="pill">{productCatalog.length} products</span>
          </div>
          {productCatalog.map((product) => (
            <article key={product.id} className="card stack" data-testid={`commerce-product-${product.id}`}>
              <div className="space-between">
                <strong>{product.name}</strong>
                <span className="pill">{product.category}</span>
              </div>
              <p className="muted">Stock: {product.stock}</p>
              <div className="space-between">
                <strong>{money(product.price)}</strong>
                <button
                  className="button secondary"
                  data-testid={`commerce-add-${product.id}`}
                  type="button"
                  onClick={() => addToCart(product.id)}
                >
                  Add to cart
                </button>
              </div>
            </article>
          ))}
        </section>

        <section className="card stack" data-testid="commerce-cart">
          <div className="space-between">
            <h3>Cart + Checkout</h3>
            <span className="pill">{cartItems.length} line items</span>
          </div>

          <div className="stack">
            {cartItems.length === 0 ? <p className="muted">Cart is empty.</p> : null}
            {cartItems.map((item) => (
              <div key={item.id} className="space-between card" data-testid={`commerce-cart-item-${item.id}`}>
                <div>
                  <strong>{item.name}</strong>
                  <p className="muted">
                    {money(item.price)} x {item.quantity}
                  </p>
                </div>
                <div className="row">
                  <button
                    className="button ghost"
                    data-testid={`commerce-dec-${item.id}`}
                    onClick={() => updateQuantity(item.id, -1)}
                    type="button"
                  >
                    -
                  </button>
                  <button
                    className="button ghost"
                    data-testid={`commerce-inc-${item.id}`}
                    onClick={() => updateQuantity(item.id, 1)}
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid-two">
            <label className="field">
              <span className="label">Coupon</span>
              <input
                className="input"
                data-testid="commerce-coupon-input"
                value={couponInput}
                onChange={(event) => setCouponInput(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="label">Shipping</span>
              <select
                className="select"
                data-testid="commerce-shipping"
                value={shipping}
                onChange={(event) => setShipping(event.target.value as ShippingMethod)}
              >
                <option value="standard">Standard (Free)</option>
                <option value="priority">Priority ($12)</option>
                <option value="express">Express ($24)</option>
              </select>
            </label>
          </div>

          <div className="row">
            <button className="button ghost" data-testid="commerce-apply-coupon" onClick={applyCoupon} type="button">
              Apply coupon
            </button>
            <button className="button warning" data-testid="commerce-clear-cart" onClick={clearCart} type="button">
              Clear cart
            </button>
          </div>

          <div className="banner info" data-testid="commerce-coupon-message">
            {couponMessage}
          </div>

          <div className="grid-two">
            <label className="field">
              <span className="label">Customer name</span>
              <input
                className="input"
                data-testid="commerce-customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </label>
            <label className="field">
              <span className="label">Customer email</span>
              <input
                className="input"
                data-testid="commerce-customer-email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
              />
            </label>
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span className="label">Country</span>
              <select
                className="select"
                data-testid="commerce-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="DE">Germany</option>
              </select>
            </label>
          </div>

          <table className="table" data-testid="commerce-totals">
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td>{money(subtotal)}</td>
              </tr>
              <tr>
                <td>Discount</td>
                <td>-{money(discountAmount)}</td>
              </tr>
              <tr>
                <td>Shipping</td>
                <td>{money(shippingCost)}</td>
              </tr>
              <tr>
                <td>Tax</td>
                <td>{money(tax)}</td>
              </tr>
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td>
                  <strong>{money(total)}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <button className="button primary" data-testid="commerce-complete-order" type="button" onClick={completeOrder}>
            Complete order
          </button>
        </section>
      </div>

      <section className="card stack" data-testid="commerce-order-history">
        <div className="space-between">
          <h3>Recent orders</h3>
          <span className="pill">{orders.length}</span>
        </div>
        {orders.length === 0 ? <p className="muted">No orders completed this session.</p> : null}
        {orders.map((order) => (
          <div key={order.id} className="timeline-item" data-testid={`commerce-order-${order.id}`}>
            {order.id} · {order.customer} · {order.itemCount} items · {money(order.total)}
          </div>
        ))}
      </section>
    </AppShell>
  );
}
