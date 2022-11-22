import { Router } from "express";
import bodyParser from "body-parser";

export default (rootDirectory, pluginOptions) => {
  const router = Router();

  router.use(bodyParser.json());

  router.get("/mercadopago", (req, res) => {
    res.json({
      message: "Welcome to Totemiq Mercadopago!",
    });
  });

  router.post("/mercadopago", async (req, res) => {
    const mercadoPagoProviderService = req.scope.resolve("mercadopagoService");
    let paymentDetail;

    //Obtain payment details if the "type" of notification is "payment"
    try {
      if (req.body.type === "payment") {
        paymentDetail = await mercadoPagoProviderService.notificationPayment(
          req.body
        );
      }
    } catch (err) {
      res.sendStatus(402);
      return;
    }

    async function handleCartPayments(event, req, res, paymentIntent, cartId) {
      const manager = req.scope.resolve("manager");
      const cartService = req.scope.resolve("cartService");
      const orderService = req.scope.resolve("orderService");

      const order = await orderService
        .retrieveByCartId(cartId)
        .catch(() => undefined);

      await manager.transaction(async (m) => {
        switch (event) {
          case "payment.created":
            if (!order) {
              const cartServiceTx = cartService.withTransaction(manager);
              await cartServiceTx.setPaymentSession(cartId, "mercadopago");
              await cartServiceTx.authorizePayment(cartId, {
                id: paymentIntent.id,
              });
              await orderService
                .withTransaction(manager)
                .createFromCart(cartId);
            }
            break;
          default:
            res.sendStatus(204);
            return;
        }
      });
    }

    try {
      // Notification action type
      const event = paymentDetail?.action;
      // Payment details MercadoPago
      const paymentIntent = paymentDetail?.payment;
      // cartId that comes in the detail of the MercadoPago payment
      const cartId = paymentIntent?.external_reference;
      if (cartId) {
        await handleCartPayments(event, req, res, paymentIntent, cartId);
      }

      res.sendStatus(200);
    } catch (e) {
      res.sendStatus(409);
    }
  });
  return router;
};
