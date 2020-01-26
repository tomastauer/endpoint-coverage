import { ExpressLayer, LayerWithPathAndMethod } from './types';
import { isRoute } from './utilities';

type LayerRegexp = RegExp | string | { fast_slash: boolean };

interface Key {
    name: string;
    optional: boolean;
}

const PARAM_PLACEHOLDER = '__param__';

function getMethod(layer: LayerWithPathAndMethod): string {
    return (layer.method || 'all').toUpperCase();
}

function withPlaceholders(regex: string, keys: Key[]): string {
    let result = regex;

    keys.forEach(key => {
        if (key.optional) {
            result = result.replace('(?:\\/([^\\/]+?))?', PARAM_PLACEHOLDER);
        } else {
            result = result.replace('\\/(?:([^\\/]+?))', PARAM_PLACEHOLDER);
        }
    });

    return result;
}

function replacePlaceholdersWithParameters(input: string, keys: Key[]): string {
    let result = input;

    keys.forEach(key => {
        result = result.replace(PARAM_PLACEHOLDER, `/:${key.name}${key.optional ? '?' : ''}`);
    });

    return result;
}

function formatLayer(layer: ExpressLayer): string {
    if (isRoute(layer) && layer.route.path) {
        return layer.route.path;
    }
    const t = layer.regexp as LayerRegexp;

    if (typeof t === 'string') {
        return t;
    } else if ('fast_slash' in t && t.fast_slash) {
        return '';
    } else {
        const replaced = withPlaceholders(
            t
                .toString()
                .replace('\\/?', '')
                .replace('(?=\\/|$)', '$'),
            layer.keys,
        );

        const match = replaced.match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//);

        return match
            ? replacePlaceholdersWithParameters(match[1].replace(/\\(.)/g, '$1'), layer.keys)
            : '<regex:' + t.toString() + '>';
    }
}

export function formatLayerPath(layer: LayerWithPathAndMethod): string {
    return `${getMethod(layer)} ${layer.path.map(formatLayer).join('')}`;
}
