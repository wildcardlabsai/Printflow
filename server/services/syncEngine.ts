import { Order, OrderItem, ProductionJob, SalesChannel, ProductMapping, Customer, OrderStatus } from '../../src/types';
import { serverStore } from '../storage';

export interface NormalizedMarketplaceItem {
  externalListingId: string;
  externalSku?: string;
  title: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  variations?: Record<string, string>;
}

export interface NormalizedMarketplaceOrder {
  channel: SalesChannel;
  externalOrderId: string;
  externalReceiptId?: string;
  orderDate: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    street: string;
    city: string;
    state?: string;
    postcode: string;
    country: string;
  };
  items: NormalizedMarketplaceItem[];
  subtotal: number;
  shippingPaid: number;
  discount: number;
  total: number;
  customerNotes?: string;
  isPaid: boolean;
  isShipped: boolean;
  carrier?: string;
  trackingNumber?: string;
}

export interface SyncEngineResult {
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  ordersRequiringMapping: number;
  errors: string[];
}

export class OrderSyncEngine {
  /**
   * Processes an array of normalized orders from any marketplace
   * using a shared normalization, duplicate check, SKU mapping,
   * order generation, and production queue dispatch pipeline.
   */
  public static async processMarketplaceOrders(
    orders: NormalizedMarketplaceOrder[],
    existingOrders: Order[],
    existingProducts: Array<{ id: string; sku: string; name: string; sellingPrice: number; costPrice: number; estimatedFilamentGrams: number; estimatedPrintTimeMinutes: number; material: any; defaultFilamentColor: string; defaultPrinterId?: string }>,
    existingCustomers: Customer[],
    nextOrderNumber: number,
    orderPrefix: string
  ): Promise<{
    result: SyncEngineResult;
    updatedOrders: Order[];
    newProductionJobs: ProductionJob[];
    updatedCustomers: Customer[];
    newNextOrderNumber: number;
  }> {
    const mappings = serverStore.getMappings();
    const result: SyncEngineResult = {
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsSkipped: 0,
      ordersRequiringMapping: 0,
      errors: [],
    };

    const updatedOrders = [...existingOrders];
    const newProductionJobs: ProductionJob[] = [];
    const updatedCustomers = [...existingCustomers];
    let currentNextNum = nextOrderNumber;

    for (const rawOrder of orders) {
      result.recordsProcessed++;

      try {
        // 1. Duplicate Check: check if order exists by channel and externalOrderId
        const existingOrderIndex = updatedOrders.findIndex(
          (o) => o.salesChannel === rawOrder.channel && o.externalOrderId === rawOrder.externalOrderId
        );

        // 2. Customer Match or Create
        let customer = updatedCustomers.find(
          (c) => c.email.toLowerCase() === rawOrder.customer.email.toLowerCase()
        );

        if (!customer) {
          customer = {
            id: 'cust-mkt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            name: rawOrder.customer.name || 'Marketplace Buyer',
            email: rawOrder.customer.email || `buyer-${rawOrder.externalOrderId}@marketplace.local`,
            phone: rawOrder.customer.phone || '',
            address: {
              street: rawOrder.customer.street || 'Address on file',
              city: rawOrder.customer.city || 'City',
              stateOrCounty: rawOrder.customer.state || '',
              postcode: rawOrder.customer.postcode || 'Postcode',
              country: rawOrder.customer.country || 'United Kingdom',
            },
            notes: `Auto-imported from ${rawOrder.channel}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          updatedCustomers.push(customer);
        }

        // 3. Product / SKU Matching
        let allItemsMapped = true;
        const mappedItems: OrderItem[] = [];
        let totalProductCost = 0;

        for (let i = 0; i < rawOrder.items.length; i++) {
          const item = rawOrder.items[i];
          let matchedProduct: any = undefined;
          let matchedVariantId: string | undefined = undefined;

          // Check manual mapping first
          const manualMap = mappings.find(
            (m) =>
              m.salesChannel === rawOrder.channel &&
              ((item.externalSku && m.externalSku === item.externalSku) ||
                (item.externalListingId && m.externalListingId === item.externalListingId))
          );

          if (manualMap) {
            matchedProduct = existingProducts.find((p) => p.id === manualMap.internalProductId);
            matchedVariantId = manualMap.internalVariantId;
          }

          // If no manual mapping, attempt direct SKU matching
          if (!matchedProduct && item.externalSku) {
            matchedProduct = existingProducts.find(
              (p) => p.sku.toLowerCase() === item.externalSku!.toLowerCase()
            );
          }

          if (matchedProduct) {
            const unitCost = matchedProduct.costPrice || 2.5;
            totalProductCost += unitCost * item.quantity;

            mappedItems.push({
              id: `item-mkt-${Date.now()}-${i + 1}`,
              orderId: '', // assigned below
              productId: matchedProduct.id,
              productName: matchedProduct.name,
              variantId: matchedVariantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: unitCost,
              filamentGramsPerUnit: matchedProduct.estimatedFilamentGrams,
              printTimeMinutesPerUnit: matchedProduct.estimatedPrintTimeMinutes,
              subtotal: item.subtotal,
            });
          } else {
            allItemsMapped = false;
            mappedItems.push({
              id: `item-unmapped-${Date.now()}-${i + 1}`,
              orderId: '',
              productId: 'unmapped',
              productName: `[UNMAPPED] ${item.title} (Listing: ${item.externalListingId})`,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              costPrice: 0,
              filamentGramsPerUnit: 0,
              printTimeMinutesPerUnit: 0,
              subtotal: item.subtotal,
            });
          }
        }

        // Determine Status: If unmapped items exist, order MUST go to 'MAPPING REQUIRED'
        let orderStatus: OrderStatus = 'CONFIRMED';
        if (!allItemsMapped) {
          orderStatus = 'MAPPING REQUIRED';
          result.ordersRequiringMapping++;
        } else if (rawOrder.isShipped) {
          orderStatus = 'SHIPPED';
        } else {
          orderStatus = 'AWAITING PRINT';
        }

        const estimatedProfit = Number(
          (rawOrder.total - totalProductCost - rawOrder.shippingPaid).toFixed(2)
        );

        const fullShippingAddress = `${rawOrder.customer.street}, ${rawOrder.customer.city}, ${rawOrder.customer.postcode}, ${rawOrder.customer.country}`;

        if (existingOrderIndex >= 0) {
          // UPDATE existing order (Idempotency)
          const existing = updatedOrders[existingOrderIndex];

          const updated: Order = {
            ...existing,
            subtotal: rawOrder.subtotal,
            shippingCost: rawOrder.shippingPaid,
            total: rawOrder.total,
            productCost: totalProductCost,
            estimatedProfit,
            trackingNumber: rawOrder.trackingNumber || existing.trackingNumber,
            shippingProvider: rawOrder.carrier || existing.shippingProvider,
            shippingStatus: rawOrder.isShipped ? 'Shipped' : existing.shippingStatus,
            status: existing.status === 'MAPPING REQUIRED' && allItemsMapped ? 'AWAITING PRINT' : existing.status,
            marketplaceMetadata: {
              ...existing.marketplaceMetadata,
              receiptId: rawOrder.externalReceiptId,
              lastSyncedAt: new Date().toISOString(),
              syncStatus: allItemsMapped ? 'synced' : 'mapping_required',
            },
            updatedAt: new Date().toISOString(),
          };

          updatedOrders[existingOrderIndex] = updated;
          result.recordsUpdated++;
        } else {
          // CREATE new order
          const internalOrderId = `${orderPrefix}${currentNextNum}`;
          currentNextNum++;
          const orderId = 'order-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

          mappedItems.forEach((it) => (it.orderId = orderId));

          const newOrder: Order = {
            id: orderId,
            internalOrderId,
            externalOrderId: rawOrder.externalOrderId,
            salesChannel: rawOrder.channel,
            orderDate: rawOrder.orderDate,
            customerId: customer.id,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            billingAddress: fullShippingAddress,
            shippingAddress: fullShippingAddress,
            items: mappedItems,
            subtotal: rawOrder.subtotal,
            shippingCost: rawOrder.shippingPaid,
            discount: rawOrder.discount,
            total: rawOrder.total,
            productCost: totalProductCost,
            estimatedProfit,
            paymentStatus: rawOrder.isPaid ? 'Paid' : 'Pending',
            status: orderStatus,
            productionStatus: allItemsMapped ? 'Awaiting Print' : 'Cancelled',
            packingStatus: 'Unpacked',
            shippingStatus: rawOrder.isShipped ? 'Shipped' : 'Unfulfilled',
            shippingProvider: rawOrder.carrier || 'Royal Mail',
            shippingService: 'Tracked 48',
            trackingNumber: rawOrder.trackingNumber,
            customerNotes: rawOrder.customerNotes,
            internalNotes: `Synced from ${rawOrder.channel}`,
            marketplaceMetadata: {
              receiptId: rawOrder.externalReceiptId,
              lastSyncedAt: new Date().toISOString(),
              syncStatus: allItemsMapped ? 'synced' : 'mapping_required',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          updatedOrders.unshift(newOrder);
          result.recordsCreated++;

          // 4. Create Production Jobs ONLY if all products are mapped and not already shipped
          if (allItemsMapped && !rawOrder.isShipped) {
            mappedItems.forEach((item) => {
              const prod = existingProducts.find((p) => p.id === item.productId);
              if (!prod) return;

              const job: ProductionJob = {
                id: 'job-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                orderId: newOrder.id,
                orderInternalId: newOrder.internalOrderId,
                orderItemId: item.id,
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                printerId: prod.defaultPrinterId,
                status: 'awaiting_print',
                priority: 'NORMAL',
                estimatedPrintTimeMinutes: prod.estimatedPrintTimeMinutes * item.quantity,
                estimatedFilamentGrams: prod.estimatedFilamentGrams * item.quantity,
                material: prod.material,
                color: prod.defaultFilamentColor || 'Black',
                createdAt: new Date().toISOString(),
                notes: `Marketplace order: ${newOrder.salesChannel} (${newOrder.externalOrderId})`,
              };

              newProductionJobs.push(job);
            });
          }
        }
      } catch (err: any) {
        result.errors.push(`Order ${rawOrder.externalOrderId}: ${err.message}`);
      }
    }

    return {
      result,
      updatedOrders,
      newProductionJobs,
      updatedCustomers,
      newNextOrderNumber: currentNextNum,
    };
  }
}
