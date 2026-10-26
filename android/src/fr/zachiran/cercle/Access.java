package fr.zachiran.cercle;
import android.content.Context;import android.content.SharedPreferences;
final class Access {
 static SharedPreferences prefs(Context c){return c.getSharedPreferences("cercle",Context.MODE_PRIVATE);}
 static boolean connected(Context c){return !StoreConfig.catalog(c).isEmpty()&&!prefs(c).getBoolean("preview",false);}
 static void clear(Context c){prefs(c).edit().clear().commit();c.getSystemService(android.app.job.JobScheduler.class).cancel(417);}
}
