declare module 'jspdf' {
    export default class jsPDF {
        constructor(options?: any);
        setFillColor(r: number, g: number, b: number): void;
        rect(x: number, y: number, w: number, h: number, style: string): void;
        setTextColor(r: number, g: number, b: number): void;
        setFontSize(size: number): void;
        setFont(fontName: string, fontStyle: string): void;
        // Definición laxa para aceptar sobrecargas de argumentos
        text(text: string, x: number, y: number, options?: any, transform?: any): void;
        roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style: string): void;
        save(filename: string): void;
        // Propiedades dinámicas agregadas por plugins
        lastAutoTable?: { finalY: number };
        internal: any;
    }
}

declare module 'jspdf-autotable' {
    export default function autoTable(doc: any, options: any): void;
}

declare module 'html5-qrcode' {
    export class Html5QrcodeScanner {
        constructor(elementId: string, config: any, verbose: boolean);
        render(onScanSuccess: (decodedText: string, decodedResult: any) => void, onScanFailure?: (error: any) => void): void;
        clear(): Promise<void>;
    }
}

declare module 'react-qr-code' {
    import React from 'react';
    interface QRCodeProps {
        value: string;
        size?: number;
        bgColor?: string;
        fgColor?: string;
        level?: 'L' | 'M' | 'Q' | 'H';
        style?: React.CSSProperties;
    }
    const QRCode: React.FC<QRCodeProps>;
    export default QRCode;
}