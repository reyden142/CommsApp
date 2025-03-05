const path = require("path");

module.exports = {
  mode: "development", // or 'production' for production builds
  entry: "./components/Email.js", // Entry point of your React app
  output: {
    path: path.resolve(__dirname, "dist"), // Output directory
    filename: "bundle.js", // Name of the bundled file
  },
  devtool: "source-map", // Add source maps for easier debugging

  resolve: {
    fallback: {
      path: require.resolve("path-browserify"), // Polyfill for 'path'
    },
    extensions: [".js", ".jsx"], // Allow importing .js and .jsx files without specifying the extension
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          "style-loader", // Injects CSS into the DOM
          "css-loader", // Interprets @import and url() like import/require() and will resolve them
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
      },
    ],
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "public"),
    },
    compress: true,
    port: 3000,
  },
};
