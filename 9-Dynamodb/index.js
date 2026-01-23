const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const OCM_API_KEY = process.env.OCM_API_KEY;
const OCM_URL = process.env.OCM_URL;
const TABLE_NAME = process.env.CHARGERS_TABLE;

// Configure DynamoDB client for LocalStack
// LOCALSTACK_HOSTNAME is set automatically when Lambda runs inside LocalStack container
const DYNAMODB_ENDPOINT = process.env.LOCALSTACK_HOSTNAME
  ? `http://${process.env.LOCALSTACK_HOSTNAME}:4566`
  : 'http://localhost:4566';

console.log('DynamoDB endpoint:', DYNAMODB_ENDPOINT);

const client = new DynamoDBClient({
  endpoint: DYNAMODB_ENDPOINT,
  region: 'us-east-1',
});
// DocumentClient auto-converts JS objects <-> DynamoDB format 
// (no need for { S: "value" } syntax)
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async () => {
  console.log("Fetching OCM chargers...");

  try {
    // Fetch from OCM API
    const MAX_RESULTS = 1000; // for Serbia there is around 110 on OCM API
    const params = new URLSearchParams({
      key: OCM_API_KEY,
      countrycode: 'RS',
      maxresults: MAX_RESULTS,
      compact: true,
      verbose: false,
    });

    const response = await fetch(`${OCM_URL}?${params}`);
    const chargers = await response.json();

    const fetchedAll = chargers.length < MAX_RESULTS;
    console.log(`Fetched ${chargers.length} chargers from OCM`);
    console.log(fetchedAll ? 'All chargers fetched' : 'May have more chargers (hit maxresults limit)');
    console.log('Example charger:', JSON.stringify(chargers[0], null, 2));

    // Store only selected fields
    const syncTimestamp = new Date().toISOString();
    const items = chargers.map(charger => ({
      chargeId: String(charger.ID),                         // Primary key
      id: charger.ID,
      uuid: charger.UUID,
      town: charger.AddressInfo?.Town || 'Unknown',         // GSI key
      title: charger.AddressInfo?.Title,
      addressLine1: charger.AddressInfo?.AddressLine1,      // Street
      addressLine2: charger.AddressInfo?.AddressLine2,      // District/area
      postcode: charger.AddressInfo?.Postcode,
      latitude: charger.AddressInfo?.Latitude,
      longitude: charger.AddressInfo?.Longitude,
      isRecentlyVerified: charger.IsRecentlyVerified,
      dateCreated: charger.DateCreated,
      dateLastVerified: charger.DateLastVerified,
      dateLastStatusUpdate: charger.DateLastStatusUpdate,
      numberOfPoints: charger.NumberOfPoints,               // Charging connectors count
      lastSyncedAt: syncTimestamp,                          // For cleanup
    }));

    // Insert/update all OCM records (upsert)
    // Future improvement: use Promise.all(batches.map(...)) to run batches in parallel for faster writes
    const batches = [];
    for (let i = 0; i < items.length; i += 25) {
      batches.push(items.slice(i, i + 25));
    }

    for (const batch of batches) {
      try {
        await docClient.send(new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: batch.map(item => ({ PutRequest: { Item: item } }))
          }
        }));
      } catch (batchError) {
        console.error('BatchWrite error:', batchError.message);
        throw batchError;
      }
    }
    console.log(`Written ${items.length} chargers to DynamoDB`);

    // Delete only stale records (exist in DB but not in OCM)
    const currentIds = new Set(items.map(item => item.chargeId));
    const scanResult = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: 'chargeId',
    }));

    console.log("scanResult =>", scanResult);
    const staleIds = (scanResult.Items || [])
      .map(item => item.chargeId)
      .filter(id => !currentIds.has(id));
    console.log("staleIds =>", staleIds);    
    let deletedCount = 0;
    if (staleIds.length > 0) {
      console.log(`Deleting ${staleIds.length} stale records...`);
      const deleteBatches = [];
      for (let i = 0; i < staleIds.length; i += 25) {
        deleteBatches.push(staleIds.slice(i, i + 25));
      }
      for (const batch of deleteBatches) {
        try {
          await docClient.send(new BatchWriteCommand({
            RequestItems: {
              [TABLE_NAME]: batch.map(id => ({ DeleteRequest: { Key: { chargeId: id } } }))
            }
          }));
        } catch (deleteError) {
          console.error('Delete batch error:', deleteError.message);
          throw deleteError;
        }
      }
      deletedCount = staleIds.length;
      console.log(`Deleted ${deletedCount} stale records`);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': 'http://punjaci-website.s3-website.localhost.localstack.cloud:4566' },
      body: JSON.stringify({
        message: "OCM data synced to DynamoDB",
        count: items.length,
        deleted: deletedCount,
        fetchedAll: fetchedAll,
      }),
    };
  } catch (error) {
    console.error("Error syncing OCM data:", error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': 'http://punjaci-website.s3-website.localhost.localstack.cloud:4566' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
