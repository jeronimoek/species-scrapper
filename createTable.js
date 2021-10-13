import AWS from "aws-sdk";
import { awsConfig } from "./config.js";

AWS.config.update(awsConfig);

var dynamodb = new AWS.DynamoDB();

var params = {
  TableName : "Species",
  KeySchema: [       
    { AttributeName: "scientific_name", KeyType: "HASH"}  //Partition key
  ],
  AttributeDefinitions: [       
    { AttributeName: "scientific_name", AttributeType: "S" },
  ],
  ProvisionedThroughput: {       
    ReadCapacityUnits: 10, 
    WriteCapacityUnits: 10
  }
};

dynamodb.createTable(params, function(err, data) {
  if (err) {
    console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
  } else {
    console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
  }
});