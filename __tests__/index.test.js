const redis = require("redis");
const { chargeRequestRedis } = require("../index");

jest.mock("redis", () => ({
  createClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(),
    eval: jest.fn(),
    on: jest.fn(),
  })),
}));

describe("chargeRequestRedis", () => {
  let redisClient;

  beforeEach(() => {
    redisClient = redis.createClient();
  });

  it("should return an error if the balance is insufficient", async () => {
    redisClient.eval.mockResolvedValue(-1);

    const response = await chargeRequestRedis();

    expect(response).toEqual({
      statusCode: 500,
      body: JSON.stringify({ success: false, error: "Insufficient balance to cover charges. Charges: 5" }),
    });
  });

  it("should decrement the balance and return the new balance if the balance is sufficient", async () => {
    redisClient.eval.mockResolvedValue(95);

    const response = await chargeRequestRedis();

    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify({ success: true, data: { remainingBalance: 95, charges: 5, isAuthorized: true } }),
    });
  });
});
