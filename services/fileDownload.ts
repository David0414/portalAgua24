const isIOSDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const dataUrlToBlobUrl = (dataUrl: string): string | null => {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const header = parts[0];
    const base64 = parts[1];
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch?.[1] || 'application/octet-stream';

    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);

    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
};

export const openOrDownloadFile = (url: string, filename: string) => {
  if (!url) return;

  let finalUrl = url;
  let generatedBlobUrl: string | null = null;

  if (url.startsWith('data:')) {
    generatedBlobUrl = dataUrlToBlobUrl(url);
    if (generatedBlobUrl) finalUrl = generatedBlobUrl;
  }

  if (isIOSDevice()) {
    const win = window.open(finalUrl, '_blank');
    if (!win) window.location.href = finalUrl;
    if (generatedBlobUrl) {
      setTimeout(() => URL.revokeObjectURL(generatedBlobUrl!), 60000);
    }
    return;
  }

  const a = document.createElement('a');
  a.href = finalUrl;
  a.download = filename;
  a.target = '_blank';
  a.rel = 'noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (generatedBlobUrl) {
    setTimeout(() => URL.revokeObjectURL(generatedBlobUrl!), 60000);
  }
};
