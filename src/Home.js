import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Form, Button, Card, ListGroup } from 'react-bootstrap'
import axios from 'axios' // You'll need to install axios: npm install axios

// Replace IPFS client with Pinata configuration
const pinataApiKey = 'f0fd3280b6448cafdd2d'
const pinataSecretApiKey = '0786b96e7a3c991204757410a01877c9dce9dc66c684b7499dfd6e084c87ac5f'
const pinataGateway = 'https://orange-impressed-eagle-940.mypinata.cloud/ipfs/'
const pinataGatewayToken = '-WOBUO3SiJI5g_pqtyj2akLuKqlmp8dgDL3Ibc-XYm_tlorBBU47Ty2vrKLxS8VB'
const pinataJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJhMzJmNjczNi03YWQyLTRlNWQtYmRhYy1iOTYzZGFkYjFlNDAiLCJlbWFpbCI6InNwYW0uYWF5dXNoZ2FkaXlhN0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYjZhNDM3MzAwNDRlMzYzZWQxODEiLCJzY29wZWRLZXlTZWNyZXQiOiIyNDgxMDBhMTc4MjczODU4NWIxMDM5MTM5YWQxYzBjN2RjN2JjODg3YmY5MDQ1NWIxNDU2MmIwNDc5NmIwM2VkIiwiZXhwIjoxNzcyNzQyNjYyfQ.1HvXPCSbjcTBSmGiSXx4Sqv8nBD6Zce5yr1J2SxwsC8'


const Home = ({ contract }) => {
    const [posts, setPosts] = useState('')
    const [hasProfile, setHasProfile] = useState(false)
    const [post, setPost] = useState('')
    const [address, setAddress] = useState('')
    const [loading, setLoading] = useState(true)



    const loadPosts = async () => {
        setLoading(true);

        try {
            const address = await contract.signer.getAddress();
            setAddress(address);

            const balance = await contract.balanceOf(address);
            setHasProfile(balance.toNumber() > 0);

            const results = await contract.getAllPosts();
            const posts = await Promise.all(results.map(async (post) => {
                const response = await fetch(`${pinataGateway}${post.hash}?pinataGatewayToken=${pinataGatewayToken}`);
                const metadata = await response.json();
                console.log(response);

                const nftId = await contract.profiles(post.author);
                const uri = await contract.tokenURI(nftId);
                const profileResponse = await fetch(uri);
                const profileMetadata = await profileResponse.json();

                return {
                    id: post.id,
                    content: metadata.post,
                    tipAmount: post.tipAmount,
                    author: {
                        address: post.author,
                        username: profileMetadata.username,
                        avatar: profileMetadata.avatar,
                    },
                };
            }));

            setPosts(posts.sort((a, b) => b.tipAmount - a.tipAmount));
        } catch (error) {
            console.error('Error loading posts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPosts();
    }, []);

    const uploadPost = async () => {
        if (!post) {
            window.alert('Please enter a post!');
            return;
        }

        const postContent = { post };

        try {
            const response = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', postContent, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${pinataJWT}`,
                },
            });

            const { IpfsHash } = response.data;
            if (!IpfsHash) throw new Error('Failed to upload post to Pinata');

            await (await contract.uploadPost(IpfsHash)).wait();
            loadPosts();
        } catch (error) {
            window.alert(`Error uploading post: ${error.message}`);
        }
    };


    const tip = async (post) => {
        // tip post owner
        await (await contract.tipPostOwner(post.id, { value: ethers.utils.parseEther("0.1") })).wait()
        loadPosts()
    }

    if (loading) return (
        <div className='text-center'>
            <main style={{ padding: "1rem 0" }}>
                <h2>Loading...</h2>
            </main>
        </div>
    )

    return (
        <div className="container-fluid mt-5">
            {hasProfile ?
                (<div className="row">
                    <main role="main" className="col-lg-12 mx-auto" style={{ maxWidth: '1000px' }}>
                        <div className="content mx-auto">
                            <Row className="g-4">
                                <Form.Control onChange={(e) => setPost(e.target.value)} size="lg" required as="textarea" />
                                <div className="d-grid px-0">
                                    <Button onClick={() => uploadPost(post)} variant="primary" size="lg">
                                        Post!
                                    </Button>

                                </div>
                            </Row>
                        </div>
                    </main>
                </div>)
                :
                (<div className="text-center">
                    <main style={{ padding: "1rem 0" }}>
                        <h2>Must own an NFT to post</h2>
                    </main>
                </div>)
            }

            <p>&nbsp;</p>
            <hr />
            <p className="my-auto">&nbsp;</p>
            {posts.length > 0 ?
                posts.map((post, key) => {
                    return (
                        <div key={key} className="col-lg-12 my-3 mx-auto" style={{ width: '1000px' }}>
                            <Card border="primary">
                                <Card.Header>
                                    <img
                                        className='mr-2'
                                        width='30'
                                        height='30'
                                        src={post.author.avatar}
                                    />
                                    <small className="ms-2 me-auto d-inline">
                                        {post.author.username}
                                    </small>
                                    <small className="mt-1 float-end d-inline">
                                        {post.author.address}
                                    </small>
                                </Card.Header>
                                <Card.Body color="secondary">
                                    <Card.Title>
                                        {post.content || 'No content available'}
                                    </Card.Title>
                                    
                                </Card.Body>
                                <Card.Footer className="list-group-item">
                                    <div className="d-inline mt-auto float-start">Tip Amount: {ethers.utils.formatEther(post.tipAmount)} ETH</div>
                                    {address === post.author.address || !hasProfile ?
                                        null : <div className="d-inline float-end">
                                            <Button onClick={() => tip(post)} className="px-0 py-0 font-size-16" variant="link" size="md">
                                                Tip for 0.1 ETH
                                            </Button>
                                        </div>}
                                </Card.Footer>
                            </Card>
                        </div>)
                })
                : (
                    <div className="text-center">
                        <main style={{ padding: "1rem 0" }}>
                            <h2>No posts yet</h2>
                        </main>
                    </div>
                )}

        </div >
    );
}

export default Home