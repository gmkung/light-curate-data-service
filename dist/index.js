"use strict";
// Main entry point for the package
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_CHAINS = exports.clearItemsCache = exports.fetchItemsByStatus = exports.fetchItemsById = exports.fetchItems = exports.fetchFromIPFS = exports.uploadJSONToIPFS = exports.uploadToIPFS = exports.graph = exports.ipfs = exports.LightCurateRegistry = void 0;
const klerosIpfsUtils = __importStar(require("./ipfs"));
const web3_1 = require("./web3");
Object.defineProperty(exports, "LightCurateRegistry", { enumerable: true, get: function () { return web3_1.LightCurateRegistry; } });
const graphUtils = __importStar(require("./graph"));
// Export IPFS utilities
exports.ipfs = klerosIpfsUtils;
// Export Graph utilities
exports.graph = graphUtils;
// Re-export specific functions for convenience
exports.uploadToIPFS = klerosIpfsUtils.uploadToIPFS, exports.uploadJSONToIPFS = klerosIpfsUtils.uploadJSONToIPFS, exports.fetchFromIPFS = klerosIpfsUtils.fetchFromIPFS;
exports.fetchItems = graphUtils.fetchItems, exports.fetchItemsById = graphUtils.fetchItemsById, exports.fetchItemsByStatus = graphUtils.fetchItemsByStatus, exports.clearItemsCache = graphUtils.clearItemsCache;
// Export constants
exports.SUPPORTED_CHAINS = {
    ETHEREUM_MAINNET: 1,
    GNOSIS_CHAIN: 100,
};
// Export types
__exportStar(require("./types"), exports);
