"use client";

import { useEffect } from "react";

export default function PayPalButton() {
  useEffect(() => {
    // 防止重复加载 script
    if (document.getElementById("paypal-script")) return;

    const script = document.createElement("script");
    script.id = "paypal-script";
    script.src =
      "https://www.paypal.com/sdk/js?client-id=AQ210w6UOiDh2vjMeqdwwYAAMWpeJ_9L6QY4oN8iWYmLvy8G3vA8Hz_ATBJTcQ9VAtcoq4_BY27iKvGB&currency=USD";
    script.async = true;

    script.onload = () => {
      // @ts-ignore
      if (window.paypal) {
        // @ts-ignore
        window.paypal
          .Buttons({
            createOrder: function (data: any, actions: any) {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: "5.00", // 💰价格（可以改）
                    },
                  },
                ],
              });
            },
            onApprove: function (data: any, actions: any) {
              return actions.order.capture().then(function (details: any) {
                alert("支付成功：" + details.payer.name.given_name);
              });
            },
          })
          .render("#paypal-button");
      }
    };

    document.body.appendChild(script);
  }, []);

  return <div id="paypal-button" style={{ marginTop: "20px" }} />;
}