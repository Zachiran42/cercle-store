package fr.zachiran.cercle;
import java.security.*;import java.security.spec.X509EncodedKeySpec;
public final class CatalogTrust {
 public static boolean verify(byte[] payload,byte[] signature,byte[] publicKey)throws GeneralSecurityException{PublicKey key=KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(publicKey));Signature verifier=Signature.getInstance("SHA256withECDSA");verifier.initVerify(key);verifier.update(payload);return verifier.verify(signature);}
}
