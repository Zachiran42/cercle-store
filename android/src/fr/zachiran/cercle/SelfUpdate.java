package fr.zachiran.cercle;
import org.json.*;
import java.io.IOException;

/** Only the store entry from the verified shared catalogue can update Cercle. */
final class SelfUpdate {
 static JSONObject find(JSONArray apps,String packageName,String repository)throws Exception{
  JSONObject found=null;
  for(int i=0;i<apps.length();i++){
   JSONObject app=apps.getJSONObject(i);if(!packageName.equals(app.optString("packageName")))continue;
   if(found!=null)throw new IOException("Le catalogue contient plusieurs versions de Cercle.");
   if(app.optBoolean("personal")||app.optBoolean("external")||app.optBoolean("sharedUpdate")||app.optBoolean("pendingCheck"))throw new IOException("La mise à jour de Cercle doit provenir du catalogue signé.");
   JSONObject release=app.getJSONObject("release");
   if(!packageName.equals(release.getString("packageName"))||release.getLong("versionCode")<1||release.getLong("size")<1||release.getLong("size")>200L*1024*1024||!release.getString("sha256").matches("[0-9a-f]{64}")||release.getJSONArray("signers").length()<1)throw new IOException("La fiche de mise à jour de Cercle est incomplète.");
   DownloadPolicy.initial(release.getString("downloadUrl"),repository);found=new JSONObject(app.toString());
  }
  if(found==null)throw new IOException("La mise à jour de Cercle est absente du catalogue. Réessayez plus tard.");
  return found;
 }
}
