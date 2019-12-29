import { Request, Application } from 'express';
import { RouteLayer, ParsedRoute } from './RouteLayer';

export interface CoverageResult {
    coveredRoutes: Record<string, string[]>;
    notCoveredRoutes: string[];
}

interface RouteMatch extends ParsedRoute {
    originalPath: string;
}

export class Coverage {
    private matches: RouteMatch[] = [];
    private registeredRoutes: ParsedRoute[] = [];
    private registeredLayers: RouteLayer[] = [];
    private endpointRegistered = false;

    public tryToRegisterLayers(app: Application): void {
        if (!this.registeredLayers.length) {
            this.registeredLayers = RouteLayer.createLayers(app);
            this.registeredRoutes = this.registeredLayers.map(l => l.getRoute()).flat();
        }
    }

    public tryToRegisterResultEndpoint(app: Application): void {
        if (!this.endpointRegistered) {
            app.get('/coverageResult', (_, res) => {
                res.status(200)
                    .header('Content-type', 'application/json')
                    .send(this.collectCoverage());
            });
            this.endpointRegistered = true;
        }
    }

    public call(request: Request): void {
        const originalPath = request.path;

        this.matches.push(
            ...this.registeredLayers
                .filter(l => l.isMatch(request.method, originalPath))
                .map(l => l.getRoute())
                .flat()
                .map(r => ({ ...r, originalPath })),
        );
    }

    public collectCoverage(): CoverageResult {
        const coveredRoutes: Record<string, string[]> = {};
        this.matches.forEach(match => {
            (coveredRoutes[match.path] = coveredRoutes[match.path] || []).push(match.originalPath);
        });

        const notCoveredRoutes = (this.registeredRoutes || [])
            .filter(f => !this.matches.some(m => m.path === f.path))
            .map(r => r.path);

        return { coveredRoutes, notCoveredRoutes };
    }
}
