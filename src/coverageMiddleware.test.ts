import express from 'express';
import { coverageMiddleware } from '../src/coverageMiddleware';
import { Server } from 'http';
import request from 'supertest';
import { Coverage } from './Coverage';

function makeServer(): Server {
    const app = express();
    const port = 65431;

    app.use(coverageMiddleware);
    app.get('/path/:param/path.test', (_, res) => {
        res.end();
    });
    return app.listen(port);
}

describe(coverageMiddleware.name, () => {
    let server: Server;

    beforeEach(() => {
        server = makeServer();
    });

    afterEach(done => {
        server.close(done);
    });

    it('should collect not covered endpoint', async () => {
        await request(server)
            .get('/')
            .send();

        const coverage = Coverage.collectCoverage();

        expect(coverage.coveredRoutes).toEqual({});
        expect(coverage.notCoveredRoutes).toEqual(['/path/:param/path.test']);
    });

    it('should correctly recognize covered endpoint', async () => {
        await request(server)
            .get('/path/someParam/path.test?query=value')
            .send();

        const coverage = Coverage.collectCoverage();

        expect(coverage.coveredRoutes).toEqual({ '/path/:param/path.test': ['/path/someParam/path.test'] });
        expect(coverage.notCoveredRoutes).toEqual([]);
    });
});
