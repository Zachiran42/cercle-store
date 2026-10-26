import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import path from 'node:path';
const exec = promisify(execFile);
export async function inspectApk(file, tools) {
  if (!tools?.javaHome || !tools?.buildTools) throw Object.assign(new Error('Configure les outils Android avant de publier un APK.'), { status: 503 });
  const java = path.join(tools.javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
  const aapt = path.join(tools.buildTools, process.platform === 'win32' ? 'aapt2.exe' : 'aapt2');
  const options = { timeout: 45000, maxBuffer: 2 * 1024 * 1024, windowsHide: true };
  let certificate, badging;
  try {
    certificate = (await exec(java, ['-jar', path.join(tools.buildTools, 'lib', 'apksigner.jar'), 'verify', '--verbose', '--print-certs', file], options)).stdout;
    badging = (await exec(aapt, ['dump', 'badging', file], options)).stdout;
  } catch { throw Object.assign(new Error('Cet APK est invalide, non signé ou sa signature ne peut pas être vérifiée.'), { status: 400 }); }
  const pkg = badging.match(/^package: name='([^']+)' versionCode='(\d+)' versionName='([^']*)'/m);
  const signers = [...certificate.matchAll(/^Signer #\d+ certificate SHA-256 digest: ([0-9a-f]+)/gmi)].map(m => m[1].toLowerCase()).sort();
  if (!pkg || !/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(pkg[1]) || !signers.length) throw Object.assign(new Error('Les informations ou la signature de cet APK sont incomplètes.'), { status: 400 });
  if (/^uses-split:/m.test(badging) || /^package:.* split='/m.test(badging)) throw Object.assign(new Error('Publie un APK universel autonome. Les APK fractionnés ne sont pas pris en charge.'), { status: 400 });
  const versionCode = Number(pkg[2]);
  if (!Number.isSafeInteger(versionCode) || versionCode < 1) throw Object.assign(new Error('Le numéro interne de version est invalide.'), { status: 400 });
  const hash = createHash('sha256'); let size = 0;
  for await (const chunk of createReadStream(file)) { hash.update(chunk); size += chunk.length; }
  return { packageName: pkg[1], versionCode, versionName: pkg[3], name: (badging.match(/^application-label-fr:'(.*)'/m) || badging.match(/^application-label:'(.*)'/m) || [])[1] || pkg[1], minSdk: Number(badging.match(/^sdkVersion:'(\d+)'/m)?.[1] || 1), signers, sha256: hash.digest('hex'), size };
}
