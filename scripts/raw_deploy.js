
import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Starting raw deployment to Base Sepolia...");

    const rpcUrl = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
    const privateKey = process.env.BASE_PRIVATE_KEY;

    if (!privateKey) {
        throw new Error("BASE_PRIVATE_KEY not found in .env");
    }

    // Provider and Wallet
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`Deploying from address: ${wallet.address}`);
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);

    // Read Artifact
    const artifactPath = path.resolve(__dirname, "../artifacts/contracts/ERC8004AgentIdentity.sol/ERC8004AgentIdentity.json");
    if (!fs.existsSync(artifactPath)) {
        throw new Error(`Artifact not found at ${artifactPath}. Did you run 'npx hardhat compile'?`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const { abi, bytecode } = artifact;

    // Deploy
    console.log("Deploying contract...");
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy();

    console.log("Waiting for deployment transaction...");
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log(`✅ ERC8004AgentIdentity DEPLOYED at: ${address}`);

    // Save to file for easy access
    fs.writeFileSync("deployed_address.txt", address);
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
});
