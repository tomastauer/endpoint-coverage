import { RequestHandler } from 'express';

export interface ExpressLayer {
    handle: RouterObject | RequestHandler;
    name: string;
    params: any;
    path: any;
    keys: any;
    regexp: RegExp;
    method?: string;
}

export interface RouterObject {
    stack: ExpressLayer[];
}

export interface ExpressLayerRoute extends ExpressLayer {
    name: 'bound dispatch';
    route: Route;
}

export interface ExpressLayerRouter extends ExpressLayer {
    name: 'router';
    handle: RouterObject;
}

export interface Route {
    path: string;
    stack: ExpressLayer[];
    methods: Record<string, boolean>;
}

export interface LayerWithPathAndMethod {
    node: ExpressLayerRoute;
    method: string | null;
    path: ExpressLayer[];
}
