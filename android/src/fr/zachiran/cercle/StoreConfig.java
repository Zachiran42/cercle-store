package fr.zachiran.cercle;
import android.content.Context;
final class StoreConfig {
 static String catalog(Context c){return c.getString(R.string.github_catalog_url);}
 static String key(Context c){return c.getString(R.string.github_public_key);}
 static String repository(Context c){return c.getString(R.string.github_repository);}
 static String page(Context c){return catalog(c).replaceFirst("catalog\\.json$","");}
}
