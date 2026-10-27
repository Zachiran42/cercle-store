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
 static boolean matches(JSONObject app,String category){
  if("Tout".equals(category))return true;
  if("Applications externes".equals(category))return app.optBoolean("external");
  if("Créations du Cercle".equals(category))return !app.optBoolean("external")&&!app.optBoolean("personal");
  return category.equals(app.optString("category"));
 }
}
