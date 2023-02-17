# medusa-payment-mercadopago

This is a plugin for [Mercado Pago](https://www.mercadopago.com/) built using [MedusaJS](https://medusajs.com/), an open-source headless commerce platform.

The plugin provides a seamless integration between Mercado Pago and MedusaJS, enabling online merchants to easily accept payments from customers in their local currency. The repository includes documentation on how to install and configure the plugin, as well as examples of its usage.

## Installation

To install the plugin, simply run the following command:

```bash
npm install @minskylab/medusa-payment-mercadopago
```

or

```bash
yarn add @minskylab/medusa-payment-mercadopago
```

## Configuration

To configure the plugin, you'll need to set the following environment variables:

- `MERCADOPAGO_ACCESS_TOKEN`: Your Mercado Pago access token
- `MERCADOPAGO_SUCCESS_BACKURL`: Your store plattform backurl when payment is successful
- `MERCADOPAGO_WEBHOOK_URL`: Your store plattform url

## Usage

To use the plugin, simply add the following code to your MedusaJS configuration:

```js
const plugins = [
  // ..
  {
    resolve: `@minskylab/medusa-payment-mercadopago`,
    options: {
      access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
      success_backurl: process.env.MERCADOPAGO_SUCCESS_BACKURL,
      webhook_url: process.env.MERCADOPAGO_WEBHOOK_URL,
    },
  },
];
// ..
```

For more information, please refer to the [documentation](https://github.com/minskylab/medusa-payment-mercadopago).

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you encounter any problems.

## License

This project is licensed under the [MIT License](https://choosealicense.com/licenses/mit/)
