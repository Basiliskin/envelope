// Imported as a raw string at build time (vite's `?raw` loader) so the
// composer bundle carries the *built* reader.html verbatim — the same
// artifact `npm run build:reader` produces, not a re-transpiled copy.
import readerTemplate from "../../../dist-reader/reader.html?raw";

export { readerTemplate };
