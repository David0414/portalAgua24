declare module 'jspdf-autotable' {
    export default function autoTable(doc: any, options: any): void;
}

declare module 'html5-qrcode' {
    export class Html5QrcodeScanner {
        constructor(elementId: string, config: any, verbose: boolean);
        render(onScanSuccess: (decodedText: string, decodedResult: any) => void, onScanFailure?: (error: any) => void): void;
        clear(): Promise<void>;
    }

    export class Html5Qrcode {
        constructor(elementId: string, verbose?: boolean | any);
        isScanning: boolean;
        start(
            cameraIdOrConfig: string | { facingMode: string | { exact: string } } | { deviceId: string },
            configuration: any,
            onScanSuccess: (decodedText: string, decodedResult: any) => void,
            onScanFailure?: (errorMessage: string) => void
        ): Promise<void>;
        stop(): Promise<void>;
        clear(): Promise<void>;
        scanFile(imageFile: File, showImage?: boolean): Promise<string>;
    }

    export enum Html5QrcodeSupportedFormats {
        QR_CODE = 0,
        AZTEC = 1,
        CODABAR = 2,
        CODE_39 = 3,
        CODE_93 = 4,
        CODE_128 = 5,
        DATA_MATRIX = 6,
        MAXICODE = 7,
        ITF = 8,
        EAN_13 = 9,
        EAN_8 = 10,
        PDF_417 = 11,
        RSS_14 = 12,
        RSS_EXPANDED = 13,
        UPC_A = 14,
        UPC_E = 15,
        UPC_EAN_EXTENSION = 16,
    }
}
