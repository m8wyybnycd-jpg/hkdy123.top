const fs = require("fs");
const path = require("path");

const targets = process.argv.slice(2).map((p) => path.resolve(p));
let scanned = 0;
let repaired = 0;
let skippedBinary = 0;

function isUtf8Text(buf) {
  try {
    const s = buf.toString("utf8");
    return Buffer.from(s, "utf8").equals(buf);
  } catch {
    return false;
  }
}

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full);
    } else if (e.isFile()) {
      scanned++;
      let buf;
      try {
        buf = fs.readFileSync(full);
      } catch {
        continue;
      }
      if (buf.length === 0) continue;
      let lastNonNull = buf.length - 1;
      while (lastNonNull >= 0 && buf[lastNonNull] === 0x00) lastNonNull--;
      if (lastNonNull === buf.length - 1) continue;
      const prefix = buf.slice(0, lastNonNull + 1);
      if (!isUtf8Text(prefix)) {
        skippedBinary++;
        continue;
      }
      fs.writeFileSync(full, prefix);
      repaired++;
    }
  }
}

for (const t of targets) {
  if (fs.existsSync(t)) walk(t);
}
console.log(`scanned=${scanned} repaired=${repaired} skippedBinary=${skippedBinary}`);
