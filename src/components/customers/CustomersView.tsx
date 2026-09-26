import React, { useState } from 'react';
import { useDatabase } from '../../context/DatabaseContext';
import { Customer } from '../../types';
import { formatCurrency } from '../../lib/calculations';
import { Button } from '../ui/Button';
import { Users, Plus, Search, Mail, Phone, MapPin, Eye, Edit } from 'lucide-react';

interface CustomersViewProps {
  onOpenCustomerModal: (customer?: Customer) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onOpenCustomerModal,
  onSelectCustomer,
}) => {
  const { customers, orders, settings } = useDatabase();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = customers.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q) ?? false;
      const matchCity = c.address.city.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchCity) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Top Filter & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search customers by name, email, phone, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onOpenCustomerModal()}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Add Customer
        </Button>
      </div>

      {/* Customer Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>
            Directory: <strong className="text-white">{filteredCustomers.length}</strong> active buyers
          </span>
          <span className="text-[11px]">Click a customer to see full purchase timeline</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 select-none">
              <tr>
                <th className="px-3.5 py-2.5 font-medium">Customer Name</th>
                <th className="px-3.5 py-2.5 font-medium">Contact Details</th>
                <th className="px-3.5 py-2.5 font-medium">Delivery City</th>
                <th className="px-3.5 py-2.5 font-medium text-center">Orders</th>
                <th className="px-3.5 py-2.5 font-medium text-right">Lifetime Spend</th>
                <th className="px-3.5 py-2.5 font-medium">Latest Activity</th>
                <th className="px-3.5 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                        <Users className="w-6 h-6 text-slate-500" />
                      </div>
                      <p className="text-sm text-slate-300 font-medium mb-1">
                        {customers.length === 0 ? 'No customers yet' : 'No customers match your search'}
                      </p>
                      <p className="text-xs text-slate-500 mb-4 max-w-[260px]">
                        {customers.length === 0
                          ? 'Customers are added automatically when you create orders, or you can add them manually.'
                          : 'Try adjusting your search criteria.'}
                      </p>
                      {customers.length === 0 && (
                        <Button variant="primary" size="sm" onClick={() => onOpenCustomerModal()} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                          Add First Customer
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const custOrders = orders.filter((o) => o.customerId === cust.id);
                  const totalSpend = custOrders.reduce((acc, o) => acc + o.total, 0);
                  const latestOrder = custOrders[0]?.orderDate;

                  return (
                    <tr
                      key={cust.id}
                      onClick={() => onSelectCustomer(cust)}
                      className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="font-semibold text-white text-xs">{cust.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {cust.id}</div>
                      </td>

                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cust.email}</span>
                        </div>
                        {cust.phone && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{cust.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cust.address.city}, {cust.address.postcode}</span>
                        </div>
                      </td>

                      <td className="px-3.5 py-3 text-center whitespace-nowrap font-mono text-slate-200">
                        {custOrders.length}
                      </td>

                      <td className="px-3.5 py-3 text-right whitespace-nowrap font-mono font-bold text-emerald-400">
                        {formatCurrency(totalSpend, settings.currencySymbol)}
                      </td>

                      <td className="px-3.5 py-3 whitespace-nowrap text-slate-400 text-[11px]">
                        {latestOrder ? new Date(latestOrder).toLocaleDateString() : 'None yet'}
                      </td>

                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectCustomer(cust)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                            title="View Orders"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenCustomerModal(cust)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                            title="Edit Customer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
