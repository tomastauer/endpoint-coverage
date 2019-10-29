import { coverageMiddleware } from './coverageMiddleware';
import { Coverage, CoverageResult } from './Coverage';

function collectCoverage(): CoverageResult {
    return Coverage.collectCoverage();
}

export { coverageMiddleware, collectCoverage };
