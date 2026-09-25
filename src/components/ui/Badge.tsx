import React from 'react';
import { OrderStatus, PrinterStatus, JobStatus, JobPriority, SalesChannel } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  className = '',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    default: 'bg-slate-800 text-slate-200 border-slate-700',
    neutral: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    success: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    warning: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    danger: 'bg-rose-950/60 text-rose-300 border-rose-800/60',
    info: 'bg-sky-950/60 text-sky-300 border-sky-800/60',
    purple: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded border ${variantClasses[variant]} ${sizeClasses} ${className}`}
    >
      {children}
    </span>
  );
};

export const OrderStatusBadge: React.FC<{ status: OrderStatus; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const map: Record<OrderStatus, { variant: BadgeProps['variant']; label: string }> = {
    NEW: { variant: 'info', label: 'New' },
    CONFIRMED: { variant: 'info', label: 'Confirmed' },
    'MAPPING REQUIRED': { variant: 'warning', label: 'Mapping Required' },
    'AWAITING PRINT': { variant: 'warning', label: 'Awaiting Print' },
    PRINTING: { variant: 'purple', label: 'Printing' },
    PRINTED: { variant: 'info', label: 'Printed' },
    PACKING: { variant: 'warning', label: 'Packing' },
    'READY TO SHIP': { variant: 'info', label: 'Ready to Ship' },
    SHIPPED: { variant: 'success', label: 'Shipped' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    'ON HOLD': { variant: 'danger', label: 'On Hold' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
  };

  const item = map[status] || { variant: 'neutral', label: status };
  return <Badge variant={item.variant} size={size}>{item.label}</Badge>;
};

export const PrinterStatusBadge: React.FC<{ status: PrinterStatus; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const map: Record<PrinterStatus, { variant: BadgeProps['variant']; label: string; dot: string }> = {
    ONLINE: { variant: 'success', label: 'Online', dot: 'bg-emerald-400' },
    IDLE: { variant: 'info', label: 'Idle / Ready', dot: 'bg-sky-400' },
    PRINTING: { variant: 'purple', label: 'Printing', dot: 'bg-indigo-400 animate-pulse' },
    OFFLINE: { variant: 'neutral', label: 'Offline', dot: 'bg-slate-400' },
    ERROR: { variant: 'danger', label: 'Error', dot: 'bg-rose-400' },
    MAINTENANCE: { variant: 'warning', label: 'Maintenance', dot: 'bg-amber-400' },
  };

  const item = map[status] || { variant: 'neutral', label: status, dot: 'bg-slate-400' };
  return (
    <Badge variant={item.variant} size={size} className="gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </Badge>
  );
};

export const PrinterConnectionBadge: React.FC<{ status?: string; size?: 'sm' | 'md' }> = ({
  status = 'Connected',
  size = 'md',
}) => {
  const map: Record<string, { variant: BadgeProps['variant']; label: string; dot: string }> = {
    Connected: { variant: 'success', label: 'Connected', dot: 'bg-emerald-400' },
    Disconnected: { variant: 'neutral', label: 'Disconnected', dot: 'bg-slate-400' },
    Connecting: { variant: 'info', label: 'Connecting...', dot: 'bg-sky-400 animate-pulse' },
    'Authentication Required': { variant: 'warning', label: 'Auth Required', dot: 'bg-amber-400' },
    Error: { variant: 'danger', label: 'Error', dot: 'bg-rose-400' },
    Unknown: { variant: 'neutral', label: 'Unknown', dot: 'bg-slate-500' },
  };

  const item = map[status] || { variant: 'neutral', label: status, dot: 'bg-slate-400' };
  return (
    <Badge variant={item.variant} size={size} className="gap-1.5 font-medium">
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </Badge>
  );
};

export const JobStatusBadge: React.FC<{ status: JobStatus; size?: 'sm' | 'md' }> = ({ status, size = 'md' }) => {
  const map: Record<JobStatus, { variant: BadgeProps['variant']; label: string }> = {
    awaiting_print: { variant: 'warning', label: 'In Queue' },
    assigned: { variant: 'info', label: 'Assigned' },
    ready: { variant: 'info', label: 'Ready' },
    sending: { variant: 'purple', label: 'Sending...' },
    queued: { variant: 'info', label: 'Queued on Printer' },
    printing: { variant: 'purple', label: 'Printing' },
    printed: { variant: 'success', label: 'Completed' },
    paused: { variant: 'neutral', label: 'Paused' },
    failed: { variant: 'danger', label: 'Failed' },
    cancelled: { variant: 'neutral', label: 'Cancelled' },
  };

  const item = map[status] || { variant: 'neutral', label: status };
  return <Badge variant={item.variant} size={size}>{item.label}</Badge>;
};

export const PriorityBadge: React.FC<{ priority: JobPriority; size?: 'sm' | 'md' }> = ({ priority, size = 'md' }) => {
  const map: Record<JobPriority, { variant: BadgeProps['variant']; label: string }> = {
    LOW: { variant: 'neutral', label: 'Low' },
    NORMAL: { variant: 'info', label: 'Normal' },
    HIGH: { variant: 'warning', label: 'High' },
    URGENT: { variant: 'danger', label: 'URGENT' },
  };

  const item = map[priority] || { variant: 'neutral', label: priority };
  return <Badge variant={item.variant} size={size}>{item.label}</Badge>;
};

export const ChannelBadge: React.FC<{ channel: SalesChannel; size?: 'sm' | 'md' }> = ({ channel, size = 'md' }) => {
  const map: Record<SalesChannel, { bg: string; text: string; label: string }> = {
    Etsy: { bg: 'bg-orange-950/60 border-orange-800/60', text: 'text-orange-300', label: 'Etsy' },
    eBay: { bg: 'bg-blue-950/60 border-blue-800/60', text: 'text-blue-300', label: 'eBay' },
    'Facebook Marketplace': { bg: 'bg-sky-950/60 border-sky-800/60', text: 'text-sky-300', label: 'Facebook' },
    Website: { bg: 'bg-emerald-950/60 border-emerald-800/60', text: 'text-emerald-300', label: 'Website' },
    Manual: { bg: 'bg-purple-950/60 border-purple-800/60', text: 'text-purple-300', label: 'Direct / Manual' },
    Other: { bg: 'bg-slate-800 border-slate-700', text: 'text-slate-300', label: 'Other' },
  };

  const item = map[channel] || { bg: 'bg-slate-800 border-slate-700', text: 'text-slate-300', label: channel };
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded border ${item.bg} ${item.text} ${sizeClasses}`}>
      {item.label}
    </span>
  );
};
