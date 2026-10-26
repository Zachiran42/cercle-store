// CLI GitHub locale de test, sans réseau ni authentification réelle.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const file=process.env.CERCLE_FAKE_STATE;if(!file)throw new Error('Préchargement réservé aux tests.');const s=JSON.parse(fs.readFileSync(file,'utf8'));const args=process.argv.slice(1);args[0]=path.basename(args[0]);const input=fs.readFileSync(0,'utf8');const body=input?JSON.parse(input):null;s.calls.push({args,body});
const output=value=>{fs.writeFileSync(file,JSON.stringify(s));if(value!==undefined)process.stdout.write(JSON.stringify(value));process.exit(0);};const missing=()=>{fs.writeFileSync(file,JSON.stringify(s));process.stderr.write('HTTP 404: Not Found');process.exit(1);};
const hash=()=>createHash('sha1').update(JSON.stringify(s.calls)).digest('hex');
if(args[0]==='auth')output({ok:true});
if(args[0]==='repo'&&args[1]==='create'){s.exists=true;output({ok:true});}
if(args[0]==='release'&&args[1]==='upload'){const release=s.releases.find(r=>r.tag_name===args[2]);if(!release)missing();const bytes=fs.readFileSync(args[3]);release.assets.push({name:path.basename(args[3]),digest:'sha256:'+createHash('sha256').update(bytes).digest('hex')});output({ok:true});}
if(args[0]!=='api')throw new Error('Commande inattendue.');const method=args[args.indexOf('--method')+1];const index=args.indexOf('--method')+2;const endpoint=args[index];if(endpoint==='user')output({login:'Zachiran42',id:274734538});
if(!s.exists)missing();const suffix=endpoint.replace(/^repos\/[^/]+\/[^/]+\/?/,'');
if(suffix==='')output({private:false,default_branch:'main'});
if(suffix==='git/ref/heads/main'){if(!s.head)missing();output({object:{sha:s.head}});}
if(suffix.startsWith('contents/github-store.json')){if(method==='PUT'){s.marker=body.content;s.head=hash();output({commit:{sha:s.head}});}if(!s.marker)missing();output({content:s.marker});}
if(suffix==='git/blobs'){const sha=hash();s.blobs[sha]=body.content;output({sha});}
if(suffix.startsWith('git/commits/'))output({tree:{sha:'base-tree'}});
if(suffix==='git/trees'){s.lastTree=body.tree;output({sha:hash()});}
if(suffix==='git/commits'){s.commits.push({sha:hash(),message:body.message,tree:s.lastTree});output({sha:hash()});}
if(suffix==='git/refs/heads/main'){if(body.force!==false)throw new Error('Forçage interdit.');s.head=body.sha;output({object:{sha:s.head}});}
if(suffix.startsWith('releases/tags/')){const release=s.releases.find(r=>r.tag_name===decodeURIComponent(suffix.slice('releases/tags/'.length)));if(!release)missing();output(release);}
if(suffix==='releases'&&method==='POST'){const release={id:s.releases.length+1,assets:[],...body};s.releases.push(release);output(release);}
if(/^releases\/\d+$/.test(suffix)){const release=s.releases.find(r=>r.id===Number(suffix.split('/')[1]));if(!release)missing();if(method==='PATCH')Object.assign(release,body);output(release);}
if(suffix==='pages'){if(method==='GET'){if(!s.pages)missing();output(s.pages);}s.pages={build_type:body.build_type,source:body.source,html_url:'https://zachiran42.github.io/cercle-store/'};if(method==='PUT')output();output(s.pages);}
throw new Error('API inattendue : '+method+' '+endpoint);
