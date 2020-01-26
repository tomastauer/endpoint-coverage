import { RequestHandler, Router, Application } from 'express';
import { coverageMiddleware } from './coverageMiddleware';

export function registerRoutes(app: Application): void {
    const dh: RequestHandler = (_, res) => {
        res.end();
    };

    const dm: RequestHandler = (_, __, next) => {
        next();
    };
    app.use(coverageMiddleware());

    app.use(dm, dm);
    app.use('/directPathMiddleware', dm, dm);
    app.get('/directPathGet', dh, dh);
    app.get('/directPathGetAnonymous', (_, res) => {
        res.end();
    });
    app.post('/directPathPost', dh, dh);
    app.put(/regex\/[a-z]+/, dh, dh);
    app.delete('/directPathDeleteParam/:withParams', dh, dh);
    app.all('/directPathAll', dh, dh);

    app.route('/route')
        .get(dh, dh)
        .post(dh, dh);

    const routerC = Router().get('/routerCGet', dh, dh);
    app.use('/routerC/:paramC?/:paramC2/path', routerC);

    const routerB = Router()
        .get('/routeBGet', dh, dh)
        .post('/routeBPost', dh, dh)
        .put('/routeBPutParam/:withParams/path', dh, dh)
        .all('/routeBAll', dh, dh)
        .get('/routeBGetAnonymous', (_, res) => {
            res.end();
        })
        .use('/routeBMiddleware', dm, dm);

    const routerA = Router()
        .get('/routeAGet', dh, dh)
        .post('/routeAPost', dh, dh)
        .put('/routeAPut', dm)
        .delete('/routeADeleteParam/:withParams/path', dm)
        .get('/routeADeleteOptionalParam/:withOptionalParams?/path', dm)
        .all('/routeAAll', dh, dh)
        .get('/routeAGetAnonymous', (_, res) => {
            res.end();
        })
        .use('/routeAMiddleware', dm, dm)
        .use('/routeB', routerB);

    app.use('/routerA', routerA);
}
