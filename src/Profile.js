import { useState, useEffect } from 'react';
import { ethers } from "ethers";
import { Row, Form, Button, Card, Col } from 'react-bootstrap';
import axios from 'axios'; // Ensure axios is installed: npm install axios

// Replace the IPFS client with Pinata configuration
const pinataApiKey = 'f0fd3280b6448cafdd2d';
const pinataSecretApiKey = '0786b96e7a3c991204757410a01877c9dce9dc66c684b7499dfd6e084c87ac5f';
const pinataGateway = 'https://orange-impressed-eagle-940.mypinata.cloud/ipfs/';
const gatewayKey = "WOBUO3SiJI5g_pqtyj2akLuKqlmp8dgDL3Ibc-XYm_tlorBBU47Ty2vrKLxS8VB"; // Your Gateway Key


const App = ({ contract }) => {
    const [profile, setProfile] = useState(null);
    const [nfts, setNfts] = useState([]);
    const [avatar, setAvatar] = useState(null);
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);

    // Load NFTs for the user

    const ipfsGateway = "https://ipfs.io/ipfs/";
    const pinataGateway = "https://gateway.pinata.cloud/ipfs/";


    const loadMyNFTs = async () => {
        try {
            const results = await contract.getMyNfts();
            
            let nfts = await Promise.all(results.map(async (i) => {
                try {
                    let uri = await contract.tokenURI(i);
                    console.log("Fetching metadata from URI:", uri);
    
                    // Convert IPFS URI to a public gateway URL
                    if (uri.startsWith("ipfs://")) {
                        uri = `https://ipfs.io/ipfs/${uri.split("ipfs://")[1]}`;
                    }
    
                    const response = await axios.get(uri, {
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
    
                    if (response.status !== 200) {
                        console.error("Error retrieving metadata, status code:", response.status);
                        return {
                            id: i,
                            username: "Error loading",
                            avatar: ""
                        };
                    }
    
                    const metadata = response.data;
                    console.log("Fetched Metadata:", metadata);
    
                    // Extract CID from the avatar field if it's a Pinata URL or IPFS URI
                    let avatarUrl = metadata.avatar;
    
                    if (avatarUrl.includes("/ipfs/")) {
                        // Extract the CID from the URL
                        const parts = avatarUrl.split("/ipfs/");
                        if (parts.length > 1) {
                            const avatarCid = parts[1].split("?")[0]; // Remove any query parameters
                            avatarUrl = `https://ipfs.io/ipfs/${avatarCid}`;
                        }
                    }
    
                    return {
                        id: i,
                        avatar: avatarUrl || '',
                        username: metadata.username || 'Unknown'
                    };
                } catch (error) {
                    console.error("Error fetching NFT metadata:", error);
                    return {
                        id: i,
                        username: "Error loading",
                        avatar: ""
                    };
                }
            }));
    
            setNfts(nfts);
            getProfile(nfts);
        } catch (error) {
            console.error("Error in loadMyNFTs:", error);
        } finally {
            setLoading(false);
        }
    };
    
    
    
    
    
    const getProfile = async (nfts) => {
        try {
            const address = await contract.signer.getAddress();
            const id = await contract.profiles(address);
            const profile = nfts.find((i) => i.id.toString() === id.toString());
    
            if (profile) { // Ensure profile exists before setting state
                setProfile(profile);
            } else {
                console.warn("Profile not found.");
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    };
    

    // Upload avatar to Pinata
    const uploadToPinata = async (event) => {
        event.preventDefault();
        const file = event.target.files[0];
        if (!file) {
            console.error("No file selected for upload.");
            return;
        }
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                formData,
                {
                    headers: {
                        'pinata_api_key': pinataApiKey,
                        'pinata_secret_api_key': pinataSecretApiKey
                    },
                }
            );
            setAvatar(`${pinataGateway}${response.data.IpfsHash}`);
        } catch (error) {
            console.error("Error uploading file to Pinata:", error);
        }
    };

    // Mint NFT Profile
    const mintProfile = async () => {
        if (!avatar || !username) {
            alert("Please upload an avatar and enter a username!");
            return;
        }
        try {
            const metadata = { avatar, username };

            // Upload metadata JSON to Pinata
            const response = await axios.post(
                "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                metadata,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'pinata_api_key': pinataApiKey,
                        'pinata_secret_api_key': pinataSecretApiKey
                    }
                }
            );

            setLoading(true);
            await (await contract.mint(`${pinataGateway}${response.data.IpfsHash}`)).wait();
            loadMyNFTs();
        } catch (error) {
            console.error("Pinata metadata upload error:", error);
            alert("Pinata metadata upload error: " + error.message);
        }
    };

    // Switch Profile
    const switchProfile = async (nft) => {
        setLoading(true);
        await contract.setProfile(nft.id);
        await loadMyNFTs();
    };

    useEffect(() => {
        loadMyNFTs();
    }, []);

    if (loading) return (
        <div className='text-center'>
            <main style={{ padding: "1rem 0" }}>
                <h2>Loading...</h2>
            </main>
        </div>
    );

    return (
        <div className="mt-4 text-center">
            {profile ? (
                <div className="mb-3">
                    <h3 className="mb-3">{profile.username || "Unnamed"}</h3>
                    <img className="mb-3" style={{ width: '400px' }} src={profile.avatar || ''} alt="Profile" />
                </div>
            ) : (
                <h4 className="mb-4">No NFT profile, please create one...</h4>
            )}

            <div className="row">
                <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1000px' }}>
                    <div className="content mx-auto">
                        <Row className="g-4">
                            <Form.Control
                                type="file"
                                required
                                name="file"
                                onChange={uploadToPinata}
                            />
                            <Form.Control
                                onChange={(e) => setUsername(e.target.value)}
                                size="lg"
                                required
                                type="text"
                                placeholder="Username"
                            />
                            <div className="d-grid px-0">
                                <Button onClick={mintProfile} variant="primary" size="lg">
                                    Mint NFT Profile
                                </Button>
                            </div>
                        </Row>
                    </div>
                </main>
            </div>

            <div className="px-5 container">
                <Row xs={1} md={2} lg={4} className="g-4 py-5">
                    {nfts.map((nft, idx) => (
                        nft.id !== (profile?.id || null) && (
                            <Col key={idx} className="overflow-hidden">
                                <Card>
                                    <Card.Img variant="top" src={nft.avatar} />
                                    <Card.Body>
                                        <Card.Title>{nft.username}</Card.Title>
                                    </Card.Body>
                                    <Card.Footer>
                                        <div className='d-grid'>
                                            <Button onClick={() => switchProfile(nft)} variant="primary" size="lg">
                                                Set as Profile
                                            </Button>
                                        </div>
                                    </Card.Footer>
                                </Card>
                            </Col>
                        )
                    ))}
                </Row>
            </div>
        </div>
    );
};

export default App;
