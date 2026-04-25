"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function PayPalButton() {
  return (
    <PayPalScriptProvider
      options={{
        "client-id":
          "ATbmRwUuq9O6z0LlAQpKAExOtYxN5Tf47V3yPsWXo6x2Uc3YrLpfbqO8KmpQiFHQM00tNQFhOMs8x4_u",
        currency: "USD",
      }}
    >
      <PayPalButtons
        createOrder={(data, actions) => {
          return actions.order.create({
            purchase_units: [
              {
                amount: { value: "5.00" },
              },
            ],
          });
        }}
        onApprove={(data, actions) => {
          return actions.order.capture().then(() => {
            alert("支付成功");
          });
        }}
      />
    </PayPalScriptProvider>
  );
}