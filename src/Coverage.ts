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
    private static matches: RouteMatch[] = [];
    private static registeredRoutes: ParsedRoute[];
    private static registeredLayers: RouteLayer[];

    public static tryToRegisterLayers(app: Application): void {
        if (!this.registeredLayers) {
            this.registeredLayers = RouteLayer.createLayers(app);
            this.registeredRoutes = this.registeredLayers.map(l => l.getRoute()).flat();
        }
    }

    public static call(request: Request): void {
        const originalPath = request.path;

        this.matches.push(
            ...this.registeredLayers
                .filter(l => l.isMatch(request.method, originalPath))
                .map(l => l.getRoute())
                .flat()
                .map(r => ({ ...r, originalPath })),
        );
    }

    public static collectCoverage(): CoverageResult {
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
