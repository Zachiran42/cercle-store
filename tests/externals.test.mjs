import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {validateExternalCatalog} from '../server/externals.mjs';
const root=path.resolve(import.meta.dirname,'..'),input=JSON.parse(fs.readFileSync(path.join(root,'external-catalog.json'),'utf8'));
test('catalogue externe : provenance, origine officielle, identité et popularité vérifiables',()=>{
 const apps=validateExternalCatalog(input);assert.equal(apps.length,input.apps.length);assert.equal(apps.length,1);assert.ok(apps.every(a=>a.external&&a.author&&a.popularity.githubStars>=1000));assert.equal(apps[0].packageName,'app.organicmaps.web');assert.ok(apps.every(a=>!a.release.downloadUrl.includes('Zachiran42/cercle-store')));
 for(const mutate of [
 a=>a.external=false,a=>a.author='',a=>a.packageName='fr.zachiran.cercle',a=>a.release.packageName='other.app',a=>a.release.sha256='bad',a=>a.release.signers=[],a=>a.release.downloadUrl='https://github.com/evil/repo/releases/download/v1/app.apk',a=>a.sourceUrl='https://github.com.evil.test/friend/repo',a=>a.popularity.githubStars=-1,a=>a.release.size=201*1024*1024,a=>a.release.downloadUrl+='?token=bad'
 ]){const copy=structuredClone(input);mutate(copy.apps[0]);assert.throws(()=>validateExternalCatalog(copy));}
 assert.throws(()=>validateExternalCatalog(input,[{packageName:input.apps[0].packageName}]));
 const copy=structuredClone(input);copy.apps.push(copy.apps[0]);assert.throws(()=>validateExternalCatalog(copy));
});
test('site : URLs limitées au dépôt officiel et filtres distincts des créations',()=>{
 const nodes=new Map(),context=vm.createContext({URL,Uint8Array,TextDecoder,atob,fetch:()=>new Promise(()=>{}),document:{getElementById:id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);}}});
 vm.runInContext(fs.readFileSync(path.join(root,'public/github.js'),'utf8'),context);vm.runInContext('config={repository:"Zachiran42/cercle-store"}',context);
 const app=structuredClone(input.apps[0]);context.app=app;
 assert.equal(vm.runInContext('downloadUrl(app.release.downloadUrl,app)',context),app.release.downloadUrl);
 context.app={...app,sourceUrl:'https://github.com/evil/repo'};assert.throws(()=>vm.runInContext('downloadUrl(app.release.downloadUrl,app)',context));
 context.app={...app,external:false};assert.throws(()=>vm.runInContext('downloadUrl(app.release.downloadUrl,app)',context));
 context.app=app;assert.equal(vm.runInContext('matches(app,"Applications externes")',context),true);assert.equal(vm.runInContext('matches(app,"Créations du Cercle")',context),false);
});

test('publication conditionnelle : seules les décisions retenues rejoignent le catalogue',()=>{
 const review=JSON.parse(fs.readFileSync(path.join(root,'external-reviews.json'),'utf8'));
 assert.equal(review.reviews.length,10);assert.equal(review.reviews.filter(r=>r.decision==='retained').length,8);
 for(const r of review.reviews){const app=input.apps.find(a=>a.sourceUrl==='https://github.com/'+r.repository);if(r.decision==='deferred'){assert.equal(app,undefined);continue;}if(!app)continue;assert.equal(app.release.sha256,r.apkSha256);assert.equal(app.release.versionName,r.version);assert.deepEqual(app.release.signers,r.signers);assert.equal(app.review.sourceCommit,r.sourceCommit);}
});
