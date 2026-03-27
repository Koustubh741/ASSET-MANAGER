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
        bg: '#002543',          // deep navy background
        layer1: '#3b82f6',      // medium blue
        layer2: '#10b981',      // green
        layer3: '#8b5cf6',      // purple
        layer4: '#1e3a8a',      // dark blue
        layer5: '#6366f1',      // indigo
        focus: '#cffafe',       // bright cyan/white center star
        grid: 'rgba(255,255,255,0.4)',
        text: '#93c5fd'
    };

    return (
        <div style={{ backgroundColor: colors.bg }} className="w-full h-full min-h-[500px] p-8 rounded-2xl relative shadow-2xl flex flex-col">
            
            {/* Header matches bottom-left/top formatting */}
            <div className="absolute top-4 w-full text-center pointer-events-none z-10">
                <h3 className="text-[#a5f3fc] text-xl font-light tracking-widest uppercase opacity-90">Attribute Comparison</h3>
            </div>

            <div className="flex-grow flex items-center justify-center relative mt-6">
                <ResponsiveContainer width="100%" height={450}>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
                        
                        {/* The Grid mapping to multi-polygon shapes */}
                        <PolarGrid stroke={colors.grid} strokeDasharray="2 2" />
                        
                        {/* Axes and Labels */}
                        <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fill: colors.text, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em' }} 
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
                            name="Focus Target"
                            dataKey="Focus" 
                            stroke="#ffffff" 
                            fill={colors.focus} 
                            fillOpacity={0.85} 
                            strokeWidth={1}
                            dot={{ r: 2.5, fill: '#ffffff', stroke: 'none' }} 
                            activeDot={{ r: 5, fill: '#000', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* Footer watermark matching the image */}
            <div className="absolute bottom-4 left-6 text-[#60a5fa] text-[10px] font-mono tracking-widest opacity-70">
                Ellen Blackburn | Data: ESPN (Demo)
            </div>
        </div>
    );
};

export default memo(MultiLayerRadarChart);
