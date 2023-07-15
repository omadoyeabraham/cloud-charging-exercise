"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const redis = require("redis");
const util = require("util");

const ACCOUNT_KEY = `account1/balance`;
const DEFAULT_BALANCE = 100;

// We initialize the Redis client outside the Lambda handler function
// so that it can be reused across function invocations.
let redisClient;

/**
 * Get the redis client if it exists, otherwise create a new one
 * @returns
 */
function getRedisClient() {
  if (!redisClient || !redisClient.connected) {
    redisClient = redis.createClient({
      url: "redis://host.docker.internal:6379",
      legacyMode: true,
    });

    redisClient.on("error", function (err) {
      console.error("Error with Redis client:", err);
    });
  }

  return redisClient;
}

/**
 * Handler function for the Lambda function
 * @param {*} input
 * @returns
 */
exports.chargeRequestRedis = async function (input) {
  try {
    const redisClient = getRedisClient();

    if (!redisClient) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: "Error creating Redis client" }),
      };
    }

    await redisClient.connect();

    // const balance = await getRedisValue(ACCOUNT_KEY);
    const charges = getCharges();

    // Lua script to check the balance and decrement atomically
    const luaScript = `
      local balance = redis.call('get', KEYS[1])
      if balance ~= nil then
        balance = tonumber(balance)
        local charges = tonumber(ARGV[1])
        if balance >= charges then
          return redis.call('decrby', KEYS[1], charges)
        end
      end
      return -1
    `;

    // Promisify and execute the Lua script
    const runLuaScript = util.promisify(redisClient.eval).bind(redisClient);
    const newBalance = await runLuaScript(luaScript, 1, ACCOUNT_KEY, charges);

    if (newBalance < 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ success: false, error: `Insufficient balance to cover charges. Charges: ${charges}` }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: { remainingBalance: newBalance, charges, isAuthorized: true } }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message }),
    };
  }
};

/**
 * Get the charges for the request
 * @returns
 */
function getCharges() {
  return parseFloat(DEFAULT_BALANCE / 20);
}
