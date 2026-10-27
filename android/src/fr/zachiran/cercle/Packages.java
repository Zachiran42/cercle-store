package fr.zachiran.cercle;
import android.content.Context;
import android.content.pm.*;
import android.os.Build;
import org.json.*;
import java.io.*;
import java.net.HttpURLConnection;
import java.security.MessageDigest;
import java.util.*;
final class Packages {
 static long version(PackageInfo info){return Build.VERSION.SDK_INT>=28?info.getLongVersionCode():info.versionCode;}
 static PackageInfo installed(Context c,String pkg){try{return c.getPackageManager().getPackageInfo(pkg,Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES);}catch(PackageManager.NameNotFoundException e){return null;}}
 static String hex(byte[] value){StringBuilder b=new StringBuilder();for(byte v:value)b.append(String.format(java.util.Locale.US,"%02x",v&255));return b.toString();}
 static List<String> signers(PackageInfo info) throws Exception{android.content.pm.Signature[] certificates=Build.VERSION.SDK_INT>=28?(info.signingInfo==null?null:info.signingInfo.getApkContentsSigners()):info.signatures;if(certificates==null||certificates.length==0)throw new IOException("La signature de l’application ne peut pas être vérifiée.");List<String> result=new ArrayList<>();for(android.content.pm.Signature cert:certificates)result.add(hex(MessageDigest.getInstance("SHA-256").digest(cert.toByteArray())));Collections.sort(result);return result;}
 static boolean pending(JSONObject app){return app.optBoolean("pendingCheck")&&(app.optBoolean("personal")||app.optBoolean("sharedUpdate"));}
 static boolean currentVersionInstalled(Context c,JSONObject app)throws Exception{if(pending(app))return false;PackageInfo info=installed(c,app.getString("packageName"));return info!=null&&version(info)>=app.getJSONObject("release").getLong("versionCode");}
 interface Progress{void update(int percent);default void stage(String name){}}
 static File download(Context c,JSONObject app,Progress progress) throws Exception{
  if(currentVersionInstalled(c,app))throw new IOException("Cette application est déjà à jour.");
  if(app.optBoolean("sharedUpdate"))return SharedUpdates.download(c,app,progress);
  if(app.optBoolean("personal"))return PersonalApps.download(c,app,progress);
  JSONObject release=app.getJSONObject("release");String downloadUrl=release.getString("downloadUrl");long expected=release.getLong("size");if(expected<=0||expected>200L*1024*1024)throw new IOException("La taille du fichier est invalide.");
  HttpURLConnection connection=app.optBoolean("external")?Api.externalDownload(c,app):Api.download(c,downloadUrl);File file=File.createTempFile("cercle-",".apk",c.getCacheDir());boolean valid=false;
  try{if(connection.getResponseCode()!=200)throw new IOException("Téléchargement impossible. Vérifiez votre connexion ou votre invitation.");MessageDigest digest=MessageDigest.getInstance("SHA-256");long total=0;int last=-1;byte[] buffer=new byte[65536];try(InputStream in=connection.getInputStream();OutputStream out=new FileOutputStream(file)){int n;while((n=in.read(buffer))!=-1){total+=n;if(total>expected)throw new IOException("Le fichier reçu a une taille incorrecte.");digest.update(buffer,0,n);out.write(buffer,0,n);int percent=(int)(total*100/expected);if(percent!=last){progress.update(percent);last=percent;}}}if(total!=expected||!hex(digest.digest()).equals(release.getString("sha256")))throw new IOException("Le fichier reçu est incomplet ou a été modifié. Réessayez.");
   progress.stage("Vérification de l’identité et du certificat…");PackageInfo archive=c.getPackageManager().getPackageArchiveInfo(file.getAbsolutePath(),Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES);if(archive==null||!archive.packageName.equals(app.getString("packageName"))||version(archive)!=release.getLong("versionCode"))throw new IOException("Ce fichier ne correspond pas à l’application annoncée.");
   List<String> certificates=signers(archive),expectedSigners=new ArrayList<>();JSONArray raw=release.getJSONArray("signers");for(int i=0;i<raw.length();i++)expectedSigners.add(raw.getString(i));Collections.sort(expectedSigners);if(!certificates.equals(expectedSigners))throw new IOException("La signature de cette version ne correspond pas au catalogue.");PackageInfo previous=installed(c,archive.packageName);if(previous!=null){if(!signers(previous).equals(certificates))throw new IOException("Cette mise à jour n’est pas signée avec la clé de l’application installée.");if(version(previous)>=version(archive))throw new IOException("Cette version est déjà installée ou est plus ancienne.");}valid=true;return file;
  }finally{connection.disconnect();if(!valid)file.delete();}
 }
}
