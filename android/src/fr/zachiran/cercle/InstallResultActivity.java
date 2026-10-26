package fr.zachiran.cercle;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInstaller;
import android.os.Bundle;
import android.widget.Toast;
public final class InstallResultActivity extends Activity {
 @Override public void onCreate(Bundle b){super.onCreate(b);handle(getIntent());}
 @Override public void onNewIntent(Intent i){super.onNewIntent(i);setIntent(i);handle(i);}
 private void handle(Intent intent){int status=intent.getIntExtra(PackageInstaller.EXTRA_STATUS,PackageInstaller.STATUS_FAILURE);if(status==PackageInstaller.STATUS_PENDING_USER_ACTION){Intent confirmation=intent.getParcelableExtra(Intent.EXTRA_INTENT);if(confirmation!=null){try{startActivityForResult(confirmation,1);return;}catch(Exception ignored){}}Toast.makeText(this,"Android n’a pas pu ouvrir la confirmation d’installation.",Toast.LENGTH_LONG).show();}else if(status==PackageInstaller.STATUS_SUCCESS){Toast.makeText(this,"L’application est prête !",Toast.LENGTH_LONG).show();}else if(status==PackageInstaller.STATUS_FAILURE_ABORTED){Toast.makeText(this,"Installation annulée. Vous pourrez réessayer dans Cercle.",Toast.LENGTH_LONG).show();}else{Toast.makeText(this,"Android n’a pas installé cette version. Vérifiez la compatibilité et l’espace disponible.",Toast.LENGTH_LONG).show();}finish();}
 @Override public void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);finish();}
}
