import React, { useState } from 'react';
import AssetRequestsList from '@/components/AssetRequestsList';
import { FileText, Plus } from 'lucide-react';

export default function AssetRequestsPage() {
    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-app-text flex items-center gap-2">
                            <FileText className="w-8 h-8 text-indigo-400" />
                            Asset Requests
                        </h1>
                        <p className="text-app-text-muted text-app-text-muted mt-1">
                            Manage asset approvals, BYOD compliance, and procurement workflows.
                        </p>
                    </div>

                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-app-text font-medium rounded-xl shadow-lg shadow-indigo-500/20 border border-indigo-500/20 flex items-center gap-2 transition-all">
                        <Plus className="w-5 h-5" />
                        New Request
                    </button>
                </div>

                {/* Main Content */}
                <AssetRequestsList />

            </div>
    );
}
