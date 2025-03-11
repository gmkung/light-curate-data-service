export declare const uploadToIPFS: (data: Uint8Array, fileName: string) => Promise<string>;
export declare const uploadJSONToIPFS: (data: any) => Promise<string>;
export declare function fetchFromIPFS(ipfsPath: string): Promise<any>;
