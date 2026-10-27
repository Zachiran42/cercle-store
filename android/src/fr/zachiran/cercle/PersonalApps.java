package fr.zachiran.cercle;
import android.content.Context;
import android.content.pm.*;
import android.os.Build;
import org.json.*;
import java.io.*;
import java.net.HttpURLConnection;
import java.security.MessageDigest;
import java.util.*;

final class PersonalApps {
 static final String KEY="personalApps";static final long MAX=200L*1024*1024;
 static JSONArray copy(JSONArray a)throws Exception{return new JSONArray(a.toString());}
 static synchronized JSONArray all(Context c){try{return new JSONArray(Access.prefs(c).getString(KEY,"[]"));}catch(Exception e){return new JSONArray();}}
 static void write(Context c,JSONArray apps)throws Exception{if(!Access.prefs(c).edit().putString(KEY,apps.toString()).commit())throw new IOException("L’ajout n’a pas pu être enregistré sur ce téléphone.");}
 static boolean pending(JSONObject app){return app.optBoolean("personal")&&app.optBoolean("pendingCheck");}
 static JSONObject find(JSONArray array,String pkg){for(int i=0;i<array.length();i++){JSONObject a=array.optJSONObject(i);if(a!=null&&a.optString("packageName").equals(pkg))return a;}return null;}
 static JSONArray merge(Context c,JSONArray shared){JSONArray result=new JSONArray();Set<String> names=new HashSet<>();for(int i=0;i<shared.length();i++){JSONObject a=shared.optJSONObject(i);if(a!=null){result.put(a);names.add(a.optString("packageName"));}}JSONArray personal=all(c);for(int i=0;i<personal.length();i++){JSONObject a=personal.optJSONObject(i);if(a!=null&&!names.contains(a.optString("packageName"))&&!a.optString("packageName").equals(c.getPackageName()))result.put(a);}return result;}
 static synchronized void save(Context c,JSONObject app)throws Exception{
  JSONObject release=app.getJSONObject("release");String pkg=app.getString("packageName");
  if(pkg.equals(c.getPackageName())||release.getLong("versionCode")<1||!release.getString("sha256").matches("[0-9a-f]{64}")||release.getJSONArray("signers").length()<1||pending(app))throw new IOException("Vérifiez d’abord le fichier APK.");
  GitHubSourcePolicy.download(release.getString("downloadUrl"),app.getString("repository"));
  JSONArray apps=all(c);JSONObject existing=find(apps,pkg);
  if(existing!=null){sameIdentity(existing,app);if(existing.getJSONObject("release").optLong("versionCode")>release.getLong("versionCode"))throw new IOException("Cette publication est plus ancienne que la version déjà ajoutée.");}
  if(existing==null&&apps.length()>=20)throw new IOException("Vous pouvez suivre jusqu’à 20 applications personnelles.");
  JSONArray next=new JSONArray();for(int i=0;i<apps.length();i++)if(!apps.getJSONObject(i).optString("packageName").equals(pkg))next.put(apps.getJSONObject(i));next.put(app);write(c,next);
 }
 static synchronized void remove(Context c,String pkg)throws Exception{JSONArray next=new JSONArray(),old=all(c);for(int i=0;i<old.length();i++)if(!old.getJSONObject(i).optString("packageName").equals(pkg))next.put(old.getJSONObject(i));write(c,next);}
 static void sameIdentity(JSONObject previous,JSONObject next)throws Exception{
  if(!previous.getString("packageName").equals(next.getString("packageName"))||!previous.getString("repository").equalsIgnoreCase(next.getString("repository"))||!signers(previous.getJSONObject("release")).equals(signers(next.getJSONObject("release"))))throw new IOException("Le dépôt, l’identifiant ou le certificat de cette application a changé. La mise à jour est refusée.");
 }
 static List<String> signers(JSONObject release)throws Exception{List<String> result=new ArrayList<>();JSONArray a=release.getJSONArray("signers");for(int i=0;i<a.length();i++)result.add(a.getString(i));Collections.sort(result);return result;}
 static JSONObject json(String endpoint)throws Exception{
  if(!endpoint.startsWith("https://api.github.com/repos/"))throw new IOException("Adresse GitHub invalide.");
  HttpURLConnection con=Api.open(endpoint);con.setUseCaches(false);con.setRequestProperty("Cache-Control","no-cache");try{con.setRequestProperty("Accept","application/vnd.github+json");int status=con.getResponseCode();if(status==404)throw new FileNotFoundException("Dépôt public ou publication introuvable.");if(status==403||status==429)throw new IOException("GitHub limite les requêtes pour le moment. Réessayez plus tard.");if(status!=200)throw new IOException("GitHub est indisponible pour le moment.");ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=con.getInputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){out.write(b,0,n);if(out.size()>2*1024*1024)throw new IOException("La réponse GitHub est trop volumineuse.");}}String text=out.toString("UTF-8");return text.trim().startsWith("[")?new JSONObject().put("items",new JSONArray(text)):new JSONObject(text);}finally{con.disconnect();}
 }
 static JSONObject latest(String repo)throws Exception{
  String endpoint="https://api.github.com/repos/"+GitHubSourcePolicy.repository(repo)+"/releases";
  try{return json(endpoint+"/latest");}catch(FileNotFoundException missing){JSONArray releases=json(endpoint+"?per_page=10").getJSONArray("items");for(int i=0;i<releases.length();i++){JSONObject r=releases.getJSONObject(i);if(!r.optBoolean("draft"))return r;}throw new IOException("Ce dépôt ne publie pas encore d’APK dans GitHub Releases.");}
 }
 static JSONArray assets(JSONObject release)throws Exception{JSONArray result=new JSONArray(),raw=release.getJSONArray("assets");for(int i=0;i<raw.length();i++){JSONObject a=raw.getJSONObject(i);if(a.optString("name").toLowerCase(Locale.ROOT).endsWith(".apk")&&a.optString("state","uploaded").equals("uploaded")&&a.optLong("size")>0&&a.optLong("size")<=MAX)result.put(a);}if(result.length()==0)throw new IOException("Cette publication ne contient pas d’APK autonome. Un fichier AAB ou ZIP ne peut pas être installé ici.");return result;}
 static JSONObject candidate(String repo,JSONObject release,JSONObject asset)throws Exception{
  repo=GitHubSourcePolicy.repository(repo);String digest=asset.optString("digest",""),hash="";
  if(!digest.isEmpty()&&!digest.equals("null")){if(!digest.matches("sha256:[0-9a-fA-F]{64}"))throw new IOException("L’empreinte GitHub de ce fichier est invalide.");hash=digest.substring(7).toLowerCase(Locale.ROOT);}
  long size=asset.getLong("size");if(size<1||size>MAX||asset.getLong("id")<1)throw new IOException("Le fichier APK est trop volumineux ou invalide.");
  JSONObject r=new JSONObject().put("versionName",release.optString("tag_name")).put("versionCode",0).put("minSdk",26).put("size",size).put("sha256",hash).put("signers",new JSONArray()).put("assetId",asset.getLong("id")).put("assetName",asset.getString("name")).put("downloadUrl",GitHubSourcePolicy.assetUrl(repo,release.getString("tag_name"),asset.getString("name")));
  return new JSONObject().put("personal",true).put("pendingCheck",true).put("repository",repo).put("packageName","").put("name",repo.substring(repo.indexOf('/')+1)).put("description","Application personnelle ajoutée depuis "+repo+".").put("category","Mes ajouts").put("license","Voir les licences du dépôt").put("sourceUrl","https://github.com/"+repo).put("release",r).put("prerelease",release.optBoolean("prerelease"));
 }
 static String hash(File file)throws Exception{MessageDigest digest=MessageDigest.getInstance("SHA-256");try(InputStream in=new FileInputStream(file)){byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1)digest.update(b,0,n);}return Packages.hex(digest.digest());}
 static File cached(Context c,JSONObject app)throws Exception{return new File(c.getCacheDir(),"cercle-personal-"+app.getJSONObject("release").getLong("assetId")+".apk");}
 static File fetch(Context c,JSONObject app,Packages.Progress progress)throws Exception{
  JSONObject release=app.getJSONObject("release");String repo=GitHubSourcePolicy.repository(app.getString("repository")),url=release.getString("downloadUrl");GitHubSourcePolicy.download(url,repo);long expected=release.getLong("size");if(expected<1||expected>MAX)throw new IOException("Taille APK invalide.");
  File cache=cached(c,app);String expectedHash=release.optString("sha256");if(cache.isFile()&&cache.length()==expected&&!expectedHash.isEmpty()&&hash(cache).equals(expectedHash)){progress.update(100);return cache;}
  File file=File.createTempFile("cercle-personal-",".apk",c.getCacheDir());HttpURLConnection con=null;boolean valid=false;
  try{
   con=Api.personalDownload(url,repo);if(con.getResponseCode()!=200)throw new IOException("L’APK n’est pas disponible.");long total=0;int last=-1;MessageDigest digest=MessageDigest.getInstance("SHA-256");
   try(InputStream in=con.getInputStream();OutputStream out=new FileOutputStream(file)){byte[] b=new byte[65536];int n;while((n=in.read(b))!=-1){total+=n;if(total>expected)throw new IOException("Le fichier reçu a une taille incorrecte.");digest.update(b,0,n);out.write(b,0,n);int p=(int)(total*100/expected);if(p!=last){progress.update(p);last=p;}}}
   String actual=Packages.hex(digest.digest());if(total!=expected||(!expectedHash.isEmpty()&&!actual.equals(expectedHash)))throw new IOException("L’APK ne correspond pas au fichier publié sur GitHub.");
   if(cache.exists()&&!cache.delete())throw new IOException("Le cache APK ne peut pas être remplacé.");if(!file.renameTo(cache))throw new IOException("Le fichier APK ne peut pas être conservé.");valid=true;return cache;
  }finally{if(con!=null)con.disconnect();if(!valid)file.delete();}
 }
 static JSONObject inspect(Context c,JSONObject candidate,File file)throws Exception{return inspect(c,candidate,file,true);}
 static JSONObject inspect(Context c,JSONObject candidate,File file,boolean personalIdentity)throws Exception{
  JSONObject app=new JSONObject(candidate.toString()),release=app.getJSONObject("release");
  PackageInfo info=c.getPackageManager().getPackageArchiveInfo(file.getAbsolutePath(),Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES);
  if(info==null||info.applicationInfo==null||Packages.version(info)<1||info.splitNames!=null&&info.splitNames.length>0)throw new IOException("Choisissez un APK Android autonome et signé.");
  if(info.packageName.equals(c.getPackageName()))throw new IOException("Les mises à jour de Cercle proviennent uniquement de son catalogue signé.");
  String expected=app.optString("packageName");if(!expected.isEmpty()&&!expected.equals(info.packageName))throw new IOException("L’identifiant de l’application a changé.");
  List<String> certs=Packages.signers(info);List<String> pinned=signers(release);if(!pinned.isEmpty()&&!pinned.equals(certs))throw new IOException("Le certificat de cette application a changé. La mise à jour est refusée.");
  PackageInfo installed=Packages.installed(c,info.packageName);if(installed!=null&&!Packages.signers(installed).equals(certs))throw new IOException("Cet APK n’utilise pas le certificat de l’application déjà installée.");
  info.applicationInfo.sourceDir=file.getAbsolutePath();info.applicationInfo.publicSourceDir=file.getAbsolutePath();CharSequence label=info.applicationInfo.loadLabel(c.getPackageManager());String name=label==null?info.packageName:label.toString().trim();if(name.isEmpty())name=info.packageName;
  app.put("packageName",info.packageName).put("name",name.substring(0,Math.min(80,name.length()))).put("pendingCheck",false);
  release.put("versionCode",Packages.version(info)).put("versionName",info.versionName==null?String.valueOf(Packages.version(info)):info.versionName).put("minSdk",info.applicationInfo.minSdkVersion).put("sha256",hash(file)).put("signers",new JSONArray(certs));
  JSONObject old=find(all(c),info.packageName);if(personalIdentity&&old!=null)sameIdentity(old,app);return app;
 }
 static boolean sameAsset(JSONObject a,JSONObject b)throws Exception{JSONObject x=a.getJSONObject("release"),y=b.getJSONObject("release");return x.getLong("assetId")==y.getLong("assetId")&&x.getLong("size")==y.getLong("size")&&x.getString("downloadUrl").equals(y.getString("downloadUrl"))&&(y.optString("sha256").isEmpty()||x.optString("sha256").equals(y.optString("sha256")));}
 static synchronized void recordCandidate(Context c,JSONObject previous,JSONObject candidate)throws Exception{
  JSONArray apps=all(c);JSONObject current=find(apps,previous.getString("packageName"));if(current==null||!sameAsset(current,previous))return;
  JSONObject next=new JSONObject(current.toString());next.put("release",candidate.getJSONObject("release")).put("pendingCheck",true).put("prerelease",candidate.optBoolean("prerelease"));next.getJSONObject("release").put("signers",current.getJSONObject("release").getJSONArray("signers"));
  for(int i=0;i<apps.length();i++)if(apps.getJSONObject(i).getString("packageName").equals(previous.getString("packageName")))apps.put(i,next);write(c,apps);
 }
 static String refresh(Context c){
  JSONArray apps=all(c);int failed=0;
  for(int i=0;i<apps.length();i++)try{
   JSONObject previous=apps.getJSONObject(i),r=latest(previous.getString("repository"));JSONArray choices=assets(r);JSONObject selected=null;String family=GitHubSourcePolicy.family(previous.getJSONObject("release").getString("assetName"));
   for(int j=0;j<choices.length();j++)if(GitHubSourcePolicy.family(choices.getJSONObject(j).getString("name")).equals(family)){if(selected!=null){selected=null;break;}selected=choices.getJSONObject(j);}
   if(selected==null&&choices.length()==1)selected=choices.getJSONObject(0);if(selected==null){failed++;continue;}
   JSONObject next=candidate(previous.getString("repository"),r,selected);if(!sameAsset(previous,next))recordCandidate(c,previous,next);
  }catch(Exception e){failed++;}
  return failed==0?"":failed==1?"Un dépôt personnel n’a pas pu être vérifié. Vos ajouts restent disponibles.":"Certains dépôts personnels n’ont pas pu être vérifiés. Vos ajouts restent disponibles.";
 }
 static File download(Context c,JSONObject app,Packages.Progress progress)throws Exception{
  JSONObject saved=find(all(c),app.getString("packageName"));if(saved==null||!sameAsset(saved,app))throw new IOException("Cette fiche personnelle a changé. Actualisez le catalogue.");sameIdentity(saved,app);
  File file=fetch(c,saved,progress);JSONObject verified;
  try{progress.stage("Vérification de l’identité et du certificat…");verified=inspect(c,saved,file);save(c,verified);}catch(Exception e){file.delete();throw e;}
  // Keep the screen's object in sync before the installer reads its identity.
  app.put("release",verified.getJSONObject("release")).put("pendingCheck",false);
  PackageInfo installed=Packages.installed(c,verified.getString("packageName"));if(installed!=null&&Packages.version(installed)>=verified.getJSONObject("release").getLong("versionCode"))throw new IOException("Cette application est déjà à jour.");
  if(verified.getJSONObject("release").getInt("minSdk")>Build.VERSION.SDK_INT)throw new IOException("Cette application nécessite une version d’Android plus récente.");
  return file;
 }
}
