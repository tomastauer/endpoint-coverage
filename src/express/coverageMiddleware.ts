import { NextFunction, Request, Response, RequestHandler } from 'express';
import { Coverage } from './Coverage';

export function coverageMiddleware(): RequestHandler {
    const coverage = new Coverage();

    return (request: Request, _: Response, next: NextFunction): void => {
        coverage.tryToInjectCoverageRoute(request.app);
        coverage.tryToRegisterResultEndpoint(request.app);

        next();
    };
}
