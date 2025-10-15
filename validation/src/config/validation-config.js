// Validation-only configuration and helpers.
// Not for production use. Do not import this from runtime application code.
import { WEBSOCKET_CONFIG } from 'shared';
export const VALIDATION_CONFIG = {
    RECONNECT: {
        BASE_MS: 500,
        MAX_MS: 5000,
        JITTER_MS: 100,
    },
    STUB_PORTS: {
        tv: 4301,
        remote: 4302,
    },
};
export function buildLocalServerUrl(host = 'localhost') {
    return `ws://${host}:${WEBSOCKET_CONFIG.SERVER_DEFAULT_PORT}${WEBSOCKET_CONFIG.WS_PATH}`;
}
