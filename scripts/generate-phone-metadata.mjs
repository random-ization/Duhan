import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, 'node_modules', 'libphonenumber-js', 'metadata.min.json');
const metadata = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const keep = new Set(['CN', 'VN', 'MN']);

const subset = {
  version: metadata.version,
  country_calling_codes: Object.fromEntries(
    Object.entries(metadata.country_calling_codes).filter(([, countries]) =>
      countries.some((c) => keep.has(c))
    )
  ),
  countries: Object.fromEntries(Object.entries(metadata.countries).filter(([c]) => keep.has(c))),
  nonGeographic: {},
};

const out = `export default ${JSON.stringify(subset, null, 2)} as const;\n`;

const targets = [
  path.join(projectRoot, 'src', 'lib', 'phone', 'metadata.cn-vn-mn.ts'),
  path.join(projectRoot, 'convex', 'phone', 'metadata.cn-vn-mn.ts'),
];

for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, out, 'utf8');
  console.log(`Wrote ${path.relative(projectRoot, target)}`);
}

