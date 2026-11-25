import { HttpError } from "./http";

/**
 * Removes hidden metadata from an uploaded photo before it's stored (SW-28):
 * location, timestamps, camera and phone details, comments, thumbnails. The
 * phone's re-encode usually drops these already, but a direct upload to the API
 * doesn't go through the phone, so the server makes sure.
 *
 * Only the container is rewritten; the pixels are never decoded. A file that
 * doesn't parse is refused rather than stored as-is, and anything after the
 * image's end is dropped, since it's a place to hide data.
 */
export function stripMetadata(bytes: Uint8Array, type: string): Uint8Array {
  if (type === "image/jpeg") return stripJpeg(bytes);
  if (type === "image/png") return stripPng(bytes);
  return stripWebp(bytes);
}

const unreadable = () => new HttpError(415, "We couldn't read that photo. Try taking it again.", "photoUnreadable");

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const ascii = (bytes: Uint8Array, at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));

// --- JPEG -----------------------------------------------------------------------

// APP1–APP15 hold EXIF (with GPS), XMP, IPTC and maker notes; COM is free text.
// APP0 (JFIF) and an ICC color profile in APP2 carry no personal data and are kept.
const isMetadataSegment = (marker: number, bytes: Uint8Array, at: number) =>
  marker === 0xfe || (marker >= 0xe1 && marker <= 0xef && !(marker === 0xe2 && ascii(bytes, at + 4, 12) === "ICC_PROFILE\0"));

function stripJpeg(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw unreadable();
  const keep: Uint8Array[] = [bytes.subarray(0, 2)];
  let at = 2;
  for (;;) {
    if (bytes[at] !== 0xff) throw unreadable();
    while (bytes[at + 1] === 0xff) at++; // fill bytes before a marker
    const marker = bytes[at + 1];
    if (marker === undefined) throw unreadable();
    if (marker === 0xd9) {
      keep.push(bytes.subarray(at, at + 2)); // end of image: anything after it goes
      return concat(keep);
    }
    if (at + 4 > bytes.length) throw unreadable();
    const end = at + 2 + ((bytes[at + 2]! << 8) | bytes[at + 3]!);
    if (end > bytes.length) throw unreadable();
    if (!isMetadataSegment(marker, bytes, at)) keep.push(bytes.subarray(at, end));
    at = end;
    if (marker === 0xda) {
      // Start of scan: compressed data runs to the next real marker. In it, 0xFF
      // is followed by 0x00 (a stuffed byte) or a restart marker (0xD0–0xD7).
      let scan = at;
      while (scan + 1 < bytes.length && !(bytes[scan] === 0xff && bytes[scan + 1] !== 0 && (bytes[scan + 1]! < 0xd0 || bytes[scan + 1]! > 0xd7))) scan++;
      if (scan + 1 >= bytes.length) throw unreadable();
      keep.push(bytes.subarray(at, scan));
      at = scan;
    }
  }
}

// --- PNG ------------------------------------------------------------------------

// eXIf is EXIF (with GPS); the text chunks can hold anything; tIME is when it was edited.
const PNG_METADATA = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

function stripPng(bytes: Uint8Array): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const keep: Uint8Array[] = [bytes.subarray(0, 8)];
  let at = 8;
  for (;;) {
    if (at + 12 > bytes.length) throw unreadable();
    const end = at + 12 + view.getUint32(at);
    if (end > bytes.length) throw unreadable();
    const kind = ascii(bytes, at + 4, 4);
    if (!PNG_METADATA.has(kind)) keep.push(bytes.subarray(at, end));
    if (kind === "IEND") return concat(keep);
    at = end;
  }
}

// --- WebP -----------------------------------------------------------------------

const WEBP_METADATA = new Set(["EXIF", "XMP "]);
const VP8X_EXIF = 0x08;
const VP8X_XMP = 0x04;

function stripWebp(bytes: Uint8Array): Uint8Array {
  if (bytes.length < 12) throw unreadable();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const riffEnd = 8 + view.getUint32(4, true);
  if (riffEnd > bytes.length) throw unreadable();
  const keep: Uint8Array[] = [];
  let at = 12;
  while (at < riffEnd) {
    if (at + 8 > riffEnd) throw unreadable();
    const size = view.getUint32(at + 4, true);
    const end = at + 8 + size + (size % 2); // chunks are padded to an even length
    if (end > riffEnd) throw unreadable();
    const kind = ascii(bytes, at, 4);
    if (kind === "VP8X") {
      const chunk = bytes.slice(at, end);
      chunk[8] = chunk[8]! & ~(VP8X_EXIF | VP8X_XMP); // the header no longer promises them
      keep.push(chunk);
    } else if (!WEBP_METADATA.has(kind)) {
      keep.push(bytes.subarray(at, end));
    }
    at = end;
  }
  const body = concat(keep);
  const header = new Uint8Array(12);
  header.set(bytes.subarray(0, 12));
  new DataView(header.buffer).setUint32(4, body.length + 4, true); // "WEBP" + chunks
  return concat([header, body]);
}
