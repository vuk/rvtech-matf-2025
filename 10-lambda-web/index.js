const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.CHARGERS_TABLE;

// Konfiguracija DynamoDB klijenta za LocalStack
const DYNAMODB_ENDPOINT = process.env.LOCALSTACK_HOSTNAME
  ? `http://${process.env.LOCALSTACK_HOSTNAME}:4566`
  : 'http://localhost:4566';

const client = new DynamoDBClient({
  endpoint: DYNAMODB_ENDPOINT,
  region: 'us-east-1',
});
const docClient = DynamoDBDocumentClient.from(client);

// CORS headers za frontend (dozvoli pristup sa S3 website-a)
const ALLOWED_ORIGIN = 'http://punjaci-website.s3-website.localhost.localstack.cloud:4566';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Preuzmi town iz path parametra
  const town = event.pathParameters?.town;
  
  if (!town) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Town parametar je obavezan' }),
    };
  }

  try {
    // Query GSI TownIndex po gradu
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'TownIndex',
      KeyConditionExpression: 'town = :town',
      ExpressionAttributeValues: {
        // decodeURIComponent: dekodira URL encoded karaktere (npr. "Novi%20Sad" → "Novi Sad", "%C4%8Ca%C4%8Dak" → "Čačak")
        // Potrebno jer browser automatski enkoduje specijalne karaktere u URL-u
        ':town': decodeURIComponent(town),
      },
    }));

    console.log(`Pronađeno ${result.Items?.length || 0} punjača za grad: ${town}`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        town: decodeURIComponent(town),
        count: result.Items?.length || 0,
        chargers: result.Items || [],
      }),
    };
  } catch (error) {
    console.error('Greška pri query-ju DynamoDB:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
