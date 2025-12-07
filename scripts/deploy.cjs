const hre = require("hardhat");

async function main() {
    console.log("Deploying ERC-8004 Agent Identity Contract...");

    const AgentIdentity = await hre.ethers.getContractFactory("ERC8004AgentIdentity");
    const agentIdentity = await AgentIdentity.deploy();

    await agentIdentity.waitForDeployment();

    const address = await agentIdentity.getAddress();

    console.log("ERC8004AgentIdentity deployed to:", address);

    // Wait for block confirmations
    console.log("Waiting for block confirmations...");
    await agentIdentity.deploymentTransaction().wait(5);

    console.log("Contract verified deployed.");

    // Verify on Etherscan
    try {
        await hre.run("verify:verify", {
            address: address,
            constructorArguments: [],
        });
    } catch (error) {
        console.log("Verification failed (optional):", error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
