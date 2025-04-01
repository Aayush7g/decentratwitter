import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Form, Button, Card, ListGroup } from 'react-bootstrap'
import axios from 'axios' // You'll need to install axios: npm install axios

// Replace IPFS client with Pinata configuration
const pinataApiKey = 'f0fd3280b6448cafdd2d'
const pinataSecretApiKey = '0786b96e7a3c991204757410a01877c9dce9dc66c684b7499dfd6e084c87ac5f'
const pinataGateway = 'https://orange-impressed-eagle-940.mypinata.cloud/ipfs/'

const pinataJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJhMzJmNjczNi03YWQyLTRlNWQtYmRhYy1iOTYzZGFkYjFlNDAiLCJlbWFpbCI6InNwYW0uYWF5dXNoZ2FkaXlhN0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYjZhNDM3MzAwNDRlMzYzZWQxODEiLCJzY29wZWRLZXlTZWNyZXQiOiIyNDgxMDBhMTc4MjczODU4NWIxMDM5MTM5YWQxYzBjN2RjN2JjODg3YmY5MDQ1NWIxNDU2MmIwNDc5NmIwM2VkIiwiZXhwIjoxNzcyNzQyNjYyfQ.1HvXPCSbjcTBSmGiSXx4Sqv8nBD6Zce5yr1J2SxwsC8'


const Home = ({ contract }) => {
    const [posts, setPosts] = useState('')
    const [hasProfile, setHasProfile] = useState(false)
    const [post, setPost] = useState('')
    const [address, setAddress] = useState('')
    const [loading, setLoading] = useState(true)

    const loadPosts = async () => {
        // Get user's address
        let address = await contract.signer.getAddress()
        setAddress(address)
        // Check if user owns an nft
        // and if they do set profile to true
        const balance = await contract.balanceOf(address)
        setHasProfile(balance.toNumber() > 0)
        // Get all posts
        let results = await contract.getAllPosts()
        // Fetch metadata of each post and add that to post object.
        let posts = await Promise.all(results.map(async i => {
            // use hash to fetch the post's metadata stored on ipfs 
            // Updated to use Pinata gateway
            let response = await fetch(`${pinataGateway}${i.hash}`)
            let text = await response.text();
            try {
                const metadataPost = JSON.parse(text);
            } catch (error) {
                console.error("Error parsing JSON:", text);
            }
            const metadataPost = await response.json()
            try {
                let response = await fetch(`${pinataGateway}${i.hash}`);
                metadataPost = await response.json();
            } catch (error) {
                console.error("Error fetching post metadata:", error);
                return null;
            }
            // get authors nft profile
            const nftId = await contract.profiles(i.author)
            // get uri url of nft profile
            const uri = await contract.tokenURI(nftId)
            // fetch nft profile metadata
            response = await fetch(uri)
            const metadataProfile = await response.json()
            // define author object
            const author = {
                address: i.author,
                username: metadataProfile.username,
                avatar: metadataProfile.avatar
            }
            // define post object
            let post = {
                id: i.id,
                content: metadataPost.post,
                tipAmount: i.tipAmount,
                author
            }
            return post
        }))
        posts = posts.sort((a, b) => b.tipAmount - a.tipAmount)
        // Sort posts from most tipped to least tipped. 
        setPosts(posts)
        setLoading(false)

    }

    useEffect(() => {
        if (!posts.length) {
            loadPosts();
        }
    }, [posts]);

    const uploadPost = async () => {
        if (!post) return window.alert('Please enter a post!');
    
        const postData = JSON.stringify({ post });
        
        try {
          const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${pinataJWT}`
            },
            body: postData
          });
    
          const data = await response.json();
          if (!data.IpfsHash) throw new Error('Failed to upload post to Pinata');
          
          const hash = data.IpfsHash;   
          await (await contract.uploadPost(hash)).wait();
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
                                    <Button onClick={uploadPost} variant="primary" size="lg">
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
                                        {post.content}
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