import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../lib/db';
import {
  AuditLogEntry,
  Customer,
  FilamentSpool,
  Order,
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
import { useAuth } from './AuthContext';

interface DatabaseContextType {
  orders: Order[];
  products: Product[];
  customers: Customer[];
  productionJobs: ProductionJob[];
  printers: Printer[];
  filaments: FilamentSpool[];
  shippingRecords: ShippingRecord[];
  statusHistory: StatusHistoryEntry[];
  auditLogs: AuditLogEntry[];
  settings: SystemSettings;
  refreshData: () => void;
  resetDatabase: () => void;
  // Order actions
  createOrder: (data: Parameters<typeof db.createOrder>[0]) => Order;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus, note?: string) => Order;
  updateOrderShipping: (orderId: string, data: Parameters<typeof db.updateOrderShipping>[1]) => Order;
  // Product actions
  saveProduct: (product: Product) => Product;
  deleteProduct: (id: string) => boolean;
  // Customer actions
  saveCustomer: (customer: Customer) => Customer;
  // Printer actions
  updatePrinterStatus: (printerId: string, status: PrinterStatus) => Printer;
  savePrinter: (printer: Printer) => Printer;
  // Production actions
  updateJobStatus: (
    jobId: string,
    newStatus: JobStatus,
    details?: {
      printerId?: string;
      printerName?: string;
      actualPrintTimeMinutes?: number;
      actualFilamentGrams?: number;
      spoolId?: string;
      notes?: string;
    }
  ) => ProductionJob;
  assignPrinterToJob: (jobId: string, printerId: string, priority?: JobPriority) => ProductionJob;
  // Filament actions
  saveFilament: (spool: FilamentSpool) => FilamentSpool;
  deductFilament: (spoolId: string, gramsUsed: number, reason: string) => FilamentSpool;
  // Settings actions
  updateSettings: (updates: Partial<SystemSettings>) => SystemSettings;
  // Backup
  exportDataJSON: () => string;
  importDataJSON: (jsonStr: string) => { success: boolean; message: string };
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userName = user?.name || user?.email || 'Operator';

  const [orders, setOrders] = useState<Order[]>(() => db.getOrders());
  const [products, setProducts] = useState<Product[]>(() => db.getProducts());
  const [customers, setCustomers] = useState<Customer[]>(() => db.getCustomers());
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>(() => db.getProductionJobs());
  const [printers, setPrinters] = useState<Printer[]>(() => db.getPrinters());
  const [filaments, setFilaments] = useState<FilamentSpool[]>(() => db.getFilaments());
  const [shippingRecords, setShippingRecords] = useState<ShippingRecord[]>(() => db.getShippingRecords());
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>(() => db.getStatusHistory());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => db.getAuditLogs());
  const [settings, setSettings] = useState<SystemSettings>(() => db.getSettings());

  const refreshData = useCallback(() => {
    setOrders(db.getOrders());
    setProducts(db.getProducts());
    setCustomers(db.getCustomers());
    setProductionJobs(db.getProductionJobs());
    setPrinters(db.getPrinters());
    setFilaments(db.getFilaments());
    setShippingRecords(db.getShippingRecords());
    setStatusHistory(db.getStatusHistory());
    setAuditLogs(db.getAuditLogs());
    setSettings(db.getSettings());
  }, []);

  useEffect(() => {
    const handleDbChange = () => refreshData();
    window.addEventListener('printflow_db_changed', handleDbChange);
    window.addEventListener('printflow_db_reset', handleDbChange);
    return () => {
      window.removeEventListener('printflow_db_changed', handleDbChange);
      window.removeEventListener('printflow_db_reset', handleDbChange);
    };
  }, [refreshData]);

  const resetDatabase = () => {
    db.resetToSeedData();
    refreshData();
  };

  const createOrder = (data: Parameters<typeof db.createOrder>[0]) => {
    const result = db.createOrder(data, userName);
    refreshData();
    return result;
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus, note?: string) => {
    const result = db.updateOrderStatus(orderId, newStatus, note, userName);
    refreshData();
    return result;
  };

  const updateOrderShipping = (orderId: string, data: Parameters<typeof db.updateOrderShipping>[1]) => {
    const result = db.updateOrderShipping(orderId, data, userName);
    refreshData();
    return result;
  };

  const saveProduct = (product: Product) => {
    const result = db.saveProduct(product, userName);
    refreshData();
    return result;
  };

  const deleteProduct = (id: string) => {
    const result = db.deleteProduct(id, userName);
    refreshData();
    return result;
  };

  const saveCustomer = (customer: Customer) => {
    const result = db.saveCustomer(customer, userName);
    refreshData();
    return result;
  };

  const updatePrinterStatus = (printerId: string, status: PrinterStatus) => {
    const result = db.updatePrinterStatus(printerId, status, userName);
    refreshData();
    return result;
  };

  const savePrinter = (printer: Printer) => {
    const result = db.savePrinter(printer, userName);
    refreshData();
    return result;
  };

  const updateJobStatus = (
    jobId: string,
    newStatus: JobStatus,
    details?: {
      printerId?: string;
      printerName?: string;
      actualPrintTimeMinutes?: number;
      actualFilamentGrams?: number;
      spoolId?: string;
      notes?: string;
    }
  ) => {
    const result = db.updateJobStatus(jobId, newStatus, details, userName);
    refreshData();
    return result;
  };

  const assignPrinterToJob = (jobId: string, printerId: string, priority?: JobPriority) => {
    const result = db.assignPrinterToJob(jobId, printerId, priority, userName);
    refreshData();
    return result;
  };

  const saveFilament = (spool: FilamentSpool) => {
    const result = db.saveFilament(spool, userName);
    refreshData();
    return result;
  };

  const deductFilament = (spoolId: string, gramsUsed: number, reason: string) => {
    const result = db.deductFilament(spoolId, gramsUsed, reason, userName);
    refreshData();
    return result;
  };

  const updateSettings = (updates: Partial<SystemSettings>) => {
    const result = db.updateSettings(updates, userName);
    refreshData();
    return result;
  };

  const exportDataJSON = () => db.exportDataJSON();
  const importDataJSON = (json: string) => {
    const res = db.importDataJSON(json);
    if (res.success) refreshData();
    return res;
  };

  return (
    <DatabaseContext.Provider
      value={{
        orders,
        products,
        customers,
        productionJobs,
        printers,
        filaments,
        shippingRecords,
        statusHistory,
        auditLogs,
        settings,
        refreshData,
        resetDatabase,
        createOrder,
        updateOrderStatus,
        updateOrderShipping,
        saveProduct,
        deleteProduct,
        saveCustomer,
        updatePrinterStatus,
        savePrinter,
        updateJobStatus,
        assignPrinterToJob,
        saveFilament,
        deductFilament,
        updateSettings,
        exportDataJSON,
        importDataJSON,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
