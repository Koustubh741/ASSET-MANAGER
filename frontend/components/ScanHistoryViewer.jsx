import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert, Tabs, Tab, IconButton, Collapse } from '@mui/material';
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot, TimelineOppositeContent } from '@mui/lab';
import { ExpandMore as ExpandMoreIcon, Memory as MemoryIcon, Storage as StorageIcon, Computer as ComputerIcon, Update as UpdateIcon } from '@mui/icons-material';
import apiClient from '../lib/apiClient';

const ScanHistoryViewer = ({ assetId = null }) => {
    const [scans, setScans] = useState([]);
    const [selectedScan, setSelectedScan] = useState(null);
    const [diffs, setDiffs] = useState([]);
    const [assetHistory, setAssetHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tabValue, setTabValue] = useState(0);
    const [expandedScan, setExpandedScan] = useState(null);

    useEffect(() => {
        loadData();
    }, [assetId]);

    const loadData = async () => {
        try {
            setLoading(true);
            if (assetId) {
                // Load asset-specific history
                const history = await apiClient.getAssetChangeHistory(assetId);
                setAssetHistory(history);
            } else {
                // Load all recent scans
                const scanData = await apiClient.getDiscoveryScans(50);
                setScans(scanData);
            }
        } catch (err) {
            setError(err.message || 'Failed to load scan history');
        } finally {
            setLoading(false);
        }
    };

    const loadScanDiffs = async (scanId) => {
        try {
            const diffData = await apiClient.getScanDiffs(scanId);
            setDiffs(diffData);
            setSelectedScan(scanId);
        } catch (err) {
            setError(err.message || 'Failed to load scan diffs');
        }
    };

    const getChangeIcon = (fieldName) => {
        if (fieldName.includes('RAM')) return <MemoryIcon />;
        if (fieldName.includes('Storage')) return <StorageIcon />;
        if (fieldName.includes('OS') || fieldName.includes('Processor')) return <ComputerIcon />;
        return <UpdateIcon />;
    };

    const getChangeColor = (fieldName) => {
        if (fieldName.includes('Software Installed')) return 'success';
        if (fieldName.includes('Software Removed')) return 'error';
        if (fieldName.includes('RAM') || fieldName.includes('Storage')) return 'primary';
        return 'info';
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                {assetId ? 'Asset Change History' : 'Discovery Scan History'}
            </Typography>

            {!assetId && (
                <Box sx={{ mb: 3 }}>
                    <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                        <Tab label="Recent Scans" />
                        <Tab label="Configuration Changes" disabled={!selectedScan} />
                    </Tabs>

                    {tabValue === 0 && (
                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Scan Time</TableCell>
                                        <TableCell>Agent ID</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Assets Processed</TableCell>
                                        <TableCell>Duration</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {scans.map((scan) => {
                                        const duration = scan.end_time && scan.start_time
                                            ? Math.round((new Date(scan.end_time) - new Date(scan.start_time)) / 1000)
                                            : null;

                                        return (
                                            <TableRow key={scan.id} hover>
                                                <TableCell>{formatDateTime(scan.start_time)}</TableCell>
                                                <TableCell>
                                                    <Chip label={scan.agent_id} size="small" />
                                                </TableCell>
                                                <TableCell>{scan.scan_type}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={scan.status}
                                                        color={scan.status === 'COMPLETED' ? 'success' : 'warning'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>{scan.assets_processed || 0}</TableCell>
                                                <TableCell>{duration ? `${duration}s` : 'N/A'}</TableCell>
                                                <TableCell>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => {
                                                            loadScanDiffs(scan.id);
                                                            setTabValue(1);
                                                        }}
                                                    >
                                                        <ExpandMoreIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {tabValue === 1 && selectedScan && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                Configuration Changes Detected
                            </Typography>
                            {diffs.length === 0 ? (
                                <Alert severity="info">No configuration changes detected in this scan.</Alert>
                            ) : (
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Asset</TableCell>
                                                <TableCell>Field</TableCell>
                                                <TableCell>Old Value</TableCell>
                                                <TableCell>New Value</TableCell>
                                                <TableCell>Detected At</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {diffs.map((diff) => (
                                                <TableRow key={diff.id}>
                                                    <TableCell>{diff.asset_name}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            icon={getChangeIcon(diff.field_name)}
                                                            label={diff.field_name}
                                                            color={getChangeColor(diff.field_name)}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {diff.old_value || 'N/A'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="bold">
                                                            {diff.new_value || 'N/A'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{formatDateTime(diff.detected_at)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Box>
                    )}
                </Box>
            )}

            {assetId && assetHistory.length > 0 && (
                <Timeline position="alternate">
                    {assetHistory.map((change, index) => (
                        <TimelineItem key={change.id}>
                            <TimelineOppositeContent color="text.secondary">
                                {formatDateTime(change.detected_at)}
                            </TimelineOppositeContent>
                            <TimelineSeparator>
                                <TimelineDot color={getChangeColor(change.field_name)}>
                                    {getChangeIcon(change.field_name)}
                                </TimelineDot>
                                {index < assetHistory.length - 1 && <TimelineConnector />}
                            </TimelineSeparator>
                            <TimelineContent>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" component="span">
                                            {change.field_name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {change.old_value || 'N/A'} → {change.new_value || 'N/A'}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </TimelineContent>
                        </TimelineItem>
                    ))}
                </Timeline>
            )}

            {assetId && assetHistory.length === 0 && (
                <Alert severity="info">No configuration changes recorded for this asset yet.</Alert>
            )}
        </Box>
    );
};

export default ScanHistoryViewer;
