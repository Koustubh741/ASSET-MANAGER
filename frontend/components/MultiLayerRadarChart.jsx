import React, { memo } from 'react';
import {
    Radar, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';

/**
 * MultiLayerRadarChart
 * Modeled after the reference ESPN chart with 10 attributes and multiple overlapping data layers.
 */
const data = [
    { subject: 'Strength',              Layer1: 75, Layer2: 60, Layer3: 85, Layer4: 45, Layer5: 90, Focus: 60 },
    { subject: 'Speed',                 Layer1: 85, Layer2: 70, Layer3: 65, Layer4: 55, Layer5: 80, Focus: 50 },
    { subject: 'Power',                 Layer1: 65, Layer2: 85, Layer3: 75, Layer4: 45, Layer5: 60, Focus: 40 },
    { subject: 'Nerve',                 Layer1: 70, Layer2: 65, Layer3: 80, Layer4: 55, Layer5: 85, Focus: 55 },
    { subject: 'Hand-eye Coordination', Layer1: 85, Layer2: 55, Layer3: 90, Layer4: 70, Layer5: 75, Focus: 65 },
    { subject: 'Flexibility',           Layer1: 55, Layer2: 90, Layer3: 65, Layer4: 85, Layer5: 50, Focus: 75 },
    { subject: 'Endurance',             Layer1: 80, Layer2: 75, Layer3: 85, Layer4: 65, Layer5: 90, Focus: 60 },
    { subject: 'Durability',            Layer1: 90, Layer2: 80, Layer3: 70, Layer4: 50, Layer5: 85, Focus: 55 },
    { subject: 'Analytical Aptitude',   Layer1: 75, Layer2: 85, Layer3: 60, Layer4: 90, Layer5: 70, Focus: 85 },
    { subject: 'Agility',               Layer1: 85, Layer2: 65, Layer3: 90, Layer4: 75, Layer5: 60, Focus: 65 },
];

const MultiLayerRadarChart = () => {
    // Colors matching the ethereal, varied look in the original image
    const colors = {
        bg: 'var(--bg-app-obsidian)',          // Kinetic Obsidian
        layer1: 'var(--color-kinetic-primary)',    // mission-primary
        layer2: 'var(--color-kinetic-secondary)',  // mission-secondary
        layer3: 'var(--color-kinetic-gold)',       // mission-gold
        layer4: 'var(--color-kinetic-rose)',       // mission-rose
        layer5: 'var(--color-kinetic-cyan)',       // mission-cyan
        focus: 'var(--color-kinetic-accent)',      // mission-accent
        grid: 'var(--border-main)',
        text: 'var(--text-muted)'
    };

    return (
        <div style={{ backgroundColor: colors.bg }} className="w-full h-full min-h-[500px] p-8 rounded-none relative shadow-2xl flex flex-col">
            
            {/* Header matches mission-critical formatting */}
            <div className="absolute top-4 w-full text-center pointer-events-none z-10">
                <h3 className="text-app-primary text-xl font-black tracking-[0.4em] uppercase opacity-90 font-['Space_Grotesk']">Neural Attribute Matrix</h3>
            </div>

            <div className="flex-grow flex items-center justify-center relative mt-6">
                <ResponsiveContainer width="100%" height={450}>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                        
                        {/* The Grid mapping to multi-polygon shapes */}
                        <PolarGrid stroke={colors.grid} strokeDasharray="3 3" strokeOpacity={0.4} />
                        
                        {/* Axes and Labels */}
                        <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fill: colors.text, fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', fontFamily: 'Space Grotesk' }} 
                        />
                        <PolarRadiusAxis 
                            angle={90} 
                            domain={[0, 100]} 
                            tick={false} 
                            axisLine={false} 
                        />
                        
                        {/* Background Data Layers - semi-transparent overlapping layers */}
                        <Radar dataKey="Layer1" stroke={colors.layer1} fill={colors.layer1} fillOpacity={0.25} strokeWidth={1.5} />
                        <Radar dataKey="Layer2" stroke={colors.layer2} fill={colors.layer2} fillOpacity={0.25} strokeWidth={1.5} />
                        <Radar dataKey="Layer3" stroke={colors.layer3} fill={colors.layer3} fillOpacity={0.25} strokeWidth={1.5} />
                        <Radar dataKey="Layer4" stroke={colors.layer4} fill={colors.layer4} fillOpacity={0.35} strokeWidth={1.5} />
                        <Radar dataKey="Layer5" stroke={colors.layer5} fill={colors.layer5} fillOpacity={0.25} strokeWidth={1.5} />
                        
                        {/* Prominent Foreground Layer (Focus) */}
                        <Radar 
                            name="Operational Baseline"
                            dataKey="Focus" 
                            stroke="var(--color-kinetic-accent)" 
                            fill={colors.focus} 
                            fillOpacity={0.65} 
                            strokeWidth={2}
                            dot={{ r: 3, fill: 'var(--color-kinetic-accent)', stroke: 'var(--bg-app-obsidian)', strokeWidth: 2 }} 
                            activeDot={{ r: 6, fill: '#fff', stroke: 'var(--color-kinetic-accent)', strokeWidth: 3 }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* Footer watermark matching the mission-critical identity */}
            <div className="absolute bottom-4 left-6 text-app-primary/40 text-[9px] font-mono tracking-[0.4em] uppercase font-black">
                Kinetic Ops Intelligence Hub | NODE_SYNC::SECURE
            </div>
        </div>
    );
};

export default memo(MultiLayerRadarChart);
