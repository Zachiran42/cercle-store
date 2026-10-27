import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {command} from '../server/github.mjs';
const root=path.resolve(import.meta.dirname,'..');
test('le téléchargement relit la version installée avant tout accès réseau',async()=>{
 const tools=JSON.parse(fs.readFileSync(path.join(root,'.toolchain.json'),'utf8'));
 const temp=fs.mkdtempSync(path.join(root,'build','package-state-'));
 try{
  const files={
   'fr/zachiran/cercle/SharedUpdates.java':'package fr.zachiran.cercle;import android.content.Context;import org.json.JSONObject;import java.io.File;final class SharedUpdates{static File download(Context c,JSONObject a,Packages.Progress p){throw new AssertionError();}}',
   'android/os/Build.java':'package android.os; public class Build {public static class VERSION {public static int SDK_INT=35;}}',
   'android/content/Context.java':'package android.content; import android.content.pm.PackageManager; import java.io.File; public class Context {public PackageManager pm=new PackageManager();public PackageManager getPackageManager(){return pm;}public File getCacheDir(){throw new AssertionError("Cache touched before version check");}}',
   'android/content/pm/PackageManager.java':'package android.content.pm; public class PackageManager {public static final int GET_SIGNING_CERTIFICATES=1,GET_SIGNATURES=2;public PackageInfo info;public PackageInfo getPackageInfo(String p,int flags)throws NameNotFoundException{if(info==null)throw new NameNotFoundException();return info;}public PackageInfo getPackageArchiveInfo(String p,int flags){return null;}public static class NameNotFoundException extends Exception {}}',
   'android/content/pm/PackageInfo.java':'package android.content.pm; public class PackageInfo {public String packageName;public int versionCode;public long longVersion;public long getLongVersionCode(){return longVersion;}public SigningInfo signingInfo;public Signature[] signatures;}',
   'android/content/pm/SigningInfo.java':'package android.content.pm; public class SigningInfo {public Signature[] getApkContentsSigners(){return null;}}',
   'android/content/pm/Signature.java':'package android.content.pm; public class Signature {public byte[] toByteArray(){return new byte[0];}}',
   'org/json/JSONObject.java':'package org.json; import java.util.*; public class JSONObject {private Map<String,Object> values=new HashMap<>();public JSONObject put(String k,Object v){values.put(k,v);return this;}public String getString(String k){return (String)values.get(k);}public long getLong(String k){return ((Number)values.get(k)).longValue();}public JSONObject getJSONObject(String k){return (JSONObject)values.get(k);}public JSONArray getJSONArray(String k){return (JSONArray)values.get(k);}public boolean optBoolean(String k){return Boolean.TRUE.equals(values.get(k));}}',
   'org/json/JSONArray.java':'package org.json; public class JSONArray {public int length(){return 0;}public String getString(int i){return null;}}',
   'fr/zachiran/cercle/PersonalApps.java':'package fr.zachiran.cercle; import android.content.Context;import org.json.JSONObject;import java.io.File;final class PersonalApps {static boolean pending(JSONObject a){return false;}static File download(Context c,JSONObject a,Packages.Progress p){throw new AssertionError();}}',
   'fr/zachiran/cercle/Api.java':'package fr.zachiran.cercle; import android.content.Context; import java.net.HttpURLConnection; import java.io.IOException; final class Api {static HttpURLConnection externalDownload(Context c,org.json.JSONObject a){throw new AssertionError();}static int calls;static HttpURLConnection download(Context c,String url)throws Exception{calls++;throw new IOException("NETWORK_REACHED");}}',
   'fr/zachiran/cercle/PackageStateTest.java':[
    'package fr.zachiran.cercle;',
    'import android.content.Context;import android.content.pm.PackageInfo;import org.json.JSONObject;import java.io.IOException;',
    'public class PackageStateTest {',
    ' static void expect(Context c,JSONObject app,boolean network)throws Exception{Api.calls=0;try{Packages.download(c,app,p->{});throw new AssertionError("Unexpected success");}catch(IOException e){if(network){if(!"NETWORK_REACHED".equals(e.getMessage())||Api.calls!=1)throw new AssertionError("New version blocked: "+e);}else if(Api.calls!=0||!e.getMessage().contains("déjà à jour"))throw new AssertionError("Current version reached network: "+e);}}',
    ' static void version(Context c,long value){PackageInfo p=new PackageInfo();p.packageName="app.reader";p.versionCode=(int)value;p.longVersion=value;c.pm.info=p;}',
    ' public static void main(String[] args)throws Exception{Context c=new Context();JSONObject app=new JSONObject().put("packageName","app.reader").put("release",new JSONObject().put("versionCode",5L).put("downloadUrl","https://example.test/app.apk").put("size",10L));',
    ' for(int sdk:new int[]{26,35}){android.os.Build.VERSION.SDK_INT=sdk;version(c,4);expect(c,app,true);expect(c,app,true);version(c,5);expect(c,app,false);version(c,6);expect(c,app,false);c.pm.info=null;expect(c,app,true);}',
    ' android.os.Build.VERSION.SDK_INT=35;version(c,4294967297L);expect(c,app,false);System.out.println("Installed-version transitions and network guard OK");}',
    '}'
   ].join('\n')
  };
  for(const [name,value] of Object.entries(files)){const file=path.join(temp,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}
  const classes=path.join(temp,'classes');fs.mkdirSync(classes);
  const source=path.join(root,'android/src/fr/zachiran/cercle/Packages.java'),bin=path.join(tools.javaHome,'bin');
  await command(path.join(bin,'javac.exe'),['-encoding','UTF-8','-source','8','-target','8','-d',classes,source,...Object.keys(files).map(p=>path.join(temp,p))]);
  const result=await command(path.join(bin,'java.exe'),['-cp',classes,'fr.zachiran.cercle.PackageStateTest']);
  assert.match(result,/transitions and network guard OK/);
 }finally{assert.equal(path.dirname(path.resolve(temp)),path.join(root,'build'));assert.ok(path.basename(temp).startsWith('package-state-'));fs.rmSync(temp,{recursive:true,force:true});}
});
