import { NextFunction, Request, Response } from 'express';
import { Coverage } from './Coverage';

export function coverageMiddleware(request: Request, _: Response, next: NextFunction): void {
    Coverage.tryToRegisterLayers(request.app);
    Coverage.call(request);

    next();
}
