package fr.zachiran.cercle;
import android.app.*;
import android.app.job.*;
import android.content.*;
import android.content.pm.PackageInfo;
import android.os.Build;
import org.json.*;
public final class UpdateJob extends JobService {
 private volatile boolean stopped;
 static void schedule(Context c){if(!Access.connected(c))return;JobInfo job=new JobInfo.Builder(417,new ComponentName(c,UpdateJob.class)).setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY).setPeriodic(6*3600000L).setPersisted(true).build();c.getSystemService(JobScheduler.class).schedule(job);}
 @Override public boolean onStartJob(JobParameters params){stopped=false;new Thread(()->{try{JSONArray shared;try{shared=CatalogApps.all(Api.catalog(this));}catch(Exception unavailable){JSONObject cached=Api.cached(this);shared=CatalogApps.all(cached);}SharedUpdates.refresh(this,shared);PersonalApps.refresh(this);JSONArray apps=PersonalApps.merge(this,SharedUpdates.merge(this,shared));int count=0;for(int i=0;i<apps.length();i++){JSONObject app=apps.getJSONObject(i);PackageInfo installed=Packages.installed(this,app.getString("packageName"));if(installed!=null&&(Packages.pending(app)||Packages.version(installed)<app.getJSONObject("release").getLong("versionCode")))count++;}if(count>0&&!stopped){NotificationManager manager=getSystemService(NotificationManager.class);manager.createNotificationChannel(new NotificationChannel("updates","Mises à jour des applications",NotificationManager.IMPORTANCE_DEFAULT));if(Build.VERSION.SDK_INT<33||checkSelfPermission("android.permission.POST_NOTIFICATIONS")==android.content.pm.PackageManager.PERMISSION_GRANTED){Intent open=new Intent(this,MainActivity.class).putExtra("updates",true);PendingIntent pending=PendingIntent.getActivity(this,0,open,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);Notification notification=new Notification.Builder(this,"updates").setSmallIcon(fr.zachiran.cercle.R.drawable.ic_cercle).setContentTitle(count==1?"Une nouveauté vous attend":count+" nouveautés vous attendent").setContentText("Ouvrez Cercle pour les installer.").setContentIntent(pending).setAutoCancel(true).build();manager.notify(417,notification);}}}catch(Exception ignored){}finally{if(!stopped)jobFinished(params,false);}},"cercle-updates").start();return true;}
 @Override public boolean onStopJob(JobParameters params){stopped=true;return true;}
}
