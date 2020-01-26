import { ExpressLayer, ExpressLayerRoute, ExpressLayerRouter } from './types';
import { COVERAGE_ENDPOINT } from './constants';

export function isRoute(layer: ExpressLayer): layer is ExpressLayerRoute {
    return layer.name === 'bound dispatch';
}

export function isRouter(layer: ExpressLayer): layer is ExpressLayerRouter {
    return layer.name === 'router';
}

export function isCoverageEndpoint(layer: ExpressLayer): boolean {
    return isRoute(layer) && layer.route.path === COVERAGE_ENDPOINT;
}

export function notUndefined<T>(x: T | undefined): x is T {
    return x !== undefined;
}
