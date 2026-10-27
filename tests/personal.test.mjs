import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {command} from '../server/github.mjs';
const root=path.resolve(import.meta.dirname,'..');
test('ajouts GitHub : consentement local, isolation, mises à jour et refus des identités modifiées',async()=>{
 const tools=JSON.parse(fs.readFileSync(path.join(root,'.toolchain.json'),'utf8')),jar=path.join(root,'build/test-json.jar');
 const expected='3ea61b2a06e31edf1c91134fe9106b0ebb16628be169f3db75bc7a2b06b45796';
 if(!fs.existsSync(jar)){const response=await fetch('https://repo.maven.apache.org/maven2/org/json/json/20250517/json-20250517.jar');if(!response.ok)throw Error('Dépendance de test JSON indisponible');const bytes=Buffer.from(await response.arrayBuffer());assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);fs.writeFileSync(jar,bytes);}
 assert.equal(createHash('sha256').update(fs.readFileSync(jar)).digest('hex'),expected);
 const temp=fs.mkdtempSync(path.join(root,'build','personal-test-'));
 try{
 const files={
  'fr/zachiran/cercle/ExternalCatalogChecks.java':fs.readFileSync(path.join(root,'tests/ExternalCatalogChecks.java'),'utf8'),
  'fr/zachiran/cercle/SharedUpdatesChecks.java':fs.readFileSync(path.join(root,'tests/SharedUpdatesChecks.java'),'utf8'),
  'android/os/Build.java':'package android.os;public class Build{public static class VERSION{public static int SDK_INT=35;}}',
  'android/content/Context.java':'package android.content;import android.content.pm.PackageManager;import java.io.File;import java.util.*;public class Context{public PackageManager pm=new PackageManager();public Map<String,String> values=new HashMap<>();public File cache;public Context(File dir){cache=dir;dir.mkdirs();}public PackageManager getPackageManager(){return pm;}public File getCacheDir(){return cache;}public String getPackageName(){return "fr.zachiran.cercle";}}',
  'android/content/pm/PackageManager.java':'package android.content.pm;public class PackageManager{public static final int GET_SIGNING_CERTIFICATES=1,GET_SIGNATURES=2;public PackageInfo info,archive;public PackageInfo getPackageInfo(String p,int flags)throws NameNotFoundException{if(info==null||!p.equals(info.packageName))throw new NameNotFoundException();return info;}public PackageInfo getPackageArchiveInfo(String p,int flags){return archive;}public static class NameNotFoundException extends Exception{}}',
  'android/content/pm/PackageInfo.java':'package android.content.pm;public class PackageInfo{public String packageName,versionName;public String[] splitNames;public int versionCode;public ApplicationInfo applicationInfo=new ApplicationInfo();public SigningInfo signingInfo;public Signature[] signatures;public long getLongVersionCode(){return versionCode;}}',
  'android/content/pm/ApplicationInfo.java':'package android.content.pm;public class ApplicationInfo{public int minSdkVersion=24;public String sourceDir,publicSourceDir;public CharSequence loadLabel(PackageManager p){return "Reader";}}',
  'android/content/pm/SigningInfo.java':'package android.content.pm;public class SigningInfo{public Signature[] certs;public Signature[] getApkContentsSigners(){return certs;}}',
  'android/content/pm/Signature.java':'package android.content.pm;public class Signature{String value;public Signature(String s){value=s;}public byte[] toByteArray(){return value.getBytes(java.nio.charset.StandardCharsets.UTF_8);}}',
  'fr/zachiran/cercle/Access.java':'package fr.zachiran.cercle;import android.content.Context;final class Access{static Prefs prefs(Context c){return new Prefs(c);}static class Prefs{Context c;Prefs(Context x){c=x;}String getString(String k,String fallback){return c.values.getOrDefault(k,fallback);}Editor edit(){return new Editor(c);}}static class Editor{Context c;String key,value;Editor(Context x){c=x;}Editor putString(String k,String v){key=k;value=v;return this;}boolean commit(){c.values.put(key,value);return true;}}}',
  'fr/zachiran/cercle/Api.java':[
   'package fr.zachiran.cercle;import org.json.*;import java.net.*;import java.io.*;import java.util.*;final class Api{',
   'static JSONObject catalog;static JSONObject cached(android.content.Context c){return catalog;}static int downloads;static byte[] data="apk-fixture".getBytes(java.nio.charset.StandardCharsets.UTF_8);static Map<String,String> json=new HashMap<>();static Map<String,Integer> codes=new HashMap<>();',
   'static HttpURLConnection open(String u)throws Exception{if(!json.containsKey(u)&&!codes.containsKey(u))throw new IOException("Missing endpoint "+u);return new Fake(u,json.getOrDefault(u,"{}").getBytes(java.nio.charset.StandardCharsets.UTF_8),codes.getOrDefault(u,200));}',
   'static HttpURLConnection personalDownload(String url,String repo)throws Exception{GitHubSourcePolicy.download(url,repo);downloads++;return new Fake(url,data,200);}',
   'static HttpURLConnection externalDownload(android.content.Context c,JSONObject app)throws Exception{return personalDownload(app.getJSONObject("release").getString("downloadUrl"),CatalogApps.repository(app));}',
   'static HttpURLConnection download(android.content.Context c,String url)throws Exception{throw new AssertionError("Shared path should not be used");}',
   'static class Fake extends HttpURLConnection{byte[] body;int status;Fake(String u,byte[] b,int s)throws Exception{super(new URL(u));body=b;status=s;}public int getResponseCode(){return status;}public InputStream getInputStream(){return new ByteArrayInputStream(body);}public void disconnect(){}public boolean usingProxy(){return false;}public void connect(){}}}'
  ].join('\n'),
  'fr/zachiran/cercle/PersonalTest.java':[
   'package fr.zachiran.cercle;import android.content.Context;import android.content.pm.*;import org.json.*;import java.io.*;import java.util.*;',
   'public class PersonalTest{static int checks;interface Task{void run()throws Exception;}static void ok(boolean b){checks++;if(!b)throw new AssertionError("Check "+checks);}static void reject(Task t)throws Exception{checks++;try{t.run();}catch(IOException e){return;}throw new AssertionError("Expected refusal "+checks);}',
   'static PackageInfo pkg(int v,String cert){PackageInfo p=new PackageInfo();p.packageName="app.reader";p.versionCode=v;p.versionName="1."+v;p.signatures=new Signature[]{new Signature(cert)};p.signingInfo=new SigningInfo();p.signingInfo.certs=p.signatures;return p;}',
   'static JSONObject asset(long id,String name)throws Exception{return new JSONObject().put("id",id).put("name",name).put("size",Api.data.length).put("state","uploaded");}',
   'static JSONObject release(String tag,JSONObject...assets)throws Exception{return new JSONObject().put("tag_name",tag).put("draft",false).put("prerelease",false).put("assets",new JSONArray(Arrays.asList(assets)));}',
   'public static void main(String[] args)throws Exception{File dir=new File(args[0]);Context c=new Context(new File(dir,"one")),other=new Context(new File(dir,"two"));String repo="friend/reader";',
   'ok(GitHubSourcePolicy.repository("https://github.com/friend/reader/").equals(repo));ok(GitHubSourcePolicy.repository("https://github.com/friend/reader.git").equals(repo));ok(GitHubSourcePolicy.repository(repo).equals(repo));',
   'for(String u:new String[]{"http://github.com/friend/reader","https://github.com.evil.test/friend/reader","https://friend@github.com/friend/reader","https://github.com/friend/reader?token=secret","https://github.com/friend/%2e%2e","../../bad"})reject(()->GitHubSourcePolicy.repository(u));',
   'String url=GitHubSourcePolicy.assetUrl(repo,"release/1.0","Reader arm64.apk");GitHubSourcePolicy.download(url,repo);ok(true);reject(()->GitHubSourcePolicy.download(url,"other/repo"));reject(()->GitHubSourcePolicy.assetUrl(repo,"..","a.apk"));reject(()->GitHubSourcePolicy.assetUrl(repo,"v1","../a.apk"));reject(()->DownloadPolicy.initial("https://github.com/friend/reader/releases/download/v1/reader.apk","Zachiran42/cercle-store"));',
   'ok(GitHubSourcePolicy.family("reader-v1.2.3-arm64.apk").equals(GitHubSourcePolicy.family("reader-v2.0.0-arm64.apk")));ok(!GitHubSourcePolicy.family("reader-v1.2-arm64.apk").equals(GitHubSourcePolicy.family("reader-v1.2-x86.apk")));',
   'JSONObject a=asset(1,"reader-1.0-arm64.apk"),r=release("v1",a);ok(PersonalApps.assets(release("v1",a,asset(3,"sources.zip"))).length()==1);reject(()->PersonalApps.assets(release("empty",asset(3,"file.aab"))));',
   'JSONObject candidate=PersonalApps.candidate(repo,r,a);c.pm.archive=pkg(5,"A");File apk=PersonalApps.fetch(c,candidate,p->{});JSONObject verified=PersonalApps.inspect(c,candidate,apk);ok(PersonalApps.all(c).length()==0);ok(verified.getJSONObject("release").getLong("versionCode")==5);ok(!PersonalApps.pending(verified));',
   'PersonalApps.save(c,verified);ok(PersonalApps.all(c).length()==1);ok(PersonalApps.all(other).length()==0);Context reopened=new Context(c.cache);reopened.values=c.values;ok(PersonalApps.all(reopened).length()==1);',
   'int before=Api.downloads;PersonalApps.fetch(c,verified,p->{});ok(Api.downloads==before);ok(PersonalApps.merge(c,new JSONArray().put(new JSONObject().put("packageName","shared.app"))).length()==2);ok(PersonalApps.merge(c,new JSONArray().put(new JSONObject().put("packageName","app.reader"))).length()==1);',
   'JSONObject badDigest=PersonalApps.candidate(repo,r,asset(2,"reader.apk").put("digest","sha256:"+String.join("",Collections.nCopies(64,"0"))));reject(()->PersonalApps.fetch(c,badDigest,p->{}));reject(()->PersonalApps.candidate(repo,r,asset(2,"reader.apk").put("digest","md5:123")));',
   'JSONObject update=PersonalApps.candidate(repo,release("v2"),asset(2,"reader-2.0-arm64.apk"));PersonalApps.recordCandidate(c,verified,update);JSONObject saved=PersonalApps.all(c).getJSONObject(0);ok(PersonalApps.pending(saved));ok(PersonalApps.signers(saved.getJSONObject("release")).equals(PersonalApps.signers(verified.getJSONObject("release"))));',
   'c.pm.archive=pkg(6,"B");File second=PersonalApps.fetch(c,saved,p->{});reject(()->PersonalApps.inspect(c,saved,second));c.pm.archive=pkg(6,"A");c.pm.archive.packageName="evil.app";reject(()->PersonalApps.inspect(c,saved,second));c.pm.archive=pkg(6,"A");c.pm.archive.packageName=c.getPackageName();reject(()->PersonalApps.inspect(c,saved,second));',
   'c.pm.archive=pkg(6,"A");c.pm.archive.splitNames=new String[]{"config.arm64"};reject(()->PersonalApps.inspect(c,saved,second));c.pm.archive=pkg(6,"A");c.pm.info=pkg(5,"B");reject(()->PersonalApps.inspect(c,saved,second));',
   'c.pm.info=pkg(5,"A");c.pm.archive=pkg(6,"A");JSONObject v6=PersonalApps.inspect(c,saved,second);PersonalApps.save(c,v6);ok(c.pm.info.versionCode==5);ok(PersonalApps.all(c).getJSONObject(0).getJSONObject("release").getLong("versionCode")==6);',
   'JSONObject next=PersonalApps.candidate(repo,release("v3"),asset(3,"reader-3.0-arm64.apk"));PersonalApps.recordCandidate(c,v6,next);JSONObject pending=PersonalApps.all(c).getJSONObject(0);c.pm.archive=pkg(6,"A");c.pm.info=pkg(6,"A");reject(()->PersonalApps.download(c,pending,p->{}));ok(!PersonalApps.pending(PersonalApps.all(c).getJSONObject(0)));',
   'JSONObject current=PersonalApps.all(c).getJSONObject(0);String endpoint="https://api.github.com/repos/"+repo+"/releases/latest";Api.json.put(endpoint,release("v4",asset(4,"reader-4.0-arm64.apk"),asset(5,"reader-4.0-x86.apk")).toString());ok(PersonalApps.refresh(c).isEmpty());JSONObject selected=PersonalApps.all(c).getJSONObject(0);ok(selected.getJSONObject("release").getString("assetName").contains("arm64"));ok(PersonalApps.pending(selected));',
   'Api.codes.put(endpoint,429);ok(!PersonalApps.refresh(c).isEmpty());ok(PersonalApps.all(c).length()==1);Api.codes.clear();Api.json.put(endpoint,release("v5",asset(6,"unrelated-a.apk"),asset(7,"unrelated-b.apk")).toString());ok(!PersonalApps.refresh(c).isEmpty());ok(PersonalApps.all(c).getJSONObject(0).getJSONObject("release").getLong("assetId")==4);',
   'JSONObject stale=PersonalApps.all(c).getJSONObject(0);PersonalApps.remove(c,"app.reader");ok(PersonalApps.all(c).length()==0);before=Api.downloads;reject(()->PersonalApps.download(c,stale,p->{}));ok(Api.downloads==before);PersonalApps.recordCandidate(c,stale,next);ok(PersonalApps.all(c).length()==0);',
   'SharedUpdatesChecks.run(new File(dir,"shared"));ExternalCatalogChecks.run(new File(dir,"external"));System.out.println("Personal app checks OK: "+checks);}}'
  ].join('\n')
 };
 for(const [p,s] of Object.entries(files)){const file=path.join(temp,p);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,s);}
 const classes=path.join(temp,'classes');fs.mkdirSync(classes);const bin=path.join(tools.javaHome,'bin');
 const native=['Packages','PersonalApps','SharedUpdates','CatalogApps','GitHubSourcePolicy','DownloadPolicy'].map(n=>path.join(root,'android/src/fr/zachiran/cercle',n+'.java'));
 await command(path.join(bin,'javac.exe'),['-encoding','UTF-8','-source','8','-target','8','-cp',jar,'-d',classes,...native,...Object.keys(files).map(p=>path.join(temp,p))]);
 const result=await command(path.join(bin,'java.exe'),['-cp',classes+path.delimiter+jar,'fr.zachiran.cercle.PersonalTest',temp]);
 assert.match(result,/Personal app checks OK: [5-9][0-9]/);assert.match(result,/Shared upstream checks OK: [4-9][0-9]/);assert.match(result,/External catalogue checks OK:/);
 }finally{assert.equal(path.dirname(path.resolve(temp)),path.join(root,'build'));assert.ok(path.basename(temp).startsWith('personal-test-'));fs.rmSync(temp,{recursive:true,force:true});}
});
