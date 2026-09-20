/** An Order row with what its price depends on — see orderLineTotal. */
interface PricedOrderLine {
  quantity: number;
  menu: { price: number };
  OrdersAddons: { addon: { price: number } }[];
}

/** The one definition of what a line costs: menu price × quantity plus
 *  the sum of its selected addons' prices (addons are counted once per
 *  line, not per unit — this is the billing formula the cashier's total
 *  is built from). Shared so the cashier list, the customer's receipt,
 *  the order-confirmed screen and history can't disagree. */
export function orderLineTotal(order: PricedOrderLine) {
  const addonsTotal = order.OrdersAddons.reduce(
    (sum, link) => sum + link.addon.price,
    0,
  );
  return order.menu.price * order.quantity + addonsTotal;
}

export function orderLinesTotal(orders: PricedOrderLine[]) {
  return orders.reduce((sum, order) => sum + orderLineTotal(order), 0);
}
