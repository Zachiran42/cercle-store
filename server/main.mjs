import http from 'node:http';
import {readConfig,preparePublication,publishGitHub,githubStatus} from './github.mjs';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual, generateKeyPairSync, createPrivateKey, sign } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, existsSync, openSync, fsyncSync, closeSync, statSync, createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectApk } from './apk.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hash = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const safeEqual = (a, b) => { const x = Buffer.from(a || ''), y = Buffer.from(b || ''); return x.length === y.length && timingSafeEqual(x, y); };
const clean = (value, max = 400) => String(value || '').trim().slice(0, max);
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
async function body(req, max = 32768) { const chunks = []; let length = 0; for await (const chunk of req) { length += chunk.length; if (length > max) fail(413, 'Ce formulaire est trop volumineux.'); chunks.push(chunk); } const value = Buffer.concat(chunks).toString('utf8'); try { return JSON.parse(value || '{}'); } catch { fail(400, 'Le formulaire est illisible.'); } }
function save(file, value) { const temporary = file + '.' + randomUUID() + '.tmp'; const fd = openSync(temporary, 'wx', 0o600); try { writeFileSync(fd, JSON.stringify(value, null, 2)); fsyncSync(fd); } finally { closeSync(fd); } renameSync(temporary, file); }
export function createStore(options = {}) {
  const publicUrl = (options.publicUrl || process.env.CERCLE_PUBLIC_URL || 'http://127.0.0.1:8787').replace(/\/$/, '');
  const urlConfig = new URL(publicUrl);
  if (urlConfig.protocol !== 'https:' && !(['127.0.0.1', 'localhost', '[::1]'].includes(urlConfig.hostname) && urlConfig.protocol === 'http:')) throw new Error('Une adresse HTTPS est obligatoire hors du poste local.');
  if (urlConfig.username || urlConfig.password || urlConfig.pathname !== '/') throw new Error('L’adresse publique doit être une origine HTTPS sans chemin ni identifiants.');
  const secure = urlConfig.protocol === 'https:';

  const dataDir = path.resolve(options.dataDir || process.env.CERCLE_DATA_DIR || path.join(root, 'data'));
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  for (const dir of ['uploads', 'apks']) mkdirSync(path.join(dataDir, dir), { recursive: true, mode: 0o700 });
  const databaseFile = path.join(dataDir, 'store.json');
  let db = existsSync(databaseFile) ? JSON.parse(readFileSync(databaseFile, 'utf8')) : null;
  if (!db) {
    const password = options.adminPassword || process.env.CERCLE_ADMIN_PASSWORD || token();
    const salt = randomBytes(16).toString('hex');
    const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    writeFileSync(path.join(dataDir, 'catalog-private.pem'), pair.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    db = { schema: 1, admin: { salt, passwordHash: scryptSync(password, salt, 32).toString('hex') }, publicKey: pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64'), apps: [], releases: [], invitations: [], members: [], sessions: [], uploads: [] };
    save(databaseFile, db);
    if (!options.adminPassword && !process.env.CERCLE_ADMIN_PASSWORD) writeFileSync(path.join(dataDir, 'premier-acces-admin.txt'), 'Mot de passe administrateur initial :\n' + password + '\n\nCe fichier est privé. Conserve-le dans ton gestionnaire de mots de passe.\n', { mode: 0o600 });
  }
  if (db.schema !== 1) throw new Error('Version de données non prise en charge.');
  let githubBusy = false;
  const githubConfig = () => { try { return readConfig(root); } catch { return null; } };
  const catalogFingerprint = () => hash(JSON.stringify({apps:db.apps,releases:db.releases,externalCatalog:existsSync(path.join(root,"external-catalog.json"))?hash(readFileSync(path.join(root,"external-catalog.json"))):null}));
  const privateKey = createPrivateKey(readFileSync(path.join(dataDir, 'catalog-private.pem')));
  let tools = options.tools;
  const toolFile = options.toolFile || process.env.CERCLE_TOOLCHAIN || path.join(root, '.toolchain.json');
  if (!tools && existsSync(toolFile)) tools = JSON.parse(readFileSync(toolFile, 'utf8').replace(/^\uFEFF/, ''));
  const rate = new Map();
  const mutate = fn => { const next = structuredClone(db); const result = fn(next); save(databaseFile, next); db = next; return result; };
  const checkRate = (req, bucket, limit, window = 600000) => { const key = bucket + ':' + req.socket.remoteAddress; const now = Date.now(); let state = rate.get(key); if (!state || state.until < now) state = { count: 0, until: now + window }; state.count++; rate.set(key, state); if (rate.size > 10000) for (const [k,v] of rate) if (v.until < now) rate.delete(k); if (state.count > limit) fail(429, 'Trop de tentatives. Réessaie dans quelques minutes.'); };
  const session = req => { const cookie = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('cercle_admin='))?.slice(13); const found = db.sessions.find(s => safeEqual(s.hash, hash(cookie || '')) && s.expires > Date.now()); if (!found) fail(401, 'Connecte-toi pour gérer ton store.'); return found; };
  const origin = req => { if (req.headers.origin !== publicUrl) fail(403, 'Cette demande ne vient pas de ton administration.'); };
  const adminWrite = req => { origin(req); const s = session(req); if (!safeEqual(req.headers['x-csrf-token'], s.csrf)) fail(403, 'La session doit être actualisée.'); return s; };
  const member = req => { const match = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/); if (!match) fail(401, 'Une invitation est nécessaire.'); const found = db.members.find(m => safeEqual(m.tokenHash, hash(match[1])) && !m.revoked && m.expires > Date.now()); if (!found) fail(401, 'Ton accès a expiré ou a été retiré. Demande une nouvelle invitation.'); return found; };
  const latest = () => db.apps.filter(a => !a.hidden).map(a => { const r = db.releases.find(x => x.id === a.releaseId); return { ...a, release: r && { id: r.id, packageName: a.packageName, versionName: r.versionName, versionCode: r.versionCode, minSdk: r.minSdk, size: r.size, sha256: r.sha256, signers: r.signers, publishedAt: r.publishedAt, downloadPath: '/api/files/' + r.id + '.apk' } }; });
  const publicStats = () => ({ apps: latest(), members: db.members.map(({ tokenHash, ...m }) => m), invitations: db.invitations.map(({ tokenHash, ...i }) => i), toolsReady: Boolean(tools?.javaHome && tools?.buildTools), publicUrl, github:{configuration:githubConfig(),lastPublication:db.githubPublication||null,dirty:db.githubFingerprint!==catalogFingerprint(),busy:githubBusy}, storeApkReady: existsSync(path.join(root, 'build', 'cercle.apk')) });
  const cookie = value => 'cercle_admin=' + value + '; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=28800' + (secure ? '; Secure' : '');
  const staticFiles = new Map([['/', 'index.html'], ['/admin', 'admin.html'], ['/demo', 'demo.html'], ['/rejoindre', 'join.html'], ['/styles.css', 'styles.css'], ['/admin.js', 'admin.js'], ['/demo.js', 'demo.js'], ['/join.js', 'join.js'], ['/mark.svg', 'mark.svg']]);
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    let uploaded;
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      const method = req.method;
      if (method === 'GET' && pathname === '/api/health') return json(res, 200, { ok: true, name: 'Cercle', version: '0.1.0' });
      if (method === 'POST' && pathname === '/api/admin/login') {
        origin(req); checkRate(req, 'login', 8);
        const input = await body(req);
        if (typeof input.password !== 'string' || input.password.length > 512) fail(401, 'Mot de passe incorrect.');
        const candidate = scryptSync(input.password, db.admin.salt, 32).toString('hex');
        if (!safeEqual(candidate, db.admin.passwordHash)) fail(401, 'Mot de passe incorrect.');
        const value = token(), csrf = token(), expires = Date.now() + 8 * 3600000;
        mutate(d => { d.sessions = d.sessions.filter(s => s.expires > Date.now()); d.sessions.push({ hash: hash(value), csrf, expires }); });
        res.setHeader('Set-Cookie', cookie(value)); return json(res, 200, { csrf });
      }
      if (method === 'GET' && pathname === '/api/admin/github/status') { session(req); return json(res,200,{...await githubStatus(tools),configuration:githubConfig()}); }
      if (method === 'POST' && (pathname === '/api/admin/github/prepare' || pathname === '/api/admin/github/publish')) {
        adminWrite(req); const input=await body(req); if(githubBusy) fail(409,'Une publication GitHub est déjà en cours.');
        const publish=pathname.endsWith('/publish');if(publish&&input.confirmPublic!==true)fail(400,'Confirmez que les APK et le catalogue seront publics.');
        githubBusy=true;
        try { const fingerprint=catalogFingerprint(); const prepared=await preparePublication({root,dataDir,db:structuredClone(db),tools});
          if(!publish)return json(res,200,{prepared:true,apps:prepared.manifest.apps,repository:prepared.config.repository,preview:'/github-preview/',directory:prepared.output});
          const auth=await githubStatus(tools);if(!auth.ready)fail(409,auth.message);
          const result=await publishGitHub({root,prepared,tools});mutate(d=>{d.githubRevision=result.revision;d.githubPublication={...result,publishedAt:Date.now()};d.githubFingerprint=fingerprint;});
          return json(res,202,result);
        } finally { githubBusy=false; }
      }
      if (method === 'GET' && pathname === '/api/admin/session') { const s = session(req); return json(res, 200, { csrf: s.csrf, ...publicStats() }); }
      if (method === 'POST' && pathname === '/api/admin/logout') { const s = adminWrite(req); mutate(d => { d.sessions = d.sessions.filter(x => x.hash !== s.hash); }); res.setHeader('Set-Cookie', cookie('') + '; Max-Age=0'); return json(res, 200, { ok: true }); }
      if (method === 'POST' && pathname === '/api/admin/password') { adminWrite(req); const input = await body(req); if (typeof input.password !== 'string' || input.password.length < 14 || input.password.length > 256) fail(400, 'Choisis un mot de passe de 14 caractères minimum.'); const salt = randomBytes(16).toString('hex'), passwordHash = scryptSync(input.password, salt, 32).toString('hex'); mutate(d => { d.admin = { salt, passwordHash }; d.sessions = []; }); try { unlinkSync(path.join(dataDir, 'premier-acces-admin.txt')); } catch {} res.setHeader('Set-Cookie', cookie('') + '; Max-Age=0'); return json(res, 200, { ok: true }); }
      if (method === 'POST' && pathname === '/api/admin/invitations') {
        adminWrite(req); const input = await body(req); const name = clean(input.name, 80); if (!name) fail(400, 'Indique le prénom de la personne.');
        if (!secure && !options.testing) fail(400, 'Configure une adresse HTTPS avant de créer une invitation pour un téléphone.');
        const value = token(), id = randomUUID(), expires = Date.now() + 7 * 86400000;
        mutate(d => d.invitations.push({ id, name, tokenHash: hash(value), expires, createdAt: Date.now(), used: false, revoked: false }));
        return json(res, 201, { id, name, expires, url: publicUrl + '/rejoindre#code=' + value });
      }
      if (method === 'POST' && pathname === '/api/admin/revoke') { adminWrite(req); const { id } = await body(req); mutate(d => { const m = d.members.find(x => x.id === id); const i = d.invitations.find(x => x.id === id); if (!m && !i) fail(404, 'Cet accès est introuvable.'); if (m) m.revoked = true; if (i) { i.revoked = true; for (const linked of d.members.filter(x => x.invitationId === id)) linked.revoked = true; } }); return json(res, 200, { ok: true }); }
      if (method === 'POST' && pathname === '/api/join') {
        checkRate(req, 'join', 20); const { invitationToken } = await body(req); if (typeof invitationToken !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(invitationToken)) fail(400, 'Ce lien d’invitation est incomplet.');
        const value = token(); const result = mutate(d => { const invite = d.invitations.find(x => safeEqual(x.tokenHash, hash(invitationToken))); if (!invite || invite.used || invite.revoked || invite.expires < Date.now()) fail(401, 'Cette invitation a expiré ou a déjà été utilisée.'); invite.used = true; const m = { id: randomUUID(), name: invite.name, invitationId: invite.id, tokenHash: hash(value), joinedAt: Date.now(), expires: Date.now() + 365 * 86400000, revoked: false }; d.members.push(m); return { name: m.name, expires: m.expires }; });
        return json(res, 200, { ...result, token: value, publicKey: db.publicKey, storeName: 'Cercle' });
      }
      if (method === 'GET' && pathname === '/api/catalog') { member(req); const payload = Buffer.from(JSON.stringify({ schema: 1, name: 'Cercle', generatedAt: Date.now(), apps: latest() })); return json(res, 200, { payload: payload.toString('base64'), signature: sign('sha256', payload, privateKey).toString('base64') }); }
      if (method === 'GET' && /^\/api\/files\/[a-f0-9-]{36}\.apk$/.test(pathname)) {
        member(req); const id = pathname.split('/').pop().slice(0, -4); const release = db.releases.find(x => x.id === id); if (!release || db.apps.find(a => a.packageName === release.packageName)?.hidden) fail(404, 'Cette version n’est plus disponible.');
        const file = path.join(dataDir, 'apks', release.sha256 + '.apk'); if (!existsSync(file)) fail(404, 'Le fichier de cette version est absent.');
        res.writeHead(200, { 'Content-Type': 'application/vnd.android.package-archive', 'Content-Length': statSync(file).size, 'Content-Disposition': 'attachment; filename="' + release.packageName + '-' + release.versionCode + '.apk"' }); await pipeline(createReadStream(file), res); return;
      }
      if (method === 'POST' && pathname === '/api/admin/uploads') {
        adminWrite(req); checkRate(req, 'uploads', 30, 3600000);
        if (req.headers['content-type']?.split(';')[0] !== 'application/vnd.android.package-archive') fail(415, 'Choisis un fichier APK.');
        const max = 200 * 1024 * 1024; if (Number(req.headers['content-length']) > max) fail(413, 'La taille maximale est de 200 Mo.');
        const id = randomUUID(); uploaded = path.join(dataDir, 'uploads', id + '.apk'); let size = 0;
        await pipeline(req, new Transform({ transform(chunk, encoding, callback) { size += chunk.length; callback(size > max ? Object.assign(new Error('La taille maximale est de 200 Mo.'), { status: 413 }) : null, chunk); } }), createWriteStream(uploaded, { flags: 'wx', mode: 0o600 }));
        if (!size) fail(400, 'Ce fichier est vide.');
        const info = await inspectApk(uploaded, tools);
        mutate(d => { d.uploads.push({ id, ...info, uploadedAt: Date.now() }); }); uploaded = undefined;
        return json(res, 201, { id, ...info });
      }
      if (method === 'POST' && pathname === '/api/admin/publish') {
        adminWrite(req); const input = await body(req); const draft = db.uploads.find(x => x.id === input.uploadId); if (!draft) fail(404, 'Ajoute d’abord ton APK.');
        const name = clean(input.name || draft.name, 80), description = clean(input.description, 2000), category = clean(input.category, 40), license = clean(input.license, 80), sourceUrl = clean(input.sourceUrl, 500), changelog = clean(input.changelog, 1200);
        if (!name || !description || !license) fail(400, 'Complète le nom, la description et la licence.');
        if (sourceUrl) { let u; try { u = new URL(sourceUrl); } catch { fail(400, 'Le lien du code source est invalide.'); } if (u.protocol !== 'https:' || u.username || u.password) fail(400, 'Le lien du code source doit utiliser HTTPS.'); }
        const currentApp = db.apps.find(x => x.packageName === draft.packageName); const previous = db.releases.filter(x => x.packageName === draft.packageName).sort((a,b) => b.versionCode - a.versionCode)[0];
        if (previous && previous.versionCode >= draft.versionCode) fail(409, 'Augmente le numéro interne de version (versionCode) de ton application.');
        if (previous && previous.signers.join(',') !== draft.signers.join(',')) fail(409, 'La clé de signature a changé. Publie une version signée avec la clé précédente.');
        const source = path.join(dataDir, 'uploads', draft.id + '.apk'), destination = path.join(dataDir, 'apks', draft.sha256 + '.apk');
        if (!existsSync(source)) fail(404, 'Ajoute à nouveau cet APK.');
        renameSync(source, destination);
        const release = { ...draft, id: randomUUID(), changelog, publishedAt: Date.now() }; delete release.name; delete release.uploadedAt;
        mutate(d => { d.releases.push(release); const a = { id: currentApp?.id || randomUUID(), packageName: draft.packageName, name, description, category: category || 'Pratique', license, sourceUrl, releaseId: release.id, updatedAt: Date.now(), hidden: false }; const index = d.apps.findIndex(x => x.packageName === a.packageName); if (index < 0) d.apps.push(a); else d.apps[index] = a; d.uploads = d.uploads.filter(x => x.id !== draft.id); });
        return json(res, 201, { ok: true, ...publicStats() });
      }
      if (method === 'POST' && pathname === '/api/admin/visibility') { adminWrite(req); const input = await body(req); if (typeof input.hidden !== 'boolean') fail(400, 'Visibilité invalide.'); mutate(d => { const app = d.apps.find(x => x.id === input.id); if (!app) fail(404, 'Application introuvable.'); app.hidden = input.hidden; }); return json(res, 200, { ok: true }); }
      if (method === 'GET' && pathname === '/download/cercle.apk') { const file = path.join(root, 'build', 'cercle.apk'); if (!existsSync(file)) fail(404, 'L’APK du store n’a pas encore été ajouté au serveur.'); res.writeHead(200, { 'Content-Type': 'application/vnd.android.package-archive', 'Content-Length': statSync(file).size, 'Content-Disposition': 'attachment; filename="cercle.apk"' }); await pipeline(createReadStream(file), res); return; }
      if(method==='GET'&&pathname.startsWith('/github-preview/')) { const name=pathname==='/github-preview/'?'index.html':pathname.slice('/github-preview/'.length);if(!['index.html','catalog.json','store.json','styles.css','catalog.js','mark.svg'].includes(name))fail(404,'Page introuvable.');const file=path.join(root,'build','github-export','pages',name);if(!existsSync(file))fail(404,'Préparez d’abord le catalogue pour GitHub.');const type=name.endsWith('.json')?'application/json':name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':'text/html';res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});res.end(readFileSync(file));return; }
      if ((method === 'GET' || method === 'HEAD') && staticFiles.has(pathname)) {
        const name = staticFiles.get(pathname), file = path.join(root, 'public', name);
        const type = name.endsWith('.css') ? 'text/css' : name.endsWith('.js') ? 'text/javascript' : name.endsWith('.svg') ? 'image/svg+xml' : 'text/html';
        res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' }); if (method === 'HEAD') res.end(); else res.end(readFileSync(file)); return;
      }
      fail(404, 'Cette page est introuvable.');
    } catch (error) {
      if (uploaded) try { unlinkSync(uploaded); } catch {}
      if (res.headersSent || res.destroyed) { res.destroy(); return; }
      json(res, error.status || 500, { error: error.status ? error.message : 'Une erreur est survenue. Réessaie dans un instant.' });
    }
  });
  server.requestTimeout = 180000; server.headersTimeout = 20000; server.maxHeadersCount = 64;
  return { server, dataDir, publicUrl, getState: () => structuredClone(db), recordGitHubPublication: (result) => mutate(d => { d.githubRevision=result.revision;d.githubPublication={...result,publishedAt:Date.now()};d.githubFingerprint=catalogFingerprint(); }) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server, dataDir, publicUrl } = createStore();
  const port = Number(process.env.PORT || 8787), host = process.env.HOST || '127.0.0.1';
  server.listen(port, host, () => { console.log('Cercle : ' + publicUrl + '/admin'); console.log('Premier accès : consulte le fichier privé ' + path.join(dataDir, 'premier-acces-admin.txt')); });
}
