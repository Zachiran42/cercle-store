package fr.zachiran.cercle;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.URLDecoder;
import java.util.Locale;

/** Separate policy for repositories explicitly selected by the local user. */
public final class GitHubSourcePolicy {
 public static String repository(String input)throws IOException {
  String value=input==null?"":input.trim();
  if(value.matches("[A-Za-z0-9][A-Za-z0-9-]{0,38}/[A-Za-z0-9][A-Za-z0-9._-]{0,99}"))return value;
  try{
   URI u=DownloadPolicy.secure(value);
   if(!"github.com".equalsIgnoreCase(u.getHost())||u.getQuery()!=null||!u.getRawPath().equals(u.getPath()))throw new Exception();
   String[] parts=u.getPath().replaceAll("/+$","").split("/",-1);
   if(parts.length<3||!parts[0].isEmpty())throw new Exception();
   String repo=parts[2].endsWith(".git")?parts[2].substring(0,parts[2].length()-4):parts[2];
   String result=parts[1]+"/"+repo;
   if(!result.matches("[A-Za-z0-9][A-Za-z0-9-]{0,38}/[A-Za-z0-9][A-Za-z0-9._-]{0,99}"))throw new Exception();
   if(parts.length>3&&!"releases".equals(parts[3]))throw new Exception();
   return result;
  }catch(Exception e){throw new IOException("Collez le lien d’un dépôt public, par exemple https://github.com/auteur/application.");}
 }
 static String encode(String s)throws IOException{try{return URLEncoder.encode(s,"UTF-8").replace("+","%20");}catch(Exception e){throw new IOException("Nom de fichier invalide.");}}
 public static String assetUrl(String repo,String tag,String file)throws IOException {
  String canonical=repository(repo);String url="https://github.com/"+canonical+"/releases/download/"+encode(tag)+"/"+encode(file);download(url,canonical);return url;
 }
 public static void download(String value,String repo)throws IOException {
  URI u=DownloadPolicy.secure(value);String canonical=repository(repo),prefix="/"+canonical+"/releases/download/";
  if(!"github.com".equalsIgnoreCase(u.getHost())||u.getQuery()!=null||!u.getRawPath().startsWith(prefix))throw new IOException("Le fichier ne provient pas du dépôt choisi.");
  String[] parts=u.getRawPath().substring(prefix.length()).split("/",-1);
  if(parts.length!=2)throw new IOException("Lien APK invalide.");
  try{
   String tag=URLDecoder.decode(parts[0],"UTF-8"),file=URLDecoder.decode(parts[1],"UTF-8");
   if(tag.isEmpty()||tag.length()>200||file.length()>220||!file.toLowerCase(Locale.ROOT).endsWith(".apk")||file.contains("/")||file.contains("\\")||file.equals(".apk"))throw new Exception();
   for(String segment:tag.split("/",-1))if(segment.isEmpty()||segment.equals(".")||segment.equals(".."))throw new Exception();
   if((tag+file).matches("(?s).*[\\x00-\\x1f\\x7f\\\\].*")||!encode(tag).equals(parts[0])||!encode(file).equals(parts[1]))throw new Exception();
  }catch(Exception e){throw new IOException("Lien APK invalide.");}
 }
 /** Keep architecture and flavor; only replace dotted version numbers. */
 public static String family(String file){return file.toLowerCase(Locale.ROOT).replaceAll("v?[0-9]+(?:\\.[0-9]+)+(?:[-._]?(?:beta|alpha|rc)[0-9]*)?","{version}");}
}
