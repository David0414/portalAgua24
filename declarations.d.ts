declare module 'jspdf' {
    interface jsPDF {
        lastAutoTable?: { finalY: number };
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
    interface QRCodeProps {
        value: string;
        size?: number;
        bgColor?: string;
        fgColor?: string;
        level?: 'L' | 'M' | 'Q' | 'H';
        style?: import('react').CSSProperties;
    }
    const QRCodeComponent: import('react').FC<QRCodeProps>;
    export default QRCodeComponent;
}