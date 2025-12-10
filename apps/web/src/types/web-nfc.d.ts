/**
 * Web NFC API Type Declarations
 *
 * Web NFC allows web apps to read and write NFC tags.
 * Supported in Chrome 89+ on Android.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_NFC_API
 */

interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFRecord {
  recordType: string;
  mediaType?: string;
  id?: string;
  data?: DataView;
  encoding?: string;
  lang?: string;
  toRecords?: () => NDEFRecord[];
}

interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: NDEFMessage;
}

interface NDEFWriteOptions {
  overwrite?: boolean;
  signal?: AbortSignal;
}

interface NDEFScanOptions {
  signal?: AbortSignal;
}

interface NDEFReader extends EventTarget {
  scan(options?: NDEFScanOptions): Promise<void>;
  write(message: string | BufferSource | NDEFMessageInit, options?: NDEFWriteOptions): Promise<void>;
  onreading: ((event: NDEFReadingEvent) => void) | null;
  onreadingerror: ((event: Event) => void) | null;
}

interface NDEFRecordInit {
  recordType: string;
  mediaType?: string;
  id?: string;
  encoding?: string;
  lang?: string;
  data?: BufferSource | string;
}

interface NDEFMessageInit {
  records: NDEFRecordInit[];
}

declare var NDEFReader: {
  prototype: NDEFReader;
  new(): NDEFReader;
};

interface Window {
  NDEFReader?: typeof NDEFReader;
}
