import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

const BarcodeScanner = ({ onScanSuccess, onScanError, onClose }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0
        };

        const scanner = new Html5QrcodeScanner(
            "reader",
            config,
            /* verbose= */ false
        );

        scanner.render((decodedText) => {
            onScanSuccess(decodedText);
            scanner.clear();
        }, (error) => {
            if (onScanError) onScanError(error);
        });

        scannerRef.current = scanner;

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => {
                    console.error("Failed to clear scanner on unmount", err);
                });
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-app-border relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-app-text-muted hover:text-app-text hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-app-surface rounded-none z-[101] transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Close scanner"
                    title="Close"
                >
                    <X size={20} />
                </button>

                <div className="p-6">
                    <h3 className="text-lg font-bold text-app-text mb-2">Scan Barcode</h3>
                    <p className="text-xs text-app-text-muted mb-6">Point your camera at the serial number barcode on the box.</p>

                    <div id="reader" className="overflow-hidden rounded-none border border-app-border bg-black/40"></div>

                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 text-sm font-bold text-app-text-muted hover:text-app-text transition-colors"
                        >
                            Cancel Scanning
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BarcodeScanner;
