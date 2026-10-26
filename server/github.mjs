import fs from 'node:fs';
import path from 'node:path';
import {createHash, createPrivateKey, createPublicKey, sign} from 'node:crypto';
import {spawn} from 'node:child_process';
import {inspectApk} from './apk.mjs';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function readConfig(root){
 const config=JSON.parse(fs.readFileSync(path.join(root,'github-store.json'),'utf8').replace(/^\uFEFF/,''));
 if(!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(config.repository))throw new Error('Le dépôt GitHub est invalide.');
 const [owner,repo]=config.repository.split('/');
 if(repo==='.'||repo==='..')throw new Error('Nom de dépôt invalide.');
 const expected='https://'+owner.toLowerCase()+'.github.io/'+encodeURIComponent(repo)+'/';
 if(config.pagesUrl!==expected)throw new Error('L’adresse GitHub Pages ne correspond pas au dépôt.');
 if(config.schema!==1||!Number.isSafeInteger(config.storeVersionCode)||config.storeVersionCode<1||typeof config.storeVersion!=='string')throw new Error('Configuration GitHub incomplète.');
 const key=createPublicKey({key:Buffer.from(config.publicKey,'base64'),format:'der',type:'spki'});
 if(key.asymmetricKeyType!=='ec'||key.asymmetricKeyDetails?.namedCurve!=='prime256v1')throw new Error('Clé publique de catalogue invalide.');
 return config;
}
export function buildStamp(root,apk,versionCode,versionName){const configFile=path.join(root,'github-store.json');const value={apkSha256:sha(fs.readFileSync(apk)),configSha256:fs.existsSync(configFile)?sha(fs.readFileSync(configFile)):null,versionCode:Number(versionCode),versionName};fs.writeFileSync(apk+'.build.json',JSON.stringify(value,null,2));return value;}
export async function preparePublication({root,dataDir,db,tools}){
 const config=readConfig(root),key=createPrivateKey(fs.readFileSync(path.join(dataDir,'catalog-private.pem')));
 const pub=createPublicKey(key).export({type:'spki',format:'der'}).toString('base64');
 if(pub!==config.publicKey||pub!==db.publicKey)throw new Error('La clé locale ne correspond pas à celle intégrée au store. Restaurez votre sauvegarde.');
 const storeApk=path.join(root,'build','cercle.apk');
 if(!fs.existsSync(storeApk)||!fs.existsSync(storeApk+'.build.json'))throw new Error('Compilez le store GitHub avant la première publication.');
 const stamp=JSON.parse(fs.readFileSync(storeApk+'.build.json','utf8'));
 if(stamp.apkSha256!==sha(fs.readFileSync(storeApk))||stamp.configSha256!==sha(fs.readFileSync(path.join(root,'github-store.json'))))throw new Error('Le store doit être recompilé avec la configuration GitHub actuelle.');
 const store=await inspectApk(storeApk,tools);
 if(store.packageName!=='fr.zachiran.cercle'||store.versionCode!==config.storeVersionCode||store.versionName!==config.storeVersion)throw new Error('La version de l’APK Cercle ne correspond pas à la configuration.');
 const output=path.join(root,'build','github-export'),pages=path.join(output,'pages');
 fs.mkdirSync(pages,{recursive:true});
 const releases=[],apps=[];
 async function append(app,info,file,isStore=false){
  const actual=await inspectApk(file,tools);
  if(actual.sha256!==info.sha256||actual.packageName!==info.packageName||actual.versionCode!==info.versionCode||actual.signers.join(',')!==info.signers.join(','))throw new Error('Un fichier local ne correspond plus au catalogue : '+app.name);
  const tag=isStore?'store-v'+config.storeVersion:'app-'+info.packageName+'-v'+info.versionCode;
  const fileName=isStore?'Cercle.apk':info.packageName+'-'+info.versionCode+'.apk';
  const directory=path.join(output,'releases',tag);fs.mkdirSync(directory,{recursive:true});const target=path.join(directory,fileName);fs.copyFileSync(file,target);
  const downloadUrl='https://github.com/'+config.repository+'/releases/download/'+encodeURIComponent(tag)+'/'+encodeURIComponent(fileName);
  const release={id:tag,packageName:info.packageName,versionCode:info.versionCode,versionName:info.versionName,minSdk:info.minSdk,size:info.size,sha256:info.sha256,signers:info.signers,publishedAt:info.publishedAt||Date.now(),downloadUrl};
  apps.push({id:app.id||info.packageName,packageName:info.packageName,name:app.name,description:app.description,category:app.category||'Pratique',license:app.license,sourceUrl:app.sourceUrl||'',release});
  releases.push({tag,name:app.name+' '+info.versionName,fileName,file:target,sha256:info.sha256,size:info.size,url:downloadUrl,isStore});
 }
 for(const app of db.apps.filter(a=>!a.hidden)){
  if(app.packageName===store.packageName)continue;
  const release=db.releases.find(r=>r.id===app.releaseId);if(!release)throw new Error('Une version locale est introuvable.');
  await append(app,release,path.join(dataDir,'apks',release.sha256+'.apk'));
 }
 await append({name:'Cercle',description:'Le petit store pour retrouver les applications de votre proche.',category:'Le store',license:'MIT',sourceUrl:'https://github.com/'+config.repository},store,storeApk,true);
 const revision=Math.max(Date.now(),(db.githubRevision||0)+1);
 const catalog={schema:2,revision,name:'Cercle',repository:config.repository,generatedAt:Date.now(),apps};
 const payload=Buffer.from(JSON.stringify(catalog));
 const envelope={payload:payload.toString('base64'),signature:sign('sha256',payload,key).toString('base64')};
 fs.writeFileSync(path.join(pages,'catalog.json'),JSON.stringify(envelope));
 fs.writeFileSync(path.join(pages,'store.json'),JSON.stringify({name:'Cercle',repository:config.repository,apkUrl:releases.find(r=>r.isStore).url,catalogUrl:config.pagesUrl+'catalog.json',publicKey:config.publicKey}));
 for(const [source,name] of [['github.html','index.html'],['github.js','catalog.js'],['styles.css','styles.css'],['mark.svg','mark.svg']]){const origin=path.join(root,'public',source),destination=path.join(pages,name);if(name==='index.html'){const html=fs.readFileSync(origin,'utf8').replace('./styles.css','./styles.css?v='+revision).replace('./catalog.js','./catalog.js?v='+revision);fs.writeFileSync(destination,html);}else fs.copyFileSync(origin,destination);}
 fs.writeFileSync(path.join(pages,'.nojekyll'),'');
 const manifest={repository:config.repository,pagesUrl:config.pagesUrl,revision,apps:apps.length-1,releases,preparedAt:Date.now()};
 fs.writeFileSync(path.join(output,'publication.json'),JSON.stringify(manifest,null,2));
 return {config,output,pages,manifest};
}
export function command(binary,args,{cwd,input,env=process.env,maxBytes=2*1024*1024}={}){
 return new Promise((resolve,reject)=>{const child=spawn(binary,args,{cwd,env,windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='',size=0;const timer=setTimeout(()=>{child.kill();reject(new Error('La commande GitHub a dépassé le délai autorisé.'));},180000);child.stdout.on('data',b=>{size+=b.length;if(size>maxBytes){child.kill();reject(new Error('Réponse GitHub trop volumineuse.'));}else out+=b;});child.stderr.on('data',b=>{if(err.length<16000)err+=b;});child.on('error',e=>{clearTimeout(timer);reject(new Error(e.code==='ENOENT'?'GitHub CLI ou Git est introuvable. Consultez le guide de configuration.':e.message));});child.on('close',code=>{clearTimeout(timer);if(code===0)resolve(out.trim());else reject(new Error(err.trim()||'La commande GitHub a échoué.'));});child.stdin.on('error',()=>{});child.stdin.end(input||'');});
}
export async function githubStatus(tools){const gh=process.env.CERCLE_GH_PATH||tools?.ghExecutable||'gh';try{await command(gh,['auth','status','--hostname','github.com'],{env:{...process.env,...(tools?.ghConfigDir?{GH_CONFIG_DIR:tools.ghConfigDir}:{})}});return {ready:true};}catch{return {ready:false,message:'Connectez GitHub CLI à votre compte pour publier.'};}}
export async function publishGitHub({root,prepared,tools}){
 const config=prepared.config,gh=process.env.CERCLE_GH_PATH||tools?.ghExecutable||'gh';
 const ghEnv={...process.env,...(tools?.ghConfigDir?{GH_CONFIG_DIR:tools.ghConfigDir}:{})};
 await command(gh,['auth','status','--hostname','github.com'],{env:ghEnv});
 const api=async(endpoint,method='GET',body)=>{const output=await command(gh,['api','--hostname','github.com','--method',method,endpoint,...(body?['--input','-']:[])],{input:body?JSON.stringify(body):undefined,env:ghEnv});return output?JSON.parse(output):null;};
 const user=await api('user');if(user.login.toLowerCase()!==config.repository.split('/')[0].toLowerCase())throw new Error('Le compte GitHub connecté ne correspond pas au propriétaire du store.');
 let repository;try{repository=await api('repos/'+config.repository);}catch(error){if(!/404|Not Found/.test(error.message))throw error;await command(gh,['repo','create',config.repository,'--public','--description','Cercle — applications Android gratuites et open source, entre proches.'],{env:ghEnv});repository=await api('repos/'+config.repository);}
 if(repository.private)throw new Error('Le dépôt doit être public pour cette configuration GitHub Pages gratuite.');
 const branch=repository.default_branch||'main';if(!/^[A-Za-z0-9._/-]+$/.test(branch))throw new Error('Nom de branche non pris en charge.');
 let head=null;try{head=await api('repos/'+config.repository+'/git/ref/heads/'+encodeURIComponent(branch));}catch(error){if(!/404|409|empty|Not Found/i.test(error.message))throw error;}
 if(head){let existing;try{existing=await api('repos/'+config.repository+'/contents/github-store.json?ref='+encodeURIComponent(branch));}catch{throw new Error('Ce dépôt contient déjà un autre projet. Choisissez un nouveau dépôt pour Cercle.');}const remote=JSON.parse(Buffer.from(existing.content,'base64').toString('utf8'));if(remote.publicKey!==config.publicKey||remote.repository!==config.repository)throw new Error('Le dépôt existant ne correspond pas à la clé de ce store.');}
 const allowed=['android','server','public','scripts','tests','package.json','README.md','VALIDATION.md','LICENSE','.gitignore','.toolchain.example.json','github-store.json','DEMARRER.cmd','CONNECTER-GITHUB.cmd'];
 function sourceFiles(){const files=[];function walk(item){const full=path.join(root,item),stat=fs.lstatSync(full);if(stat.isSymbolicLink())throw new Error('Lien symbolique refusé dans les sources.');if(stat.isDirectory()){for(const name of fs.readdirSync(full))walk(item+'/'+name);}else files.push(item.replaceAll('\\','/'));}for(const item of allowed)if(fs.existsSync(path.join(root,item)))walk(item);return files;}
 async function commit(files,message,includePages){const entries=[];for(const file of files){const bytes=fs.readFileSync(path.join(root,file));if(/-{5}BEGIN (?:EC |RSA |OPENSSH )?PRIVATE KEY-{5}/.test(bytes.toString('utf8')))throw new Error('Une clé privée a été détectée dans les sources.');const blob=await api('repos/'+config.repository+'/git/blobs','POST',{content:bytes.toString('base64'),encoding:'base64'});entries.push({path:file,mode:'100644',type:'blob',sha:blob.sha});}if(includePages)for(const name of fs.readdirSync(prepared.pages)){const blob=await api('repos/'+config.repository+'/git/blobs','POST',{content:fs.readFileSync(path.join(prepared.pages,name)).toString('base64'),encoding:'base64'});entries.push({path:'docs/'+name,mode:'100644',type:'blob',sha:blob.sha});}
  const baseTree=head?(await api('repos/'+config.repository+'/git/commits/'+head.object.sha)).tree.sha:undefined;
  const tree=await api('repos/'+config.repository+'/git/trees','POST',{...(baseTree?{base_tree:baseTree}:{}),tree:entries});
  const result=await api('repos/'+config.repository+'/git/commits','POST',{message,tree:tree.sha,parents:head?[head.object.sha]:[]});
  if(head)await api('repos/'+config.repository+'/git/refs/heads/'+encodeURIComponent(branch),'PATCH',{sha:result.sha,force:false});else await api('repos/'+config.repository+'/git/refs','POST',{ref:'refs/heads/'+branch,sha:result.sha});head={object:{sha:result.sha}};return result.sha;
 }
 if(!head){await api('repos/'+config.repository+'/contents/github-store.json','PUT',{message:'Initialiser Cercle pour GitHub Pages',content:fs.readFileSync(path.join(root,'github-store.json')).toString('base64'),branch});head=await api('repos/'+config.repository+'/git/ref/heads/'+encodeURIComponent(branch));}
 for(const release of prepared.manifest.releases){let remote;try{remote=await api('repos/'+config.repository+'/releases/tags/'+encodeURIComponent(release.tag));}catch(error){if(!/404|Not Found/.test(error.message))throw error;remote=await api('repos/'+config.repository+'/releases','POST',{tag_name:release.tag,target_commitish:head.object.sha,name:release.name,draft:true,prerelease:release.isStore,body:'APK signé publié depuis Cercle. SHA-256 : '+release.sha256});}
  const existing=remote.assets?.find(a=>a.name===release.fileName);
  if(existing){if(existing.digest!=='sha256:'+release.sha256)throw new Error('Un fichier différent existe déjà pour '+release.tag+'. Augmentez le numéro de version, sans remplacer l’ancien APK.');}
  else await command(gh,['release','upload',release.tag,release.file,'--repo',config.repository],{env:ghEnv});
  const checked=await api('repos/'+config.repository+'/releases/'+remote.id);if(checked.assets?.find(a=>a.name===release.fileName)?.digest!=='sha256:'+release.sha256)throw new Error('Le fichier envoyé ne correspond pas à l’APK local.');
  if(remote.draft)await api('repos/'+config.repository+'/releases/'+remote.id,'PATCH',{draft:false});
 }
 const commitSha=await commit(sourceFiles(),'Publier le catalogue Cercle '+prepared.manifest.revision,true);
 let site;try{site=await api('repos/'+config.repository+'/pages');if(site.build_type!=='legacy'||site.source?.branch!==branch||site.source?.path!=='/docs'){await api('repos/'+config.repository+'/pages','PUT',{build_type:'legacy',source:{branch,path:'/docs'}});site=await api('repos/'+config.repository+'/pages');}}catch(error){if(!/404|Not Found/.test(error.message))throw error;site=await api('repos/'+config.repository+'/pages','POST',{build_type:'legacy',source:{branch,path:'/docs'}});}
 return {repository:config.repository,url:site.html_url||config.pagesUrl,commitSha,revision:prepared.manifest.revision,status:'building',apps:prepared.manifest.apps};
}
