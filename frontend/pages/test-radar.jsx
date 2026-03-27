import React from 'react';
import Head from 'next/head';
import MultiLayerRadarChart from '@/components/MultiLayerRadarChart';
import Layout from '@/components/Layout';

export default function TestRadarPage() {
    return (
        <Layout>
            <Head>
                <title>Radar Chart Visualizer | ASSET-MANAGER</title>
            </Head>
            <div className="p-8 max-w-5xl mx-auto h-full min-h-screen">
                <header className="mb-8">
                    <h1 className="text-3xl font-black text-app-text tracking-tighter">Advanced Radar Verification</h1>
                    <p className="text-app-text-muted mt-2">ESPN-style multi-layered radar chart built on top of the Recharts platform.</p>
                </header>
                
                <div className="w-full max-w-3xl mx-auto">
                    <MultiLayerRadarChart />
                </div>
            </div>
        </Layout>
    );
}
