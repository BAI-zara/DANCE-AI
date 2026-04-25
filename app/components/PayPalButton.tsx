"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function PayPalButton() {
  const paypalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://www.paypal.com/sdk/js?client-id=ATbmRwUuq9O6z0LlAQpKAExOtYxN5Tf47V3yPsWXo6x2Uc3YrLpfbqO8KmpQiFHQM00tNQFhOMs8x4_u&currency=USD";
    script.async = true;

    script.onload = () => {
      if (window.paypal) {
        window.paypal
          .Buttons({
            createOrder: (data: any, actions: any) => {
              return actions.order.create({
                purchase_units: [{ amount: { value: "5.00" } }],
              });
            },
            onApprove: (data: any, actions: any) => {
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