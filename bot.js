// TEN PROKONTOL
require('dotenv').config();
const ethers = require('ethers');
const { formatEther, parseEther, parseUnits, toBigInt } = ethers;
const axios = require('axios');
const prompt = require('prompt-sync')({ sigint: true });


const SEPOLIA_CHAIN_ID = 11155111;
const TEN_CHAIN_ID = 443; 

const SEPOLIA_BRIDGE_CONTRACT = '0x007522bfE81C3a2ff8D885b65eEc2C9b68E30348';
const TEN_BRIDGE_CONTRACT = '0x796EFCB0941Cf84aa7079e124dB8b5D3082A76Fb';
const BRIDGE_DEPOSIT_FUNCTION_SELECTOR = '0x1888d712';


const ZEN_CONTRACT = '0xa02e395b0d05a33f96c0d4e74c76c1a2ee7ef3ae'; 
const BETTING_CONTRACT = '0xc288b41e88cc04dfec6e81df8b705791e94a0b64';
const BATTLESHIPS_CONTRACT = '0xD64206151CEAE054962E2eD7aC16aad5e39c3Ef3';
const HOUSE_API_URL = 'https://houseof.ten.xyz/api/player-actions';

const BATTLESHIPS_VALUE_AMOUNT = '0xfbd0fc05ae000'; 

const TENZEN_CONTRACT = '0xDa701a7231096209C4F5AC83F44F22eFA75f4519';
const TENZEN_FUNCTION_SELECTOR = '0x93e84cd9';
const TENZEN_VALUE_AMOUNT = '0xfbd0fc05ae000';
const TENZEN_GAS_PRICE = parseUnits('120', 'gwei'); 
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
    gray: '\x1b[90m',
};

const gameMessageLogs = [];
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
    gameLog: (msg) => {
        const formattedMsg = `${colors.gray}[GAME LOG] ${msg}${colors.reset}`;
        console.log(formattedMsg);
        gameMessageLogs.push(msg);
    },
    displayGameLogs: () => {
        console.log(`\n${colors.bold}${colors.gray}--- BATTLESHIPS MESSAGE LOG ---${colors.reset}`);
        if (gameMessageLogs.length === 0) {
            console.log(`${colors.gray}    No game messages yet.${colors.reset}`);
        } else {
            gameMessageLogs.forEach(log => console.log(`${colors.gray}    ${log}${colors.reset}`));
        }
        console.log(`${colors.bold}${colors.gray}-------------------------------${colors.reset}\n`);
    }
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
    console.log(`${colors.cyan}6. Bridge Sepolia to Ten Testnet (ETH)${colors.reset}`);
    console.log(`${colors.cyan}7. Bridge Ten Testnet to Sepolia (ETH)${colors.reset}`); 
    console.log(`${colors.cyan}8. Exit${colors.reset}`); 
}

function getMenuSelection() {
    displayMainMenu();
    const choice = parseInt(prompt('Enter the number of your choice: '));
    if (isNaN(choice) || choice < 1 || choice > 8) { 
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
        const balanceFormatted = formatEther(balance); 
        logger.info(`ZEN Balance: ${balanceFormatted} ZEN`); // Changed to ZEN
        return balance;
    } catch (error) {
        logger.error(`Error checking ZEN balance for ${wallet.address}: ${error.message}`);
        throw error;
    }
}

async function checkETHBalance(wallet, provider, chainName = 'ETH') {
    logger.loading(`Checking ${chainName} balance for ${wallet.address}...`);
    try {
        const balance = await provider.getBalance(wallet.address);
        const balanceFormatted = formatEther(balance); 
        logger.info(`${chainName} Balance: ${balanceFormatted} ETH`);
        return balance;
    } catch (error) {
        logger.error(`Error checking ${chainName} balance for ${wallet.address}: ${error.message}`);
        throw error;
    }
}

async function approveZEN(wallet, zenContract, spender, amount) {
    logger.loading(`Approving ${formatEther(amount)} ZEN for ${spender} from ${wallet.address}...`); 
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
    logger.loading(`Placing bet of ${formatEther(amount)} ZEN from ${wallet.address}...`); 
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

// --- NEW FUNCTION FOR HOUSEOFTEN GAME AUTOMATION ---
async function houseOfTenGameAutomated(wallet, provider, zenContract, bettingContract, selectedAI, betAmountZEN_String) {
    logger.loading(`Starting HouseOfTen Game for ${wallet.address} against ${selectedAI.name}...`);
    try {
        // Parse the bet amount string into BigInt for ZEN (which has 18 decimals, like ETH)
        const betAmountWei = parseEther(betAmountZEN_String); 

        // 1. Check ZEN balance
        const zenBalance = await checkZENBalance(wallet, zenContract);
        if (zenBalance < betAmountWei) {
            logger.error(`Insufficient ZEN balance. Required: ${betAmountZEN_String} ZEN. You have ${formatEther(zenBalance)} ZEN. Skipping this account.`);
            return;
        }

        // 2. Approve ZEN for the betting contract
        logger.step(`Approving ${betAmountZEN_String} ZEN for the Betting Contract (${BETTING_CONTRACT})...`);
        await approveZEN(wallet, zenContract, BETTING_CONTRACT, betAmountWei);

        // 3. Place the bet
        // Assuming betType 0 for simplicity, adjust if different bet types are needed based on game logic
        logger.step(`Placing bet of ${betAmountZEN_String} ZEN against ${selectedAI.name}...`);
        await placeBet(wallet, bettingContract, 1, selectedAI.address, betAmountWei);

        // 4. Notify HouseOfTen API
        logger.step('Notifying HouseOfTen API...');
        await notifyHouseAPI(wallet.address, parseFloat(betAmountZEN_String), selectedAI.address); // API usually expects float

        logger.success('HouseOfTen game played successfully!');
    } catch (error) {
        logger.error(`HouseOfTen Game failed for ${wallet.address}: ${error.message}`);
        throw error; 
    }
}
// --- END NEW FUNCTION ---

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
            gasLimit: 250000, 
            gasPrice: parseUnits('20', 'gwei'), 
            chainId: TEN_CHAIN_ID, 
            nonce: nonce,
            value: BATTLESHIPS_VALUE_AMOUNT
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
        
        logger.gameLog(`TARGET STRIKE TX: ${tx.hash}`);
        logger.gameLog(`STRIKING TARGET at (${x}, ${y})...`);
        logger.gameLog(`GRAVEYARD INFO UPDATED.`); 

        return receipt;
    } catch (error) {
        logger.error(`Error playing Battleships game at (${x}, ${y}) for ${wallet.address}: ${error.message}`);
        logger.gameLog(`SHOT FAILED at (${x}, ${y}). Error: ${error.message}`); 
        throw error;
    }
}

async function playTenzenGame(wallet, provider) {
    logger.loading(`Starting Tenzen Game for ${wallet.address}...`);
    try {
        const ethBalance = await checkETHBalance(wallet, provider, 'TenETH');
        const requiredValueBigInt = toBigInt(TENZEN_VALUE_AMOUNT); 
        
        if (ethBalance < requiredValueBigInt + parseEther('0.005')) { 
            logger.error(`Insufficient TenETH balance for Tenzen. Required: at least ${formatEther(requiredValueBigInt + parseEther('0.005'))} TenETH`); 
            return;
        }

        const nonce = await provider.getTransactionCount(wallet.address, 'latest');

        const txData = {
            to: TENZEN_CONTRACT,
            data: TENZEN_FUNCTION_SELECTOR,
            gasLimit: TENZEN_GAS_LIMIT,
            gasPrice: TENZEN_GAS_PRICE,
            chainId: TEN_CHAIN_ID,
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

const globalShotCoordinates = new Set(); 

async function battleshipsGame(wallet, provider) {
    try {
        logger.step('Starting Battleships Game...');

        const ethBalance = await checkETHBalance(wallet, provider, 'TenETH');
        const requiredValueBigInt = toBigInt(BATTLESHIPS_VALUE_AMOUNT); 
        const gasPrice = parseUnits('20', 'gwei'); 
        const gasLimit = 250000; 
        const estimatedGasCost = BigInt(gasLimit) * gasPrice;
        const totalCost = requiredValueBigInt + estimatedGasCost;

        if (ethBalance < totalCost) {
            logger.error(`Insufficient TenETH balance for Battleships. Required: ~${formatEther(totalCost)} TenETH, but you only have ${formatEther(ethBalance)} TenETH.`); 
            logger.error('Please add more testnet ETH to your wallet.');
            return; 
        }

        let x, y;
        let coordKey;
        let attempts = 0;
        const MAX_ATTEMPTS = 20;

        do {
            ({ x, y } = generateRandomCoordinates());
            coordKey = `${x},${y}`;
            attempts++;
            if (attempts > MAX_ATTEMPTS) {
                logger.error('Failed to find unique coordinates after multiple attempts. All coordinates might be shot or range is too small.');
                logger.gameLog('Failed to find unique coordinates.');
                return;
            }
        } while (globalShotCoordinates.has(coordKey));

        logger.info(`Selected coordinates: (${x}, ${y})`);

        try {
            await playBattleships(wallet, provider, x, y);
            globalShotCoordinates.add(coordKey); 
            logger.success('Battleships game played successfully!');
        } catch (error) {
            logger.error(`Battleships Game failed at (${x}, ${y}) for ${wallet.address}: ${error.message}`);
        }
    } catch (error) {
        logger.error(`Battleships Game failed for ${wallet.address}: ${error.message}`);
    }
}


async function bridgeEthToTen(wallet, sepoliaRpcUrl, tenWalletAddress, amountToBridgeETH) {
    logger.step(`Initiating Bridge from Sepolia to Ten Testnet for ${wallet.address}...`);
    let sepoliaProvider;
    try {
        sepoliaProvider = new ethers.JsonRpcProvider(sepoliaRpcUrl);
        const sepoliaWallet = new ethers.Wallet(wallet.privateKey, sepoliaProvider);

        const amountToBridgeWei = parseEther(amountToBridgeETH); 

        if (isNaN(parseFloat(amountToBridgeETH)) || parseFloat(amountToBridgeETH) <= 0) {
            logger.error('Invalid bridge amount provided. Please check the initial input.');
            return;
        }

        logger.info(`Attempting to bridge ${amountToBridgeETH} ETH from Sepolia to Ten Testnet...`);

        const sepoliaEthBalance = await checkETHBalance(sepoliaWallet, sepoliaProvider, 'SepoliaETH');
        if (sepoliaEthBalance < amountToBridgeWei + parseEther('0.0001')) { 
            logger.error(`Insufficient Sepolia ETH balance. Required: at least ${formatEther(amountToBridgeWei + parseEther('0.0001'))} ETH. Skipping this account.`); 
            return;
        }

        const nonce = await sepoliaProvider.getTransactionCount(sepoliaWallet.address, 'latest');

        const data = BRIDGE_DEPOSIT_FUNCTION_SELECTOR + tenWalletAddress.substring(2).padStart(64, '0');

        const txData = {
            to: SEPOLIA_BRIDGE_CONTRACT,
            data: data,
            value: amountToBridgeWei,
            chainId: SEPOLIA_CHAIN_ID,
            nonce: nonce,
            gasLimit: 300000, 
            gasPrice: parseUnits('15', 'gwei') 
        };

        logger.info('Sending bridge transaction from Sepolia with data:', {
            to: txData.to,
            data: txData.data,
            value: formatEther(txData.value), 
            chainId: txData.chainId,
            nonce: txData.nonce,
            gasLimit: txData.gasLimit.toString(),
            gasPrice: txData.gasPrice.toString()
        });

        const tx = await sepoliaWallet.sendTransaction(txData);
        logger.info(`Bridge TX Hash (Sepolia): ${tx.hash}`);
        logger.loading('Waiting for bridge transaction to be confirmed on Sepolia...');
        const receipt = await tx.wait();

        if (receipt.status === 0) {
            throw new Error('Bridge transaction reverted on Sepolia.');
        }

        logger.success(`Bridge TX confirmed on Sepolia in block ${receipt.blockNumber}!`);
        logger.success('ETH should now be processing to appear on Ten Testnet.');
        logger.warn('Please note: Bridging can take several minutes to hours, depending on network congestion and bridge finality.');

    } catch (error) {
        logger.error(`Error bridging ETH from Sepolia: ${error.message}`);
    }
}


async function bridgeEthToSepolia(wallet, tenRpcUrl, sepoliaWalletAddress, amountToBridgeETH) {
    logger.step(`Initiating Bridge from Ten Testnet to Sepolia for ${wallet.address}...`);
    let tenProvider;
    try {
        tenProvider = new ethers.JsonRpcProvider(tenRpcUrl);
        const tenWallet = new ethers.Wallet(wallet.privateKey, tenProvider);

        const amountToBridgeWei = parseEther(amountToBridgeETH); 

        if (isNaN(parseFloat(amountToBridgeETH)) || parseFloat(amountToBridgeETH) <= 0) {
            logger.error('Invalid bridge amount provided. Please check the initial input.');
            return;
        }

        logger.info(`Attempting to bridge ${amountToBridgeETH} ETH from Ten Testnet to Sepolia...`);

        const tenEthBalance = await checkETHBalance(tenWallet, tenProvider, 'TenETH');
        if (tenEthBalance < amountToBridgeWei + parseEther('0.005')) { 
            logger.error(`Insufficient TenETH balance. Required: at least ${formatEther(amountToBridgeWei + parseEther('0.005'))} TenETH. Skipping this account.`); 
            return;
        }

        const nonce = await tenProvider.getTransactionCount(tenWallet.address, 'latest');

        const data = BRIDGE_DEPOSIT_FUNCTION_SELECTOR + sepoliaWalletAddress.substring(2).padStart(64, '0');

        const txData = {
            to: TEN_BRIDGE_CONTRACT, 
            data: data,
            value: amountToBridgeWei,
            chainId: TEN_CHAIN_ID, 
            nonce: nonce,
            gasLimit: 300000, 
            gasPrice: parseUnits('20', 'gwei') 
        };

        logger.info('Sending bridge transaction from Ten Testnet with data:', {
            to: txData.to,
            data: txData.data,
            value: formatEther(txData.value), 
            chainId: txData.chainId,
            nonce: txData.nonce,
            gasLimit: txData.gasLimit.toString(),
            gasPrice: txData.gasPrice.toString()
        });

        const tx = await tenWallet.sendTransaction(txData);
        logger.info(`Bridge TX Hash (Ten): ${tx.hash}`);
        logger.loading('Waiting for bridge transaction to be confirmed on Ten Testnet...');
        const receipt = await tx.wait();

        if (receipt.status === 0) {
            throw new Error('Bridge transaction reverted on Ten Testnet.');
        }

        logger.success(`Bridge TX confirmed on Ten Testnet in block ${receipt.blockNumber}!`);
        logger.success('ETH should now be processing to appear on Sepolia.');
        logger.warn('Please note: Bridging back to Sepolia can also take several minutes to hours, depending on network congestion and bridge finality.');

    } catch (error) {
        logger.error(`Error bridging ETH from Ten Testnet: ${error.message}`);
    }
}


async function main() {
    logger.banner();

    const accounts = [];
    const DEFAULT_SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com'; 

    for (let i = 1; ; i++) {
        const privateKey = process.env[`PRIVATE_KEY_${i}`];
        const rpcUrlTen = process.env[`RPC_URL_${i}`];
        const rpcUrlSepolia = process.env[`RPC_URL_SEPOLIA_${i}`] || process.env.RPC_URL_SEPOLIA || DEFAULT_SEPOLIA_RPC; 

        // Kondisi break yang diperbaiki: Berhenti jika tidak ada privateKey DAN tidak ada rpcUrlTen untuk indeks ini.
        if (!privateKey && !rpcUrlTen) { 
            break;
        }

        // Kondisi error: Jika salah satu ada tapi yang lain tidak (mismatched pair)
        if (!privateKey || !rpcUrlTen) {
            logger.error(`Mismatched configuration for account ${i}. Missing PRIVATE_KEY_${i} or RPC_URL_${i} (for Ten Testnet).`);
            process.exit(1);
        }

        accounts.push({ privateKey, rpcUrlTen, rpcUrlSepolia });
    }

    if (accounts.length === 0) {
        logger.error('No private key and RPC URL pairs found in .env (e.g., PRIVATE_KEY_1, RPC_URL_1).');
        process.exit(1);
    }

    while (true) {
        gameMessageLogs.length = 0; 

        const globalChoice = getMenuSelection();

        if (globalChoice === 8) { 
            logger.success('Exiting Ten Testnet Auto Bot. Goodbye!');
            break;
        }

        let betAmountZEN = null; // Changed from betAmountETH
        let bridgeAmountETH = null; 
        let selectedAI = null;
        let rounds = 1;

        if (globalChoice === 1) { // HouseOfTen Game
            selectedAI = getAISelection();
            logger.info(`Selected AI for all accounts: ${selectedAI.name} (${selectedAI.address})`);
            betAmountZEN = prompt('Enter bet amount in ZEN (e.g., 0.0001) for all accounts: '); // Prompt for ZEN
            if (isNaN(parseFloat(betAmountZEN)) || parseFloat(betAmountZEN) <= 0) {
                logger.error('Invalid bet amount. Returning to main menu.');
                console.log('\n');
                continue;
            }
            const roundsInput = parseInt(prompt('Enter number of rounds to play: '));
            if (!isNaN(roundsInput) && roundsInput > 0) {
                rounds = roundsInput;
            } else {
                logger.warn('Invalid number of rounds. Defaulting to 1 round.');
            }
        } else if (globalChoice === 2 || globalChoice === 3) { // Tenzen atau Battleships
            const roundsInput = parseInt(prompt('Enter number of rounds to play: '));
            if (!isNaN(roundsInput) && roundsInput > 0) {
                rounds = roundsInput;
            } else {
                logger.warn('Invalid number of rounds. Defaulting to 1 round.');
            }
        } else if (globalChoice === 6 || globalChoice === 7) { // Bridge Sepolia->Ten atau Ten->Sepolia
            bridgeAmountETH = prompt('Enter amount of ETH to bridge for all accounts (e.g., 0.0001): '); 
            if (isNaN(parseFloat(bridgeAmountETH)) || parseFloat(bridgeAmountETH) <= 0) {
                logger.error('Invalid bridge amount. Returning to main menu.');
                console.log('\n');
                continue;
            }
            const roundsInput = parseInt(prompt('Enter number of rounds to play: '));
            if (!isNaN(roundsInput) && roundsInput > 0) {
                rounds = roundsInput;
            } else {
                logger.warn('Invalid number of rounds. Defaulting to 1 round.');
            }
        }
        
        for (let r = 0; r < rounds; r++) {
            console.log(`\n${colors.bold}--- Starting Round ${r + 1}/${rounds} ---${colors.reset}`);
            for (const [index, account] of accounts.entries()) {
                console.log(`\n${colors.bold}--- Processing Account ${index + 1}/${accounts.length} (Round ${r + 1}) ---${colors.reset}`);
                try {
                    const currentProviderTen = new ethers.JsonRpcProvider(account.rpcUrlTen);
                    const currentWalletTen = new ethers.Wallet(account.privateKey, currentProviderTen);
                    
                    const currentZenContract = new ethers.Contract(ZEN_CONTRACT, zenABI, currentWalletTen);
                    const currentBettingContract = new ethers.Contract(BETTING_CONTRACT, bettingABI, currentWalletTen);

                    logger.wallet(`Wallet Address: ${currentWalletTen.address}`);
                    logger.info(`Using Ten RPC: ${account.rpcUrlTen}`);
                    logger.info(`Using Sepolia RPC: ${account.rpcUrlSepolia}`);

                    if (globalChoice === 1) {
                        await houseOfTenGameAutomated(currentWalletTen, currentProviderTen, currentZenContract, currentBettingContract, selectedAI, betAmountZEN); // Use betAmountZEN
                    } else if (globalChoice === 2) {
                        await playTenzenGame(currentWalletTen, currentProviderTen);
                    } else if (globalChoice === 3) {
                        await battleshipsGame(currentWalletTen, currentProviderTen);
                    } else if (globalChoice === 6) { // Bridge Sepolia -> Ten
                        await bridgeEthToTen(currentWalletTen, account.rpcUrlSepolia, currentWalletTen.address, bridgeAmountETH); 
                    } else if (globalChoice === 7) { // Bridge Ten -> Sepolia
                        await bridgeEthToSepolia(currentWalletTen, account.rpcUrlTen, currentWalletTen.address, bridgeAmountETH); 
                    }

                } catch (error) {
                    logger.error(`Error processing account ${index + 1} (${account.rpcUrlTen}) in Round ${r + 1}: ${error.message}`);
                }
                if (index < accounts.length - 1) {
                    logger.info('Waiting 10 seconds before processing next account...');
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }
            if (r < rounds - 1) { 
                logger.info(`Waiting 3 seconds before next round...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        logger.success('All rounds processed for the selected action.');
        
        if (globalChoice === 3) {
            logger.displayGameLogs();
        }
        console.log('\n');
    }

    logger.success('Exiting Ten Testnet Auto Bot. Goodbye!');
}

main().catch((error) => {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
