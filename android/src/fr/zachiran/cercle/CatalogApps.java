package fr.zachiran.cercle;
import org.json.*;
import java.io.IOException;

/** External entries live in a separate signed field so older clients keep their original catalogue. */
final class CatalogApps {
 static JSONArray all(JSONObject catalog){
  JSONArray result=new JSONArray();if(catalog==null)return result;
  JSONArray owned=catalog.optJSONArray("apps"),external=catalog.optJSONArray("externalApps");
  if(owned!=null)for(int i=0;i<owned.length();i++)result.put(owned.optJSONObject(i));
  if(external!=null)for(int i=0;i<external.length();i++){JSONObject app=external.optJSONObject(i);try{repository(app);if(PersonalApps.find(result,app.getString("packageName"))==null)result.put(app);}catch(Exception ignored){}}
  return result;
 }
 static String repository(JSONObject app)throws Exception{
  if(app==null||!app.optBoolean("external")||app.optBoolean("personal")||app.optBoolean("sharedUpdate")||app.getString("packageName").equals("fr.zachiran.cercle")||app.optString("author").trim().isEmpty())throw new IOException("Fiche externe invalide.");
  String source=app.getString("sourceUrl"),repo=GitHubSourcePolicy.repository(source);
  if(!source.equals("https://github.com/"+repo))throw new IOException("Le dépôt officiel est invalide.");
  GitHubSourcePolicy.download(app.getJSONObject("release").getString("downloadUrl"),repo);return repo;
 }
 static String category(JSONObject app){String value=app.optString("category","").trim();return value.isEmpty()?"Pratique":value;}
 static java.util.List<String> categories(JSONArray apps,String storePackage){java.util.LinkedHashSet<String> found=new java.util.LinkedHashSet<>();for(int i=0;i<apps.length();i++){JSONObject app=apps.optJSONObject(i);if(app!=null&&!storePackage.equals(app.optString("packageName")))found.add(category(app));}java.util.List<String> result=new java.util.ArrayList<>();result.add("Tout");for(String name:new String[]{"Jeux","Pratique","Maison","Cuisine","Loisirs","Documents","Cartes et navigation"})if(found.remove(name))result.add(name);java.util.List<String> other=new java.util.ArrayList<>(found);java.util.Collections.sort(other,java.text.Collator.getInstance(java.util.Locale.FRENCH));result.addAll(other);return result;}
 static int count(JSONArray apps,String category,String origin,String storePackage){int count=0;for(int i=0;i<apps.length();i++){JSONObject app=apps.optJSONObject(i);if(app!=null&&!storePackage.equals(app.optString("packageName"))&&matches(app,category)&&matches(app,origin))count++;}return count;}
 static boolean matches(JSONObject app,String category){
  if("Tout".equals(category))return true;
  if("Applications externes".equals(category))return app.optBoolean("external");
  if("Créations du Cercle".equals(category))return !app.optBoolean("external")&&!app.optBoolean("personal");
  if("Mes ajouts".equals(category))return app.optBoolean("personal");
  return category.equals(category(app));
 }
}
