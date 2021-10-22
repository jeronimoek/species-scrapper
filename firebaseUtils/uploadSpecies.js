import admin from "firebase-admin";
import serviceAccount from "./config-species-firebase.json"
import { BigBatch } from '@qualdesk/firestore-big-batch' // <- add this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore()

function uploadSpecies (data, collection = "Species") {
  const batch = new BigBatch({ firestore: db })
  //const batch = db.batch()
  data.forEach((species)=>{
    if(species && species["scientific_name"]){
      console.log(species)
      const docRef = db.collection(collection).doc(species["scientific_name"])
      batch.set(docRef, species)
    } else {
      console.log("Species ERROR => ", species)
    }
  })
  batch.commit()
    .then( (d) => console.log("uploaded species",data.length) )
    .catch( (e) => console.log(e) )
}

export default uploadSpecies