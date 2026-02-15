import React, { useState } from 'react';
import { X, ShieldCheck, ShieldAlert, Check, Lock, Smartphone } from 'lucide-react';
import apiClient from '../lib/apiClient';

const ComplianceCheckModal = ({ isOpen, onClose, request, onUpdate }) => {
    const [isChecking, setIsChecking] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    if (!isOpen || !request) return null;

    const handleRunCheck = async () => {
        setIsChecking(true);
        setError(null);
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : {};

            // Call the new BYOD compliance endpoint
            const data = await apiClient.byodComplianceCheck(request.id, user.id);
            setResult(data);

            // If successful, wait a moment then close
            if (data.success) {
                setTimeout(() => {
                    onUpdate();
                    onClose();
                }, 2000);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsChecking(false);
        }
    };

    const policies = [
        { name: 'Device Encryption', icon: Lock, required: true },
        { name: 'Password Complexity', icon: ShieldCheck, required: true },
        { name: 'OS Version Support', icon: Smartphone, required: true },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        BYOD Security Scan
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Smartphone className="w-8 h-8 text-blue-600" />
                        </div>
                        <h4 className="font-medium text-slate-900">{request.asset_model || 'Unknown Device'}</h4>
                        <p className="text-sm text-slate-500">{request.serial_number}</p>
                    </div>

                    <div className="space-y-3">
                        <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Policies</h5>
                        {policies.map((policy, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <policy.icon className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700">{policy.name}</span>
                                </div>
                                {result ? (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-200" />
                                )}
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex gap-2 items-start">
                            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {result && result.success && (
                        <div className="bg-emerald-50 text-emerald-600 text-sm p-3 rounded-lg border border-emerald-100 text-center font-medium">
                            Compliance Verified Successfully!
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-100">
                    <button
                        onClick={handleRunCheck}
                        disabled={isChecking || (result && result.success)}
                        className={`w-full py-2.5 px-4 rounded-lg font-medium shadow-sm flex items-center justify-center gap-2 transition-all ${result && result.success
                                ? 'bg-emerald-600 text-white cursor-default'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                    >
                        {isChecking ? 'Running Scan...' : result && result.success ? 'Compliant' : 'Run Compliance Check'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComplianceCheckModal;
