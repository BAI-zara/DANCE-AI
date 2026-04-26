"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function PayPalButton() {
  return (
    <PayPalScriptProvider
      options={{
        clientId:
          "ATbmRwUuq9O6z0LlAQpKAExOtYxN5Tf47V3yPsWXo6x2Uc3YrLpfbqO8KmpQiFHQM00tNQFhOMs8x4_u",
        currency: "USD",
      }}
    >
      <PayPalButtons
        style={{
          layout: "vertical",
          shape: "pill",
          label: "paypal",
        }}
        createOrder={(data, actions) => {
          return actions.order.create({
            intent: "CAPTURE",
            purchase_units: [
              {
                amount: { currency_code: "USD", value: "5.00" },
              },
            ],
          });
        }}
        onApprove={(data, actions) => {
          if (!actions.order) return Promise.resolve();
          return actions.order.capture().then(() => {
            alert("Payment successful");
          });
        }}
      />
    </PayPalScriptProvider>
  );
}
