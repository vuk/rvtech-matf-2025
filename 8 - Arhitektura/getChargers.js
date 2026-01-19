// http://j7yqnoc8so.execute-api.localhost.localstack.cloud:4566/dev/chargers
exports.getChargers = async () => {
  console.log("Getting chargers...");

  return {
    statusCode: 200,
    body: JSON.stringify({ chargers: ["Charger1", "Charger2", "Charger3"] }),
  };
};
