import { Buffer } from "buffer";

class StringManipulator {
  private buffer: string;

  constructor() {
    this.buffer = "";
  }

  add(text: string): void {
    this.buffer += text;
  }

  cut(): void {
    this.add("\x1D\x56\x42\x00");
  }

  center(): void {
    this.add("\x1B\x61\x01");
  }

  left(): void {
    this.add("\x1B\x61\x00");
  }

  right(): void {
    this.add("\x1B\x61\x02");
  }

  font(size: "A" | "B"): void {
    this.add(size === "B" ? "\x1B\x21\x01" : "\x1B\x21\x00");
  }

  size(n: string): void {
    this.add(`\x1D\x21${n}`);
  }

  bold(on: boolean): void {
    this.add(on ? "\x1B\x45\x01" : "\x1B\x45\x00");
  }

  underline(on: boolean): void {
    this.add(on ? "\x1B\x2D\x01" : "\x1B\x2D\x00");
  }

  internationalCharSet(): void {
    this.add("\x1B\x52\x01");
  }

  alphanumericCharSet(): void {
    this.add("\x1B\x52\x00");
  }

  text(text: string): void {
    try {
      // Dùng TextEncoder thay cho iconv-lite
      const encoder = new TextEncoder();
      const encodedText = encoder.encode(text);
      this.buffer += String.fromCharCode.apply(null, Array.from(encodedText));
    } catch (error) {
      console.error("Lỗi encoding text:", error);
      this.buffer += text; // Fallback về text gốc nếu có lỗi
    }
  }

  barcode(data: string, type: BarcodeType): void {
    const barcodeTypes: Record<BarcodeType, string> = {
      "UPC-A": "\x00",
      "UPC-E": "\x01",
      EAN13: "\x02",
      EAN8: "\x03",
      CODE39: "\x04",
      ITF: "\x05",
      CODABAR: "\x06",
      CODE93: "\x48",
      CODE128: "\x49",
    };

    if (!barcodeTypes[type]) {
      throw new Error(`Invalid barcode type: ${type}`);
    }

    const barcodeType = barcodeTypes[type];
    const barcodeLength = String(data).length;
    const barcodeBytes = unescape(encodeURIComponent(data));
    this.add(`\x1D\x6B${barcodeType}${barcodeLength}${barcodeBytes}`);
  }

  flush(): string {
    const data = this.buffer;
    console.log(
      "Printing buffer...",
      typeof data,
      JSON.stringify(data, null, 2)
    );
    this.buffer = "";
    return data;
  }
}

type BarcodeType =
  | "UPC-A"
  | "UPC-E"
  | "EAN13"
  | "EAN8"
  | "CODE39"
  | "ITF"
  | "CODABAR"
  | "CODE93"
  | "CODE128";

export default StringManipulator;
