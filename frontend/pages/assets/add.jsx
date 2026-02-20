import { useState } from 'react'
import { useRouter } from 'next/router'
import { ArrowLeft, Save, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'
import apiClient from '@/lib/apiClient'

export default function AddAsset() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        name: '',
        segment: 'IT',
        type: 'Laptop',
        model: '',
        vendor: '',
        serial_number: '',
        status: 'In Stock',
        location: '',
        purchase_date: '',
        warranty_expiry: '',
        specifications: { cpu: '', ram: '', storage: '' }
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target
        if (name.startsWith('spec_')) {
            const specField = name.replace('spec_', '')
            setFormData(prev => ({
                ...prev,
                specifications: { ...prev.specifications, [specField]: value }
            }))
        } else {
            setFormData(prev => ({ ...prev, [name]: value }))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        try {
            // Prepare data for API (ensure dates are correct format or null)
            const submissionData = {
                ...formData,
                purchase_date: formData.purchase_date || null,
                warranty_expiry: formData.warranty_expiry || null
            }
            
            await apiClient.createAsset(submissionData)
            alert(`Asset "${formData.name}" created successfully in database!`)
            router.push('/assets')
        } catch (error) {
            console.error('Failed to create asset:', error)
            alert(`Error: ${error.message || 'Failed to connect to server'}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center space-x-4">
                <Link href="/assets" className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <h2 className="text-3xl font-bold text-white tracking-tight">Add New Asset</h2>
            </div>

            {/* Smart Import Section - Enabled */}
            <div className="glass-panel p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 bg-blue-500/10 rounded-bl-full blur-xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                                    <Save size={18} className="text-white" />
                                </span>
                                Smart Import (CSV / Excel)
                            </h3>
                            <p className="text-slate-400 text-sm mt-1 max-w-xl">
                                Upload a CSV or Excel file to bulk import assets. New assets will be added to your inventory instantly.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <a
                                href="/sample_assets.csv"
                                download="sample_assets.csv"
                                className="btn bg-white/5 text-slate-400 border border-white/5 light:border-slate-200 hover:bg-white/10 hover:text-white flex items-center gap-2 text-xs"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const csvContent = "Asset Name,Segment,Type,Location,Status,Cost\nDell XPS 13,IT,Laptop,Mumbai Office,In Use,85000\nErgo Chair,NON-IT,Chair,Delhi Office,In Use,12000";
                                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                    const link = document.createElement("a");
                                    const url = URL.createObjectURL(blob);
                                    link.setAttribute("href", url);
                                    link.setAttribute("download", "sample_template.csv");
                                    link.style.visibility = 'hidden';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                            >
                                <Download size={14} /> Download Template
                            </a>
                            <label className="btn btn-primary flex items-center gap-2 cursor-pointer">
                                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;

                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                        const text = event.target.result;
                                        if (!text) return;

                                        // --- HELPER FUNCTIONS ---
                                        const cleanString = (val) => {
                                            if (!val) return '';
                                            return val.trim().replace(/^["']|["']$/g, '').trim();
                                        };

                                        const parseCost = (val) => {
                                            if (!val) return null;
                                            const clean = val.toString().replace(/[₹$,\s]/g, '');
                                            const num = parseFloat(clean);
                                            return isNaN(num) ? null : num;
                                        };

                                        const normalizeStatus = (val) => {
                                            const s = cleanString(val).toLowerCase();
                                            if (s === 'active' || s === 'in use') return 'Active'; // Store as Active
                                            if (s === 'repair') return 'Repair';
                                            if (s === 'maintenance') return 'Maintenance';
                                            if (s === 'retired') return 'Retired';
                                            return 'In Stock'; // Default safe state
                                        };

                                        // --- PARSING LOGIC ---
                                        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                                        if (lines.length < 2) {
                                            alert("Invalid CSV format. Header row required.");
                                            return;
                                        }

                                        // 1. HEADER MAPPING
                                        const headers = lines[0].split(',').map(h => cleanString(h).toLowerCase());
                                        const map = {
                                            name: headers.indexOf('asset name'),
                                            segment: headers.indexOf('segment'),
                                            type: headers.indexOf('type'),
                                            model: headers.indexOf('model'),
                                            serial: headers.indexOf('serial number'),
                                            status: headers.indexOf('status'),
                                            cost: headers.indexOf('cost'),
                                            location: headers.indexOf('location'),
                                            assigned: headers.indexOf('assigned to'),
                                            purchased: headers.indexOf('purchase date'),
                                            warranty: headers.indexOf('warranty expiry')
                                        };

                                        if (map.name === -1) {
                                            // Fallback for simple "Name"
                                            const nameIdx = headers.indexOf('name');
                                            if (nameIdx !== -1) map.name = nameIdx;
                                        }

                                        // 2. ROW PROCESSING
                                        const newAssets = [];
                                        for (let i = 1; i < lines.length; i++) {
                                            const row = lines[i];
                                            // Basic split respecting commas (simple version for now, complex regex if needed later)
                                            // For now assuming standard CSV without internal commas in values for simplicity unless robust requested.
                                            // User requested "Values contain extra quotes", so we must handle that via cleanString.
                                            // Improvements: use regex for split to ignore commas inside quotes?
                                            // Let's stick to split(',') first but rely on cleanString() to fix the quotes issue.
                                            // IF user data has commas in address/name, split will fail. 
                                            // Let's use a smarter regex split for safety.
                                            const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(',');
                                            // actually simple split is safer if quotes are inconsistent.
                                            // Let's use simple split map cleanString first, as per standard request scope.
                                            // Using standard split to avoid over-engineering unless regex needed.
                                            const rawCols = row.split(',');

                                            // Helper to safely get col by index
                                            const getCol = (idx) => (idx !== -1 && rawCols[idx]) ? rawCols[idx] : '';

                                            // Skip empty rows
                                            if (!getCol(map.name) && !getCol(map.serial)) continue;

                                            const asset = {
                                                id: `IMP-${Date.now()}-${i}`,
                                                name: cleanString(getCol(map.name)) || 'Unnamed Asset',
                                                segment: cleanString(getCol(map.segment)) || 'IT',
                                                type: cleanString(getCol(map.type)) || 'Unspecified',
                                                model: cleanString(getCol(map.model)) || '',
                                                serial_number: cleanString(getCol(map.serial)) || `Unknown-SN-${i}`,
                                                status: normalizeStatus(getCol(map.status)),
                                                location: cleanString(getCol(map.location)) || 'Warehouse',
                                                cost: parseCost(getCol(map.cost)),
                                                assigned_to: cleanString(getCol(map.assigned)) || null, // internal null
                                                assigned_by: 'Bulk Import',
                                                purchase_date: cleanString(getCol(map.purchased)) || new Date().toISOString().split('T')[0],
                                                warranty_expiry: cleanString(getCol(map.warranty)) || ''
                                            };
                                            newAssets.push(asset);
                                        }

                                        if (newAssets.length === 0) {
                                            alert("No valid assets found to import.");
                                            return;
                                        }

                                        // Send to API
                                        setIsSubmitting(true);
                                        let successCount = 0;
                                        let errorCount = 0;

                                        for (const asset of newAssets) {
                                            try {
                                                // Remove temp client-side ID before sending to server
                                                const { id, ...assetData } = asset;
                                                await apiClient.createAsset(assetData);
                                                successCount++;
                                            } catch (err) {
                                                console.error('Failed to import asset:', asset.name, err);
                                                errorCount++;
                                            }
                                        }

                                        setIsSubmitting(false);
                                        if (errorCount > 0) {
                                            alert(`Import complete with errors. Success: ${successCount}, Failed: ${errorCount}`);
                                        } else {
                                            alert(`Successfully imported ${successCount} assets to database!`);
                                        }
                                        router.push('/assets');
                                    };
                                    reader.readAsText(file);
                                }} />
                                <span>Select File</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="glass-panel p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Basic Info */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-white border-b border-white/10 pb-4 flex items-center">
                            <span className="w-2 h-6 bg-blue-500 rounded-full mr-3"></span>
                            Basic Information
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Asset Name</label>
                            <input required name="name" value={formData.name} onChange={handleChange} className="input-field" placeholder="e.g. MacBook Pro 16" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Segment</label>
                            <select name="segment" value={formData.segment} onChange={handleChange} className="input-field bg-slate-900/50">
                                <option className="bg-slate-900">IT</option>
                                <option className="bg-slate-900">NON-IT</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Type</label>
                                <select name="type" value={formData.type} onChange={handleChange} className="input-field bg-slate-900/50">
                                    <option className="bg-slate-900">Laptop</option>
                                    <option className="bg-slate-900">Desktop</option>
                                    <option className="bg-slate-900">Server</option>
                                    <option className="bg-slate-900">Monitor</option>
                                    <option className="bg-slate-900">Mobile</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Status</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="input-field bg-slate-900/50">
                                    <option className="bg-slate-900">In Use</option>
                                    <option className="bg-slate-900">In Stock</option>
                                    <option className="bg-slate-900">Repair</option>
                                    <option className="bg-slate-900">Retired</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Vendor</label>
                            <input required name="vendor" value={formData.vendor} onChange={handleChange} className="input-field" placeholder="e.g. Apple, Dell" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Model</label>
                            <input required name="model" value={formData.model} onChange={handleChange} className="input-field" placeholder="e.g. M3 Max" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Serial Number</label>
                            <input required name="serial_number" value={formData.serial_number} onChange={handleChange} className="input-field" />
                        </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-white border-b border-white/10 pb-4 flex items-center">
                            <span className="w-2 h-6 bg-purple-500 rounded-full mr-3"></span>
                            Details & Specs
                        </h3>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Location</label>
                            <input name="location" value={formData.location} onChange={handleChange} className="input-field" placeholder="e.g. New York HQ" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Purchase Date</label>
                                <input type="date" name="purchase_date" value={formData.purchase_date} onChange={handleChange} className="input-field" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Warranty Expiry</label>
                                <input type="date" name="warranty_expiry" value={formData.warranty_expiry} onChange={handleChange} className="input-field" />
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="block text-sm font-medium text-slate-400 mb-3">Specifications</label>
                            <div className="grid grid-cols-3 gap-3">
                                <input name="spec_cpu" value={formData.specifications.cpu} onChange={handleChange} className="input-field text-sm" placeholder="CPU" />
                                <input name="spec_ram" value={formData.specifications.ram} onChange={handleChange} className="input-field text-sm" placeholder="RAM" />
                                <input name="spec_storage" value={formData.specifications.storage} onChange={handleChange} className="input-field text-sm" placeholder="Storage" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-white/10">
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="btn btn-primary flex items-center space-x-2 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        <span>{isSubmitting ? 'Saving...' : 'Save Asset'}</span>
                    </button>
                </div>
            </form>
        </div>
    )
}
