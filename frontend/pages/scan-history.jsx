import React from 'react';
import { Container, Box, Typography, Paper } from '@mui/material';
import ScanHistoryViewer from '../components/ScanHistoryViewer';

const ScanHistoryPage = () => {
    return (
        <Container maxWidth="xl">
                <Box sx={{ py: 4 }}>
                    <Typography variant="h4" gutterBottom>
                        Discovery Scan History
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                        View all discovery agent scan sessions and track configuration changes across your infrastructure.
                    </Typography>

                    <Paper sx={{ p: 3, mt: 3 }}>
                        <ScanHistoryViewer />
                    </Paper>
                </Box>
            </Container>
    );
};

export default ScanHistoryPage;
