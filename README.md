# endpoint-coverage

Provides a way to collect API endpoint test coverage in your API tests.

## Installation
Via [NPM](https://www.npmjs.com/package/endpoint-coverage)
```sh
$ npm install endpoint-coverage --save-dev
```

## Usage
There is one main function exported in the module, `coverageMiddleware`. 

### `coverageMiddleware`
[Express.js](https://expressjs.com) middleware that collects all HTTP requests made against the server. Scans all request handlers registered in the application and use them for comparison when collecting the coverage.

Registers endpoint (`GET /collectCoverage`) for collecting the coverage.

Middleware should be registered only in the test environment.


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
import { CoverageResult } from 'endpoint-coverage';

afterAll(async () => {
	const coverageResult: CoverageResult = await fetch('/coverageResult');
	expect(coverageResult.notCoveredRoutes).toBeEmpty();
});
```