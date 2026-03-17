import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import Barcode from 'react-barcode'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { ArrowLeft, User, MapPin, Calendar, Activity, Server, Shield, QrCode, ScanBarcode, AlertCircle, Download, Edit2, Save, X, Monitor } from 'lucide-react'

import apiClient from '@/lib/apiClient';
import { useRole } from '@/contexts/RoleContext';
import ScanHistoryViewer from '@/components/ScanHistoryViewer';
import AssetTimeline from '@/components/AssetTimeline';

function LogMaintenanceModal({ assetId, onClose, onSave }) {
    const [data, setData] = useState({
        asset_id: assetId,
        maintenance_type: 'Repair',
        description: '',
        cost: 0,
        status: 'Completed',
        completed_date: new Date().toISOString()
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiClient.post('/maintenance', data);
            onSave();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to log maintenance');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Log Maintenance Event</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 transition-colors">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Event Type</label>
                        <select
                            value={data.maintenance_type}
                            onChange={e => setData({ ...data, maintenance_type: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-4 text-sm"
                        >
                            <option value="Repair">Repair</option>
                            <option value="Upgrade">Upgrade</option>
                            <option value="Preventive">Preventive Maintenance</option>
                            <option value="Inspection">Inspection</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                        <textarea
                            value={data.description}
                            onChange={e => setData({ ...data, description: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-4 text-sm"
                            rows="3"
                            placeholder="Describe the work performed..."
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Maintenance Cost ($)</label>
                        <input
                            type="number"
                            value={data.cost}
                            onChange={e => setData({ ...data, cost: parseFloat(e.target.value) })}
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2 px-4 text-sm font-mono"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                    >
                        {saving ? 'Logging...' : 'Save Maintenance Log'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function AssetDetail() {
    const router = useRouter()
    const { id } = router.query
    const { currentRole } = useRole()
    const [asset, setAsset] = useState(null)
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [showQR, setShowQR] = useState(false)
    const [showBarcode, setShowBarcode] = useState(false)
    const [isEditingWarranty, setIsEditingWarranty] = useState(false)
    const [isRemoteRequested, setIsRemoteRequested] = useState(false)
    const [showLogMaintenance, setShowLogMaintenance] = useState(false)
    const [warrantyFormData, setWarrantyFormData] = useState({
        purchase_date: '',
        warranty_expiry: ''
    })
    const [savingWarranty, setSavingWarranty] = useState(false)



    useEffect(() => {
        if (!id) return
        const fetchAsset = async () => {
            try {
                const [assetData, eventsData] = await Promise.all([
                    apiClient.getAsset(id),
                    apiClient.getAssetEvents(id)
                ]);

                setAsset(assetData);
                setEvents(eventsData || []);
                setLoading(false);

                // Initialize warranty form data
                if (assetData) {
                    setWarrantyFormData({
                        purchase_date: assetData.purchase_date ? assetData.purchase_date.split('T')[0] : '',
                        warranty_expiry: assetData.warranty_expiry ? assetData.warranty_expiry.split('T')[0] : ''
                    });
                }
            } catch (error) {
                console.error('Failed to load asset:', error);
                setLoading(false);
            }
        };

        fetchAsset();
    }, [id]);

    // Check if user can edit warranty (Admin or Asset Inventory Manager)
    // Backend accepts both ASSET_MANAGER and ASSET_INVENTORY_MANAGER
    const canEditWarranty = currentRole?.slug === 'ADMIN' ||
        currentRole?.slug === 'ASSET_MANAGER' ||
        currentRole?.slug === 'ASSET_INVENTORY_MANAGER';

    const handleEditWarranty = () => {
        setIsEditingWarranty(true);
    };

    const handleCancelEditWarranty = () => {
        // Reset form data to original asset values
        if (asset) {
            setWarrantyFormData({
                purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : '',
                warranty_expiry: asset.warranty_expiry ? asset.warranty_expiry.split('T')[0] : ''
            });
        }
        setIsEditingWarranty(false);
    };

    const handleSaveWarranty = async () => {
        if (!asset) return;

        setSavingWarranty(true);
        try {
            const updateData = {
                purchase_date: warrantyFormData.purchase_date || null,
                warranty_expiry: warrantyFormData.warranty_expiry || null
            };

            const updatedAsset = await apiClient.updateAsset(asset.id, updateData);
            setAsset(updatedAsset);
            setIsEditingWarranty(false);

            // Show success message (you can replace with a toast notification)
            alert('Warranty information updated successfully!');
        } catch (error) {
            console.error('Failed to update warranty:', error);
            alert('Failed to update warranty information. Please try again.');
        } finally {
            setSavingWarranty(false);
        }
    };

    const handleRemoteAssist = async () => {
        if (!asset.id) return;
        try {
            await apiClient.requestRemoteAssistance(asset.id);
            setIsRemoteRequested(true);
            alert('Remote assistance request sent to the agent.');
        } catch (error) {
            alert('Failed to request remote assistance: ' + error.message);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>
    if (!asset) return <div className="p-8">Asset not found</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Link href="/assets" className="p-2 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-200 dark:bg-white/10 rounded-full text-slate-700 dark:text-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{asset.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-mono text-sm mt-1">
                        <span className="text-slate-500 dark:text-slate-400 mr-2 text-xs uppercase tracking-wider font-semibold">Serial Number</span>
                        {asset.serial_number || 'UNKNOWN'}
                    </p>
                </div>
                <div className="ml-auto flex items-center space-x-3">
                    <Link
                        href={`/assets/${asset.id}/cmdb`}
                        className="flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-500/20 hover:bg-blue-500/20 transition-all"
                    >
                        <Activity size={16} />
                        <span>View CMDB</span>
                    </Link>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ring-1 ring-inset ${asset.status === 'In Use' ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' :
                        asset.status === 'In Stock' ? 'bg-blue-500/10 text-blue-400 ring-blue-500/20' :
                            'bg-slate-500/10 text-slate-500 dark:text-slate-400 ring-slate-500/20'
                        }`}>
                        {asset.status}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="backdrop-blur-md bg-slate-200 dark:bg-white/10 dark:bg-white/5 border border-slate-300 dark:border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                            <Server className="mr-3 text-blue-400" size={20} />
                            Specifications
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Model</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{asset.model}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">OEM Name</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100 uppercase">{asset.vendor || "Unknown"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Serial Number</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100 font-mono text-sm">{asset.serial_number || "UNKNOWN"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Asset ID</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100 text-xs truncate" title={asset.id}>{asset.id}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Type</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{asset.type}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Processor</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{asset.specifications?.Processor || asset.specifications?.cpu || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">RAM</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{asset.specifications?.RAM || (asset.specifications?.ram_mb ? `${asset.specifications.ram_mb} MB` : 'N/A')}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Storage</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{asset.specifications?.Storage || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">OS</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{asset.specifications?.OS || asset.specifications?.os_name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Condition</p>
                                <p className={`font-medium ${asset.specifications?.Condition === 'Fair' ? 'text-orange-400' : 'text-emerald-400'}`}>
                                    {asset.specifications?.Condition || 'Excellent'}
                                </p>
                            </div>
                            {(asset.specifications?.['IP Address'] || asset.specifications?.ip_address || asset.specifications?.IP_Address || asset.specifications?.['Management IP']) && (
                                <div className="col-span-2 md:col-span-3 bg-blue-500/5 rounded-lg p-3 border border-blue-500/10 mb-2">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center">
                                        <Activity size={14} className="mr-2 text-blue-400" />
                                        Management IP Address
                                    </p>
                                    {(() => {
                                        const raw = asset.specifications?.['IP Address'] || asset.specifications?.ip_address || asset.specifications?.IP_Address || asset.specifications?.['Management IP'] || '';
                                        const entries = typeof raw === 'string' && raw.includes('; ') ? raw.split('; ').map(s => s.trim()).filter(Boolean) : [raw];
                                        return entries.length > 1 ? (
                                            <ul className="font-mono text-blue-400/90 text-sm space-y-0.5 list-none p-0 m-0">
                                                {entries.map((entry, i) => <li key={i}>{entry}</li>)}
                                            </ul>
                                        ) : (
                                            <p className="font-medium text-slate-900 dark:text-slate-100 font-mono text-lg">{raw}</p>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Dynamically render any other specifications */}
                            {Object.entries(asset.specifications || {})
                                .filter(([k, v]) => !['Processor', 'cpu', 'RAM', 'ram_mb', 'Storage', 'OS', 'os_name', 'Condition', 'IP Address', 'ip_address', 'Agent ID', 'agent_id'].includes(k) && v != null && v !== '')
                                .map(([key, value]) => (
                                    <div key={key}>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{key.replace(/_/g, ' ')}</p>
                                        <p className="font-medium text-slate-900 dark:text-slate-100">{String(value)}</p>
                                    </div>
                                ))
                            }
                        </div>
                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5">
                            <button
                                onClick={() => setShowLogMaintenance(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/20 transition-all font-semibold"
                            >
                                <Activity size={16} />
                                <span>Log Maintenance Event</span>
                            </button>
                        </div>
                    </div>

                    <div className="backdrop-blur-md bg-slate-200 dark:bg-white/10 dark:bg-white/5 border border-slate-300 dark:border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6 relative overflow-hidden">
                        {/* Background Animation for entire card */}
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>

                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8 flex items-center relative z-10">
                            <Activity className="mr-3 text-emerald-400" size={20} />
                            Asset Lifecycle Timeline
                        </h3>

                        {/* Dynamic Timeline Container */}
                        <div className="z-10 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-white/5 mt-4">
                            <AssetTimeline assetId={asset.id} />
                        </div>
                    </div>

                    {/* Configuration Change History */}
                    <div className="backdrop-blur-md bg-slate-200 dark:bg-white/10 dark:bg-white/5 border border-slate-300 dark:border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                            <Activity className="mr-3 text-cyan-400" size={20} />
                            Configuration Change History
                        </h3>
                        <ScanHistoryViewer assetId={asset.id} />
                    </div>

                    {/* Renewal & Service Request Section - Conditions: Retired, Repair, Maintenance OR Warranty Expired */}
                    {['Retired', 'Repair', 'Maintenance'].includes(asset.status) || (asset.warranty_expiry && new Date(asset.warranty_expiry) <= new Date()) ? (
                        <div className="backdrop-blur-md bg-slate-200 dark:bg-white/10 dark:bg-white/5 border border-slate-300 dark:border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6 border-l-4 border-l-orange-500">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                                <AlertCircle className="mr-3 text-orange-400" size={24} />
                                Renewal & Service Request
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                This asset is flagged for attention ({asset.status === 'In Use' ? 'Warranty Expired' : asset.status}).
                                Submit a request to the relevant department.
                            </p>

                            {asset.renewal_status ? (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-white/10">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Current Status</p>
                                    <p className="text-lg font-bold text-blue-400 mt-1">{asset.renewal_status.replace(/_/g, ' ')}</p>
                                    {asset.renewal_reason && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Reason</p>
                                            <p className="text-slate-700 dark:text-slate-300 italic">"{asset.renewal_reason}"</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <form className="space-y-4" onSubmit={async (e) => {
                                    e.preventDefault()
                                    const formData = new FormData(e.target)
                                    const reason = formData.get('reason')
                                    const urgency = formData.get('urgency')
                                    const cost = formData.get('cost')

                                    try {
                                        await apiClient.updateAsset(asset.id, {
                                            // Initialize workflow
                                            renewal_status: 'Requested',
                                            renewal_reason: reason,
                                            renewal_urgency: urgency,
                                            renewal_cost: cost ? parseFloat(cost) : 0
                                        })
                                        alert('Request submitted successfully!')
                                        router.reload()
                                    } catch (err) {
                                        alert('Failed to submit request')
                                    }
                                }}>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Reason for Request</label>
                                        <textarea
                                            name="reason"
                                            required
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-slate-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                            rows="3"
                                            placeholder="e.g., Device failing in field, license expired..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Urgency</label>
                                            <select name="urgency" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-slate-200 text-sm outline-none">
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Est. Cost ($)</label>
                                            <input
                                                type="number"
                                                name="cost"
                                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg p-2.5 text-slate-900 dark:text-slate-200 text-sm outline-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 bg-blue-600/90 hover:bg-blue-600 text-slate-900 dark:text-white shadow-lg shadow-blue-500/30 backdrop-blur-sm py-2.5 mt-2">
                                        Send Request to Department
                                    </button>
                                </form>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="backdrop-blur-md bg-slate-200 dark:bg-white/10 dark:bg-white/5 border border-slate-300 dark:border-white/20 dark:border-white/10 shadow-xl rounded-xl transition-all duration-300 hover:border-blue-500/30 p-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                            <User className="mr-3 text-purple-400" size={20} />
                            Ownership
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Assigned To</p>
                                <p className="font-medium text-slate-900 dark:text-slate-100">{asset.assigned_to || "Unassigned"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Location</p>
                                <div className="flex items-center text-slate-900 dark:text-slate-100">
                                    <MapPin size={16} className="mr-2 text-purple-400" />
                                    <p className="font-medium">{asset.location || "Unknown"}</p>
                                </div>
                            </div>
                            <Link href={`/assets/assign?id=${asset.id}`} className="block w-full text-center py-2 px-4 rounded-lg bg-slate-200 dark:bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 transition-all backdrop-blur-sm mb-3">
                                Change Assignment
                            </Link>

                            <button
                                onClick={handleRemoteAssist}
                                disabled={isRemoteRequested}
                                className={`w-full py-2.5 flex items-center justify-center gap-2 rounded-lg border border-blue-500/20 font-medium transition-all ${isRemoteRequested ? 'bg-blue-500/10 text-blue-400 cursor-default' : 'bg-blue-600/10 text-blue-300 hover:bg-blue-600/20 hover:text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed'}`}
                            >
                                <Monitor size={18} />
                                {isRemoteRequested ? 'Remote Request Sent' : 'Remote Assist (RDP)'}
                            </button>
                        </div>
                    </div>

                    <div className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                                <Shield className="mr-3 text-orange-400" size={20} />
                                Warranty
                            </h3>
                            {canEditWarranty && !isEditingWarranty && (
                                <button
                                    onClick={handleEditWarranty}
                                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 transition-all text-sm"
                                >
                                    <Edit2 size={14} />
                                    <span>Edit</span>
                                </button>
                            )}
                        </div>
                        {isEditingWarranty ? (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm text-slate-500 dark:text-slate-400 mb-2">Purchase Date</label>
                                    <div className="flex items-center">
                                        <Calendar size={16} className="mr-2 text-orange-400" />
                                        <input
                                            type="date"
                                            value={warrantyFormData.purchase_date}
                                            onChange={(e) => setWarrantyFormData({ ...warrantyFormData, purchase_date: e.target.value })}
                                            className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-slate-200 text-sm focus:ring-1 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-500 dark:text-slate-400 mb-2">Warranty Expiry</label>
                                    <div className="flex items-center">
                                        <Calendar size={16} className="mr-2 text-orange-400" />
                                        <input
                                            type="date"
                                            value={warrantyFormData.warranty_expiry}
                                            onChange={(e) => setWarrantyFormData({ ...warrantyFormData, warranty_expiry: e.target.value })}
                                            className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg p-2 text-slate-900 dark:text-slate-200 text-sm focus:ring-1 focus:ring-orange-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex space-x-2 pt-2">
                                    <button
                                        onClick={handleSaveWarranty}
                                        disabled={savingWarranty}
                                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save size={16} />
                                        <span>{savingWarranty ? 'Saving...' : 'Save'}</span>
                                    </button>
                                    <button
                                        onClick={handleCancelEditWarranty}
                                        disabled={savingWarranty}
                                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-slate-500/20 hover:bg-slate-500/30 text-slate-500 dark:text-slate-400 border border-slate-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <X size={16} />
                                        <span>Cancel</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Purchase Date</p>
                                    <div className="flex items-center text-slate-900 dark:text-slate-100">
                                        <Calendar size={16} className="mr-2 text-orange-400" />
                                        <p className="font-medium">{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Expires</p>
                                    <div className="flex items-center text-slate-900 dark:text-slate-100">
                                        <Calendar size={16} className="mr-2 text-orange-400" />
                                        <p className="font-medium">{asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="glass-panel p-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
                            <QrCode className="mr-3 text-pink-400" size={20} />
                            Digital Identity
                        </h3>
                        <div className="space-y-4">
                            {/* PDF Export Button */}
                            <button
                                onClick={async () => {
                                    const element = document.getElementById('digital-identity-card');
                                    if (!element) return;

                                    // Temporarily show both codes for capture
                                    const originalShowQR = showQR;
                                    const originalShowBarcode = showBarcode;
                                    setShowQR(true);
                                    setShowBarcode(true);

                                    // Wait for render
                                    setTimeout(async () => {
                                        try {
                                            const canvas = await html2canvas(element, { scale: 2 });
                                            const imgData = canvas.toDataURL('image/png');
                                            const pdf = new jsPDF();
                                            const imgProps = pdf.getImageProperties(imgData);
                                            const pdfWidth = pdf.internal.pageSize.getWidth();
                                            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

                                            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                                            pdf.save(`Asset-${asset.serial_number}.pdf`);
                                        } catch (err) {
                                            console.error("Export failed", err);
                                            alert("Failed to export PDF");
                                        } finally {
                                            setShowQR(originalShowQR);
                                            setShowBarcode(originalShowBarcode);
                                        }
                                    }, 500);
                                }}
                                className="w-full py-2 px-4 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition-all flex items-center justify-center font-medium mb-4"
                            >
                                <Download size={18} className="mr-2" />
                                Export to PDF
                            </button>

                            <div id="digital-identity-card" className="space-y-4 p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5">
                                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 text-center mb-2">Digital Asset Card</h4>
                                <div className="text-center mb-4">
                                    <p className="text-lg font-bold text-slate-900 dark:text-white">{asset.name}</p>
                                    <p className="font-mono text-sm text-slate-500 dark:text-slate-400">{asset.serial_number}</p>
                                </div>

                                {showQR && (
                                    <div className="bg-white p-4 rounded-lg flex justify-center animate-in fade-in zoom-in duration-300">
                                        <QRCode
                                            value={`ASSET IDENTITY CARD
-------------------
Name: ${asset.name}
Model: ${asset.model}
S/N: ${asset.serial_number}
ID: ${asset.id}
Type: ${asset.type}
Status: ${asset.status}
Loc: ${asset.location}
User: ${asset.assigned_to || 'Unassigned'}
Dept: ${asset.department || 'IT Operations'}
Purchased: ${asset.purchase_date}
Warranty: ${asset.warranty_expiry || 'N/A'}
Specs: ${asset.specifications?.Processor || 'Standard'} / ${asset.specifications?.RAM || 'Standard'}
-------------------
Property of AssetMgr`}
                                            size={180}
                                        />
                                    </div>
                                )}

                                {showBarcode && (
                                    <div className="bg-white p-4 rounded-lg flex justify-center overflow-hidden animate-in fade-in zoom-in duration-300">
                                        <Barcode
                                            value={asset.serial_number}
                                            width={1.5}
                                            height={50}
                                            fontSize={14}
                                            background="#ffffff"
                                            lineColor="#000000"
                                        />
                                    </div>
                                )}

                                {/* Controls for toggling view (hidden during export if we want, but keeping buttons separate) */}
                            </div>

                            <button
                                onClick={() => setShowQR(!showQR)}
                                className="w-full py-2 px-4 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 transition-all flex items-center justify-center font-medium"
                            >
                                <QrCode size={18} className="mr-2" />
                                {showQR ? 'Hide QR Code' : 'Show Asset QR'}
                            </button>

                            <button
                                onClick={() => setShowBarcode(!showBarcode)}
                                className="w-full py-2 px-4 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30 transition-all flex items-center justify-center font-medium"
                            >
                                <ScanBarcode size={18} className="mr-2" />
                                {showBarcode ? 'Hide Barcode' : 'Show Barcode'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showLogMaintenance && (
                <LogMaintenanceModal
                    assetId={asset.id}
                    onClose={() => setShowLogMaintenance(false)}
                    onSave={() => router.reload()}
                />
            )}
        </div>
    )
}
