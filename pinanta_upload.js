import pinata from './pinata.cjs';
import fs from 'fs';

const uploadToPinata = async (filePath) => {
    const fileStream = fs.createReadStream(filePath);
    try {
        const result = await pinata.pinFileToIPFS(fileStream);
        console.log("Uploaded to IPFS:", result);
    } catch (error) {
        console.error("IPFS Upload Error:", error);
    }
};

uploadToPinata("sword.jpg");
