import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import apiClient from '@/lib/apiClient'
import { ArrowLeft, UserCheck } from 'lucide-react'
import Link from 'next/link'

export default function AssignAsset() {
    const router = useRouter()
    const { id } = router.query
    const [asset, setAsset] = useState(null)
    const [formData, setFormData] = useState({
        assigned_to: '',
        location: '',
        assignment_date: new Date().toISOString().split('T')[0]
    })

    useEffect(() => {
        if (!id) return
        const fetchAsset = async () => {
            try {
                const data = await apiClient.getAsset(id)
                setAsset(data)
                setFormData(prev => ({
                    ...prev,
                    location: data.location || ''
                }))
            } catch (error) {
                console.error("Failed to fetch asset", error)
            }
        }
        fetchAsset()
    }, [id])

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await apiClient.assignAsset(id, formData)
            router.push(`/assets/${id}`)
        } catch (error) {
            console.error("Failed to assign asset", error)
            alert("Failed to assign asset")
        }
    }

    if (!asset) return <div className="p-8">Loading...</div>

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-center space-x-4">
                <Link href={`/assets/${id}`} className="p-2 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface rounded-full text-app-text-muted hover:text-app-text transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <h2 className="text-xl font-bold text-app-text tracking-tight">Assign Asset</h2>
            </div>

            <div className="glass-panel p-8">
                <div className="mb-8 p-6 bg-white dark:bg-slate-900/50 rounded-none border border-app-border">
                    <p className="text-sm text-app-text-muted mb-1">Selected Asset</p>
                    <div className="flex justify-between items-center">
                        <p className="font-bold text-xl text-app-text">{asset.name}</p>
                        <span className="text-xs font-mono px-2 py-1 rounded bg-app-surface text-app-text-muted">{asset.serial_number}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-app-text-muted mb-2">Assign To (User Email/Name)</label>
                        <input
                            required
                            name="assigned_to"
                            value={formData.assigned_to}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="e.g. john.doe@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-app-text-muted mb-2">Location</label>
                        <input
                            required
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="e.g. London Office"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-app-text-muted mb-2">Assignment Date</label>
                        <input
                            type="date"
                            required
                            name="assignment_date"
                            value={formData.assignment_date}
                            onChange={handleChange}
                            className="input-field"
                        />
                    </div>

                    <div className="pt-6">
                        <button type="submit" className="btn btn-primary w-full flex justify-center items-center space-x-2 py-3">
                            <UserCheck size={20} />
                            <span>Confirm Assignment</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
