import { RouteLayer } from './RouteLayer';
import express from 'express';

describe(RouteLayer.name, () => {
    const matchTestCases = [
        ['get', '/path', 'get', '/', false],
        ['get', '/', 'get', '/', true],
        ['get', '/', 'post', '/', false],
        ['get', '/path', 'get', '/anotherPath', false],
        ['get', '/path/path', 'get', '/path', false],
        ['get', '/path/:param', 'get', '/path/someParam', true],
        ['get', '/path/:param', 'get', '/path', false],
        ['get', '/path/:param?', 'get', '/path/someParam', true],
        ['get', '/path/:param?', 'get', '/path', true],
        ['get', '/[A-Z]+', 'get', '/asd', true],
        ['get', '/[A-Z]+', 'get', '/123', false],
    ] as const;

    const routeTestCases = [
        ['get', '/path', [{ method: 'get', path: '/path' }]],
        ['get', '/', [{ method: 'get', path: '/' }]],
        ['get', '/[A-Z]+', [{ method: 'get', path: '/[A-Z]+' }]],
        ['post', '/', [{ method: 'post', path: '/' }]],
        ['get', '/path/path', [{ method: 'get', path: '/path/path' }]],
        [
            'get',
            '/path/:param',
            [
                {
                    method: 'get',
                    path: '/path/:param',
                    params: [{ name: 'param', offset: 7, optional: false, fragment: 1 }],
                },
            ],
        ],
        [
            'get',
            '/path/:param?',
            [
                {
                    method: 'get',
                    path: '/path/:param?',
                    params: [{ name: 'param', offset: 7, optional: true, fragment: 1 }],
                },
            ],
        ],
        [
            'get',
            '/path/:param/:param?',
            [
                {
                    method: 'get',
                    path: '/path/:param/:param?',
                    params: [
                        { name: 'param', offset: 7, optional: false, fragment: 1 },
                        { name: 'param', offset: 14, optional: true, fragment: 2 },
                    ],
                },
            ],
        ],
    ] as const;

    it.each(matchTestCases)(
        'should correctly match the route for registered route %s: %s and called route %s: %s',
        (registeredMethod, registeredPath, calledMethod, calledPath, expectedMatch) => {
            const app = express();

            app[registeredMethod](registeredPath, (_, res) => {
                res.end();
            });

            const routeLayer = RouteLayer.createLayers(app);
            expect(routeLayer[0].isMatch(calledMethod, calledPath)).toEqual(expectedMatch);
        },
    );

    it.each(routeTestCases)(
        'should correctly get parsed route for registered route %s: %s',
        (registeredMethod, registeredPath, expectedRoute) => {
            const app = express();

            app[registeredMethod](registeredPath, (_, res) => {
                res.end();
            });

            const routeLayer = RouteLayer.createLayers(app);
            expect(routeLayer[0].getRoute()).toEqual(expectedRoute);
        },
    );
});
