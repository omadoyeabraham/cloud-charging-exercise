# Crossover Cloud Charging Assessment

- The Lambda function is located in `index.js`
- The Artillery load test is located in `load-test.yml`
- The Artillery test used in verifying data accuracy over concurrent requests is located in `data-accuracy-test.yml`
- `template.yml` defines the AWS SAM cli template used to run the lambda locally for testing

## Testing the lambda function locally

1. Ensure you have the AWS Serverless Application Mpdel (SAM) cli installed and configured
2. Start the local redis instance using `docker compose up`
3. Run `sam local start-api -p 4000` in your cli to start the API on port 4000
4. Test with curl or amy tool of your choice, e.g postman
