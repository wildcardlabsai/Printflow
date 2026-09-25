import {
  AuditLogEntry,
  Customer,
  FilamentSpool,
  Order,
  OrderItem,
  OrderStatus,
  Printer,
  PrinterStatus,
  Product,
  ProductionJob,
  ShippingRecord,
  StatusHistoryEntry,
  SystemSettings,
  JobStatus,
  JobPriority,
} from '../types';
import { calculateProductCost } from './calculations';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_CUSTOMERS,
  INITIAL_FILAMENTS,
  INITIAL_ORDERS,
  INITIAL_PRINTERS,
  INITIAL_PRODUCTS,
  INITIAL_PRODUCTION_JOBS,
  INITIAL_SETTINGS,
  INITIAL_SHIPPING_RECORDS,
  INITIAL_STATUS_HISTORY,
} from './seedData';
import { emailService } from './emailService';

const DB_PREFIX = 'printflow_v1_';

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(DB_PREFIX + key);
    if (!item) return defaultValue;
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
    return defaultValue;
  }
}

let cloudSyncDebounce: any = null;

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(DB_PREFIX + key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('printflow_db_changed', { detail: { key } }));

    // Auto-sync debounced push to cloud database (Firebase or Supabase) if configured
    if (cloudSyncDebounce) clearTimeout(cloudSyncDebounce);
    cloudSyncDebounce = setTimeout(() => {
      // Check Firebase
      import('./firebaseDb').then(({ firebaseDb }) => {
        if (firebaseDb.isConfigured() && firebaseDb.getConfig().enabled) {
          firebaseDb.pushAllToFirebase().catch(() => {});
        }
      });

      // Check Supabase / PostgREST
      import('./cloudDb').then(({ cloudDb }) => {
        if (cloudDb.isConfigured() && cloudDb.getConfig().enabled) {
          cloudDb.pushToCloud().catch(() => {});
        }
      });
    }, 1500);
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
}

export class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public ensureInitialized(): void {
    if (!localStorage.getItem(DB_PREFIX + 'initialized')) {
      this.resetToSeedData();
    } else {
      // Ensure company name is updated to PokeCraft 3D Prints
      try {
        const currentSettings = this.getSettings();
        if (currentSettings.businessName !== 'PokeCraft 3D Prints') {
          currentSettings.businessName = 'PokeCraft 3D Prints';
          currentSettings.orderPrefix = 'PC-';
          saveToStorage('settings', currentSettings);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  public resetToSeedData(): void {
    saveToStorage('settings', INITIAL_SETTINGS);
    saveToStorage('printers', INITIAL_PRINTERS);
    saveToStorage('filaments', INITIAL_FILAMENTS);
    saveToStorage('products', INITIAL_PRODUCTS);
    saveToStorage('customers', INITIAL_CUSTOMERS);
    saveToStorage('orders', INITIAL_ORDERS);
    saveToStorage('production_jobs', INITIAL_PRODUCTION_JOBS);
    saveToStorage('shipping_records', INITIAL_SHIPPING_RECORDS);
    saveToStorage('status_history', INITIAL_STATUS_HISTORY);
    saveToStorage('audit_logs', INITIAL_AUDIT_LOGS);
    localStorage.setItem(DB_PREFIX + 'initialized', 'true');
    window.dispatchEvent(new CustomEvent('printflow_db_reset'));
  }

  // ================= SETTINGS =================
  public getSettings(): SystemSettings {
    return loadFromStorage('settings', INITIAL_SETTINGS);
  }

  public updateSettings(updates: Partial<SystemSettings>, user: string = 'System'): SystemSettings {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    saveToStorage('settings', updated);
    this.addAuditLog({
      action: 'Settings updated',
      entityType: 'Settings',
      entityId: 'global',
      summary: `Updated business settings`,
      user,
    });
    return updated;
  }

  // ================= AUDIT LOGS =================
  public getAuditLogs(): AuditLogEntry[] {
    const logs = loadFromStorage<AuditLogEntry[]>('audit_logs', []);
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const logs = loadFromStorage<AuditLogEntry[]>('audit_logs', []);
    const newEntry: AuditLogEntry = {
      id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    logs.unshift(newEntry);
    saveToStorage('audit_logs', logs.slice(0, 300)); // maintain recent 300
    return newEntry;
  }

  // ================= PRINTERS =================
  public getPrinters(): Printer[] {
    return loadFromStorage<Printer[]>('printers', []);
  }

  public getPrinterById(id: string): Printer | undefined {
    return this.getPrinters().find((p) => p.id === id);
  }

  public updatePrinterStatus(printerId: string, status: PrinterStatus, user: string = 'User'): Printer {
    const printers = this.getPrinters();
    const index = printers.findIndex((p) => p.id === printerId);
    if (index === -1) throw new Error('Printer not found');

    const updatedPrinter: Printer = {
      ...printers[index],
      status,
      updatedAt: new Date().toISOString(),
    };
    printers[index] = updatedPrinter;
    saveToStorage('printers', printers);

    this.addAuditLog({
      action: 'Printer updated',
      entityType: 'Printer',
      entityId: printerId,
      summary: `Printer ${updatedPrinter.name} status changed to ${status}`,
      user,
    });

    return updatedPrinter;
  }

  public savePrinter(printer: Printer, user: string = 'User'): Printer {
    const printers = this.getPrinters();
    const existingIndex = printers.findIndex((p) => p.id === printer.id);
    let result: Printer;

    if (existingIndex >= 0) {
      result = { ...printer, updatedAt: new Date().toISOString() };
      printers[existingIndex] = result;
      this.addAuditLog({
        action: 'Printer updated',
        entityType: 'Printer',
        entityId: printer.id,
        summary: `Updated printer details for ${printer.name}`,
        user,
      });
    } else {
      result = { ...printer, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      printers.push(result);
      this.addAuditLog({
        action: 'Printer created',
        entityType: 'Printer',
        entityId: printer.id,
        summary: `Added new printer: ${printer.name}`,
        user,
      });
    }

    saveToStorage('printers', printers);
    return result;
  }

  // ================= FILAMENTS =================
  public getFilaments(): FilamentSpool[] {
    return loadFromStorage<FilamentSpool[]>('filaments', []);
  }

  public getFilamentById(id: string): FilamentSpool | undefined {
    return this.getFilaments().find((f) => f.id === id);
  }

  public saveFilament(spool: FilamentSpool, user: string = 'User'): FilamentSpool {
    const spools = this.getFilaments();
    const existingIndex = spools.findIndex((s) => s.id === spool.id);
    let result: FilamentSpool;

    const costPerGram = spool.weightPurchasedG > 0 ? Number((spool.cost / spool.weightPurchasedG).toFixed(4)) : 0.02;
    const cleanSpool = { ...spool, costPerGram };

    if (existingIndex >= 0) {
      result = { ...cleanSpool, updatedAt: new Date().toISOString() };
      spools[existingIndex] = result;
      this.addAuditLog({
        action: 'Filament updated',
        entityType: 'Filament',
        entityId: spool.id,
        summary: `Updated filament spool: ${spool.brand} ${spool.color} (${spool.remainingWeightG}g remaining)`,
        user,
      });
    } else {
      result = { ...cleanSpool, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      spools.push(result);
      this.addAuditLog({
        action: 'Filament added',
        entityType: 'Filament',
        entityId: spool.id,
        summary: `Added new filament spool: ${spool.brand} ${spool.color} (${spool.weightPurchasedG}g)`,
        user,
      });
    }

    saveToStorage('filaments', spools);
    return result;
  }

  public deductFilament(spoolId: string, gramsUsed: number, reason: string, user: string = 'User'): FilamentSpool {
    const spools = this.getFilaments();
    const index = spools.findIndex((s) => s.id === spoolId);
    if (index === -1) throw new Error('Filament spool not found');

    const current = spools[index];
    const newRemaining = Math.max(0, current.remainingWeightG - gramsUsed);
    const updatedStatus = newRemaining === 0 ? 'Depleted' : current.spoolStatus;

    const updated: FilamentSpool = {
      ...current,
      remainingWeightG: newRemaining,
      spoolStatus: updatedStatus,
      updatedAt: new Date().toISOString(),
    };

    spools[index] = updated;
    saveToStorage('filaments', spools);

    this.addAuditLog({
      action: 'Filament updated',
      entityType: 'Filament',
      entityId: spoolId,
      summary: `Deducted ${gramsUsed}g from ${current.brand} ${current.color} (${reason}). Remaining: ${newRemaining}g`,
      user,
    });

    return updated;
  }

  // ================= PRODUCTS =================
  public getProducts(): Product[] {
    return loadFromStorage<Product[]>('products', []);
  }

  public getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  public saveProduct(product: Product, user: string = 'User'): Product {
    const products = this.getProducts();
    const existingIndex = products.findIndex((p) => p.id === product.id);
    let result: Product;

    if (existingIndex >= 0) {
      result = { ...product, updatedAt: new Date().toISOString() };
      products[existingIndex] = result;
      this.addAuditLog({
        action: 'Product edited',
        entityType: 'Product',
        entityId: product.id,
        summary: `Updated product: ${product.name} (SKU: ${product.sku})`,
        user,
      });
    } else {
      result = { ...product, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      products.push(result);
      this.addAuditLog({
        action: 'Product created',
        entityType: 'Product',
        entityId: product.id,
        summary: `Created new product: ${product.name} (SKU: ${product.sku})`,
        user,
      });
    }

    saveToStorage('products', products);
    return result;
  }

  public deleteProduct(id: string, user: string = 'User'): boolean {
    const products = this.getProducts();
    const toDelete = products.find((p) => p.id === id);
    if (!toDelete) return false;

    const filtered = products.filter((p) => p.id !== id);
    saveToStorage('products', filtered);

    this.addAuditLog({
      action: 'Product deleted',
      entityType: 'Product',
      entityId: id,
      summary: `Deleted product: ${toDelete.name}`,
      user,
    });
    return true;
  }

  // ================= CUSTOMERS =================
  public getCustomers(): Customer[] {
    return loadFromStorage<Customer[]>('customers', []);
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  public saveCustomer(customer: Customer, user: string = 'User'): Customer {
    const customers = this.getCustomers();
    const existingIndex = customers.findIndex((c) => c.id === customer.id);
    let result: Customer;

    if (existingIndex >= 0) {
      result = { ...customer, updatedAt: new Date().toISOString() };
      customers[existingIndex] = result;
      this.addAuditLog({
        action: 'Customer updated',
        entityType: 'Customer',
        entityId: customer.id,
        summary: `Updated customer profile for ${customer.name}`,
        user,
      });
    } else {
      result = { ...customer, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      customers.push(result);
      this.addAuditLog({
        action: 'Customer created',
        entityType: 'Customer',
        entityId: customer.id,
        summary: `Created customer: ${customer.name}`,
        user,
      });
    }

    saveToStorage('customers', customers);
    return result;
  }

  // ================= PRODUCTION JOBS =================
  public getProductionJobs(): ProductionJob[] {
    return loadFromStorage<ProductionJob[]>('production_jobs', []);
  }

  public getProductionJobById(id: string): ProductionJob | undefined {
    return this.getProductionJobs().find((j) => j.id === id);
  }

  public updateJobStatus(
    jobId: string,
    newStatus: JobStatus,
    details?: {
      printerId?: string;
      printerName?: string;
      actualPrintTimeMinutes?: number;
      actualFilamentGrams?: number;
      spoolId?: string;
      notes?: string;
    },
    user: string = 'User'
  ): ProductionJob {
    const jobs = this.getProductionJobs();
    const index = jobs.findIndex((j) => j.id === jobId);
    if (index === -1) throw new Error('Job not found');

    const job = jobs[index];
    const prevStatus = job.status;
    const now = new Date().toISOString();

    const updatedJob: ProductionJob = {
      ...job,
      status: newStatus,
      printerId: details?.printerId ?? job.printerId,
      printerName: details?.printerName ?? job.printerName,
      actualPrintTimeMinutes: details?.actualPrintTimeMinutes ?? job.actualPrintTimeMinutes,
      actualFilamentGrams: details?.actualFilamentGrams ?? job.actualFilamentGrams,
      spoolId: details?.spoolId ?? job.spoolId,
      notes: details?.notes ?? job.notes,
      startedAt: newStatus === 'printing' && !job.startedAt ? now : job.startedAt,
      completedAt: newStatus === 'printed' ? now : job.completedAt,
    };

    jobs[index] = updatedJob;
    saveToStorage('production_jobs', jobs);

    // If starting a job, set printer status to PRINTING
    if (newStatus === 'printing' && updatedJob.printerId) {
      const printers = this.getPrinters();
      const pIndex = printers.findIndex((p) => p.id === updatedJob.printerId);
      if (pIndex >= 0) {
        printers[pIndex] = {
          ...printers[pIndex],
          status: 'PRINTING',
          currentJobId: updatedJob.id,
          currentJobName: `${updatedJob.productName} x ${updatedJob.quantity}`,
          progressPercentage: 5,
          remainingMinutes: updatedJob.estimatedPrintTimeMinutes,
          updatedAt: now,
        };
        saveToStorage('printers', printers);
      }
    }

    // If completed or failed or cancelled, release printer if it was assigned
    if (['printed', 'failed', 'cancelled'].includes(newStatus) && updatedJob.printerId) {
      const printers = this.getPrinters();
      const pIndex = printers.findIndex((p) => p.id === updatedJob.printerId);
      if (pIndex >= 0 && printers[pIndex].currentJobId === updatedJob.id) {
        printers[pIndex] = {
          ...printers[pIndex],
          status: 'IDLE',
          currentJobId: undefined,
          currentJobName: undefined,
          progressPercentage: 0,
          remainingMinutes: 0,
          updatedAt: now,
        };
        saveToStorage('printers', printers);
      }
    }

    // If completed and filament used was provided, deduct from spool
    if (newStatus === 'printed' && updatedJob.actualFilamentGrams && updatedJob.spoolId) {
      try {
        this.deductFilament(
          updatedJob.spoolId,
          updatedJob.actualFilamentGrams,
          `Production Job #${updatedJob.id} (${updatedJob.productName})`,
          user
        );
      } catch (err) {
        console.warn('Could not deduct filament from spool:', err);
      }
    }

    // Check parent order production status
    this.syncOrderProductionStatus(updatedJob.orderId, user);

    this.addAuditLog({
      action: `Production job ${newStatus}`,
      entityType: 'Production',
      entityId: jobId,
      summary: `Job #${jobId} (${job.productName} x ${job.quantity}) status changed from ${prevStatus} to ${newStatus}`,
      user,
    });

    return updatedJob;
  }

  public assignPrinterToJob(jobId: string, printerId: string, priority?: JobPriority, user: string = 'User'): ProductionJob {
    const jobs = this.getProductionJobs();
    const index = jobs.findIndex((j) => j.id === jobId);
    if (index === -1) throw new Error('Job not found');

    const printer = this.getPrinterById(printerId);
    if (!printer) throw new Error('Printer not found');

    const updatedJob: ProductionJob = {
      ...jobs[index],
      printerId,
      printerName: printer.name,
      priority: priority ?? jobs[index].priority,
    };

    jobs[index] = updatedJob;
    saveToStorage('production_jobs', jobs);

    this.addAuditLog({
      action: 'Printer assigned',
      entityType: 'Production',
      entityId: jobId,
      summary: `Assigned job #${jobId} to ${printer.name}`,
      user,
    });

    return updatedJob;
  }

  private syncOrderProductionStatus(orderId: string, user: string): void {
    const orders = this.getOrders();
    const oIndex = orders.findIndex((o) => o.id === orderId);
    if (oIndex === -1) return;

    const orderJobs = this.getProductionJobs().filter((j) => j.orderId === orderId);
    if (orderJobs.length === 0) return;

    const allCompleted = orderJobs.every((j) => j.status === 'printed');
    const anyPrinting = orderJobs.some((j) => j.status === 'printing');
    const allCancelled = orderJobs.every((j) => j.status === 'cancelled');

    const order = orders[oIndex];
    let newProdStatus = order.productionStatus;
    let newOrderStatus = order.status;

    if (allCancelled) {
      newProdStatus = 'Cancelled';
    } else if (allCompleted) {
      newProdStatus = 'Printed';
      if (['AWAITING PRINT', 'PRINTING'].includes(order.status)) {
        newOrderStatus = 'PRINTED';
      }
    } else if (anyPrinting) {
      newProdStatus = 'Printing';
      if (order.status === 'AWAITING PRINT') {
        newOrderStatus = 'PRINTING';
      }
    } else if (orderJobs.some((j) => j.status === 'printed')) {
      newProdStatus = 'Partially Printed';
    }

    if (newProdStatus !== order.productionStatus || newOrderStatus !== order.status) {
      const updatedOrder: Order = {
        ...order,
        productionStatus: newProdStatus,
        status: newOrderStatus,
        updatedAt: new Date().toISOString(),
      };
      orders[oIndex] = updatedOrder;
      saveToStorage('orders', orders);

      this.addStatusHistory({
        orderId: order.id,
        orderInternalId: order.internalOrderId,
        previousStatus: order.status,
        newStatus: newOrderStatus,
        user,
        note: `Production updated: ${newProdStatus}`,
      });
    }
  }

  // ================= ORDERS =================
  public getOrders(): Order[] {
    const orders = loadFromStorage<Order[]>('orders', []);
    return orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }

  public getOrderById(id: string): Order | undefined {
    return this.getOrders().find((o) => o.id === id);
  }

  public createOrder(
    params: {
      customerId: string;
      salesChannel: Order['salesChannel'];
      externalOrderId?: string;
      items: Array<{
        productId: string;
        variantId?: string;
        quantity: number;
        customPrice?: number;
      }>;
      shippingCost?: number;
      discount?: number;
      shippingProvider?: string;
      shippingService?: string;
      customerNotes?: string;
      internalNotes?: string;
    },
    user: string = 'User'
  ): Order {
    const settings = this.getSettings();
    const customer = this.getCustomerById(params.customerId);
    if (!customer) throw new Error('Customer does not exist');

    const nextNum = settings.nextOrderNumber;
    const internalOrderId = `${settings.orderPrefix}${nextNum}`;
    const orderId = 'order-' + Date.now();

    const orderItems: OrderItem[] = [];
    let subtotal = 0;
    let totalProductCost = 0;

    params.items.forEach((itemParam, idx) => {
      const product = this.getProductById(itemParam.productId);
      if (!product) return;

      const variant = product.variants?.find((v) => v.id === itemParam.variantId);
      const unitPrice = itemParam.customPrice ?? (product.sellingPrice + (variant?.priceModifier || 0));
      const itemSubtotal = Number((unitPrice * itemParam.quantity).toFixed(2));

      // Calculate cost
      const costCalc = calculateProductCost({
        filamentGrams: (product.estimatedFilamentGrams + (variant?.filamentGramsModifier || 0)),
        printTimeMinutes: product.estimatedPrintTimeMinutes,
        settings,
      });

      const itemCost = Number((costCalc.totalCost * itemParam.quantity).toFixed(2));

      const orderItem: OrderItem = {
        id: `item-${orderId}-${idx + 1}`,
        orderId,
        productId: product.id,
        productName: product.name,
        variantId: variant?.id,
        variantName: variant?.name,
        quantity: itemParam.quantity,
        unitPrice,
        costPrice: costCalc.totalCost,
        filamentGramsPerUnit: product.estimatedFilamentGrams,
        printTimeMinutesPerUnit: product.estimatedPrintTimeMinutes,
        subtotal: itemSubtotal,
      };

      orderItems.push(orderItem);
      subtotal += itemSubtotal;
      totalProductCost += itemCost;
    });

    const shippingCost = params.shippingCost ?? 3.5;
    const discount = params.discount ?? 0;
    const total = Number((subtotal + shippingCost - discount).toFixed(2));
    const estimatedProfit = Number((total - totalProductCost - shippingCost).toFixed(2));

    const fullShippingAddress = `${customer.address.street}, ${customer.address.city}, ${customer.address.postcode}, ${customer.address.country}`;

    const newOrder: Order = {
      id: orderId,
      internalOrderId,
      externalOrderId: params.externalOrderId,
      salesChannel: params.salesChannel,
      orderDate: new Date().toISOString(),
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      billingAddress: fullShippingAddress,
      shippingAddress: fullShippingAddress,
      items: orderItems,
      subtotal: Number(subtotal.toFixed(2)),
      shippingCost,
      discount,
      total,
      productCost: Number(totalProductCost.toFixed(2)),
      estimatedProfit,
      paymentStatus: 'Paid',
      status: 'CONFIRMED',
      productionStatus: 'Awaiting Print',
      packingStatus: 'Unpacked',
      shippingStatus: 'Unfulfilled',
      shippingProvider: params.shippingProvider || settings.defaultShippingProvider,
      shippingService: params.shippingService || 'Tracked 48',
      customerNotes: params.customerNotes,
      internalNotes: params.internalNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save order
    const orders = this.getOrders();
    orders.unshift(newOrder);
    saveToStorage('orders', orders);

    // Increment next order number
    this.updateSettings({ nextOrderNumber: nextNum + 1 }, user);

    // Record status history
    this.addStatusHistory({
      orderId: newOrder.id,
      orderInternalId: newOrder.internalOrderId,
      previousStatus: 'NEW',
      newStatus: 'CONFIRMED',
      user,
      note: 'Order confirmed and generated',
    });

    // Automatically create required production jobs for each item
    const existingJobs = this.getProductionJobs();
    orderItems.forEach((item) => {
      const product = this.getProductById(item.productId);
      const defaultPrinter = product?.defaultPrinterId ? this.getPrinterById(product.defaultPrinterId) : undefined;

      const newJob: ProductionJob = {
        id: 'job-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        orderId: newOrder.id,
        orderInternalId: newOrder.internalOrderId,
        orderItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        printerId: defaultPrinter?.id,
        printerName: defaultPrinter?.name,
        status: 'awaiting_print',
        priority: 'NORMAL',
        estimatedPrintTimeMinutes: item.printTimeMinutesPerUnit * item.quantity,
        estimatedFilamentGrams: item.filamentGramsPerUnit * item.quantity,
        material: product?.material || 'PLA',
        color: product?.defaultFilamentColor || 'Black',
        createdAt: new Date().toISOString(),
        notes: `Auto-created for ${newOrder.internalOrderId}`,
      };

      existingJobs.push(newJob);
    });
    saveToStorage('production_jobs', existingJobs);

    this.addAuditLog({
      action: 'Order created',
      entityType: 'Order',
      entityId: newOrder.internalOrderId,
      summary: `Created order ${newOrder.internalOrderId} (${params.salesChannel}) for ${customer.name} with ${orderItems.length} line items`,
      user,
    });

    // Trigger Automated Customer Email: Order Confirmation
    try {
      emailService.sendCustomerEmail('order_confirmation', newOrder, {
        systemSettings: settings,
      });
    } catch (e) {
      console.warn('Customer order confirmation email trigger notice:', e);
    }

    return newOrder;
  }

  public updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    user: string = 'User'
  ): Order {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) throw new Error('Order not found');

    const order = orders[index];
    const prevStatus = order.status;

    let updatedPackingStatus = order.packingStatus;
    let updatedShippingStatus = order.shippingStatus;

    if (newStatus === 'PACKING') {
      updatedPackingStatus = 'Packing';
    } else if (['READY TO SHIP', 'SHIPPED', 'COMPLETED'].includes(newStatus)) {
      updatedPackingStatus = 'Packed';
    }

    if (newStatus === 'SHIPPED') {
      updatedShippingStatus = 'Shipped';
    } else if (newStatus === 'COMPLETED') {
      updatedShippingStatus = 'Delivered';
    }

    const updatedOrder: Order = {
      ...order,
      status: newStatus,
      packingStatus: updatedPackingStatus,
      shippingStatus: updatedShippingStatus,
      updatedAt: new Date().toISOString(),
    };

    orders[index] = updatedOrder;
    saveToStorage('orders', orders);

    this.addStatusHistory({
      orderId: order.id,
      orderInternalId: order.internalOrderId,
      previousStatus: prevStatus,
      newStatus,
      user,
      note,
    });

    this.addAuditLog({
      action: 'Order status changed',
      entityType: 'Order',
      entityId: order.internalOrderId,
      summary: `Order ${order.internalOrderId} status changed from ${prevStatus} to ${newStatus}`,
      user,
    });

    // Trigger Automated Customer Email: Order Completed
    if (newStatus === 'COMPLETED' && prevStatus !== 'COMPLETED') {
      try {
        emailService.sendCustomerEmail('order_completed', updatedOrder, {
          systemSettings: this.getSettings(),
        });
      } catch (e) {
        console.warn('Customer order completed email trigger notice:', e);
      }
    }

    return updatedOrder;
  }

  public updateOrderShipping(
    orderId: string,
    data: {
      provider: string;
      service: string;
      trackingNumber?: string;
      shippingCost?: number;
      markAsShipped?: boolean;
    },
    user: string = 'User'
  ): Order {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === orderId);
    if (index === -1) throw new Error('Order not found');

    const order = orders[index];
    const newStatus = data.markAsShipped ? 'SHIPPED' : order.status;

    const updatedOrder: Order = {
      ...order,
      shippingProvider: data.provider,
      shippingService: data.service,
      trackingNumber: data.trackingNumber || order.trackingNumber,
      shippingCost: data.shippingCost ?? order.shippingCost,
      shippingStatus: data.markAsShipped ? 'Shipped' : data.trackingNumber ? 'Label Created' : order.shippingStatus,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    orders[index] = updatedOrder;
    saveToStorage('orders', orders);

    // Save shipping record
    const shippingRecords = this.getShippingRecords();
    const existingRecIndex = shippingRecords.findIndex((r) => r.orderId === orderId);

    const record: ShippingRecord = {
      id: existingRecIndex >= 0 ? shippingRecords[existingRecIndex].id : 'ship-' + Date.now(),
      orderId: order.id,
      orderInternalId: order.internalOrderId,
      customerName: order.customerName,
      shippingAddress: order.shippingAddress,
      shippingProvider: data.provider,
      shippingService: data.service,
      trackingNumber: data.trackingNumber || order.trackingNumber,
      shippingCost: data.shippingCost ?? order.shippingCost,
      labelStatus: data.trackingNumber ? 'Printed' : 'Pending',
      shippedDate: data.markAsShipped ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString(),
    };

    if (existingRecIndex >= 0) {
      shippingRecords[existingRecIndex] = record;
    } else {
      shippingRecords.unshift(record);
    }
    saveToStorage('shipping_records', shippingRecords);

    if (data.markAsShipped && order.status !== 'SHIPPED') {
      this.addStatusHistory({
        orderId: order.id,
        orderInternalId: order.internalOrderId,
        previousStatus: order.status,
        newStatus: 'SHIPPED',
        user,
        note: `Dispatched via ${data.provider} (${data.trackingNumber || 'No tracking'})`,
      });
    }

    this.addAuditLog({
      action: 'Order shipping updated',
      entityType: 'Shipping',
      entityId: order.internalOrderId,
      summary: `Updated shipping for ${order.internalOrderId}: ${data.provider} - Tracking: ${data.trackingNumber || 'None'}`,
      user,
    });

    // Trigger Automated Customer Email: Order Dispatched & Tracking
    if (data.trackingNumber) {
      try {
        emailService.sendCustomerEmail('order_dispatched', updatedOrder, {
          trackingNumber: data.trackingNumber,
          carrier: data.provider,
          service: data.service,
          systemSettings: this.getSettings(),
        });
      } catch (e) {
        console.warn('Customer dispatch email trigger notice:', e);
      }
    }

    return updatedOrder;
  }

  // ================= SHIPPING RECORDS =================
  public getShippingRecords(): ShippingRecord[] {
    return loadFromStorage<ShippingRecord[]>('shipping_records', []);
  }

  // ================= STATUS HISTORY =================
  public getStatusHistory(orderId?: string): StatusHistoryEntry[] {
    const list = loadFromStorage<StatusHistoryEntry[]>('status_history', []);
    if (orderId) {
      return list.filter((h) => h.orderId === orderId);
    }
    return list;
  }

  public addStatusHistory(entry: Omit<StatusHistoryEntry, 'id' | 'timestamp'>): StatusHistoryEntry {
    const list = loadFromStorage<StatusHistoryEntry[]>('status_history', []);
    const newEntry: StatusHistoryEntry = {
      id: 'hist-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    list.unshift(newEntry);
    saveToStorage('status_history', list);
    return newEntry;
  }

  // ================= BACKUP / EXPORT / IMPORT =================
  public exportDataJSON(): string {
    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      printers: this.getPrinters(),
      filaments: this.getFilaments(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      orders: this.getOrders(),
      production_jobs: this.getProductionJobs(),
      shipping_records: this.getShippingRecords(),
      status_history: this.getStatusHistory(),
      audit_logs: this.getAuditLogs(),
    }, null, 2);
  }

  public importDataJSON(jsonStr: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.orders || !data.products) {
        return { success: false, message: 'Invalid backup format' };
      }
      if (data.settings) saveToStorage('settings', data.settings);
      if (data.printers) saveToStorage('printers', data.printers);
      if (data.filaments) saveToStorage('filaments', data.filaments);
      if (data.products) saveToStorage('products', data.products);
      if (data.customers) saveToStorage('customers', data.customers);
      if (data.orders) saveToStorage('orders', data.orders);
      if (data.production_jobs) saveToStorage('production_jobs', data.production_jobs);
      if (data.shipping_records) saveToStorage('shipping_records', data.shipping_records);
      if (data.status_history) saveToStorage('status_history', data.status_history);
      if (data.audit_logs) saveToStorage('audit_logs', data.audit_logs);
      window.dispatchEvent(new CustomEvent('printflow_db_reset'));
      return { success: true, message: 'Database successfully imported' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Import error' };
    }
  }
}

export const db = DatabaseService.getInstance();
