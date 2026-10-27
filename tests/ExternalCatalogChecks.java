package fr.zachiran.cercle;
import android.content.Context;import org.json.*;import java.io.*;import java.security.*;import java.util.*;
final class ExternalCatalogChecks {
 static int checks;interface Task{void run()throws Exception;}static void ok(boolean value){checks++;if(!value)throw new AssertionError("External check "+checks);}
 static void reject(Task t)throws Exception{checks++;try{t.run();}catch(IOException e){return;}throw new AssertionError("External refusal "+checks);}
 static JSONObject external()throws Exception{
  JSONObject app=SharedUpdatesChecks.base(5,"friend/reader").put("external",true).put("author","Independent team");
  app.getJSONObject("release").put("downloadUrl","https://github.com/friend/reader/releases/download/v1/reader-1.0.apk").put("assetName","reader-1.0.apk").put("assetId",50).put("sha256",Packages.hex(MessageDigest.getInstance("SHA-256").digest(Api.data)));
  return app;
 }
 static void run(File dir)throws Exception{
  Context c=new Context(dir);JSONObject external=external(),own=SharedUpdatesChecks.base(1,"friend/own").put("packageName","own.app");JSONArray original=new JSONArray().put(own);
  JSONObject catalog=new JSONObject().put("apps",original).put("externalApps",new JSONArray().put(external));Api.catalog=catalog;
  ok(original.length()==1);JSONArray combined=CatalogApps.all(catalog);ok(combined.length()==2);ok(combined.getJSONObject(1).optBoolean("external"));ok(combined.getJSONObject(1).getString("author").equals("Independent team"));
  ok(CatalogApps.matches(external,"Tout"));ok(CatalogApps.matches(external,"Applications externes"));ok(!CatalogApps.matches(external,"Créations du Cercle"));ok(CatalogApps.matches(own,"Créations du Cercle"));ok(!CatalogApps.matches(own,"Applications externes"));
  ok(CatalogApps.repository(external).equals("friend/reader"));
  c.pm.archive=SharedUpdatesChecks.pkg(5,"A");File file=Packages.download(c,external,p->{});ok(file.isFile());ok(!Packages.pending(external));ok(PersonalApps.all(c).length()==0);
  reject(()->CatalogApps.repository(new JSONObject(external.toString()).put("personal",true)));
  reject(()->CatalogApps.repository(new JSONObject(external.toString()).put("packageName",c.getPackageName())));
  JSONObject foreign=new JSONObject(external.toString());foreign.getJSONObject("release").put("downloadUrl","https://github.com/evil/repo/releases/download/v1/reader.apk");reject(()->CatalogApps.repository(foreign));
  JSONObject wrongHash=new JSONObject(external.toString());wrongHash.getJSONObject("release").put("sha256",String.join("",Collections.nCopies(64,"0")));reject(()->Packages.download(c,wrongHash,p->{}));
  c.pm.archive=SharedUpdatesChecks.pkg(5,"B");reject(()->Packages.download(c,external,p->{}));c.pm.archive=SharedUpdatesChecks.pkg(5,"A");
  c.pm.info=SharedUpdatesChecks.pkg(5,"A");int before=Api.downloads;reject(()->Packages.download(c,external,p->{}));ok(Api.downloads==before);
  JSONObject hidden=new JSONObject(external.toString()).put("author","");ok(CatalogApps.all(new JSONObject().put("externalApps",new JSONArray().put(hidden))).length()==0);
  ok(CatalogApps.all(new JSONObject().put("apps",new JSONArray().put(own)).put("externalApps",new JSONArray().put(new JSONObject(external.toString()).put("packageName","own.app")))).length()==1);
  // Upstream updates keep the initial universal APK family even before a first refresh.
  JSONObject gallery=new JSONObject(external.toString());gallery.getJSONObject("release").put("assetName","gallery-30-foss-release.apk");
  JSONArray variants=new JSONArray().put(SharedUpdatesChecks.asset(60,"gallery-40-foss-arm64-v8a-release.apk")).put(SharedUpdatesChecks.asset(61,"gallery-39-foss-release.apk"));
  ok(SharedUpdates.select(variants,null,gallery).getInt("id")==61);
  ok(!GitHubSourcePolicy.family("reader-32-arm64-v8a.apk").equals(GitHubSourcePolicy.family("reader-33-armeabi-v7a.apk")));
  ok(GitHubSourcePolicy.family("net.example-v164-2026.10.0-release.apk").equals(GitHubSourcePolicy.family("net.example-v165-2026.11.0-release.apk")));
  // A new upstream candidate is anchored by the external entry in the signed catalogue.
  String endpoint="https://api.github.com/repos/friend/reader/releases/latest";Api.json.put(endpoint,SharedUpdatesChecks.release("v1.6",SharedUpdatesChecks.asset(51,"reader-1.6.apk")).toString());Api.codes.clear();
  ok(SharedUpdates.refresh(c,combined).isEmpty()==false); // own.app has no GitHub release fixture.
  JSONObject pending=PersonalApps.find(SharedUpdates.merge(c,combined),"app.reader");ok(Packages.pending(pending));ok(pending.optBoolean("external"));ok(pending.getString("author").equals("Independent team"));
  c.pm.archive=SharedUpdatesChecks.pkg(6,"A");File update=Packages.download(c,pending,p->{});ok(update.isFile());ok(PersonalApps.all(c).length()==0);
  System.out.println("External catalogue checks OK: "+checks);
 }
}
