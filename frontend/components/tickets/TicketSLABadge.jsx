import React from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const TicketSLABadge = ({ sla }) => {
  if (!sla) return null;

  const getStatusColor = () => {
    if (sla.resolution_status === 'BREACHED') return 'text-rose-600 bg-rose-50 border-rose-200';
    if (sla.resolution_status === 'MET') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const getTimeRemaining = () => {
    if (sla.resolution_status === 'MET') return 'Resolved on time';
    if (sla.resolution_status === 'BREACHED') return 'SLA Breached';
    
    // Simplified calculation for display
    const deadline = new Date(sla.resolution_deadline);
    const now = new Date();
    const diff = deadline - now;
    
    if (diff < 0) return 'Breached';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m remaining`;
  };

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-bold uppercase ${getStatusColor()}`}>
      {sla.resolution_status === 'BREACHED' ? (
        <AlertTriangle className="w-3 h-3" />
      ) : sla.resolution_status === 'MET' ? (
        <CheckCircle className="w-3 h-3" />
      ) : (
        <Clock className="w-3 h-3 animate-pulse" />
      )}
      {getTimeRemaining()}
    </div>
  );
};

export default TicketSLABadge;
