# endpoint-coverage

Provides a way to collect API endpoint test coverage in your API tests.

## Usage
There are two main functions export in the module, `coverageMiddleware` and `collectCoverage`. 

### `coverageMiddleware`
[Express.js](https://expressjs.com) middleware that collects all HTTP requests made against the server. Scans all request handlers registered in the application and use them for comparison when collecting the coverage.

Middleware should be registered only in the test environment.

### `collectCoverage`
Compares all the registered endpoints to the list of endpoints that were call so far and returns report object containing `coveredRoutes` and `notCoveredRoutes`. Should be called after all API tests were run.

```ts
interface CoverageResult {
    coveredRoutes: Record<string, string[]>;
    notCoveredRoutes: string[];
}
```

## Example

### server.ts

```ts
import express from 'express';
import { coverageMiddleware } from 'endpoint-coverage';

const app = express();
const port = 12345;

if(isTestEnv()) {
	app.use(coverageMiddleware);
}

app.get('/path/:param', () => {...});
app.post('/anotherPath', () => {...});

return app.listen(port);
```

### afterTest.ts

```ts
import { collectCoverage } from 'endpoint-coverage';

afterAll(() => {
	const coverageResult = collectCoverage();
	expect(coverageResult.notCoveredRoutes).toBeEmpty();
});
```