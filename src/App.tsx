/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { DatabaseProvider, useDatabase } from './context/DatabaseContext';
import { Sidebar, NavSection } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';

// Views
import { DashboardView } from './components/dashboard/DashboardView';
import { OrdersView } from './components/orders/OrdersView';
import { ProductionView } from './components/production/ProductionView';
import { ProductsView } from './components/products/ProductsView';
import { CustomersView } from './components/customers/CustomersView';
import { PrintersView } from './components/printers/PrintersView';
import { FilamentView } from './components/filament/FilamentView';
import { ShippingView } from './components/shipping/ShippingView';
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { AuditLogView } from './components/audit/AuditLogView';

// Modals
import { NewOrderModal } from './components/orders/NewOrderModal';
import { OrderDetailModal } from './components/orders/OrderDetailModal';
import { ProductFormModal } from './components/products/ProductFormModal';
import { CustomerFormModal } from './components/customers/CustomerFormModal';
import { CustomerDetailModal } from './components/customers/CustomerDetailModal';
import { FilamentFormModal } from './components/filament/FilamentFormModal';
import { LogUsageModal } from './components/filament/LogUsageModal';
import { PrinterFormModal } from './components/printers/PrinterFormModal';
import { JobActionModal } from './components/production/JobActionModal';
import { ShippingLabelModal } from './components/shipping/ShippingLabelModal';
import { AuthModal } from './components/auth/AuthModal';

import { Order, Product, Customer, FilamentSpool, Printer, ProductionJob } from './types';

function MainApp() {
  const { isAuthenticated } = useAuth();
  const { updatePrinterStatus } = useDatabase();

  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Modal States
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [productModalState, setProductModalState] = useState<{
    isOpen: boolean;
    product: Product | null;
  }>({ isOpen: false, product: null });

  const [customerModalState, setCustomerModalState] = useState<{
    isOpen: boolean;
    customer: Customer | null;
  }>({ isOpen: false, customer: null });

  const [customerDetail, setCustomerDetail] = useState<Customer | null>(null);

  const [filamentModalState, setFilamentModalState] = useState<{
    isOpen: boolean;
    spool: FilamentSpool | null;
  }>({ isOpen: false, spool: null });

  const [logUsageSpool, setLogUsageSpool] = useState<FilamentSpool | null>(null);

  const [printerModalState, setPrinterModalState] = useState<{
    isOpen: boolean;
    printer: Printer | null;
  }>({ isOpen: false, printer: null });

  const [jobActionState, setJobActionState] = useState<{
    job: ProductionJob | null;
    actionType: 'start' | 'complete' | 'assign' | 'fail' | 'cancel' | null;
    isOpen: boolean;
  }>({ job: null, actionType: null, isOpen: false });

  const [shippingModalOrder, setShippingModalOrder] = useState<Order | null>(null);

  // Printer quick status toggle from dashboard
  const handlePrinterStatusToggle = (printer: Printer) => {
    const nextStatus = printer.status === 'IDLE' ? 'PRINTING' : printer.status === 'PRINTING' ? 'IDLE' : 'ONLINE';
    updatePrinterStatus(printer.id, nextStatus);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans antialiased">
      {/* Unauthenticated gate overlay */}
      {!isAuthenticated && <AuthModal isOpen={true} />}

      {/* Desktop Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onNavigate={setCurrentSection}
        className="hidden md:flex"
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentSection={currentSection}
          onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
          onOpenNewOrder={() => setIsNewOrderOpen(true)}
          onOpenNewProduct={() => setProductModalState({ isOpen: true, product: null })}
          onNavigate={setCurrentSection}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 sm:py-6 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {currentSection === 'dashboard' && (
              <DashboardView
                onNavigate={setCurrentSection}
                onSelectOrder={(id) => setSelectedOrderId(id)}
                onOpenNewOrder={() => setIsNewOrderOpen(true)}
                onJobAction={(job, actionType) =>
                  setJobActionState({ job, actionType, isOpen: true })
                }
                onPrinterStatusToggle={handlePrinterStatusToggle}
              />
            )}

            {currentSection === 'orders' && (
              <OrdersView
                onSelectOrder={(id) => setSelectedOrderId(id)}
                onOpenNewOrder={() => setIsNewOrderOpen(true)}
                onOpenShippingModal={(ord) => setShippingModalOrder(ord)}
              />
            )}

            {currentSection === 'production' && (
              <ProductionView
                onJobAction={(job, actionType) =>
                  setJobActionState({ job, actionType, isOpen: true })
                }
                onSelectOrder={(id) => setSelectedOrderId(id)}
              />
            )}

            {currentSection === 'products' && (
              <ProductsView
                onOpenProductModal={(p) => setProductModalState({ isOpen: true, product: p || null })}
              />
            )}

            {currentSection === 'customers' && (
              <CustomersView
                onOpenCustomerModal={(c) =>
                  setCustomerModalState({ isOpen: true, customer: c || null })
                }
                onSelectCustomer={(c) => setCustomerDetail(c)}
              />
            )}

            {currentSection === 'printers' && (
              <PrintersView
                onOpenPrinterModal={(p) =>
                  setPrinterModalState({ isOpen: true, printer: p || null })
                }
                onNavigateToProduction={() => setCurrentSection('production')}
              />
            )}

            {currentSection === 'filament' && (
              <FilamentView
                onOpenFilamentModal={(s) =>
                  setFilamentModalState({ isOpen: true, spool: s || null })
                }
                onOpenLogUsageModal={(s) => setLogUsageSpool(s)}
              />
            )}

            {currentSection === 'shipping' && (
              <ShippingView
                onOpenShippingModal={(ord) => setShippingModalOrder(ord)}
                onSelectOrder={(id) => setSelectedOrderId(id)}
              />
            )}

            {currentSection === 'integrations' && <IntegrationsView />}

            {currentSection === 'reports' && <ReportsView />}

            {currentSection === 'settings' && <SettingsView />}

            {currentSection === 'audit' && <AuditLogView />}
          </div>
        </main>

        {/* Mobile Navigation bar & Drawer */}
        <MobileNav
          currentSection={currentSection}
          onNavigate={setCurrentSection}
          isOpenDrawer={isMobileDrawerOpen}
          onCloseDrawer={() => setIsMobileDrawerOpen(false)}
          onOpenDrawer={() => setIsMobileDrawerOpen(true)}
        />
      </div>

      {/* Global Modals */}
      {/* 1. New Order Modal */}
      <NewOrderModal
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        onSuccess={(id) => setSelectedOrderId(id)}
      />

      {/* 2. Order Detail Modal */}
      <OrderDetailModal
        orderId={selectedOrderId}
        isOpen={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onOpenShippingModal={(ord) => {
          setSelectedOrderId(null);
          setShippingModalOrder(ord);
        }}
      />

      {/* 3. Product Form Modal */}
      <ProductFormModal
        isOpen={productModalState.isOpen}
        product={productModalState.product}
        onClose={() => setProductModalState({ isOpen: false, product: null })}
      />

      {/* 4. Customer Form Modal */}
      <CustomerFormModal
        isOpen={customerModalState.isOpen}
        customer={customerModalState.customer}
        onClose={() => setCustomerModalState({ isOpen: false, customer: null })}
      />

      {/* 5. Customer Detail Modal */}
      <CustomerDetailModal
        customer={customerDetail}
        isOpen={!!customerDetail}
        onClose={() => setCustomerDetail(null)}
        onSelectOrder={(ordId) => setSelectedOrderId(ordId)}
      />

      {/* 6. Filament Form Modal */}
      <FilamentFormModal
        isOpen={filamentModalState.isOpen}
        spool={filamentModalState.spool}
        onClose={() => setFilamentModalState({ isOpen: false, spool: null })}
      />

      {/* 7. Log Usage / Weighed Spool Modal */}
      <LogUsageModal
        isOpen={!!logUsageSpool}
        spool={logUsageSpool}
        onClose={() => setLogUsageSpool(null)}
      />

      {/* 8. Printer Form Modal */}
      <PrinterFormModal
        isOpen={printerModalState.isOpen}
        printer={printerModalState.printer}
        onClose={() => setPrinterModalState({ isOpen: false, printer: null })}
      />

      {/* 9. Production Job Action Modal */}
      <JobActionModal
        isOpen={jobActionState.isOpen}
        job={jobActionState.job}
        actionType={jobActionState.actionType}
        onClose={() => setJobActionState({ job: null, actionType: null, isOpen: false })}
      />

      {/* 10. Shipping Label & Tracking Modal */}
      <ShippingLabelModal
        isOpen={!!shippingModalOrder}
        order={shippingModalOrder}
        onClose={() => setShippingModalOrder(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <DatabaseProvider>
          <MainApp />
        </DatabaseProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
