package fr.zachiran.cercle;
import android.content.Context;import android.content.pm.*;import org.json.*;import java.io.*;import java.util.*;
final class SharedUpdatesChecks {
 static int checks;
 interface Task{void run()throws Exception;}
 static void ok(boolean b){checks++;if(!b)throw new AssertionError("Shared check "+checks);}
 static void reject(Task t)throws Exception{checks++;try{t.run();}catch(IOException e){return;}throw new AssertionError("Expected shared refusal "+checks);}
 static PackageInfo pkg(int v,String cert){PackageInfo p=new PackageInfo();p.packageName="app.reader";p.versionCode=v;p.versionName="1."+v;p.signatures=new Signature[]{new Signature(cert)};p.signingInfo=new SigningInfo();p.signingInfo.certs=p.signatures;return p;}
 static JSONObject asset(int id,String name)throws Exception{return new JSONObject().put("id",id).put("name",name).put("size",Api.data.length).put("state","uploaded");}
 static JSONObject release(String tag,JSONObject... assets)throws Exception{return new JSONObject().put("tag_name",tag).put("draft",false).put("prerelease",false).put("assets",new JSONArray(Arrays.asList(assets)));}
 static JSONObject base(int version,String repo)throws Exception{
  JSONObject r=new JSONObject().put("packageName","app.reader").put("versionCode",version).put("versionName","1."+version).put("minSdk",24).put("size",Api.data.length).put("sha256",String.join("",Collections.nCopies(64,"0"))).put("signers",new JSONArray(Packages.signers(pkg(version,"A")))).put("downloadUrl","https://github.com/store/catalog/releases/download/v1/reader.apk");
  return new JSONObject().put("packageName","app.reader").put("name","Catalogue Reader").put("description","Trusted description").put("category","Books").put("license","MIT").put("sourceUrl","https://github.com/"+repo).put("release",r);
 }
 static JSONArray catalog(JSONObject base)throws Exception{JSONArray list=new JSONArray().put(base);Api.catalog=new JSONObject().put("apps",list);return list;}
 static JSONObject merged(Context c,JSONArray list){return SharedUpdates.merge(c,list).optJSONObject(0);}
 static void run(File dir)throws Exception{
  Context c=new Context(new File(dir,"one")),other=new Context(new File(dir,"two"));String repo="friend/reader",url="https://api.github.com/repos/"+repo+"/releases/latest";
  JSONObject base=base(5,repo);JSONArray shared=catalog(base);
  Api.codes.clear();Api.json.clear();Api.json.put(url,release("v1.5",asset(1,"reader-1.5.apk").put("digest","sha256:"+base.getJSONObject("release").getString("sha256"))).toString());
  int before=Api.downloads;ok(SharedUpdates.refresh(c,shared).isEmpty());ok(Api.downloads==before);ok(!Packages.pending(merged(c,shared)));ok(SharedUpdates.record(c,base)!=null);
  Api.json.put(url,release("v1.6",asset(2,"reader-1.6.apk")).toString());ok(SharedUpdates.refresh(c,shared).isEmpty());ok(Api.downloads==before);JSONObject pending=merged(c,shared);ok(Packages.pending(pending));ok(!pending.optBoolean("personal"));ok(pending.optBoolean("sharedUpdate"));ok(pending.getString("name").equals("Catalogue Reader"));ok(pending.getString("category").equals("Books"));ok(pending.getString("license").equals("MIT"));ok(PersonalApps.all(c).length()==0);ok(!Packages.pending(merged(other,shared)));
  ok(PersonalApps.signers(pending.getJSONObject("release")).equals(Packages.signers(pkg(5,"A"))));ok(base.getJSONObject("release").getLong("versionCode")==5);ok(!base.has("sharedUpdate"));
  c.pm.info=pkg(5,"A");c.pm.archive=pkg(6,"B");reject(()->Packages.download(c,pending,p->{}));ok(Packages.pending(merged(c,shared)));
  c.pm.archive=pkg(6,"A");c.pm.archive.packageName="evil.app";reject(()->Packages.download(c,pending,p->{}));
  c.pm.archive=pkg(6,"A");c.pm.archive.splitNames=new String[]{"arm64"};reject(()->Packages.download(c,pending,p->{}));
  c.pm.archive=pkg(6,"A");c.pm.info=pkg(5,"B");reject(()->Packages.download(c,pending,p->{}));
  c.pm.info=pkg(5,"A");c.pm.archive=pkg(6,"A");File ready=Packages.download(c,pending,p->{});ok(ready.isFile());JSONObject verified=merged(c,shared);ok(!Packages.pending(verified));ok(verified.getJSONObject("release").getLong("versionCode")==6);ok(!verified.optBoolean("personal"));ok(PersonalApps.all(c).length()==0);
  ok(SharedUpdates.refresh(c,shared).isEmpty());ok(!Packages.pending(merged(c,shared)));Context reopened=new Context(c.cache);reopened.values=c.values;ok(merged(reopened,shared).getJSONObject("release").getLong("versionCode")==6);
  c.pm.info=pkg(6,"A");before=Api.downloads;reject(()->Packages.download(c,verified,p->{}));ok(Api.downloads==before);
  // A new asset with the same actual version is checked once, then suppressed.
  Api.json.put(url,release("v1.6-rebuilt",asset(3,"reader-1.6.apk")).toString());ok(SharedUpdates.refresh(c,shared).isEmpty());JSONObject sameVersion=merged(c,shared);ok(Packages.pending(sameVersion));reject(()->Packages.download(c,sameVersion,p->{}));ok(!Packages.pending(merged(c,shared)));ok(SharedUpdates.refresh(c,shared).isEmpty());ok(!Packages.pending(merged(c,shared)));
  Api.json.put(url,release("v1.4",asset(4,"reader-1.4.apk")).toString());SharedUpdates.refresh(c,shared);c.pm.archive=pkg(4,"A");reject(()->Packages.download(c,merged(c,shared),p->{}));ok(merged(c,shared).getJSONObject("release").getLong("versionCode")==6);ok(!Packages.pending(merged(c,shared)));
  Api.codes.put(url,429);ok(!SharedUpdates.refresh(c,shared).isEmpty());ok(merged(c,shared).getJSONObject("release").getLong("versionCode")==6);Api.codes.clear();
  Api.codes.put(url,404);ok(!SharedUpdates.refresh(c,shared).isEmpty());ok(!Packages.pending(merged(c,shared)));Api.codes.clear();
  Api.json.put(url,release("v1.7",asset(5,"reader-1.7.apk"),asset(6,"different-x86.apk")).toString());ok(SharedUpdates.refresh(c,shared).isEmpty());ok(merged(c,shared).getJSONObject("release").getLong("assetId")==5);
  Api.json.put(url,release("v1.8",asset(7,"different-arm.apk"),asset(8,"different-x86.apk")).toString());ok(!SharedUpdates.refresh(c,shared).isEmpty());ok(merged(c,shared).getJSONObject("release").getLong("assetId")==5);
  Api.json.put(url,release("v1.8",asset(7,"reader-1.8.apk"),asset(8,"reader-1.9.apk")).toString());ok(!SharedUpdates.refresh(c,shared).isEmpty());
  // A changed catalogue anchor invalidates local observations and stale downloads.
  JSONObject stale=merged(c,shared),newBase=base(7,repo);JSONArray newer=catalog(newBase);ok(!Packages.pending(merged(c,newer)));ok(merged(c,newer).getJSONObject("release").getLong("versionCode")==7);before=Api.downloads;reject(()->Packages.download(c,stale,p->{}));ok(Api.downloads==before);
  Api.catalog=new JSONObject().put("apps",new JSONArray());reject(()->Packages.download(c,stale,p->{}));ok(SharedUpdates.merge(c,new JSONArray()).length()==0);
  JSONObject store=new JSONObject(base.toString()).put("packageName",c.getPackageName());reject(()->SharedUpdates.repository(c,store));ok(!merged(c,new JSONArray().put(store)).optBoolean("sharedUpdate"));
  reject(()->SharedUpdates.repository(c,new JSONObject(base.toString()).put("sourceUrl","https://github.com.evil.test/friend/reader")));
  reject(()->SharedUpdates.repository(c,new JSONObject(base.toString()).put("personal",true)));
  reject(()->SharedUpdates.repository(c,new JSONObject(base.toString()).put("sourceUrl","https://github.com/friend/reader/releases")));
  // A first observation with ambiguous architecture never selects a random APK.
  Api.json.put(url,release("v2",asset(10,"reader-arm64.apk"),asset(11,"reader-x86.apk")).toString());catalog(base);ok(!SharedUpdates.refresh(other,shared).isEmpty());ok(SharedUpdates.record(other,base)==null);
  Api.json.put(url,release("v2",asset(10,"reader-arm64.apk")).put("prerelease",true).toString());ok(!SharedUpdates.refresh(other,shared).isEmpty());ok(!Packages.pending(merged(other,shared)));
  System.out.println("Shared upstream checks OK: "+checks);
 }
}
