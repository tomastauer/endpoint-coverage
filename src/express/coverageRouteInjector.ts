import { ExpressLayer, LayerWithPathAndMethod } from './types';
import { RequestHandler } from 'express';
import { COVERAGE_REPORTER } from './constants';

function getUniqueMethodLayers(layers: ExpressLayer[], method: string | null): ExpressLayer[] {
    const uniqueLayers: ExpressLayer[] = [];
    layers.forEach(l => {
        if (!uniqueLayers.some(ul => ul.method === l.method) && (!method || l.method === method)) {
            uniqueLayers.push(l);
        }
    });

    return uniqueLayers;
}

export function injectCoverageRoute(layer: LayerWithPathAndMethod, coverageHandler: RequestHandler): void {
    const stackLayers = layer.node.route.stack;

    getUniqueMethodLayers(stackLayers, layer.method).forEach(l => {
        const reporter = Object.create(l) as ExpressLayer;
        reporter.name = COVERAGE_REPORTER;
        reporter.handle = coverageHandler;
        reporter.keys = l.keys;
        reporter.method = l.method;
        reporter.params = l.params;
        reporter.path = l.path;
        reporter.regexp = l.regexp;

        stackLayers.unshift(reporter);
    });
}
