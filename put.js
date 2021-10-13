import AWS from "aws-sdk";
import { awsConfig } from "./config.js";
import stringify from "./utils/stringify.js";

AWS.config.update(awsConfig);

const dynamoDB = new AWS.DynamoDB();

async function putSpecies(sp) {
  let scName = sp.scientific_name;
  let selStatement = `SELECT * FROM Species WHERE scientific_name = '${scName}'`
  console.log("selStatement: ",selStatement)
  let elem = await dynamoDB.executeStatement(
    {
      Statement: selStatement
    }
  ).promise()
  if(elem.Items.length === 0){
    let insStatement = `INSERT INTO Species VALUE ${stringify(sp)}`
    console.log("insStatement: ",insStatement)
    await dynamoDB.executeStatement(
      {
        Statement: insStatement
      }
    ).promise(); 
  } else {
    let updStatement = `UPDATE Species ${stringify(sp,"SET")}WHERE scientific_name='${scName}'`
    console.log("updStatement: ",updStatement)
    await dynamoDB.executeStatement(
      {
        Statement: updStatement
      }
    ).promise();
  }
};

export default putSpecies