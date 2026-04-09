import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { ArrowLeft, Network, Plus, Trash2, AlertCircle } from 'lucide-react'
import apiClient from '@/lib/apiClient'

export default function AssetRelationships() {
    const router = useRouter()
    const { id } = router.query
    const [relationships, setRelationships] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [assets, setAssets] = useState([])
    const [newRelationship, setNewRelationship] = useState({
        target_asset_id: '',
        relationship_type: 'depends_on',
        description: '',
        criticality: 3
    })

    const relationshipTypes = [
        { value: 'depends_on', label: 'Depends On', color: 'orange' },
        { value: 'parent_of', label: 'Parent Of', color: 'blue' },
        { value: 'child_of', label: 'Child Of', color: 'purple' },
        { value: 'connected_to', label: 'Connected To', color: 'cyan' },
        { value: 'runs_on', label: 'Runs On', color: 'green' },
        { value: 'backs_up_to', label: 'Backs Up To', color: 'yellow' }
    ]

    useEffect(() => {
        if (!id) return
        fetchRelationships()
        fetchAssets()
    }, [id])

    const fetchRelationships = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await apiClient.getAssetRelationships(id)
            setRelationships(data)
        } catch (err) {
            console.error('Failed to fetch relationships:', err)
            setError(err.message || 'Failed to load relationships')
        } finally {
            setLoading(false)
        }
    }

    const fetchAssets = async () => {
        try {
            const res = await apiClient.getAssets()
            const data = res.data || []
            setAssets(data.filter(a => a.id !== id)) // Exclude current asset
        } catch (err) {
            console.error('Failed to fetch assets:', err)
        }
    }

    const handleAddRelationship = async (e) => {
        e.preventDefault()
        try {
            await apiClient.createAssetRelationship(
                id,
                newRelationship.target_asset_id,
                newRelationship.relationship_type,
                {
                    description: newRelationship.description,
                    criticality: newRelationship.criticality
                }
            )
            setShowAddForm(false)
            setNewRelationship({
                target_asset_id: '',
                relationship_type: 'depends_on',
                description: '',
                criticality: 3
            })
            fetchRelationships()
        } catch (err) {
            alert('Failed to create relationship: ' + err.message)
        }
    }

    const handleDeleteRelationship = async (relationshipId) => {
        if (!confirm('Are you sure you want to delete this relationship?')) return
        try {
            await apiClient.deleteAssetRelationship(id, relationshipId)
            fetchRelationships()
        } catch (err) {
            alert('Failed to delete relationship: ' + err.message)
        }
    }

    const getTypeColor = (type) => {
        const found = relationshipTypes.find(t => t.value === type)
        return found ? found.color : 'slate'
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href={`/assets/${id}`} className="p-2 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface rounded-full text-app-text-muted hover:text-app-text transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <div>
                        <h2 className="text-xl font-bold text-app-text tracking-tight">Asset Relationships (CMDB)</h2>
                        {relationships && (
                            <p className="text-app-text-muted text-sm mt-1">{relationships.asset_name}</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="btn btn-primary flex items-center space-x-2"
                >
                    <Plus size={18} />
                    <span>Add Relationship</span>
                </button>
            </div>

            {/* Add Relationship Form */}
            {showAddForm && (
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold text-app-text mb-4">Add New Relationship</h3>
                    <form onSubmit={handleAddRelationship} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-app-text-muted mb-2">Target Asset</label>
                            <select
                                required
                                value={newRelationship.target_asset_id}
                                onChange={(e) => setNewRelationship({...newRelationship, target_asset_id: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-app-border rounded-none p-2.5 text-slate-900 dark:text-slate-200"
                            >
                                <option value="">Select an asset...</option>
                                {assets.map(asset => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.name} ({asset.type})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-app-text-muted mb-2">Relationship Type</label>
                            <select
                                value={newRelationship.relationship_type}
                                onChange={(e) => setNewRelationship({...newRelationship, relationship_type: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-app-border rounded-none p-2.5 text-slate-900 dark:text-slate-200"
                            >
                                {relationshipTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-app-text-muted mb-2">Description (Optional)</label>
                            <input
                                type="text"
                                value={newRelationship.description}
                                onChange={(e) => setNewRelationship({...newRelationship, description: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-app-border rounded-none p-2.5 text-slate-900 dark:text-slate-200"
                                placeholder="e.g., Database connection"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-app-text-muted mb-2">Criticality (1-5)</label>
                            <input
                                type="range"
                                min="1"
                                max="5"
                                value={newRelationship.criticality}
                                onChange={(e) => setNewRelationship({...newRelationship, criticality: parseInt(e.target.value)})}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-app-text-muted mt-1">
                                <span>Low</span>
                                <span>Critical ({newRelationship.criticality})</span>
                            </div>
                        </div>
                        <div className="md:col-span-2 flex justify-end space-x-3">
                            <button type="button" onClick={() => setShowAddForm(false)} className="btn bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:bg-slate-600 text-app-text">
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Create Relationship
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="glass-panel min-h-[400px] p-8">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-app-text-muted">Loading relationships...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-full mb-6">
                            <AlertCircle size={48} className="text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-app-text mb-2">Error Loading Relationships</h3>
                        <p className="text-app-text-muted max-w-md mb-4">{error}</p>
                        <button onClick={fetchRelationships} className="btn btn-primary">
                            Retry
                        </button>
                    </div>
                ) : relationships && (relationships.upstream.length > 0 || relationships.downstream.length > 0) ? (
                    <>
                        <div className="flex items-center justify-center mb-8">
                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                <Network size={32} className="text-blue-400" />
                            </div>
                        </div>
                        <p className="text-center text-app-text-muted mb-8">
                            Total: {relationships.total_relationships} relationship(s)
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Upstream */}
                            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-none border border-app-border">
                                <h4 className="font-bold text-slate-900 dark:text-slate-200 mb-4 border-b border-app-border pb-2 flex items-center">
                                    <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                                    Upstream (This Asset Depends On)
                                </h4>
                                <ul className="space-y-3">
                                    {relationships.upstream.map(rel => (
                                        <li key={rel.id} className="flex items-center justify-between p-3 bg-app-surface-soft rounded-none group">
                                            <div className="flex items-center space-x-3">
                                                <span className={`px-2 py-0.5 text-xs rounded bg-${getTypeColor(rel.relationship_type)}-500/20 text-${getTypeColor(rel.relationship_type)}-400`}>
                                                    {rel.relationship_type}
                                                </span>
                                                <Link href={`/assets/${rel.related_asset?.id}`} className="text-app-text-muted hover:text-app-text">
                                                    {rel.related_asset?.name}
                                                    <span className="text-xs text-app-text-muted ml-2">({rel.related_asset?.type})</span>
                                                </Link>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteRelationship(rel.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-opacity"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </li>
                                    ))}
                                    {relationships.upstream.length === 0 && (
                                        <li className="text-app-text-muted italic text-center py-4">No upstream dependencies</li>
                                    )}
                                </ul>
                            </div>

                            {/* Downstream */}
                            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-none border border-app-border">
                                <h4 className="font-bold text-slate-900 dark:text-slate-200 mb-4 border-b border-app-border pb-2 flex items-center">
                                    <span className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></span>
                                    Downstream (Depends On This Asset)
                                </h4>
                                <ul className="space-y-3">
                                    {relationships.downstream.map(rel => (
                                        <li key={rel.id} className="flex items-center justify-between p-3 bg-app-surface-soft rounded-none group">
                                            <div className="flex items-center space-x-3">
                                                <span className={`px-2 py-0.5 text-xs rounded bg-${getTypeColor(rel.relationship_type)}-500/20 text-${getTypeColor(rel.relationship_type)}-400`}>
                                                    {rel.relationship_type}
                                                </span>
                                                <Link href={`/assets/${rel.related_asset?.id}`} className="text-app-text-muted hover:text-app-text">
                                                    {rel.related_asset?.name}
                                                    <span className="text-xs text-app-text-muted ml-2">({rel.related_asset?.type})</span>
                                                </Link>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteRelationship(rel.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-opacity"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </li>
                                    ))}
                                    {relationships.downstream.length === 0 && (
                                        <li className="text-app-text-muted italic text-center py-4">No downstream dependencies</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
                            <Network size={48} className="text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-app-text mb-2">No Relationships Found</h3>
                        <p className="text-app-text-muted max-w-md mb-6">
                            This asset does not have any defined dependencies yet. Click "Add Relationship" to create one.
                        </p>
                        <button onClick={() => setShowAddForm(true)} className="btn btn-primary flex items-center space-x-2">
                            <Plus size={18} />
                            <span>Add First Relationship</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
