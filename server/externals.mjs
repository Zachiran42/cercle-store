import fs from 'node:fs';import path from 'node:path';
const bad=()=>{throw new Error('Le catalogue externe est invalide.');};
export function externalRepository(source){
 let u;try{u=new URL(source);}catch{bad();}
 if(u.protocol!=='https:'||u.hostname!=='github.com'||u.username||u.password||u.search||u.hash||!/^\/[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(u.pathname))bad();return u.pathname.slice(1);
}
export function validateExternalCatalog(input,owned=[]){
 if(input?.schema!==1||!Array.isArray(input.apps)||input.apps.length>50)bad();
 const names=new Set(owned.map(a=>a.packageName));names.add('fr.zachiran.cercle');
 return input.apps.map(a=>{
  const repo=externalRepository(a.sourceUrl),r=a.release;
  if(a.external!==true||a.personal||a.sharedUpdate||!a.author?.trim()||a.author.length>100||!a.name?.trim()||a.name.length>80||!a.description?.trim()||a.description.length>1500||!a.category?.trim()||!a.license?.trim()||!a.id||!/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(a.packageName)||names.has(a.packageName))bad();
  names.add(a.packageName);
  if(!r||r.packageName!==a.packageName||!Number.isSafeInteger(r.versionCode)||r.versionCode<1||!r.versionName||!Number.isSafeInteger(r.minSdk)||r.minSdk<1||!Number.isSafeInteger(r.size)||r.size<1||r.size>200*1024*1024||!/^[a-f0-9]{64}$/.test(r.sha256)||!Array.isArray(r.signers)||!r.signers.length||r.signers.some(s=>!/^[a-f0-9]{64}$/.test(s))||!Number.isSafeInteger(r.assetId)||r.assetId<1||!r.assetName||/[\/\\]/.test(r.assetName)||!r.assetName.endsWith('.apk'))bad();
  let url;try{url=new URL(r.downloadUrl);}catch{bad();}
  const prefix='/'+repo+'/releases/download/';
  if(url.protocol!=='https:'||url.hostname!=='github.com'||url.username||url.password||url.search||url.hash||!url.pathname.startsWith(prefix))bad();
  const tail=url.pathname.slice(prefix.length).split('/');
  if(tail.length!==2||!tail[0]||tail[0]==='.'||tail[0]==='..'||decodeURIComponent(tail[1])!==r.assetName)bad();
  if(!Number.isSafeInteger(a.popularity?.githubStars)||a.popularity.githubStars<0||!/^\d{4}-\d{2}-\d{2}$/.test(a.popularity?.checkedAt))bad();
  return structuredClone(a);
 });
}
export function readExternalCatalog(root,owned){const file=path.join(root,'external-catalog.json');return fs.existsSync(file)?validateExternalCatalog(JSON.parse(fs.readFileSync(file,'utf8')),owned):[];}
