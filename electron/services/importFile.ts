import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

function safeBaseName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, '_').slice(0, 180);
}

export async function importFileToAppData(originalName: string, data: Uint8Array): Promise<string> {
  const dir = path.join(app.getPath('userData'), 'imports');
  await fs.mkdir(dir, { recursive: true });

  const hash = crypto.createHash('sha1').update(data).digest('hex').slice(0, 10);
  const base = safeBaseName(originalName);
  const outPath = path.join(dir, `${hash}-${base}`);

  await fs.writeFile(outPath, data);
  return outPath;
}

