"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadJSONToIPFS = exports.uploadToIPFS = void 0;
exports.fetchFromIPFS = fetchFromIPFS;
const uploadToIPFS = async (data, fileName) => {
    const blob = new Blob([data], { type: "application/octet-stream" });
    const formdata = new FormData();
    formdata.append("data", blob, fileName);
    try {
        const response = await fetch("https://kleros-api.netlify.app/.netlify/functions/upload-to-ipfs?operation=file&pinToGraph=false", {
            method: "POST",
            body: formdata,
            redirect: "follow",
        });
        if (!response.ok) {
            throw new Error(`Failed to upload to IPFS: ${response.statusText}`);
        }
        const result = (await response.json());
        const cid = result.cids[0]; // Extract the first CID from the cids array
        console.log("Uploaded to IPFS:", cid);
        return cid;
    }
    catch (error) {
        console.error("IPFS upload error:", error);
        throw error;
    }
};
exports.uploadToIPFS = uploadToIPFS;
const uploadJSONToIPFS = async (data) => {
    const jsonString = JSON.stringify(data, null, 2);
    const jsonBytes = new TextEncoder().encode(jsonString);
    return (0, exports.uploadToIPFS)(jsonBytes, "item.json");
};
exports.uploadJSONToIPFS = uploadJSONToIPFS;
async function fetchFromIPFS(ipfsPath) {
    try {
        // Remove '/ipfs/' prefix if present
        const cleanPath = ipfsPath.replace(/^\/ipfs\//, "");
        const url = `https://ipfs.io/ipfs/${cleanPath}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error("Error fetching from IPFS:", error);
        throw error;
    }
}
