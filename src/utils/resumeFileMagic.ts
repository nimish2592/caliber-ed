/** DOCX is a zip archive (PK..). Legacy .doc is OLE (D0 CF 11 E0). */

export function isZipBasedOfficeDoc(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function isLegacyMsWordDoc(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  );
}

export function legacyDocUnsupportedMessage(fileName: string): string {
  return `${fileName} is a legacy Word .doc file. Re-export as PDF or .docx (Naukri often offers PDF), or open in Word and Save As .docx.`;
}
