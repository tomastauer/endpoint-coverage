import { Application } from 'express';

interface ExpressRoute {
    stack: ExpressRouteLayer[];
    path: string;
    _handles_method: (method: string) => boolean;
}

interface ExpressRouteParam {
    name: string;
    optional: boolean;
    offset: number;
    fragment: number;
}

interface FastSlashObject {
    fast_slash: boolean;
}

export type RouteParams = ExpressRouteParam;

export interface ExpressRouteLayer {
    path?: string;
    name: string;
    route: ExpressRoute;
    handle: ExpressRoute;
    regexp: RegExp;
    method: string;
    keys: ExpressRouteParam[];
    match: (path: string) => boolean;
    params?: Record<string, string>;
}

export interface ParsedRoute {
    method: string;
    path: string;
    params?: RouteParams[];
}

export class RouteLayer {
    constructor(private innerLayer: ExpressRouteLayer) {}

    public isMatch(method: string, path: string): boolean {
        return this.innerLayer.route._handles_method(method) && this.innerLayer.match(path);
    }

    public getRoute(): ParsedRoute[] {
        const parsedRoute = this.getRouteFromLayer(this.innerLayer);
        const uniqueRoutes: ParsedRoute[] = [];
        parsedRoute
            .filter(r => r.path !== '*')
            .forEach(route => {
                if (!uniqueRoutes.find(u => u.method === route.method && u.path === route.path)) {
                    uniqueRoutes.push(route);
                }
            });

        return uniqueRoutes.map(this.fixParamOffsets).map(this.addParamFragmentNumber);
    }

    public static createLayers(app: Application): RouteLayer[] {
        return app._router.stack
            .filter((layer: ExpressRouteLayer) => layer.name !== 'coverageMiddleware' && layer.route)
            .map((layer: ExpressRouteLayer) => new RouteLayer(layer));
    }

    private isRouteNode(layer: ExpressRouteLayer): boolean {
        return Boolean(layer.route);
    }

    private isRouterNode(layer: ExpressRouteLayer): boolean {
        return Boolean(layer.name === 'router' && layer.handle.stack);
    }

    private isLeaf(layer: ExpressRouteLayer): boolean {
        return Boolean(layer.method);
    }

    private getPath(fragment: string | RegExp | FastSlashObject): string {
        if (typeof fragment === 'string') {
            return fragment;
        } else if ((fragment as FastSlashObject).fast_slash) {
            return '';
        } else {
            const match = fragment
                .toString()
                .replace('\\/?', '')
                .replace('(?=\\/|$)', '$')
                .match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//);
            return match ? match[1].replace(/\\(.)/g, '$1') : `<complex:'${fragment.toString()}'>`;
        }
    }

    // based on https://github.com/expressjs/express/issues/3308#issuecomment-300957572
    private getRouteFromLayer(layer: ExpressRouteLayer, currentPath = ''): ParsedRoute[] {
        let result: ParsedRoute[] = [];

        if (this.isRouteNode(layer)) {
            result = result.concat(
                ...layer.route.stack.map(l => this.getRouteFromLayer(l, currentPath + this.getPath(layer.route.path))),
            );
        } else if (this.isRouterNode(layer)) {
            result = result.concat(
                ...layer.handle.stack.map(l => this.getRouteFromLayer(l, currentPath + this.getPath(layer.regexp))),
            );
        } else if (this.isLeaf(layer)) {
            result = [
                {
                    method: layer.method.toLocaleLowerCase(),
                    path: currentPath + this.getPath(layer.regexp),
                },
            ];
        }

        if (layer.keys.length) {
            result.forEach(r => {
                r.params = layer.keys.flat();
            });
        }

        return result;
    }

    private fixParamOffsets(route: ParsedRoute): ParsedRoute {
        let tmpPath = route.path;
        let offset = 0;

        if (route.params) {
            route.params.forEach(param => {
                param.offset = offset + tmpPath.indexOf(param.name);
                offset = param.offset + param.name.length;
                tmpPath = tmpPath.substring(offset);
            });
        }

        return route;
    }

    private addParamFragmentNumber(route: ParsedRoute): ParsedRoute {
        if (route.params) {
            route.params.forEach(param => {
                param.fragment = (route.path.substring(0, param.offset).match(/\//g) || []).length - 1;
            });
        }

        return route;
    }
}
