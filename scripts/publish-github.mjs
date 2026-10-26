import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createStore} from '../server/main.mjs';import {preparePublication,publishGitHub} from '../server/github.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dataDir=process.env.CERCLE_DATA_DIR||path.join(root,'data');
const toolFile=process.env.CERCLE_TOOLCHAIN||path.join(root,'.toolchain.json');const tools=JSON.parse(fs.readFileSync(toolFile,'utf8').replace(/^\uFEFF/,''));const app=createStore({dataDir});
const prepared=await preparePublication({root,dataDir,db:app.getState(),tools});
if(process.argv.includes('--publish')){const result=await publishGitHub({root,prepared,tools});app.recordGitHubPublication(result);console.log(JSON.stringify(result,null,2));}
else console.log(JSON.stringify({prepared:true,directory:prepared.output,repository:prepared.config.repository,apps:prepared.manifest.apps,note:'Aucun fichier envoyé. Ajouter --publish pour publier sur le dépôt public.'},null,2));
