import pinataSDK from "@pinata/sdk";
import fs from "fs";

const PINATA_API_KEY = "b6a43730044e363ed181";
const PINATA_SECRET_KEY = "248100a1782738585b1039139ad1c0c7dc7bc887bf90455b14562b04796b03ed";

const pinata = pinataSDK(PINATA_API_KEY, PINATA_SECRET_KEY);

async function uploadFileToPinata() {
    const readableStreamForFile = fs.createReadStream("D:\\Test_git\\decentratwitter\\sword.jpg"); // ✅ Fixed Path

    const options = {
        pinataMetadata: {
            name: "MyFile",
        },
        pinataOptions: {
            cidVersion: 0,
        },
    };

    try {
        const result = await pinata.pinFileToIPFS(readableStreamForFile, options);
        console.log("File uploaded successfully:", result);
    } catch (error) {
        console.error("Error uploading to Pinata:", error);
    }
}

uploadFileToPinata();
