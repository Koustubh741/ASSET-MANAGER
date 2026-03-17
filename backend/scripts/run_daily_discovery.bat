@echo off
cd /d "d:\ASSET-MANAGER\backend"
echo [%DATE% %TIME%] Starting Daily Discovery Agents... >> discovery_log.txt

echo Running Cloud Discovery... >> discovery_log.txt
python scripts\cloud_discovery_agent.py --mock >> discovery_log.txt 2>&1

echo Running SaaS Discovery... >> discovery_log.txt
python scripts\saas_discovery_agent.py --mock >> discovery_log.txt 2>&1

echo Running Network (SNMP) Discovery... >> discovery_log.txt
:: To enable, remove "REM" and set your CIDR range below
REM python scripts\snmp_scanner.py --range 192.168.1.0/24 --community public >> discovery_log.txt 2>&1

echo [%DATE% %TIME%] Discovery Complete. >> discovery_log.txt
