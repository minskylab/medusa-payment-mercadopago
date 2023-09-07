import {
  AbstractPaymentService,
  Cart,
  Data,
  Payment,
  PaymentSession,
  PaymentSessionStatus,
  RegionService,
  TransactionBaseService,
} from "@medusajs/medusa";
import { EntityManager } from "typeorm";
import mercadopago from "mercadopago";
import { humanizeAmount } from "medusa-core-utils";
import { PaymentProviderDataInput } from "@medusajs/medusa/dist/types/payment-collection";

class MercadopagoProviderService extends AbstractPaymentService {
  static identifier = "mercadopago";
  private regionService_: RegionService;
  private options_;
  private mercadopago_;

  protected manager_: EntityManager;
  protected transactionManager_: EntityManager;

  constructor({ regionService, manager }, options) {
    super({ regionService }, options);

    /**
     * Required PayPal options:
     *  {
     *    access_token: "MERCADOPAGO_ACCESS_TOKEN", REQUIRED
     *    store_url: "STORE_PLATFORM_URL", REQUIRED
     *    webhook_url: "MERCADOPAGO_WEBHOOK_URL", REQUIRED
     *  }
     */
    this.options_ = options;

    /** @private @const {MercadoPago} */
    this.mercadopago_ = mercadopago;
    this.mercadopago_.configure({
      access_token: options.access_token,
    });

    /** @private @const {RegionService} */
    this.regionService_ = regionService;

    /** @private @const {EntityManager} */
    this.manager_ = manager;
  }

  /**
   * Obtain payment details from the updated
   * paymentSession data after payment authorization
   * @param {object} paymentSession - payment session
   * @returns {Promise<object>} Mercadopago payment
   */
  async getPaymentData(paymentSession: PaymentSession): Promise<Data> {
    try {
      const payment = await this.retrievePayment(paymentSession.data);
      return payment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Updates the data field of the PaymentSession.
   * @param {object} paymentSessionData - current data.
   * @param {object} updateData - updated data to save.
   * @returns {object} updated data composed of the two parameters.
   */
  async updatePaymentData(paymentSessionData: Data, data: Data): Promise<Data> {
    try {
      return {
        ...paymentSessionData,
        ...data,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a preference from MercadoPago.
   * Reference docs: https://www.mercadopago.com.pe/developers/es/reference/preferences/_checkout_preferences/post
   * @param {object} cart
   * @returns {object} object that is stored in the data field of the created PaymentSession.
   */
  async createPayment(cart: Cart): Promise<Data> {
    const { region_id } = cart;
    const { currency_code } = await this.regionService_.retrieve(region_id);
    const items = cart.items.map((item) => {
      return {
        id: item.id /**REQUIRED */,
        title: item.title /**REQUIRED */,
        quantity: item.quantity /**REQUIRED */,
        unit_price: humanizeAmount(
          item.unit_price,
          currency_code
        ) /**REQUIRED */,
        currency_id: currency_code.toUpperCase(),
        description: item.description,
      };
    });

    const preference = {
      items: items /**REQUIRED */,
      payer: {
        name: cart.billing_address?.first_name,
        surname: cart.billing_address?.last_name,
        email: cart.email,
      },
      notification_url: `${this.options_.webhook_url}/mercadopago`,
      external_reference: cart.id, //This field will allow you to relate the payment with the cartid
      back_urls: {
        //Return the cardId in the url to get the order from the client side
        success: `${this.options_.success_backurl}/${cart.id}/`,
      },
    };

    const paymentIntent = await this.mercadopago_.preferences.create(
      preference
    );

    return {
      preferenceId: paymentIntent.body.id,
      url: paymentIntent.body.init_point,
      urlSandbox: paymentIntent.body.sandbox_init_point,
    };
  }

  /**
   * Obtain the detail of the MercadoPago Payment.
   * @param {object} paymentData - data containing the payment id
   * @returns {Promise<object>} object with payment detail
   */
  async retrievePayment(paymentData: Data): Promise<Data> {
    try {
      const res = await this.mercadopago_.payment.get(paymentData.id);
      return res.body;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update MercadoPago preference.
   * @param {object} paymentSessionData - payment session data.
   * @param {object} cart - updated cart.
   * @returns {object} paymentSessionData.
   */
  async updatePayment(paymentSessionData: Data, cart: Cart): Promise<Data> {
    try {
      const { region_id } = cart;
      const { currency_code } = await this.regionService_.retrieve(region_id);
      const items = cart.items.map((item) => {
        return {
          id: item.id,
          title: item.title,
          quantity: item.quantity,
          unit_price: humanizeAmount(item.unit_price, currency_code),
          currency_id: currency_code.toUpperCase(),
          description: item.description,
        };
      });

      const preference = {
        items: items,
        payer: {
          name: cart.billing_address.first_name,
          surname: cart.billing_address.last_name,
          email: cart.email,
        },
        external_reference: cart.id,
        back_urls: {
          success: `${this.options_.success_backurl}/${cart.id}/`,
        },
      };
      const paymentIntent = await this.mercadopago_.preferences.update({
        id: paymentSessionData.preferenceId,
        items: items,
        payer: {
          name: cart.billing_address.first_name,
          surname: cart.billing_address.last_name,
          email: cart.email,
        },
        external_reference: cart.id,
        back_urls: {
          success: `${this.options_.success_backurl}/${cart.id}/`,
        },
      });

      return {
        preferenceId: paymentIntent.body.id,
        url: paymentIntent.body.init_point,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Authorize the MercadoPago payment attempt
   * @param {object} paymentSession - payment session data
   * @param {object} context - object with relevant data indicating the status of the payment
   * @returns {Promise<{ status: string, data: object }>} result with data and status
   */
  async authorizePayment(
    paymentSession: PaymentSession,
    context: Data
  ): Promise<{ data: Data; status: PaymentSessionStatus }> {
    //Get payment status
    const status = await this.getStatus(context);
    try {
      return {
        data: {
          ...paymentSession.data,
          id: context.id, //payment id
        },
        status: status,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Capture payment for a previously authorized order
   * @param {object} payment - payment of the order to capture
   * @returns {object} MercadoPago payment
   */
  async capturePayment(payment: Payment): Promise<Data> {
    try {
      if (payment.data.captured === true) {
        return payment.data;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refund an amount.
   * @param {object} payment - payment to be reimbursed
   * @param {number} refundAmount - amount to be reimbursed
   * @returns {Promise<Object>} MercadoPago payment
   */
  async refundPayment(payment: Payment, refundAmount: number): Promise<Data> {
    try {
      await this.mercadopago_.refund.create({
        payment_id: payment.data.id,
        amount: Math.round(humanizeAmount(refundAmount, payment.currency_code)),
      });
      const paymentData = await this.retrievePayment(payment.data);
      return paymentData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel payment
   * @param {Payment} payment - payment to cancel
   * @returns {Promise<object>} payment canceled from MercadoPago
   */
  async cancelPayment(payment: Payment): Promise<Data> {
    const paymentData = await this.retrievePayment(payment.data);
    const isCancelled = paymentData.status === "cancelled";
    const isFullyRefund =
      paymentData.status === "refunded" &&
      paymentData.transaction_amount ===
        paymentData.transaction_amount_refunded;
    /** If the payment was already canceled or fully refunded,
     * it can no longer be canceled or refunded*/
    if (isCancelled || isFullyRefund) {
      return paymentData;
    }
    try {
      /**If the payment was captured, we proceed to refund */
      if (payment.data.captured === true) {
        await this.mercadopago_.refund.create({
          payment_id: payment.data.id,
        });
      }
      /** If the payment status is Pending or In process, it is canceled */
      if (
        paymentData.status === "pending" ||
        paymentData.status === "in_process"
      ) {
        await this.mercadopago_.payment.cancel(payment.data.id);
      }
      return await this.retrievePayment(payment.data);
    } catch (error) {
      throw error;
    }
  }
  async deletePayment(paymentSession: PaymentSession): Promise<void> {
    throw new Error("Method not implemented.");
  }

  /**
   * Obtain the MercadoPago payment status
   * and return the valid status for Medusa.
   * @param {object} payment data or paymentSession
   * @returns {string} payment status
   */
  async getStatus(data: Data): Promise<PaymentSessionStatus> {
    const paymentIntent = await this.retrievePayment(data);
    switch (paymentIntent.status) {
      case "approved":
      case "authorized":
        return PaymentSessionStatus.AUTHORIZED;
      case "refunded":
      case "charged_back":
      case "cancelled":
        return PaymentSessionStatus.CANCELED;
      case "rejected":
        return PaymentSessionStatus.ERROR;
      case "pending":
      case "in_process":
      case "in_mediation":
        return PaymentSessionStatus.PENDING;
      default:
        return PaymentSessionStatus.PENDING;
    }
  }

  /**
   * Obtain payment information from the notification received
   * @param {object} body from webhook request: req.body
   * @returns {object} MercadoPago req.body and payment detail
   */
  async notificationPayment(body) {
    const paymentId = body.data.id;
    const payment = await this.retrievePayment(body.data);

    return {
      ...body,
      payment,
    };
  }

  async createPaymentNew(
    paymentInput: PaymentProviderDataInput
  ): Promise<Data> {
    throw new Error("createPaymentNew Method");
  }

  async updatePaymentNew(
    paymentSessionData: Data,
    paymentInput: PaymentProviderDataInput
  ): Promise<Data> {
    throw new Error("updatePaymentNew Method");
  }
}

export default MercadopagoProviderService;
