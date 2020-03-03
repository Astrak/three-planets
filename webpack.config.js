var path = require("path");

module.exports = {
    entry: "./index.ts",
    devServer: {
        contentBase: path.resolve(__dirname),
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "bundle.js",
        publicPath: "/dist/",
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    module: {
        rules: [{ test: /\.tsx?$/, loader: "ts-loader" }],
    },
};
