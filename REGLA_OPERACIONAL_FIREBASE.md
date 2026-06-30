# Regla operacional Firebase

Esta app no debe desplegarse si falla cualquiera de estas verificaciones:

1. `node --test tests/regression.test.js` debe pasar antes de publicar Hosting o reglas.
2. `firebase.json` debe apuntar a `workboard-cocina` y debe incluir `firestore.rules`.
3. `.firebaserc` debe apuntar a `workboard-carmelo`.
4. Los listeners de Firestore privados deben iniciar solo después de `onAuthStateChanged` y del rol del usuario.
5. Las funciones usadas por scripts globales deben estar en `window.*` o vivir en el mismo scope.
6. Después de desplegar, verificar `https://workboard-cocina.web.app/?verify=<timestamp>` y revisar consola.

El deploy de Hosting ahora corre automáticamente el test de regresión mediante `hosting.predeploy`. Si el test falla, Firebase CLI debe detener el deploy.

Comando recomendado para publicar cambios de app y reglas:

```bash
npx firebase-tools deploy --only firestore:rules,hosting --project workboard-carmelo
```

Comandos de verificación manual:

```bash
node --test tests/regression.test.js
npx firebase-tools deploy --only firestore:rules --project workboard-carmelo --dry-run
```
