import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Customer } from '../../types';
import { useDatabase } from '../../context/DatabaseContext';
import { useNotification } from '../../context/NotificationContext';

interface CustomerFormModalProps {
  customer?: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  customer,
  isOpen,
  onClose,
}) => {
  const { saveCustomer } = useDatabase();
  const { showToast } = useNotification();

  const [name, setName] = useState(customer?.name || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [street, setStreet] = useState(customer?.address?.street || '');
  const [city, setCity] = useState(customer?.address?.city || '');
  const [stateOrCounty, setStateOrCounty] = useState(customer?.address?.stateOrCounty || '');
  const [postcode, setPostcode] = useState(customer?.address?.postcode || '');
  const [country, setCountry] = useState(customer?.address?.country || 'United Kingdom');
  const [notes, setNotes] = useState(customer?.notes || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast({ type: 'error', title: 'Error', message: 'Name and Email are required' });
      return;
    }

    try {
      const saved = saveCustomer({
        id: customer?.id || 'cust-' + Date.now(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: {
          street: street.trim(),
          city: city.trim(),
          stateOrCounty: stateOrCounty.trim(),
          postcode: postcode.trim().toUpperCase(),
          country: country.trim(),
        },
        notes: notes.trim() || undefined,
        createdAt: customer?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      showToast({
        type: 'success',
        title: customer ? 'Customer Updated' : 'Customer Added',
        message: `${saved.name} record saved successfully`,
      });
      onClose();
    } catch (err: any) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? `Edit Customer: ${customer.name}` : 'Add New Customer'}
      subtitle="Customer contact info and delivery address records."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+44 7..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        <div className="space-y-2 p-3 rounded bg-slate-950 border border-slate-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Delivery Address
          </span>
          <div>
            <input
              type="text"
              placeholder="Street Address (e.g. 14 Elmwood Crescent)"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="City (e.g. Manchester)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
            <input
              type="text"
              placeholder="County / State"
              value={stateOrCounty}
              onChange={(e) => setStateOrCounty(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Postcode (e.g. M14 6YP)"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white uppercase font-mono"
            />
            <input
              type="text"
              placeholder="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special delivery instructions, preferred products..."
            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white"
          />
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {customer ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
