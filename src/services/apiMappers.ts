import type { Customer } from '../types/customers';
import type { Supplier } from '../types/suppliers';
import type { FinanceTransaction } from '../types/finance';
import type { InventoryItem } from '../types/inventory';
import type { InvoiceResponse } from '../types/invoice';
import type { InvoiceReturn } from '../types/invoice-return';
import type { Order } from '../types/orders';
import type { PurchaseOrder } from '../types/purchaseOrders';
import type { QuotationResponse } from '../types/quotation';
import { moneyToNumber } from '../utils/money';

const money = (value: unknown) => moneyToNumber(value as string | number | null | undefined);

export const mapCustomer = (value: any): Customer => ({
  ...value,
  shopName: value.shopName ?? value.fullName ?? 'Customer',
  fullName: value.fullName ?? value.shopName ?? 'Customer',
  address: value.address ?? '',
  city: value.city,
  creditLimit: money(value.creditLimit),
  totalInvoiced: money(value.totalInvoiced),
  totalPaid: money(value.totalPaid),
  totalSales: money(value.totalSales),
  outstandingBalance: money(value.outstandingBalance),
});

export const mapSupplier = (value: any): Supplier => ({
  ...value,
  totalSpent: money(value.totalSpent),
  balanceDue: money(value.balanceDue),
});

export const mapInventoryItem = (value: any): InventoryItem => ({
  ...value,
  inventoryCode: value.inventoryCode ?? value.inventory_code ?? value.product_code ?? '',
  productName: value.productName ?? value.product_name ?? '',
  productCode: value.productCode ?? value.product_code ?? '',
  quantity: value.quantity ?? 0,
  soldCount: value.soldCount ?? value.sold_count ?? 0,
  purchasePrice: money(value.purchasePrice ?? value.purchase_price),
  sellPrice: money(value.sellPrice ?? value.sell_price),
  discountRate: money(value.discountRate ?? value.discount_rate),
  actualSoldPrice: money(value.actualSoldPrice ?? value.actual_sold_price),
});

export const mapInvoice = (value: any): InvoiceResponse => ({
  ...value,
  customer: value.customer ? mapCustomer(value.customer) : null,
  customerDetails: value.customerDetails ?? value.customer ?? null,
  salesmanName: value.salesmanName ?? value.salesman?.fullName,
  items: (value.items ?? []).map((item: any) => ({
    ...item,
    inventoryItem: item.inventoryItem ? mapInventoryItem(item.inventoryItem) : undefined,
    itemCode: item.itemCode ?? item.inventoryItem?.productCode ?? '',
    itemName: item.itemName ?? item.inventoryItem?.productName ?? '',
    unitPrice: money(item.unitPrice),
    discount: money(item.discount),
    total: money(item.total),
  })),
  payments: (value.payments ?? []).map((payment: any) => ({ ...payment, amount: money(payment.amount) })),
  subTotal: money(value.subTotal),
  discount: money(value.discount),
  totalAmount: money(value.totalAmount),
  paidAmount: money(value.paidAmount),
  remainingAmount: money(value.remainingAmount),
  vatAmount: money(value.vatAmount),
  taxRate: money(value.taxRate),
  applyVat: Boolean(value.applyVat),
});

export const mapQuotation = (value: any): QuotationResponse => ({
  ...value,
  customer: mapCustomer(value.customer),
  items: (value.items ?? []).map((item: any) => ({
    ...item,
    inventoryItem: item.inventoryItem ? mapInventoryItem(item.inventoryItem) : undefined,
    itemName: item.itemName ?? item.inventoryItem?.productName,
    productCode: item.productCode ?? item.inventoryItem?.productCode,
    unitPrice: money(item.unitPrice),
    total: money(item.total),
  })),
  subTotal: money(value.subTotal),
  discount: money(value.discount),
  totalAmount: money(value.totalAmount),
});

export const mapInvoiceReturn = (value: any): InvoiceReturn => ({
  ...value,
  invoice: value.invoice,
  customer: value.customer ? mapCustomer(value.customer) : value.customer,
  items: (value.items ?? []).map((item: any) => ({
    ...item,
    inventoryItem: item.inventoryItem ? mapInventoryItem(item.inventoryItem) : undefined,
    unitPrice: money(item.unitPrice),
    total: money(item.total),
  })),
  returnTotal: money(value.returnTotal),
});

export const mapFinanceTransaction = (value: any): FinanceTransaction => ({
  ...value,
  paymentMethod: ({
    Cash: 'cash', Credit: 'credit', Card: 'card', 'Bank Deposit': 'bank_deposit',
    'Bank Transfer': 'bank_transfer', Cheque: 'cheque',
  } as Record<string, string>)[value.paymentMethod] ?? value.paymentMethod,
  invoice: value.invoice?.id ? value.invoice : null,
  invoiceNumber: value.invoiceNumber ?? value.invoice?.invoiceNumber ?? '',
  amount: money(value.amount),
});

export const mapOrder = (value: any): Order => ({
  ...value,
  salesmanName: value.salesmanName ?? value.salesman?.fullName,
  items: (value.items ?? []).map((item: any) => ({
    ...item,
    unitPrice: money(item.unitPrice), discount: money(item.discount), tax: money(item.tax),
    subTotal: money(item.subTotal), total: money(item.total),
  })),
  subTotal: money(value.subTotal), totalDiscount: money(value.totalDiscount),
  totalTax: money(value.totalTax), grandTotal: money(value.grandTotal),
});

export const mapPurchaseOrder = (value: any): PurchaseOrder => ({
  ...value,
  sourceOrderNumber: value.sourceOrder?.orderNumber ?? value.sourceOrderNumber ?? value.referenceOrderNum,
  items: (value.items ?? []).map((item: any) => ({
    ...item,
    unitPrice: money(item.unitPrice), discount: money(item.discount), tax: money(item.tax),
    subTotal: money(item.subTotal), totalPrice: money(item.totalPrice),
  })),
  subTotal: money(value.subTotal), discountValue: money(value.discountValue),
  totalDiscount: money(value.totalDiscount), totalTax: money(value.totalTax),
  shippingCharges: money(value.shippingCharges), totalAmount: money(value.totalAmount),
});
