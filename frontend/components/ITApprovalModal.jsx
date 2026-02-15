import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle } from 'lucide-react';
import apiClient from '../lib/apiClient';

const ITApprovalModal = ({ isOpen, onClose, request, onUpdate }) => {
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen || !request) return null;

    const handleAction = async (decision) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : {};
            const reviewerId = user.id;

            if (decision === 'REJECT' && !comment) {
                throw new Error('Reason is required for rejection');
            }

            const payload = {
                reviewer_id: reviewerId,
                reviewer_name: user.full_name || user.email,
                reason: comment || null
            };

            if (decision === 'APPROVE') {
                await apiClient.itApproveRequest(request.id, { reviewer_id: reviewerId });
            } else {
                await apiClient.itRejectRequest(request.id, payload);
            }

            onUpdate();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        IT Management Review
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-emerald-50 text-emerald-800 text-sm p-3 rounded-lg border border-emerald-100 flex gap-2">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <p>
                            Review request for <strong>{request.asset_name}</strong>.
                            Approving will check inventory or route to procurement.
                        </p>
                    </div>

                    {/* Requester Info */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Requester Details</label>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Name:</span>
                                <span className="font-bold text-slate-800">{request.requester_name}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Department:</span>
                                <span className="font-medium text-emerald-600">{request.requester_department || 'General'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-500">Email:</span>
                                <span className="text-slate-600 italic">{request.requester_email || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Review Notes / Rejection Reason
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px] resize-none"
                            placeholder="Enter technical validation notes..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>

                    <button
                        onClick={() => handleAction('REJECT')}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors"
                    >
                        Reject
                    </button>

                    <button
                        onClick={() => handleAction('APPROVE')}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                        {isSubmitting ? 'Processing...' : 'Approve Request'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ITApprovalModal;
