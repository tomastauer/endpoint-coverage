import { Application, Request } from 'express';
import { getLeafLayersFromApp } from './layerParser';
import { injectCoverageRoute } from './coverageRouteInjector';
import { formatLayerPath } from './layerFormatter';
import { LayerWithPathAndMethod } from './types';
import { COVERAGE_ENDPOINT } from './constants';

export interface CoverageResult {
    coveredRoutes: Record<string, string[]>;
    notCoveredRoutes: string[];
}

export class Coverage {
    private matchedLayers: Map<LayerWithPathAndMethod, string[]> = new Map<LayerWithPathAndMethod, string[]>();
    private registeredLayers: LayerWithPathAndMethod[] = [];
    private coverageRouteRegistered = false;
    private endpointRegistered = false;

    public tryToInjectCoverageRoute(app: Application): void {
        if (this.coverageRouteRegistered) {
            return;
        }

        this.coverageRouteRegistered = true;
        this.registeredLayers = getLeafLayersFromApp(app);
        this.registeredLayers.forEach(layer => {
            injectCoverageRoute(layer, (req, __, next) => {
                if (!req.url.includes(COVERAGE_ENDPOINT)) {
                    this.updateMatchedLayers(layer, req);
                }

                next();
            });
        });
    }

    private updateMatchedLayers(layer: LayerWithPathAndMethod, request: Request): void {
        const matchedLayer = this.matchedLayers.get(layer);
        const urlRepresentation = this.getUrlRepresentation(request);

        if (matchedLayer) {
            matchedLayer.push(urlRepresentation);
        } else {
            this.matchedLayers.set(layer, [urlRepresentation]);
        }
    }

    public tryToRegisterResultEndpoint(app: Application): void {
        if (this.endpointRegistered) {
            return;
        }

        if (!this.endpointRegistered) {
            this.endpointRegistered = true;
            app.get(COVERAGE_ENDPOINT, (_, res) => {
                res.status(200)
                    .header('Content-type', 'application/json')
                    .send(this.collectCoverage());
            });
        }
    }

    private getUrlRepresentation(request: Request): string {
        return `${request.method.toUpperCase()} ${request.originalUrl}`;
    }

    private collectCoverage(): CoverageResult {
        const notCoveredLayers = this.registeredLayers.filter(l => !this.matchedLayers.has(l));

        const coveredRoutes: Record<string, string[]> = {};
        for (const [layer, urls] of this.matchedLayers.entries()) {
            const formatted = formatLayerPath(layer);
            coveredRoutes[formatted] = urls;
        }

        const notCoveredRoutes = notCoveredLayers.map(formatLayerPath);

        return { coveredRoutes, notCoveredRoutes };
    }
}
