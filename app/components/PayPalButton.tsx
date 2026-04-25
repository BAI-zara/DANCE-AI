"use client";

import { useEffect, useRef } from "react";

export default function PayPalButton() {
  const paypalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://www.paypal.com/sdk/js?client-id=AQ210w6UOiDh2vjMeqdwwYAAMWpeJ_9L6QY4oN8iWYmLvy8G3vA8Hz_ATBJTcQ9VAtcoq4_BY27iKvGB&currency=USD";
    script.async = true;

    script.onload = () => {
      if (window.paypal) {
        window.paypal
          .Buttons({
            createOrder: (data, actions) => {
              return actions.order.create({
                purchase_units: [{ amount: { value: "5.00" } }],
              });
            },
            onApprove: (data, actions) => {
              return actions.order.capture().then(() => {
                alert("支付成功");
              });
            },
          })
          .render(paypalRef.current);
      }
    };

    document.body.appendChild(script);
  }, []);

  return <div ref={paypalRef} style={{ marginTop: "20px" }} />;
}