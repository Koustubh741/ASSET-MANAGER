$filePath = "d:\ASSET-MANAGER\frontend\pages\agents.jsx"
$lines = Get-Content $filePath

# Find the line with "Autonomous Sweep" toggle (around line 261)
$insertAt = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "Autonomous Sweep") {
        # Go back to find the start of this div block
        for ($j = $i; $j -ge 0; $j--) {
            if ($lines[$j] -match '^\s+<div className="flex items-center justify-between p-4 rounded-2xl bg-white/5') {
                $insertAt = $j
                break
            }
        }
        break
    }
}

if ($insertAt -lt 0) {
    Write-Host "ERROR: Could not find insertion point"
    exit 1
}

Write-Host "Found insertion point at line: $insertAt"

# SNMP Configuration fields to insert
$snmpFields = @"

                                {/* SNMP Scanner Specific Configuration */}
                                {configAgent.type === 'Network' && (
                                    <div className="space-y-4 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Server className="text-blue-400" size={16} />
                                            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">SNMP Configuration</h4>
                                        </div>

                                        {/* Network Range */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">Network Range (CIDR)</label>
                                            <input
                                                type="text"
                                                value={snmpConfig.networkRange}
                                                onChange={(e) => setSnmpConfig({ ...snmpConfig, networkRange: e.target.value })}
                                                placeholder="192.168.1.0/24"
                                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                            />
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Info size={10} />
                                                IP range to scan (e.g., 10.0.0.0/24 or 192.168.1.0/28)
                                            </p>
                                        </div>

                                        {/* Community String */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">Community String</label>
                                            <input
                                                type="password"
                                                value={snmpConfig.communityString}
                                                onChange={(e) => setSnmpConfig({ ...snmpConfig, communityString: e.target.value })}
                                                placeholder="public"
                                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                            />
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Lock size={10} />
                                                SNMP authentication string (default: public)
                                            </p>
                                        </div>

                                        {/* SNMP Version */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">SNMP Version</label>
                                            <select
                                                value={snmpConfig.snmpVersion}
                                                onChange={(e) => setSnmpConfig({ ...snmpConfig, snmpVersion: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                            >
                                                <option value="v2c">v2c (Standard)</option>
                                                <option value="v3">v3 (Secure - Coming Soon)</option>
                                            </select>
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Shield size={10} />
                                                v2c uses community strings, v3 offers encryption
                                            </p>
                                        </div>

                                        {/* Exclusions */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-tight">Exclusions (Optional)</label>
                                            <input
                                                type="text"
                                                value={snmpConfig.exclusions}
                                                onChange={(e) => setSnmpConfig({ ...snmpConfig, exclusions: e.target.value })}
                                                placeholder="192.168.1.1, 192.168.1.254"
                                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                            />
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Filter size={10} />
                                                IP addresses to skip (comma-separated)
                                            </p>
                                        </div>
                                    </div>
                                )}
"@ -split "`n"

# Insert the SNMP fields before the Autonomous Sweep toggle
$newLines = $lines[0..($insertAt - 1)] + $snmpFields + $lines[$insertAt..($lines.Count - 1)]
Set-Content -Path $filePath -Value $newLines
Write-Host "Successfully inserted SNMP configuration fields at line $insertAt"
