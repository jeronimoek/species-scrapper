import admin from "firebase-admin";
import serviceAccount from "./config-species-firebase.json"
import { BigBatch } from '@qualdesk/firestore-big-batch'

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore()

function uploadLocs (data, collection = "Locs") {
  const batch = new BigBatch({ firestore: db })
  //const batch = db.batch()
  for(const loc in data){
    if(loc && data[loc]["lugar"]){
      console.log(loc)
      const docRef = db.collection(collection).doc(loc)
      batch.set(docRef, data[loc])
    }
  }
  batch.commit()
    .then( (d) => console.log("uploaded locs",d) )
    .catch( (e) => console.log(e) )
}

export default uploadLocs