require('dotenv').config();
const ethers = require('ethers');
const axios = require('axios');
const prompt = require('prompt-sync')({ sigint: true });

const CHAIN_ID = 443; // Ten Testnet Chain ID

// PASTIKAN ALAMAT INI BENAR:
// ZEN_CONTRACT: Alamat kontrak token ZEN yang sebenarnya.
// TENZEN_CONTRACT: Alamat kontrak game Tenzen yang berinteraksi dengan ZEN.
// Jika ZEN_CONTRACT ini adalah alamat token, dan TENZEN_CONTRACT adalah alamat game, ini harus berbeda!
// Sesuai dengan konstanta Anda: ZEN_CONTRACT = '0xa02e395b0d05a33f96c0d4e74c76c1a2ee7ef3ae'
// Sesuai dengan konstanta Anda: TENZEN_CONTRACT = '0xDa701a7231096209C4F5AC83F44F22eFA75f4519'
// Ini sudah benar-benar berbeda, jadi kita akan interaksi dengan ZEN_CONTRACT untuk token,
// dan TENZEN_CONTRACT untuk game.
const ZEN_CONTRACT = '0xa02e395b0d05a33f96c0d4e74c76c1a2ee7ef3ae';
const BETTING_CONTRACT = '0xc288b41e88cc04dfec6e81df8b705791e94a0b64';
const BATTLESHIPS_CONTRACT = '0xD64206151CEAE054962E2eD7aC16aad5e39c3Ef3';
const HOUSE_API_URL = 'https://houseof.ten.xyz/api/player-actions';

// --- Konstanta Battleships ---
const BATTLESHIPS_VALUE_AMOUNT = '0xfbd0fc05ae000'; // Value Battleships dalam heksadesimal (tetap ETH)

// Konstanta TENZEN (GAME CONTRACT)
const TENZEN_CONTRACT = '0xDa701a7231096209C4F5AC83F44F22eFA75f4519';
const TENZEN_FUNCTION_SELECTOR = '0x93e84cd9';
// TENZEN_VALUE_AMOUNT (dari sebelumnya) ini sepertinya adalah ETH, tapi Tenzen Game
// sekarang akan menggunakan ZEN yang di-approve. Jadi ini mungkin tidak lagi relevan
// jika game Tenzen memang tidak menerima ETH value saat dipanggil, tapi hanya ZEN token.
// Jika game Tenzen butuh ETH *dan* ZEN, kita perlu klarifikasi. Untuk saat ini,
// kita asumsikan ia hanya memproses ZEN via approve/transferFrom.
// const TENZEN_VALUE_AMOUNT = '0xfbd0fc05ae000';
const TENZEN_GAS_PRICE = ethers.parseUnits('120', 'gwei');
const TENZEN_GAS_LIMIT = 128453; // Gas limit untuk memanggil fungsi Tenzen

// --- Konstanta Bridge (Contoh) ---
// Ganti dengan alamat kontrak bridge yang sebenarnya untuk setiap arah
const BRIDGE_SEPOLIA_TO_TEN_CONTRACT = '0xYourSepoliaToTenBridgeContractAddress'; // Contoh alamat bridge
const BRIDGE_TEN_TO_SEPOLIA_CONTRACT = '0xYourTenToSepoliaBridgeContractAddress';   // Contoh alamat bridge

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

// --- Tambahan ABI untuk Bridge jika perlu interaksi fungsi spesifik ---
// Contoh: Jika kontrak bridge punya fungsi `depositETH` atau `bridgeETH`
const bridgeABI = [
    'function depositETH() payable', // Contoh fungsi untuk deposit/bridge ETH
    // Tambahkan fungsi lain sesuai ABI kontrak bridge Anda
];


function generateRandomCoordinates() {
    return {
        x: Math.floor(Math.random() * 100),
        y: Math.floor(Math.random() * 100)
    };
}

function displayMainMenu() {
    logger.step('Main Menu:');
    console.log(`${colors.cyan}1. HouseOfTen Game${colors.reset}`);
    console.log(`${colors.cyan}2. Tenzen Game${colors.reset}`); // Akan ada prompt jumlah ZEN
    console.log(`${colors.cyan}3. Battleships Game${colors.reset}`);
    console.log(`${colors.cyan}4. Dexynth Perpetual (Coming Soon)${colors.reset}`);
    console.log(`${colors.cyan}5. Chimp Dex (Coming Soon)${colors.reset}`);
    console.log(`${colors.cyan}6. Bridge Sepolia to Ten Testnet (ETH)${colors.reset}`); // Akan ada prompt jumlah ETH
    console.log(`${colors.cyan}7. Bridge Ten Testnet to Sepolia (ETH)${colors.reset}`); // Akan ada prompt jumlah ETH
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
        const balanceETH = ethers.formatEther(balance); // ZEN mungkin bukan ETH, tapi formatnya sama
        logger.info(`ZEN Balance: ${balanceETH} ZEN`); // Ganti ETH menjadi ZEN
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
            value: BATTLESHIPS_VALUE_AMOUNT // Menggunakan nilai heksadesimal langsung
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

// --- FUNGSI TENZEN GAME YANG BENAR-BENAR MENGGUNAKAN TOKEN ZEN ---
async function playTenzenGame(wallet, provider, zenAmount) { // Parameter zenAmount
    logger.loading(`Starting Tenzen Game for ${wallet.address} with ${zenAmount} ZEN...`);
    try {
        const amountWei = ethers.parseEther(zenAmount); // Asumsi ZEN memiliki 18 desimal seperti ETH

        // Periksa saldo ZEN
        const zenContract = new ethers.Contract(ZEN_CONTRACT, zenABI, wallet);
        const zenBalance = await checkZENBalance(wallet, zenContract);
        if (zenBalance < amountWei) {
            logger.error(`Insufficient ZEN balance. Required: ${ethers.formatEther(amountWei)} ZEN`);
            return;
        }

        // Periksa saldo ETH untuk biaya gas
        const ethBalance = await checkETHBalance(wallet, provider);
        if (ethBalance < ethers.parseEther('0.01')) { // Margin untuk gas
            logger.error('Insufficient ETH balance for gas fees. Required: 0.01 ETH');
            return;
        }

        // 1. Approve ZEN untuk kontrak TENZEN_CONTRACT
        logger.step(`Approving ${zenAmount} ZEN for Tenzen Contract (${TENZEN_CONTRACT})...`);
        await approveZEN(wallet, zenContract, TENZEN_CONTRACT, amountWei);

        // 2. Panggil fungsi di kontrak TENZEN_CONTRACT
        logger.step(`Calling Tenzen Contract (${TENZEN_CONTRACT}) with function selector ${TENZEN_FUNCTION_SELECTOR}...`);
        const nonce = await provider.getTransactionCount(wallet.address, 'latest');

        const txData = {
            to: TENZEN_CONTRACT,
            data: TENZEN_FUNCTION_SELECTOR, // Asumsi selector ini sudah termasuk data untuk jumlah ZEN yang akan ditarik oleh kontrak
                                            // Jika kontrak Tenzen memiliki fungsi lain yang menerima jumlah, ABI harus ditambahkan
                                            // dan fungsi tersebut dipanggil dengan parameter jumlah.
            gasLimit: TENZEN_GAS_LIMIT,
            gasPrice: TENZEN_GAS_PRICE,
            chainId: CHAIN_ID,
            nonce: nonce,
            value: 0 // PENTING: Tenzen Game ini TIDAK MENGIRIM ETH sebagai value, tapi berinteraksi dengan ZEN.
        };

        logger.info('Sending Tenzen transaction with data:', {
            to: txData.to,
            data: txData.data,
            gasLimit: txData.gasLimit.toString(),
            gasPrice: txData.gasPrice.toString(),
            chainId: txData.chainId,
            nonce: txData.nonce,
            value: txData.value.toString() // Pastikan value 0
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
            logger.error(`Insufficient ZEN balance. Required: ${ethers.formatEther(betAmountWei)} ZEN`); // Pastikan ini ZEN
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

        const requiredZEN = ethers.parseEther('0.001'); // Ini masih ada, jika Battleships TIDAK pakai ZEN, hapus
        const zenContract = new ethers.Contract(ZEN_CONTRACT, zenABI, wallet);
        const zenBalance = await checkZENBalance(wallet, zenContract);
        if (zenBalance < requiredZEN) {
            logger.warn(`ZEN balance for Battleships is less than ${ethers.formatEther(requiredZEN)} ZEN. This might not be an issue if ZEN isn't strictly required for Battleships and it only uses ETH.`);
        }

        const ethBalance = await checkETHBalance(wallet, provider);
        const requiredBattleshipsValueBigInt = ethers.toBigInt(BATTLESHIPS_VALUE_AMOUNT);

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

// --- FUNGSI BRIDGE ETH SEPOLIA KE TEN TESTNET (PILIHAN 6) ---
async function handleBridgeSepoliaToTen(wallet, provider, ethAmount) {
    logger.loading(`Starting Bridge Sepolia to Ten Testnet for ${wallet.address} with ${ethAmount} ETH...`);
    // NOTE: Fungsi ini perlu dijalankan dengan provider Sepolia dan wallet yang terhubung ke Sepolia.
    // Jika Anda menjalankan bot ini dengan banyak akun, pastikan Anda menggunakan RPC_URL yang sesuai
    // atau memiliki logika untuk beralih jaringan di sini.
    // Untuk kesederhanaan bot multi-akun yang diberikan, ini diasumsikan bot selalu di jaringan Ten.
    // BRIDGE INI AKAN GAGAL JIKA WALLET TIDAK TERKONEKSI KE SEPOLIA.

    try {
        const valueToSend = ethers.parseEther(ethAmount);
        // Anda perlu provider Sepolia untuk ini.
        // Asumsi currentProvider di main() adalah provider Ten.
        // Anda perlu membuat provider Sepolia baru atau menggunakan akun yang memiliki RPC Sepolia.
        // Contoh: const sepoliaProvider = new ethers.JsonRpcProvider('URL_RPC_SEPOLIA_ANDA');
        // const sepoliaWallet = new ethers.Wallet(wallet.privateKey, sepoliaProvider);

        // Untuk demonstrasi, kita akan melanjutkan dengan asumsi bahwa RPC yang digunakan adalah RPC target,
        // yang berarti pengguna harus memilih akun yang terhubung ke Sepolia.
        // ATAU Anda harus memodifikasi cara akun dimuat untuk memiliki provider Sepolia dan Ten.

        // Memeriksa saldo ETH di jaringan asal (Sepolia)
        const ethBalance = await checkETHBalance(wallet, provider); // Ini akan cek di jaringan yang saat ini terhubung (Ten)
                                                                    // Jika ini bridge dari Sepolia, ini harus check balance di Sepolia.
                                                                    // Ini adalah kompleksitas bot multi-chain.
        if (ethBalance < valueToSend + ethers.parseEther('0.01')) { // Margin untuk gas
            logger.error(`Insufficient ETH balance for Bridge (on current chain). Required: at least ${ethers.formatEther(valueToSend + ethers.parseEther('0.01'))} ETH`);
            logger.warn('Please ensure your wallet is connected to Sepolia and has sufficient ETH for this bridge operation.');
            return;
        }

        // Interaksi dengan kontrak bridge di Sepolia (jika diperlukan)
        const bridgeContract = new ethers.Contract(BRIDGE_SEPOLIA_TO_TEN_CONTRACT, bridgeABI, wallet);

        logger.step(`Initiating bridge from Sepolia to Ten Testnet...`);
        const tx = await bridgeContract.depositETH({ // Contoh fungsi deposit, ganti sesuai ABI
            value: valueToSend,
            gasLimit: 200000, // Sesuaikan
            gasPrice: ethers.parseUnits('20', 'gwei'), // Sesuaikan untuk Sepolia
        });

        logger.info(`Bridge TX Hash: ${tx.hash}`);
        const receipt = await tx.wait();

        if (receipt.status === 0) {
            throw new Error('Bridge transaction reverted');
        }
        logger.success(`Bridge Sepolia to Ten Testnet TX confirmed in block ${receipt.blockNumber}`);

    } catch (error) {
        logger.error(`Error bridging from Sepolia to Ten Testnet for ${wallet.address}: ${error.message}`);
        throw error;
    }
}

// --- FUNGSI BRIDGE ETH TEN TESTNET KE SEPOLIA (PILIHAN 7) ---
async function handleBridgeTenToSepolia(wallet, provider, ethAmount) {
    logger.loading(`Starting Bridge Ten Testnet to Sepolia for ${wallet.address} with ${ethAmount} ETH...`);
    try {
        const valueToSend = ethers.parseEther(ethAmount);
        const ethBalance = await checkETHBalance(wallet, provider); // Ini akan check di Ten Testnet

        if (ethBalance < valueToSend + ethers.parseEther('0.01')) { // Margin untuk gas
            logger.error(`Insufficient ETH balance for Bridge (on Ten Testnet). Required: at least ${ethers.formatEther(valueToSend + ethers.parseEther('0.01'))} ETH`);
            return;
        }

        // Interaksi dengan kontrak bridge di Ten Testnet
        const bridgeContract = new ethers.Contract(BRIDGE_TEN_TO_SEPOLIA_CONTRACT, bridgeABI, wallet);

        logger.step(`Initiating bridge from Ten Testnet to Sepolia...`);
        const tx = await bridgeContract.depositETH({ // Contoh fungsi deposit, ganti sesuai ABI
            value: valueToSend,
            gasLimit: 200000, // Sesuaikan
            gasPrice: ethers.parseUnits('120', 'gwei'), // Sesuaikan untuk Ten Testnet
        });

        logger.info(`Bridge TX Hash: ${tx.hash}`);
        const receipt = await tx.wait();

        if (receipt.status === 0) {
            throw new Error('Bridge transaction reverted');
        }
        logger.success(`Bridge Ten Testnet to Sepolia TX confirmed in block ${receipt.blockNumber}`);

    } catch (error) {
        logger.error(`Error bridging from Ten Testnet to Sepolia for ${wallet.address}: ${error.message}`);
        throw error;
    }
}


async function main() {
    logger.banner();

    const accounts = [];
    for (let i = 1; ; i++) {
        const privateKey = process.env[`PRIVATE_KEY_${i}`];
        const rpcUrl = process.env[`RPC_URL_${i}`];
        const sepoliaRpcUrl = process.env[`SEPOLIA_RPC_URL_${i}`]; // Anda mungkin butuh ini jika bridge antar chain

        if (!privateKey && !rpcUrl) {
            break;
        }
        if (!privateKey || !rpcUrl) {
            logger.error(`Mismatched configuration for account ${i}. Missing PRIVATE_KEY_${i} or RPC_URL_${i}.`);
            process.exit(1);
        }
        accounts.push({ privateKey, rpcUrl, sepoliaRpcUrl }); // Simpan juga sepoliaRpcUrl
    }

    if (accounts.length === 0) {
        logger.error('No private key and RPC URL pairs found in .env (e.g., PRIVATE_KEY_1, RPC_URL_1).');
        process.exit(1);
    }

    while (true) {
        const globalChoice = getMenuSelection();

        if (globalChoice === 8) { // Exit adalah pilihan 8
            logger.success('Exiting Ten Testnet Auto Bot. Goodbye!');
            break;
        }

        let betAmountETH = null;      // Untuk HouseOfTen (input ZEN, tapi di prompt disebut ETH)
        let zenAmountToPlay = null;   // Untuk Tenzen Game (input ZEN)
        let ethBridgeAmount = null;   // Untuk Bridge (input ETH)
        let selectedAI = null;
        let rounds = 1; // Default to 1 round

        // --- Logika input jumlah berdasarkan pilihan menu ---
        if (globalChoice === 1) { // HouseOfTen Game (Bet ZEN)
            selectedAI = getAISelection();
            logger.info(`Selected AI for all accounts: ${selectedAI.name} (${selectedAI.address})`);
            betAmountETH = prompt('Enter bet amount in ZEN (e.g., 0.01): '); // Prompt untuk ZEN
            if (isNaN(parseFloat(betAmountETH)) || parseFloat(betAmountETH) <= 0) {
                logger.error('Invalid bet amount. Returning to main menu.');
                console.log('\n');
                continue;
            }
        } else if (globalChoice === 2) { // Tenzen Game (Play with ZEN)
            zenAmountToPlay = prompt('Enter the amount of ZEN to play (e.g., 0.001): ');
            if (isNaN(parseFloat(zenAmountToPlay)) || parseFloat(zenAmountToPlay) <= 0) {
                logger.error('Invalid ZEN amount. Please enter a positive number.');
                console.log('\n');
                continue;
            }
        } else if (globalChoice === 6 || globalChoice === 7) { // Bridge Operations (Use ETH)
            ethBridgeAmount = prompt('Enter the amount of ETH to bridge (e.g., 0.05): ');
            if (isNaN(parseFloat(ethBridgeAmount)) || parseFloat(ethBridgeAmount) <= 0) {
                logger.error('Invalid ETH amount. Please enter a positive number.');
                console.log('\n');
                continue;
            }
        }
        // Pilihan 3 (Battleships) tidak memiliki prompt jumlah spesifik di sini.
        // Pilihan 4 dan 5 adalah "Coming Soon"

        // Prompt rounds setelah semua input spesifik game/bridge
        const roundsInput = parseInt(prompt('Enter number of rounds to play: '));
        if (!isNaN(roundsInput) && roundsInput > 0) {
            rounds = roundsInput;
        } else {
            logger.warn('Invalid number of rounds. Defaulting to 1 round.');
        }
        // --- Akhir logika input jumlah dan rounds ---


        for (let r = 0; r < rounds; r++) { // Loop untuk putaran
            console.log(`\n${colors.bold}--- Starting Round ${r + 1}/${rounds} ---${colors.reset}`);
            for (const [index, account] of accounts.entries()) {
                console.log(`\n${colors.bold}--- Processing Account ${index + 1}/${accounts.length} (Round ${r + 1}) ---${colors.reset}`);
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
                        await playTenzenGame(currentWallet, currentProvider, zenAmountToPlay); // Kirim jumlah ZEN
                    } else if (globalChoice === 3) {
                        await battleshipsGame(currentWallet, currentProvider); // Battleships tidak memerlukan input jumlah spesifik
                    } else if (globalChoice === 6) {
                        // Untuk bridge Sepolia to Ten, wallet harus terkoneksi ke Sepolia.
                        // Anda perlu menyesuaikan ini untuk bot multi-chain yang sebenarnya.
                        // Jika 'sepoliaRpcUrl' tersedia di akun:
                        // const sepoliaProvider = new ethers.JsonRpcProvider(account.sepoliaRpcUrl);
                        // const sepoliaWallet = new ethers.Wallet(account.privateKey, sepoliaProvider);
                        // await handleBridgeSepoliaToTen(sepoliaWallet, sepoliaProvider, ethBridgeAmount);
                        // Untuk demo saat ini, kita pakai wallet Ten, jadi ini akan gagal jika kontrak di Sepolia.
                        logger.warn("Bridge Sepolia to Ten requires wallet to be on Sepolia. Proceeding with current wallet, but it might fail.");
                        await handleBridgeSepoliaToTen(currentWallet, currentProvider, ethBridgeAmount);
                    } else if (globalChoice === 7) {
                        await handleBridgeTenToSepolia(currentWallet, currentProvider, ethBridgeAmount);
                    }

                } catch (error) {
                    logger.error(`Error processing account ${index + 1} (${account.rpcUrl}) in Round ${r + 1}: ${error.message}`);
                }
                if (index < accounts.length - 1) {
                    logger.info('Waiting 10 seconds before processing next account...');
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }
            if (r < rounds - 1) { // Hanya jeda jika bukan putaran terakhir
                logger.info(`Waiting 3 seconds before next round...`);
                await new Promise(resolve => setTimeout(resolve, 3000)); // Jeda antar putaran
            }
        }
        logger.success('All rounds processed for the selected action.');
        console.log('\n');
    }

    logger.success('Exiting Ten Testnet Auto Bot. Goodbye!');
}

main().catch((error) => {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
