package fr.zachiran.cercle;
import android.app.ActivityOptions;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import java.io.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** APK staging and disk sync must never run on the main thread. */
final class InstallSession {
 interface Progress {void stage(String text);}
 static void submit(Context context,File file,String packageName,String request,AtomicBoolean cancel,Progress progress)throws Exception {
  if(Looper.myLooper()==Looper.getMainLooper())throw new IllegalStateException("La préparation Android doit s’exécuter en arrière-plan.");
  PackageInstaller installer=context.getPackageManager().getPackageInstaller();
  int id=-1;boolean committed=false;long started=SystemClock.elapsedRealtime();
  try{
   if(cancel.get())throw new IOException("Préparation annulée.");
   PackageInstaller.SessionParams params=new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
   params.setAppPackageName(packageName);params.setSize(file.length());
   if(Build.VERSION.SDK_INT>=31)params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_REQUIRED);
   progress.stage("Préparation des fichiers pour Android…");id=installer.createSession(params);
   try(PackageInstaller.Session session=installer.openSession(id)){
    try(InputStream in=new FileInputStream(file);OutputStream out=session.openWrite("base.apk",0,file.length())){
     byte[] bytes=new byte[65536];int n;while((n=in.read(bytes))!=-1){if(cancel.get())throw new IOException("Préparation annulée.");out.write(bytes,0,n);}
     progress.stage("Finalisation des fichiers Android…");session.fsync(out);
    }
    if(cancel.get())throw new IOException("Préparation annulée.");
    Intent callback=new Intent(context,InstallResultActivity.class).setAction("fr.zachiran.cercle.INSTALL_RESULT").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    callback.putExtra("cercleSubmittedAt",SystemClock.elapsedRealtime());callback.putExtra("cercleRequest",request);
    int flags=PendingIntent.FLAG_UPDATE_CURRENT;if(Build.VERSION.SDK_INT>=31)flags|=PendingIntent.FLAG_MUTABLE;
    Bundle options=null;
    if(Build.VERSION.SDK_INT>=35){
     ActivityOptions activityOptions=ActivityOptions.makeBasic();
     activityOptions.setPendingIntentCreatorBackgroundActivityStartMode(Build.VERSION.SDK_INT>=36?ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOW_IF_VISIBLE:ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED);
     options=activityOptions.toBundle();
    }
    PendingIntent pending=PendingIntent.getActivity(context,id,callback,flags,options);
    progress.stage("En attente de la confirmation Android…");
    session.commit(pending.getIntentSender());committed=true;
    Log.i("CercleInstall","Préparation et envoi à Android : "+(SystemClock.elapsedRealtime()-started)+" ms");
   }
  }finally{
   file.delete();
   if(id!=-1&&!committed)try{installer.abandonSession(id);}catch(Exception ignored){}
  }
 }
}
