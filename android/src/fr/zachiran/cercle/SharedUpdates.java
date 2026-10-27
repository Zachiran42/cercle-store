package fr.zachiran.cercle;
import android.content.Context;
import android.content.pm.PackageInfo;
import android.os.Build;
import org.json.*;
import java.io.*;
import java.net.URI;
import java.security.MessageDigest;
import java.util.*;

/** Local upstream observations; the signed catalogue remains the authority for identity. */
final class SharedUpdates {
 static final String KEY="sharedUpdates";
 static JSONObject all(Context c){try{return new JSONObject(Access.prefs(c).getString(KEY,"{}"));}catch(Exception e){return new JSONObject();}}
 static String repository(Context c,JSONObject base)throws Exception{
  if(base.optBoolean("personal")||base.optBoolean("sharedUpdate")||base.getString("packageName").equals(c.getPackageName()))throw new IOException("Source réservée au catalogue signé.");
  String source=base.getString("sourceUrl");URI u=DownloadPolicy.secure(source);
  if(!"github.com".equalsIgnoreCase(u.getHost())||u.getQuery()!=null||!u.getRawPath().equals(u.getPath())||!u.getPath().matches("/[A-Za-z0-9-]+/[A-Za-z0-9._-]+/?"))throw new IOException("Le code source n’est pas un dépôt GitHub.");
  JSONObject r=base.getJSONObject("release");List<String> pins=PersonalApps.signers(r);
  if(r.getLong("versionCode")<1||!r.getString("sha256").matches("[0-9a-f]{64}")||pins.isEmpty())throw new IOException("Identité du catalogue incomplète.");
  for(String pin:pins)if(!pin.matches("[0-9a-f]{64}"))throw new IOException("Certificat du catalogue invalide.");
  return GitHubSourcePolicy.repository(source);
 }
 static String anchor(Context c,JSONObject base)throws Exception{
  String value=base.getString("packageName")+"\n"+repository(c,base).toLowerCase(Locale.ROOT)+"\n"+base.getJSONObject("release").getLong("versionCode")+"\n"+base.getJSONObject("release").getString("sha256")+"\n"+PersonalApps.signers(base.getJSONObject("release"));
  return Packages.hex(MessageDigest.getInstance("SHA-256").digest(value.getBytes("UTF-8")));
 }
 static JSONObject trusted(Context c,String pkg)throws Exception{
  JSONObject catalog=Api.cached(c);JSONObject base=catalog==null?null:PersonalApps.find(catalog.getJSONArray("apps"),pkg);
  if(base==null)throw new IOException("Cette application a été retirée du catalogue. Actualisez-le.");
  repository(c,base);return base;
 }
 static JSONObject record(Context c,JSONObject base){
  try{JSONObject record=all(c).optJSONObject(base.getString("packageName"));return record!=null&&anchor(c,base).equals(record.optString("anchor"))?record:null;}catch(Exception e){return null;}
 }
 static JSONObject overlay(JSONObject base,JSONObject update)throws Exception{
  JSONObject app=new JSONObject(base.toString());app.put("sharedUpdate",true).put("repository",update.getString("repository")).put("pendingCheck",update.optBoolean("pendingCheck")).put("prerelease",update.optBoolean("prerelease")).put("release",new JSONObject(update.getJSONObject("release").toString()));
  return app;
 }
 static JSONArray merge(Context c,JSONArray shared){
  JSONArray result=new JSONArray();if(shared==null)return result;for(int i=0;i<shared.length();i++){JSONObject base=shared.optJSONObject(i);if(base==null)continue;JSONObject app=base;
   try{JSONObject r=record(c,base);if(r!=null){JSONObject update=r.optJSONObject("candidate");if(update==null)update=r.optJSONObject("verified");if(update!=null)app=overlay(base,update);}}catch(Exception ignored){}result.put(app);
  }return result;
 }
 static boolean same(JSONObject a,JSONObject b)throws Exception{return a!=null&&b!=null&&PersonalApps.sameAsset(a,b);}
 // Called only for short persistence operations, never while downloading.
 static synchronized boolean store(Context c,JSONObject base,JSONObject expected,JSONObject next)throws Exception{
  JSONObject currentBase=trusted(c,base.getString("packageName"));if(!anchor(c,base).equals(anchor(c,currentBase)))return false;
  JSONObject current=record(c,base);if(!Objects.equals(current==null?null:current.toString(),expected==null?null:expected.toString()))return false;
  JSONObject all=all(c);all.put(base.getString("packageName"),next);
  if(!Access.prefs(c).edit().putString(KEY,all.toString()).commit())throw new IOException("La vérification n’a pas pu être enregistrée.");
  return true;
 }
 static JSONObject select(JSONArray choices,JSONObject old,JSONObject base)throws Exception{
  JSONObject selected=null;String family=old==null?"":GitHubSourcePolicy.family(old.getJSONObject("release").getString("assetName"));
  for(int i=0;i<choices.length();i++){JSONObject a=choices.getJSONObject(i);boolean match=!family.isEmpty()?family.equals(GitHubSourcePolicy.family(a.getString("name"))):("sha256:"+base.getJSONObject("release").getString("sha256")).equals(a.optString("digest"));
   if(match){if(selected!=null)throw new IOException("Plusieurs variantes APK correspondent à cette application.");selected=a;}}
  if(selected==null&&family.isEmpty()&&choices.length()==1)selected=choices.getJSONObject(0);
  if(selected==null)throw new IOException("Impossible de choisir la variante APK sans ambiguïté.");
  return selected;
 }
 static String refresh(Context c,JSONArray shared){
  if(shared==null)return "Le catalogue n’a pas pu être vérifié.";
  List<String> failed=new ArrayList<>();
  for(int i=0;i<shared.length();i++){JSONObject base=shared.optJSONObject(i);if(base==null||base.optString("packageName").equals(c.getPackageName())||!base.optString("sourceUrl").startsWith("https://github.com/"))continue;
   try{
    String repo=repository(c,base);JSONObject previous=record(c,base),observed=previous==null?null:previous.optJSONObject("observed");
    // Shared apps follow stable releases; previews require a deliberate catalogue publication.
    JSONObject latest=PersonalApps.json("https://api.github.com/repos/"+repo+"/releases/latest");
    if(latest.optBoolean("draft")||latest.optBoolean("prerelease"))throw new IOException("Aucune publication stable.");
    JSONArray choices=PersonalApps.assets(latest);JSONObject selected=select(choices,observed,base),next=PersonalApps.candidate(repo,latest,selected);
    if(same(observed,next))continue;
    JSONObject entry=previous==null?new JSONObject():new JSONObject(previous.toString());entry.put("anchor",anchor(c,base)).put("observed",new JSONObject(next.toString()));entry.remove("candidate");
    JSONObject r=next.getJSONObject("release"),baseline=base.getJSONObject("release");boolean known=r.optString("sha256").equals(baseline.getString("sha256"));
    JSONObject verified=entry.optJSONObject("verified");if(verified!=null&&r.optString("sha256").equals(verified.getJSONObject("release").getString("sha256")))known=true;
    if(!known){next.put("packageName",base.getString("packageName"));r.put("packageName",base.getString("packageName")).put("signers",new JSONArray(baseline.getJSONArray("signers").toString())).put("minSdk",baseline.optInt("minSdk"));entry.put("candidate",next);}
    store(c,base,previous,entry);
   }catch(Exception e){failed.add(base.optString("name","Une application"));}
  }
  return failed.isEmpty()?"":"Publications GitHub non vérifiées : "+String.join(", ",failed)+". Les versions déjà connues restent disponibles.";
 }
 static File download(Context c,JSONObject app,Packages.Progress progress)throws Exception{
  String pkg=app.getString("packageName");JSONObject base=trusted(c,pkg),entry=record(c,base);if(entry==null)throw new IOException("Cette fiche a changé. Vérifiez les mises à jour.");
  JSONObject candidate=entry.optJSONObject("candidate");if(candidate==null)candidate=entry.optJSONObject("verified");
  if(candidate==null||!same(candidate,app))throw new IOException("Cette publication a changé. Vérifiez les mises à jour.");
  File file=PersonalApps.fetch(c,candidate,progress);
  try{
   progress.stage("Vérification de l’identité, de la version et du certificat…");
   JSONObject verified=PersonalApps.inspect(c,candidate,file,false),release=verified.getJSONObject("release");
   JSONObject previous=entry.optJSONObject("verified");long floor=base.getJSONObject("release").getLong("versionCode");if(previous!=null)floor=Math.max(floor,previous.getJSONObject("release").getLong("versionCode"));
   long version=release.getLong("versionCode");boolean pending=entry.optJSONObject("candidate")!=null;
   JSONObject next=new JSONObject(entry.toString());next.remove("candidate");
   if(version>floor)next.put("verified",verified);
   if(!store(c,base,entry,next))throw new IOException("Le catalogue ou la publication a changé pendant la vérification. Réessayez.");
   JSONObject effective=version>floor?overlay(base,verified):previous==null?base:overlay(base,previous);
   app.put("release",effective.getJSONObject("release")).put("pendingCheck",false);
   if(pending&&version<=floor)throw new IOException("Cette publication ne contient pas de version plus récente que celle déjà connue.");
   if(version<floor)throw new IOException("Une version plus ancienne a été refusée.");
   PackageInfo installed=Packages.installed(c,pkg);if(installed!=null&&Packages.version(installed)>=version)throw new IOException("Cette application est déjà à jour.");
   if(release.getInt("minSdk")>Build.VERSION.SDK_INT)throw new IOException("Cette application nécessite une version d’Android plus récente.");
   return file;
  }catch(Exception e){file.delete();throw e;}
 }
}
