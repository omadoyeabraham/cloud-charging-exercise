const express = require("express");
const bodyParser = require("body-parser");
const redis = require("redis");
const util = require("util");

const ACCOUNT_KEY = `account1/balance`;
const DEFAULT_BALANCE = 100;

let redisClient;

function getRedisClient() {
  if (!redisClient || !redisClient.connected) {
    redisClient = redis.createClient({
      url: "redis://localhost:6379",
      legacyMode: true,
    });

    redisClient.on("error", function (err) {
      console.error("Error with Redis client:", err);
    });
  }

  return redisClient;
}

function getCharges() {
  return parseFloat(DEFAULT_BALANCE / 20);
}

const app = express();
app.use(bodyParser.json());

app.post("/charge-request", async (req, res) => {
  try {
    const redisClient = getRedisClient();

    if (!redisClient) {
      return res.status(500).json({ success: false, error: "Error creating Redis client" });
    }

    await redisClient.connect();
    const charges = getCharges();

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

    const runLuaScript = util.promisify(redisClient.eval).bind(redisClient);
    const newBalance = await runLuaScript(luaScript, 1, ACCOUNT_KEY, charges);

    if (newBalance < 0) {
      return res.status(401).json({ success: false, error: `Insufficient balance to cover charges. Charges: ${charges}` });
    }

    return res.json({ success: true, data: { remainingBalance: newBalance, charges, isAuthorized: true } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on port ${port}`));
