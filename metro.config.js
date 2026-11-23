const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// 1. expo-sqlite en web usa wa-sqlite compilado a WebAssembly (.wasm). Metro no trata
//    .wasm como asset por defecto, por eso no lo resolvía aunque el archivo existiera.
config.resolver.assetExts.push('wasm');

// 2. wa-sqlite usa SharedArrayBuffer, que el navegador solo habilita si la página está
//    "aislada" (cross-origin isolated) con estas dos cabeceras HTTP del servidor de desarrollo.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;