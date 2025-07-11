require('dotenv').config();
const ethers = require('ethers');
const axios = require('axios');
const prompt = require('prompt-sync')({ sigint: true });

const CHAIN_ID = 443;
const ZEN_CONTRACT = '0xDa701a7231096209C4F5AC83F44F22eFA75f4519';
const BETTING_CONTRACT = '0x88fa5aA29BFd406Cd052595cCD8B1347913Aa1E7';
const BATTLESHIPS_CONTRACT = '0xD64206151CEAE054962E2eD7aC16aad5e39c3Ef3';
const HOUSE_API_URL = 'https://houseof.ten.xyz/api/player-actions';

// --- Konstanta Battleships baru untuk value heksadesimal ---
const BATTLESHIPS_VALUE_AMOUNT = '0xfbd0fc05ae000'; // Value Battleships dalam heksadesimal
// -------------------------------------------------------------

// Konstanta TENZEN
const TENZEN_CONTRACT = '0xDa701a7231096209C4F5AC83F44F22eFA75f4519';
const TENZEN_FUNCTION_SELECTOR = '0x93e84cd9';
const TENZEN_VALUE_AMOUNT = '0xfbd0fc05ae000';
const TENZEN_GAS_PRICE = ethers.parseUnits('120', 'gwei');
const TENZEN_GAS_LIMIT = 128453;

const AI_OPTIONS = [
    { name: 'CZHuffle', address: '0x9fde625ed8a6ec0f3ca393a62be34231a5c167f4' },
    { name: 'Vitalik Pokerin', address: '0x7B7057B07218fa9f357E39cb2fC2E723C2bfcf9F' },
    { name: 'Marc All-Indressen', address: '0xd2e443F6CF19d5d359e82bbEea76e1133028fda5' },
    { name: 'Do Kwonfold', address: '0x6bCdBe37024304C1C9F1F8AFDc69250aD24E17C3' },
    { name: 'Sam Bankroll-Fried', address: '0x9Fde625ED8A6eC0f3cA393A62be34231a5c167F4' },
];

const colors = {
    reset: '\x1b[0m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    white: '\x1b[37m',
    bold: '\x1b[1m',
};

const logger = {
    info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
    wallet: (msg) => console.log(`${colors.yellow}[➤] ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
    loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
    step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
    banner: () => {
        console.log(`${colors.cyan}${colors.bold}`);
        console.log(`---------------------------------------------`);
        console.log(` TEN PEPEK `);
        console.log(`---------------------------------------------${colors.reset}\n`);
    },
};

// ABI Contracts
const zenABI = [
    'function approve(address spender, uint256 amount) public returns (bool)',
    'function balanceOf(address account) public view returns (uint256)',
];

const bettingABI = ['function placeBet(uint256 betType, address aiAddress, uint256 amount) public'];

function generateRandomCoordinates() {
    return {
        x: Math.floor(Math.random() * 100),
        y: Math.floor(Math.random() * 100)
    };
}

function displayMainMenu() {
    logger.step('Main Menu:');
    console.log(`${colors.cyan}1. HouseOfTen Game${colors.reset}`);
    console.log(`${colors.cyan}2. Tenzen Game${colors.reset}`);
    console.log(`${colors.cyan}3. Battleships Game${colors.reset}`);
    console.log(`${colors.cyan}4. Dexynth Perpetual${colors.reset}`);
    console.log(`${colors.cyan}5. Chimp Dex${colors.reset}`);
    console.log(`${colors.cyan}6. Exit${colors.reset}`);
}

function getMenuSelection() {
    displayMainMenu();
    const choice = parseInt(prompt('Enter the number of your choice: '));
    if (isNaN(choice) || choice < 1 || choice > 6) {
        logger.error('Invalid selection. Please choose a valid number.');
        return getMenuSelection();
    }
    if (choice === 4) {
        logger.error('Dexynth Perpetual is Coming Soon. Please choose another option.');
        return getMenuSelection();
    }
    if (choice === 5) {
        logger.error('Chimp Dex is Coming Soon. Please choose another option.');
        return getMenuSelection();
    }
    return choice;
}

function displayAIMenu() {
    logger.step('Select an AI to bet against:');
    AI_OPTIONS.forEach((ai, index) => {
        console.log(`${colors.cyan}${index + 1}. ${ai.name}${colors.reset}`);
    });
}

function getAISelection() {
    displayAIMenu();
    const choice = parseInt(prompt('Enter the number of your choice: '));
    if (isNaN(choice) || choice < 1 || choice > AI_OPTIONS.length) {
        logger.error('Invalid selection. Please choose a valid number.');
        return getAISelection();
    }
    return AI_OPTIONS[choice - 1];
}

async function checkZENBalance(wallet, zenContract) {
    logger.loading(`Checking ZEN balance for ${wallet.address}...`);
    try {
        const balance = await zenContract.balanceOf(wallet.address);
        const balanceETH = ethers.formatEther(balance);
        logger.info(`ZEN Balance: ${balanceETH} ETH`);
        return balance;
    } catch (error) {
        logger.error(`Error checking ZEN balance for ${wallet.address}: ${error.message}`);
        throw error;
    }
}

async function checkETHBalance(wallet, provider) {
    logger.loading(`Checking ETH balance for ${wallet.address}...`);
    try {
        const balance = await provider.getBalance(wallet.address);
        const balanceETH = ethers.formatEther(balance);
        logger.info(`ETH Balance: ${balanceETH} ETH`);
        return balance;
    } catch (error) {
        logger.error(`Error checking ETH balance for ${wallet.address}: ${error.message}`);
        throw error;
    }
}

async function approveZEN(wallet, zenContract, spender, amount) {
    logger.loading(`Approving ${ethers.formatEther(amount)} ZEN for ${spender} from ${wallet.address}...`);
    try {
        const tx = await zenContract.connect(wallet).approve(spender, amount);
        logger.info(`Approve TX Hash: ${tx.hash}`);
        const receipt = await tx.wait();
        logger.success(`Approve TX confirmed in block ${receipt.blockNumber}`);
        return receipt;
    } catch (error) {
        logger.error(`Error approving ZEN from ${wallet.address}: ${error.message}`);
        throw error;
    }
}

async function placeBet(wallet, bettingContract, betType, aiAddress, amount) {
    logger.loading(`Placing bet of ${ethers.formatEther(amount)} ZEN from ${wallet.address}...`);
    try {
        const tx = await bettingContract.connect(wallet).placeBet(betType, aiAddress, amount, {
            gasLimit: 300000,
        });
        logger.info(`Bet TX Hash: ${tx.hash}`);
        const receipt = await tx.wait();
        logger.success(`Bet TX confirmed in block ${receipt.blockNumber}`);
        return receipt;
    } catch (error) {
        logger.error(`Error placing bet from ${wallet.address}: ${error.message}`);
        throw error;
    }
}

async function notifyHouseAPI(walletAddress, betAmount, aiAddress) {
    logger.loading('Notifying HouseOfTen API of bet placement...');
    try {
        const payload = {
            walletId: walletAddress,
            action: 'placed_bet',
            betAmount: parseFloat(betAmount),
            aiAddress: aiAddress,
            bettingContract: BETTING_CONTRACT,
        };

        const response = await axios.post(HOUSE_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': '*/*',
            },
        });

        logger.success('HouseOfTen API notified successfully');
        logger.info(`API Response: ${JSON.stringify(response.data)}`);
        return response.data;
    } catch (error) {
        logger.error(`Error notifying HouseOfTen API: ${error.message}`);
        throw error;
    }
}

async function playBattleships(wallet, provider, x, y) {
    logger.loading(`Playing Battleships game at coordinates (${x}, ${y}) for ${wallet.address}...`);
    try {
        if (x < 0 || x > 99 || y < 0 || y > 99) {
            throw new Error('Coordinates must be between 0 and 99');
        }

        const toPaddedHex = (num) => {
            const hex = num.toString(16);
            return '0'.repeat(64 - hex.length) + hex;
        };

        const xPadded = toPaddedHex(x);
        const yPadded = toPaddedHex(y);

        const data = `0xf201f038${xPadded}${yPadded}`;

        const nonce = await provider.getTransactionCount(wallet.address, 'latest');

        const txData = {
            to: BATTLESHIPS_CONTRACT,
            data: data,
            gasLimit: 210000,
            gasPrice: ethers.parseUnits('130', 'gwei'),
            chainId: CHAIN_ID,
            nonce: nonce,
            // --- Menggunakan nilai heksadesimal langsung untuk Battleships ---
            value: BATTLESHIPS_VALUE_AMOUNT 
            // -----------------------------------------------------------------
        };

        logger.info('Sending transaction with data:', {
            to: txData.to,
            data: txData.data,
            gasLimit: txData.gasLimit.toString(),
            gasPrice: txData.gasPrice.toString(),
            chainId: txData.chainId,
            nonce: txData.nonce,
            value: txData.value ? txData.value.toString() : '0'
        });

        const tx = await wallet.sendTransaction(txData);
        logger.info(`Play TX Hash: ${tx.hash}`);
        const receipt = await tx.wait();

        if (receipt.status === 0) {
            throw new Error('Transaction reverted');
        }

        logger.success(`Play TX confirmed in block ${receipt.blockNumber}`);
        return receipt;
    } catch (error) {
        logger.error(`Error playing Battleships game at (${x}, ${y}) for ${wallet.address}: ${error.message}`);
        throw error;
    }
}

async function playTenzenGame(wallet, provider) {
    logger.loading(`Starting Tenzen Game for ${wallet.address}...`);
    try {
        const ethBalance = await checkETHBalance(wallet, provider);
        const requiredValueBigInt = ethers.toBigInt(TENZEN_VALUE_AMOUNT); 
        
        if (ethBalance < requiredValueBigInt + ethers.parseEther('0.005')) {
            logger.error(`Insufficient ETH balance for Tenzen. Required: at least ${ethers.formatEther(requiredValueBigInt + ethers.parseEther('0.005'))} ETH`);
            return;
        }

        const nonce = await provider.getTransactionCount(wallet.address, 'latest');

        const txData = {
            to: TENZEN_CONTRACT,
            data: TENZEN_FUNCTION_SELECTOR,
            gasLimit: TENZEN_GAS_LIMIT,
            gasPrice: TENZEN_GAS_PRICE,
            chainId: CHAIN_ID,
            nonce: nonce,
            value: TENZEN_VALUE_AMOUNT
        };

        logger.info('Sending Tenzen transaction with data:', {
            to: txData.to,
            data: txData.data,
            gasLimit: txData.gasLimit.toString(),
            gasPrice: txData.gasPrice.toString(),
            chainId: txData.chainId,
            nonce: txData.nonce,
            value: txData.value ? txData.value.toString() : '0'
        });

        const tx = await wallet.sendTransaction(txData);
        logger.info(`Tenzen TX Hash: ${tx.hash}`);
        const receipt = await tx.wait();

        if (receipt.status === 0) {
            throw new Error('Transaction reverted');
        }

        logger.success(`Tenzen TX confirmed in block ${receipt.blockNumber}`);
        return receipt;
    } catch (error) {
        logger.error(`Error playing Tenzen Game for ${wallet.address}: ${error.message}`);
        throw error;
    }
}

async function houseOfTenGameAutomated(wallet, provider, zenContract, bettingContract, selectedAI, betAmountETH) {
    try {
        logger.step(`Starting HouseOfTen Game for ${wallet.address} (AI: ${selectedAI.name}, Bet: ${betAmountETH} ETH)...`);
        const betAmountWei = ethers.parseEther(betAmountETH);
        const betType = 1;

        const zenBalance = await checkZENBalance(wallet, zenContract);
        if (zenBalance < betAmountWei) {
            logger.error(`Insufficient ZEN balance. Required: ${ethers.formatEther(betAmountWei)} ETH`);
            return;
        }
        const ethBalance = await checkETHBalance(wallet, provider);
        if (ethBalance < ethers.parseEther('0.01')) {
            logger.error('Insufficient ETH balance for gas fees. Required: 0.01 ETH');
            return;
        }

        await approveZEN(wallet, zenContract, BETTING_CONTRACT, betAmountWei);
        await placeBet(wallet, bettingContract, betType, selectedAI.address, betAmountWei);
        await notifyHouseAPI(wallet.address, betAmountETH, selectedAI.address);

        logger.success('HouseOfTen bet placed successfully!');
    } catch (error) {
        logger.error(`HouseOfTen Game failed for ${wallet.address}: ${error.message}`);
    }
}

async function battleshipsGame(wallet, provider) {
    try {
        logger.step('Starting Battleships Game...');

        let { x, y } = generateRandomCoordinates();
        logger.info(`Selected coordinates: (${x}, ${y})`);

        const requiredZEN = ethers.parseEther('0.001');
        const zenContract = new ethers.Contract(ZEN_CONTRACT, zenABI, wallet);
        const zenBalance = await checkZENBalance(wallet, zenContract);
        if (zenBalance < requiredZEN) {
            logger.warn(`ZEN balance for Battleships is less than ${ethers.formatEther(requiredZEN)} ETH. This might not be an issue if ZEN isn't strictly required for Battleships.`);
        }

        const ethBalance = await checkETHBalance(wallet, provider);
        // Penting: Mengonversi BATTLESHIPS_VALUE_AMOUNT ke BigInt untuk perbandingan
        const requiredBattleshipsValueBigInt = ethers.toBigInt(BATTLESHIPS_VALUE_AMOUNT);

        // Memastikan saldo ETH mencukupi untuk value + perkiraan gas fee
        if (ethBalance < requiredBattleshipsValueBigInt + ethers.parseEther('0.01')) { // 0.01 ETH sebagai margin gas
            logger.error(`Insufficient ETH balance for Battleships. Required: at least ${ethers.formatEther(requiredBattleshipsValueBigInt + ethers.parseEther('0.01'))} ETH`);
            return;
        }

        try {
            await playBattleships(wallet, provider, x, y);
            logger.success('Battleships game played successfully!');
        } catch (error) {
            const newCoords = generateRandomCoordinates();
            logger.warn(`Trying new coordinates: (${newCoords.x}, ${newCoords.y})`);

            try {
                await playBattleships(wallet, provider, newCoords.x, newCoords.y);
                logger.success('Battleships game played successfully with new coordinates!');
            } catch (error) {
                logger.error(`Battleships Game failed after trying 2 different coordinates for ${wallet.address}: ${error.message}`);
            }
        }
    } catch (error) {
        logger.error(`Battleships Game failed for ${wallet.address}: ${error.message}`);
    }
}


async function main() {
    logger.banner();

    const accounts = [];
    for (let i = 1; ; i++) {
        const privateKey = process.env[`PRIVATE_KEY_${i}`];
        const rpcUrl = process.env[`RPC_URL_${i}`];

        if (!privateKey && !rpcUrl) {
            break;
        }
        if (!privateKey || !rpcUrl) {
            logger.error(`Mismatched configuration for account ${i}. Missing PRIVATE_KEY_${i} or RPC_URL_${i}.`);
            process.exit(1);
        }
        accounts.push({ privateKey, rpcUrl });
    }

    if (accounts.length === 0) {
        logger.error('No private key and RPC URL pairs found in .env (e.g., PRIVATE_KEY_1, RPC_URL_1).');
        process.exit(1);
    }

    while (true) {
        const globalChoice = getMenuSelection();

        if (globalChoice === 6) {
            logger.success('Exiting Ten Testnet Auto Bot. Goodbye!');
            break;
        }

        let betAmountETH = null;
        let selectedAI = null;

        if (globalChoice === 1) {
            selectedAI = getAISelection();
            logger.info(`Selected AI for all accounts: ${selectedAI.name} (${selectedAI.address})`);
            betAmountETH = prompt('Enter bet amount in ETH (e.g., 0.01) for all accounts: ');
            if (isNaN(parseFloat(betAmountETH)) || parseFloat(betAmountETH) <= 0) {
                logger.error('Invalid bet amount. Returning to main menu.');
                console.log('\n');
                continue;
            }
        }

        for (const [index, account] of accounts.entries()) {
            console.log(`\n${colors.bold}--- Processing Account ${index + 1}/${accounts.length} ---${colors.reset}`);
            try {
                const currentProvider = new ethers.JsonRpcProvider(account.rpcUrl);
                const currentWallet = new ethers.Wallet(account.privateKey, currentProvider);

                const currentZenContract = new ethers.Contract(ZEN_CONTRACT, zenABI, currentWallet);
                const currentBettingContract = new ethers.Contract(BETTING_CONTRACT, bettingABI, currentWallet);

                logger.wallet(`Wallet Address: ${currentWallet.address}`);
                logger.info(`Using RPC: ${account.rpcUrl}`);

                if (globalChoice === 1) {
                    await houseOfTenGameAutomated(currentWallet, currentProvider, currentZenContract, currentBettingContract, selectedAI, betAmountETH);
                } else if (globalChoice === 2) {
                    await playTenzenGame(currentWallet, currentProvider);
                } else if (globalChoice === 3) {
                    await battleshipsGame(currentWallet, currentProvider);
                }

            } catch (error) {
                logger.error(`Error processing account ${index + 1} (${account.rpcUrl}): ${error.message}`);
            }
            if (index < accounts.length - 1) {
                logger.info('Waiting 10 seconds before processing next account...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
        }
        logger.success('All accounts processed for the selected action.');
        console.log('\n');
    }

    logger.success('Exiting Ten Testnet Auto Bot. Goodbye!');
}

main().catch((error) => {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
