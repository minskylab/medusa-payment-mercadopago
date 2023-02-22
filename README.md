![medusaimage](https://user-images.githubusercontent.com/30696989/220211077-5e081407-e44b-4f62-8f61-c731b49a8a01.png)
<div align="center">
  <h1>medusa-payment-mercadopago</h1>
</div>

This is a [Medusa](https://medusajs.com/) plugin that adds [Mercado Pago](https://www.mercadopago.com/) as a payment provider to Medusa ecommerce stores.

The plugin provides a seamless integration between Mercado Pago and MedusaJS, enabling online merchants to easily accept payments from customers in their local currency. The repository includes documentation on how to install and configure the plugin, as well as examples of its usage.

## Installation

In the root of your Medusa server, run the following command to install the plugin:

```bash
npm install @minskylab/medusa-payment-mercadopago
```

or

```bash
yarn add @minskylab/medusa-payment-mercadopago
```

## Configuration

Register for a MercadoPago account and get your [credentials](https://www.mercadopago.com.pe/developers/en/docs/checkout-pro/additional-content/credentials). To configure the plugin, you'll need to set the following environment variables in your environment file (.env)

```
MERCADOPAGO_ACCESS_TOKEN=<your access token>
MERCADOPAGO_SUCCESS_BACKURL=<your backurl when payment is successful>
MERCADOPAGO_WEBHOOK_URL=<your medusa server url>
```

Next, in `medusa-config.js` add the following at the end of the `plugins` array:

```js
const plugins = [
  // other plugins
  {
    resolve: `@minskylab/medusa-payment-mercadopago`,
    options: {
      access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
      success_backurl: process.env.MERCADOPAGO_SUCCESS_BACKURL,
      webhook_url: process.env.MERCADOPAGO_WEBHOOK_URL,
    },
  },
];
```

## Client side configuration

`medusa-payment-mercadopago` returns a preference id you should send to Mercadopago Checkout as the preference id.

By using the returned ID, the plugin can obtain the necessary URL to initiate the payment flow with the product information.

### Using Preference ID

`medusa-payment-mercadopago` inserts a `preferenceId` into the [PaymentSession](https://docs.medusajs.com/advanced/backend/payment/overview/#payment-session)'s data.

Provide this id to initialize your checkout.

### Add Mercadopago Checkout Pro

To add Checkout Pro to your client-side, you'll need to install the Mercado Pago frontend SDK. In this example, we'll be using the **[react-sdk-mercadopago](https://github.com/s4mukka/react-sdk-mercadopago)** package to integrate the SDK with React.

Once you've installed the SDK, you can initialize the checkout by providing your `PUBLIC KEY` and the `preferenceId`. Take a look at the example below for guidance.

In this example, we've used a button to open Checkout Pro in a modal format, allowing the user to complete their purchase.

```js
import { useMercadopago } from "react-sdk-mercadopago";

const MERCADOPAGO_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "";

const MercadoPagoButton = ({ session }: { session: PaymentSession }) => {
  const mercadoPago = useMercadopago.v2(MERCADOPAGO_PUBLIC_KEY, {
    locale: "es-PE",
  });

  const checkout = mercadoPago?.checkout({
    preference: {
      id: session.data.preferenceId, //preference ID
    },
  });

  return (
    <Button
      size="md"
      onClick={() => checkout.open()}
    >
      Pagar
    </Button>
  );
};
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you encounter any problems.

## License

This project is licensed under the [MIT License](https://choosealicense.com/licenses/mit/)
