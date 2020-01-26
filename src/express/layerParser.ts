import { ExpressLayer, ExpressLayerRoute, ExpressLayerRouter, LayerWithPathAndMethod, RouterObject } from './types';
import { Application } from 'express';
import { isRoute, isRouter, isCoverageEndpoint, notUndefined } from './utilities';
import { SUPPORTED_VERBS } from './constants';

interface LayerWithParent {
    node: Layer;
    parent: LayerWithParent | null;
}

interface LayerRouteWithMethod {
    layer: ExpressLayerRoute;
    method: string | null;
}

interface LayerRouteWithPath {
    layer: ExpressLayerRoute;
    path: Layer[];
}

interface SplitRouters {
    routes: LayerRouteWithMethod[];
    routers: ExpressLayer[][];
}

type Layer = ExpressLayerRoute | ExpressLayerRouter;

function revertParentTree(layer: LayerWithParent): LayerRouteWithPath {
    const path = [layer.node];
    let currentLayer = layer;

    while (currentLayer.parent) {
        currentLayer = currentLayer.parent;
        path.push(currentLayer.node);
    }

    return { layer: layer.node as ExpressLayerRoute, path: path.reverse() };
}

function filterRelevantLayers(layers: ExpressLayer[]): Layer[] {
    return layers.filter(l => (isRouter(l) || isRoute(l)) && !isCoverageEndpoint(l)) as Layer[];
}

function hasAllVerbs(layerRoute: ExpressLayerRoute): boolean {
    return SUPPORTED_VERBS.every(verb => layerRoute.route.methods[verb]);
}

function getUniqueMethodLayers(layers: ExpressLayer[]): ExpressLayer[] {
    const uniqueLayers: ExpressLayer[] = [];
    layers.forEach(l => {
        if (!uniqueLayers.some(ul => ul.method === l.method)) {
            uniqueLayers.push(l);
        }
    });

    return uniqueLayers;
}

function spreadRoute(layerRoute: ExpressLayerRoute): LayerRouteWithMethod[] {
    if (hasAllVerbs(layerRoute)) {
        return [{ layer: layerRoute, method: null }];
    }
    return getUniqueMethodLayers(layerRoute.route.stack).map(layer => ({
        layer: layerRoute,
        method: layer.method || null,
    }));
}

function splitRouters(layers: LayerRouteWithMethod[]): SplitRouters {
    const stackInHandle = (layer: ExpressLayerRoute): boolean => 'stack' in layer.route.stack[0].handle;

    const routes = layers.filter(l => !stackInHandle(l.layer));
    const routers = layers
        .filter(l => stackInHandle(l.layer))
        .map(l => (l.layer.route.stack[0].handle as RouterObject).stack);

    return { routes, routers };
}

function getLeafLayers(layers: LayerWithParent[]): LayerWithPathAndMethod[] {
    return layers
        .flatMap(l => {
            if (isRouter(l.node)) {
                return getLeafLayers(filterRelevantLayers(l.node.handle.stack).map(s => ({ node: s, parent: l })));
            }
            if (isRoute(l.node)) {
                const withPath = revertParentTree(l);
                const spread = spreadRoute(l.node);

                const splitSpread = splitRouters(spread);

                return [
                    ...splitSpread.routers.flatMap(stack =>
                        getLeafLayers(filterRelevantLayers(stack).map(s => ({ node: s, parent: l }))),
                    ),
                    ...splitSpread.routes.map(s => ({
                        node: s.layer,
                        method: s.method,
                        path: withPath.path,
                    })),
                ];
            }
        })
        .filter(notUndefined);
}

export function getLeafLayersFromApp(app: Application): LayerWithPathAndMethod[] {
    return getLeafLayers(filterRelevantLayers(app._router.stack).map(s => ({ node: s, parent: null })));
}
