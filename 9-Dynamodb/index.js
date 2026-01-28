const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, BatchWriteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const OCM_API_KEY = process.env.OCM_API_KEY;
const OCM_URL = process.env.OCM_URL;
const TABLE_NAME = process.env.CHARGERS_TABLE;
const BATCH_SIZE = 25;  // DynamoDB BatchWriteItem limit (maks 25 stavki po batch-u)

// Konfiguracija DynamoDB klijenta za LocalStack
// LOCALSTACK_HOSTNAME se automatski postavlja kada Lambda radi unutar LocalStack kontejnera
const DYNAMODB_ENDPOINT = process.env.LOCALSTACK_HOSTNAME
  ? `http://${process.env.LOCALSTACK_HOSTNAME}:4566`
  : 'http://localhost:4566';

console.log('DynamoDB endpoint:', DYNAMODB_ENDPOINT);
console.log('OCM API KEY:', OCM_API_KEY);

const client = new DynamoDBClient({
  endpoint: DYNAMODB_ENDPOINT,
  region: 'us-east-1',
});
// DocumentClient automatski konvertuje JS objekte <-> DynamoDB format 
// (nije potrebna { S: "value" } sintaksa)
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async () => {
  console.log("Fetching OCM chargers...");

  try {
    // Preuzmi podatke sa OCM API-ja
    const MAX_RESULTS = 1000; // za Srbiju ima oko 110 punjača na OCM API-ju
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

    // Sačuvaj samo odabrana polja
    const ttl = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60;  // TTL: 2 dana od sada (Unix timestamp u sekundama)
    
    // Normalizuj imena gradova (Beograd ima više verzija naziva u OCM podacima + provera poštanskog broja)
    const normalizeTown = (town, postcode) => {
      if (['Belgrad', 'Belgrade', 'Beograd'].includes(town)) return 'Belgrade';
      if (postcode?.startsWith('11')) return 'Belgrade';  // Beogradski poštanski brojevi: 11000-11999
      return town || 'Unknown';
    };
    
    const items = chargers.map(charger => ({
      chargerId: String(charger.ID),                         // Primarni ključ
      uuid: charger.UUID,
      town: normalizeTown(charger.AddressInfo?.Town, charger.AddressInfo?.Postcode),  // GSI ključ (normalizovan)
      townRaw: charger.AddressInfo?.Town || 'Unknown',       // Originalno ime grada iz OCM-a
      title: charger.AddressInfo?.Title,
      addressLine1: charger.AddressInfo?.AddressLine1,      // Ulica
      addressLine2: charger.AddressInfo?.AddressLine2,      // Opština/oblast
      postcode: charger.AddressInfo?.Postcode,
      latitude: charger.AddressInfo?.Latitude,
      longitude: charger.AddressInfo?.Longitude,
      isRecentlyVerified: charger.IsRecentlyVerified,
      dateCreated: charger.DateCreated,
      dateLastVerified: charger.DateLastVerified,
      dateLastStatusUpdate: charger.DateLastStatusUpdate,
      numberOfPoints: charger.NumberOfPoints,               // Broj priključaka za punjenje
      ttl,                       // (opciono, ne koristimo) DynamoDB TTL - automatsko brisanje nakon 2 dana
    }));

    // Loguj statistiku gradova ako želiš da vidiš
    // const belgradeCount = items.filter(item => item.town === 'Belgrade').length;
    // const townCounts = items.reduce((acc, item) => {
    //   acc[item.town] = (acc[item.town] || 0) + 1;
    //   return acc;
    // }, {});
    // console.log(`Belgrade chargers: ${belgradeCount}/${items.length}`);
    // console.log('Chargers by town:', townCounts);

    // Umetni/ažuriraj sve OCM zapise (upsert)
    // Buduće poboljšanje: koristi Promise.all(batches.map(...)) za paralelno pisanje batch-eva
    const batches = [];
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      batches.push(items.slice(i, i + BATCH_SIZE));
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


    // ------------------------------------------------------------
    // Brisanje zastarelih zapisa (postoje u bazi ali ne i u OCM-u)
    const currentIds = new Set(items.map(item => item.chargerId));
    const scanResult = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: 'chargerId',
    }));

    console.log("scanResult =>", scanResult);
    const staleIds = (scanResult.Items || [])
      .map(item => item.chargerId)
      .filter(id => !currentIds.has(id));
    console.log("staleIds =>", staleIds);    
    let deletedCount = 0;
    if (staleIds.length > 0) {
      console.log(`Deleting ${staleIds.length} stale records...`);
      const deleteBatches = [];
      for (let i = 0; i < staleIds.length; i += BATCH_SIZE) {
        deleteBatches.push(staleIds.slice(i, i + BATCH_SIZE));
      }
      for (const batch of deleteBatches) {
        try {
          await docClient.send(new BatchWriteCommand({
            RequestItems: {
              [TABLE_NAME]: batch.map(id => ({ DeleteRequest: { Key: { chargerId: id } } }))
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
    // ------------------------------------------------------------

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
