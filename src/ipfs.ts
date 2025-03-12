interface IPFSResponse {
  cids: string[];
  size: number;
}

export const uploadToIPFS = async (
  data: Uint8Array,
  fileName: string
): Promise<string> => {
  const blob = new Blob([data], { type: "application/octet-stream" });
  const formdata = new FormData();
  formdata.append("data", blob, fileName);

  try {
    const response = await fetch(
      "https://kleros-api.netlify.app/.netlify/functions/upload-to-ipfs?operation=file&pinToGraph=true",
      {
        method: "POST",
        body: formdata,
        redirect: "follow" as RequestRedirect,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to upload to IPFS: ${response.statusText}`);
    }

    const result = (await response.json()) as IPFSResponse;
    const cid = result.cids[0]; // Extract the first CID from the cids array

    console.log("Uploaded to IPFS:", cid);
    return cid;
  } catch (error) {
    console.error("IPFS upload error:", error);
    throw error;
  }
};

export const uploadJSONToIPFS = async (data: any): Promise<string> => {
  const jsonString = JSON.stringify(data, null, 2);
  const jsonBytes = new TextEncoder().encode(jsonString);

  return uploadToIPFS(jsonBytes, "item.json");
};

export async function fetchFromIPFS(ipfsPath: string): Promise<any> {
  try {
    // Remove '/ipfs/' prefix if present
    const cleanPath = ipfsPath.replace(/^\/ipfs\//, "");
    const url = `https://cdn.kleros.link/ipfs/${cleanPath}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching from IPFS:", error);
    throw error;
  }
}
