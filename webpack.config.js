const path = require('path');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = {
    entry: path.join(__dirname, 'src', 'index.ts'),
    target: 'node',
    node: {
        // Allow these globals.
        __filename: false,
        __dirname: false,
        Base64: false
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'index.js',
        libraryTarget: 'commonjs2'
    },
    externals: {
        // These modules are already installed on the Lambda instance.
        'aws-sdk': 'aws-sdk',
        'awslambda': 'awslambda',
        'dynamodb-doc': 'dynamodb-doc',
        'imagemagick': 'imagemagick'
    },
    bail: true,
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['es2015'],
                            compact: false
                        }
                    }
                ]
            },
            {
                test: /\.ts(x?)$/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['es2015'],
                            compact: false
                        }
                    },
                    'ts-loader'
                ]
            },
            {
                test: /\.jpe?g$|\.gif$|\.png$|\.svg$|\.woff$|\.ttf$|\.wav$|\.mp3$/,
                use: [
                    'file-loader'
                ]
            }
        ]
    },
    plugins: [
        new ZipPlugin({
            path: path.join(__dirname, 'dist'),
            pathPrefix: "",
            filename: `dist.zip`
        })
    ]
};
