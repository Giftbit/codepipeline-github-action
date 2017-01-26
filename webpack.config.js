const failPlugin = require('webpack-fail-plugin');
const path = require('path');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = {
    entry: path.join(__dirname, 'src', 'index.ts'),
    target: 'node',
    node: {
        // Allow these globals.
        __filename: false,
        __dirname: false
    },
    output: {
        path: 'dist',
        filename: 'index.js',
        libraryTarget: 'commonjs2'
    },
    externals: {
        // These modules are already installed on the Lambda instance.
        'aws-sdk': 'aws-sdk',
        'awslambda': 'awslambda',
        'dynamodb-doc': 'dynamodb-doc',
        'imagemagick': 'imagemagick',

        // Has dynamic imports so we'll leave it out.
        'github': 'github'
    },
    bail: true,
    resolve: {
        extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js']
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader?presets[]=es2015&compact=false'
            },
            {
                test: /\.json$/,
                loader: 'json-loader'
            },
            {
                test: /\.ts(x?)$/,
                loader: 'babel-loader?presets[]=es2015&compact=false!ts-loader'
            }
        ]
    },
    plugins: [
        failPlugin,
        new ZipPlugin({
            path: path.join(__dirname, 'dist'),
            pathPrefix: "",
            filename: `dist.zip`
        })
    ]
};
