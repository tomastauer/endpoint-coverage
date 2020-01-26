import express, { Request, Router, RequestHandler, Application } from 'express';
import { Server } from 'http';
import request from 'supertest';
import { CoverageResult } from './Coverage';
import { coverageMiddleware } from './coverageMiddleware';
import { SUPPORTED_VERBS } from './constants';
import { registerRoutes } from './testData';

const simpleHandler: RequestHandler = (_, res) => {
    res.end();
};

const simpleMiddleware: RequestHandler = (_, __, next) => {
    next();
};

function makeServer(callback: (app: Application) => void): Server {
    const app = express();
    const port = 65431;

    app.use(coverageMiddleware());
    callback(app);

    return app.listen(port);
}

describe(coverageMiddleware.name, () => {
    let server: Server;

    afterEach(done => {
        server.close(done);
    });

    async function getCoverage(): Promise<CoverageResult> {
        return (
            await request(server)
                .get('/coverageResult')
                .send()
        ).body;
    }

    async function expectCoverage(coveredRoutes: Record<string, string[]>, notCoveredRoutes: string[]): Promise<void> {
        const coverage = await getCoverage();
        expect(coverage.coveredRoutes).toEqual(coveredRoutes);
        expect(coverage.notCoveredRoutes.sort()).toEqual(notCoveredRoutes.sort());
    }

    describe('direct path', () => {
        beforeEach(() => {
            server = makeServer(app => {
                app.get('/directPathGet', simpleHandler);
            });
        });

        it('should collect for non-covered', () => {
            return expectCoverage({}, ['GET /directPathGet']);
        });

        it('should collect for covered', async () => {
            await request(server)
                .get('/directPathGet')
                .send();

            return expectCoverage({ 'GET /directPathGet': ['GET /directPathGet'] }, []);
        });

        it('should cover even when query string is used', async () => {
            await request(server)
                .get('/directPathGet?queryString=value&another=value')
                .send();

            return expectCoverage({ 'GET /directPathGet': ['GET /directPathGet?queryString=value&another=value'] }, []);
        });
    });

    describe('direct path anonymous method', () => {
        beforeEach(() => {
            server = makeServer(app => {
                app.get('/directPathGetAnonymous', (_, res) => {
                    res.end();
                });
            });
        });

        it('should collect for non-covered', () => {
            return expectCoverage({}, ['GET /directPathGetAnonymous']);
        });

        it('should collect for covered', async () => {
            await request(server)
                .get('/directPathGetAnonymous')
                .send();

            return expectCoverage({ 'GET /directPathGetAnonymous': ['GET /directPathGetAnonymous'] }, []);
        });
    });

    describe('direct path multiple handlers', () => {
        beforeEach(() => {
            server = makeServer(app => {
                app.get('/directPathGet', simpleHandler, simpleHandler, simpleHandler);
            });
        });

        it('should collect for non-covered', () => {
            return expectCoverage({}, ['GET /directPathGet']);
        });

        it('should collect for covered', async () => {
            await request(server)
                .get('/directPathGet')
                .send();

            return expectCoverage({ 'GET /directPathGet': ['GET /directPathGet'] }, []);
        });
    });

    describe('direct path multiple methods', () => {
        beforeEach(() => {
            server = makeServer(app => {
                app.get('/directPath', simpleHandler);
                app.post('/directPath', simpleHandler);
                app.put('/directPath', simpleHandler);
            });
        });

        it('should collect for non-covered', () => {
            return expectCoverage({}, ['GET /directPath', 'POST /directPath', 'PUT /directPath']);
        });

        it('should collect for covered', async () => {
            await request(server)
                .get('/directPath')
                .send();

            await request(server)
                .post('/directPath')
                .send();

            await request(server)
                .put('/directPath')
                .send();

            return expectCoverage(
                {
                    'GET /directPath': ['GET /directPath'],
                    'POST /directPath': ['POST /directPath'],
                    'PUT /directPath': ['PUT /directPath'],
                },
                [],
            );
        });
    });

    describe('all supported methods', () => {
        beforeEach(() => {
            server = makeServer(app => {
                SUPPORTED_VERBS.forEach(sv => {
                    app[sv as keyof typeof app]('/directPath', simpleHandler);
                });
            });
        });

        it('should collect for non-covered', () => {
            const notCovered = SUPPORTED_VERBS.map(sv => `${sv.toUpperCase()} /directPath`);

            return expectCoverage({}, notCovered);
        });

        it('should collect for covered', async () => {
            await Promise.all(
                SUPPORTED_VERBS.map(async sv => {
                    const s = request(server);
                    const method = s[sv as keyof typeof s] as (url: string) => request.Request;

                    return method('/directPath').send();
                }),
            );

            const covered: Record<string, string[]> = {};
            SUPPORTED_VERBS.forEach(sv => {
                const pathWithMethod = `${sv.toUpperCase()} /directPath`;
                covered[pathWithMethod] = [pathWithMethod];
            });

            return expectCoverage(covered, []);
        });
    });

    describe('long path', () => {
        beforeEach(() => {
            server = makeServer(app => {
                app.get('/some/longer/path/containing/more/folders/and/final.file', simpleHandler);
            });
        });

        it('should collect for non-covered', () => {
            return expectCoverage({}, ['GET /some/longer/path/containing/more/folders/and/final.file']);
        });

        it('should collect for covered', async () => {
            await request(server)
                .get('/some/longer/path/containing/more/folders/and/final.file')
                .send();

            return expectCoverage(
                {
                    'GET /some/longer/path/containing/more/folders/and/final.file': [
                        'GET /some/longer/path/containing/more/folders/and/final.file',
                    ],
                },
                [],
            );
        });
    });

    describe('mandatory parameters', () => {
        beforeEach(() => {
            server = makeServer(app => {
                app.get('/path/:param/:anotherParam/somePath', simpleHandler);
            });
        });

        it('should collect for non-covered', () => {
            return expectCoverage({}, ['GET /path/:param/:anotherParam/somePath']);
        });

        it('should collect for non-covered when parameter is not provided', async () => {
            await request(server)
                .get('/path/value1/somePath')
                .send();

            return expectCoverage({}, ['GET /path/:param/:anotherParam/somePath']);
        });

        it('should collect for covered', async () => {
            await request(server)
                .get('/path/value1/value2/somePath')
                .send();

            await request(server)
                .get('/path/value3/value4/somePath')
                .send();

            return expectCoverage(
                {
                    'GET /path/:param/:anotherParam/somePath': [
                        'GET /path/value1/value2/somePath',
                        'GET /path/value3/value4/somePath',
                    ],
                },
                [],
            );
        });
    });

    describe('optional parameters', () => {
        beforeEach(() => {
            server = makeServer(app => {
                app.get('/path/:param?/:anotherParam?/somePath', simpleHandler);
            });
        });

        it('should collect for non-covered', () => {
            return expectCoverage({}, ['GET /path/:param?/:anotherParam?/somePath']);
        });

        it('should collect for covered', async () => {
            await request(server)
                .get('/path/value1/value2/somePath')
                .send();

            return expectCoverage(
                {
                    'GET /path/:param?/:anotherParam?/somePath': ['GET /path/value1/value2/somePath'],
                },
                [],
            );
        });

        it('should collect for covered when only one parameter is provided', async () => {
            await request(server)
                .get('/path/value1/somePath')
                .send();

            return expectCoverage(
                {
                    'GET /path/:param?/:anotherParam?/somePath': ['GET /path/value1/somePath'],
                },
                [],
            );
        });

        it('should collect for covered when no parameter is provided', async () => {
            await request(server)
                .get('/path/somePath')
                .send();

            return expectCoverage(
                {
                    'GET /path/:param?/:anotherParam?/somePath': ['GET /path/somePath'],
                },
                [],
            );
        });
    });

    describe('combination of parameters', () => {
        beforeEach(() => {
            server = makeServer(app => {
                app.get('/path/:param?/:anotherParam/somePath', simpleHandler);
            });
        });

        it('should collect for non-covered', () => {
            return expectCoverage({}, ['GET /path/:param?/:anotherParam/somePath']);
        });

        it('should collect for non-covered when no parameter is provided', async () => {
            await request(server)
                .get('/path/somePath')
                .send();

            return expectCoverage({}, ['GET /path/:param?/:anotherParam/somePath']);
        });

        it('should collect for covered', async () => {
            await request(server)
                .get('/path/value1/value2/somePath')
                .send();

            return expectCoverage(
                {
                    'GET /path/:param?/:anotherParam/somePath': ['GET /path/value1/value2/somePath'],
                },
                [],
            );
        });

        it('should collect for covered when only mandatory parameter is provided', async () => {
            await request(server)
                .get('/path/value1/somePath')
                .send();

            return expectCoverage(
                {
                    'GET /path/:param?/:anotherParam/somePath': ['GET /path/value1/somePath'],
                },
                [],
            );
        });
    });

    describe('regex', () => {
        beforeEach(() => {
            server = makeServer(app => {
                app.get('/[A-Z0-9]+/path', simpleHandler);
            });
        });

        it('should collect for non-covered', () => {
            return expectCoverage({}, ['GET /[A-Z0-9]+/path']);
        });

        it('should collect for covered', async () => {
            await request(server)
                .get('/ABC012DEF/path')
                .send();

            return expectCoverage(
                {
                    'GET /[A-Z0-9]+/path': ['GET /ABC012DEF/path'],
                },
                [],
            );
        });
    });

    describe('route with more methods', () => {
        beforeEach(() => {
            server = makeServer(app => {
                app.route('/route')
                    .get(simpleHandler)
                    .post(simpleHandler);
            });
        });

        it('should collect for non-covered', () => {
            return expectCoverage({}, ['GET /route', 'POST /route']);
        });

        it('should collect for covered', async () => {
            await request(server)
                .get('/route')
                .send();

            await request(server)
                .post('/route')
                .send();

            return expectCoverage(
                {
                    'GET /route': ['GET /route'],
                    'POST /route': ['POST /route'],
                },
                [],
            );
        });
    });

    describe('all methods', () => {
        beforeEach(() => {
            server = makeServer(app => {
                app.all('/directPath', simpleHandler);
            });
        });

        it('should collect for non-covered', () => {
            return expectCoverage({}, ['ALL /directPath']);
        });

        it('should collect for covered', async () => {
            await request(server)
                .get('/directPath')
                .send();

            await request(server)
                .post('/directPath')
                .send();

            return expectCoverage(
                {
                    'ALL /directPath': ['GET /directPath', 'POST /directPath'],
                },
                [],
            );
        });
    });

    describe('router', () => {
        beforeEach(() => {
            server = makeServer(app => {
                const routerB = Router().get('/routerBGet', simpleHandler);
                const routerA = Router()
                    .use('/routerB', routerB)
                    .post('/routerAPost', simpleHandler);
                app.use('/routerA', routerA);
            });
        });

        it('should collect for non-covered', () => {
            return expectCoverage({}, ['GET /routerA/routerB/routerBGet', 'POST /routerA/routerAPost']);
        });

        it('should collect for covered', async () => {
            await request(server)
                .get('/routerA/routerB/routerBGet')
                .send();

            await request(server)
                .post('/routerA/routerAPost')
                .send();

            return expectCoverage(
                {
                    'GET /routerA/routerB/routerBGet': ['GET /routerA/routerB/routerBGet'],
                    'POST /routerA/routerAPost': ['POST /routerA/routerAPost'],
                },
                [],
            );
        });
    });

    it('should ignore middleware', () => {
        server = makeServer(app => {
            app.use('/directPath', simpleMiddleware);
        });

        return expectCoverage({}, []);
    });

    it('complex case', async () => {
        server = makeServer(app => {
            registerRoutes(app);
        });

        await request(server)
            .get('/directPathGet')
            .send();

        await request(server)
            .get('/directPathGet?query=value')
            .send();

        await request(server)
            .get('/routerC/value/path/routerCGet')
            .send();

        await request(server)
            .put('/regex/whatever')
            .send();

        await request(server)
            .delete('/routerA/routeB/routeBAll')
            .send();

        return expectCoverage(
            {
                'ALL /routerA/routeB/routeBAll': ['DELETE /routerA/routeB/routeBAll'],
                'GET /directPathGet': ['GET /directPathGet', 'GET /directPathGet?query=value'],
                'GET /routerC/:paramC?/:paramC2/path/routerCGet': ['GET /routerC/value/path/routerCGet'],
                'PUT /regex\\/[a-z]+/': ['PUT /regex/whatever'],
            },
            [
                'ALL /directPathAll',
                'ALL /routerA/routeAAll',
                'DELETE /directPathDeleteParam/:withParams',
                'DELETE /routerA/routeADeleteParam/:withParams/path',
                'GET /directPathGetAnonymous',
                'GET /route',
                'GET /routerA/routeADeleteOptionalParam/:withOptionalParams?/path',
                'GET /routerA/routeAGet',
                'GET /routerA/routeAGetAnonymous',
                'GET /routerA/routeB/routeBGet',
                'GET /routerA/routeB/routeBGetAnonymous',
                'POST /directPathPost',
                'POST /route',
                'POST /routerA/routeAPost',
                'POST /routerA/routeB/routeBPost',
                'PUT /routerA/routeAPut',
                'PUT /routerA/routeB/routeBPutParam/:withParams/path',
            ],
        );
    });
});
