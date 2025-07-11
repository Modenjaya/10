require('dotenv').config();
const ethers = require('ethers');
const axios = require('axios');
const prompt = require('prompt-sync')({ sigint: true });

const CHAIN_ID = 443;
const ZEN_CONTRACT = '0xa02e395b0d05a33f96c0d4e74c76c1a2ee7ef3ae';
const BETTING_CONTRACT = '0x88fa5aA29BFd406Cd052595cCD8B1347913Aa1E7';
const BATTLESHIPS_CONTRACT = '0xD64206151CEAE054962E2eD7aC16aad5e39c3Ef3';
const HOUSE_API_URL = 'https://houseof.ten.xyz/api/player-actions';

const AI_OPTIONS = [
    { name: 'CZHuffle', address: '0x9fde625ed8a6ec0f3ca393a62be34231a5c167f4' },
    { name: 'Vitalik Pokerin', address: '0x7B7057B07218fa9f357E39cb2fC2E723C2bfcf9F' },
    { name: 'Marc All-Indressen', address: '0xd2e443F6CF19d5d359e82bbEea76e1133028fda5' },
    { name: 'Do Kwonfold', address: '0x6bCdBe37024304C1C9F1F8AFDc69250aD24E17C3' },
    { name: 'Sam Bankroll-Fried', address: '0x9Fde625ED8A6eC0f3cA393A62be34231a5c167F4' },
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const zenABI = [
  'function approve(address spender, uint256 amount) public returns (bool)',
  'function balanceOf(address account) public view returns (uint256)',
];

const bettingABI = ['function placeBet(uint256 betType, address aiAddress, uint256 amount) public'];

const zenContract = new ethers.Contract(ZEN_CONTRACT, zenABI, wallet);
const bettingContract = new ethers.Contract(BETTING_CONTRACT, bettingABI, wallet);

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
    console.log(`  Ten Testnet Auto Bot - Airdrop Insiders `);
    console.log(`---------------------------------------------${colors.reset}\n`);
  },
};

function generateRandomCoordinates() {
  return {
    x: Math.floor(Math.random() * 100),
    y: Math.floor(Math.random() * 100)
  };
}

function displayMainMenu() {
  logger.step('Main Menu:');
  console.log(`${colors.cyan}1. HouseOfTen Game${colors.reset}`);
  console.log(`${colors.cyan}2. Tenzen Game (Under Maintenance)${colors.reset}`);
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
  if (choice === 2) {
    logger.error('Tenzen Game is currently under maintenance. Please choose another option.');
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

async function checkZENBalance() {
  logger.loading('Checking ZEN balance...');
  try {
    const balance = await zenContract.balanceOf(wallet.address);
    const balanceETH = ethers.formatEther(balance);
    logger.info(`ZEN Balance: ${balanceETH} ETH`);
    return balance;
  } catch (error) {
    logger.error(`Error checking ZEN balance: ${error.message}`);
    throw error;
  }
}

async function checkETHBalance() {
  logger.loading('Checking ETH balance...');
  try {
    const balance = await provider.getBalance(wallet.address);
    const balanceETH = ethers.formatEther(balance);
    logger.info(`ETH Balance: ${balanceETH} ETH`);
    return balance;
  } catch (error) {
    logger.error(`Error checking ETH balance: ${error.message}`);
    throw error;
  }
}

async function approveZEN(spender, amount) {
  logger.loading(`Approving ${ethers.formatEther(amount)} ZEN for ${spender}...`);
  try {
    const tx = await zenContract.approve(spender, amount);
    logger.info(`Approve TX Hash: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.success(`Approve TX confirmed in block ${receipt.blockNumber}`);
    return receipt;
  } catch (error) {
    logger.error(`Error approving ZEN: ${error.message}`);
    throw error;
  }
}

async function placeBet(betType, aiAddress, amount) {
  logger.loading(`Placing bet of ${ethers.formatEther(amount)} ZEN...`);
  try {
    const tx = await bettingContract.placeBet(betType, aiAddress, amount, {
      gasLimit: 300000,
    });
    logger.info(`Bet TX Hash: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.success(`Bet TX confirmed in block ${receipt.blockNumber}`);
    return receipt;
  } catch (error) {
    logger.error(`Error placing bet: ${error.message}`);
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

async function playBattleships(x, y) {
  logger.loading(`Playing Battleships game at coordinates (${x}, ${y})...`);
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
      nonce: nonce
    };

    logger.info('Sending transaction with data:', {
      to: txData.to,
      data: txData.data,
      gasLimit: txData.gasLimit.toString(),
      gasPrice: txData.gasPrice.toString(),
      chainId: txData.chainId,
      nonce: txData.nonce
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
    logger.error(`Error playing Battleships game at (${x}, ${y}): ${error.message}`);
    throw error;
  }
}

async function houseOfTenGame() {
  try {
    logger.step('Starting HouseOfTen Game...');
    const selectedAI = getAISelection();
    logger.info(`Selected AI: ${selectedAI.name} (${selectedAI.address})`);

    const betAmountETH = prompt('Enter bet amount in ETH (e.g., 0.01): ');
    const betAmountWei = ethers.parseEther(betAmountETH);
    const betType = 1;

    const zenBalance = await checkZENBalance();
    if (zenBalance < betAmountWei) {
      logger.error(`Insufficient ZEN balance. Required: ${ethers.formatEther(betAmountWei)} ETH`);
      return;
    }
    const ethBalance = await checkETHBalance();
    if (ethBalance < ethers.parseEther('0.01')) {
      logger.error('Insufficient ETH balance for gas fees. Required: 0.01 ETH');
      return;
    }

    await approveZEN(BETTING_CONTRACT, betAmountWei);
    await placeBet(betType, selectedAI.address, betAmountWei);
    await notifyHouseAPI(wallet.address, betAmountETH, selectedAI.address);

    logger.success('HouseOfTen bet placed successfully!');
  } catch (error) {
    logger.error(`HouseOfTen Game failed: ${error.message}`);
  }
}

async function battleshipsGame() {
  try {
    logger.step('Starting Battleships Game...');

    let {x, y} = generateRandomCoordinates();
    logger.info(`Selected coordinates: (${x}, ${y})`);

    const requiredZEN = ethers.parseEther('0.001');
    const zenBalance = await checkZENBalance();
    if (zenBalance < requiredZEN) {
      logger.error(`Insufficient ZEN balance. Required: ${ethers.formatEther(requiredZEN)} ETH`);
      return;
    }
    const ethBalance = await checkETHBalance();
    if (ethBalance < ethers.parseEther('0.01')) {
      logger.error('Insufficient ETH balance for gas fees. Required: 0.01 ETH');
      return;
    }

    try {
      await playBattleships(x, y);
      logger.success('Battleships game played successfully!');
    } catch (error) {
      const newCoords = generateRandomCoordinates();
      logger.warn(`Trying new coordinates: (${newCoords.x}, ${newCoords.y})`);
      
      try {
        await playBattleships(newCoords.x, newCoords.y);
        logger.success('Battleships game played successfully with new coordinates!');
      } catch (error) {
        logger.error(`Battleships Game failed after trying 2 different coordinates: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`Battleships Game failed: ${error.message}`);
  }
}

async function main() {
  logger.banner();
  logger.wallet(`Wallet Address: ${wallet.address}`);

  while (true) {
    const choice = getMenuSelection();
    if (choice === 1) {
      await houseOfTenGame();
    } else if (choice === 3) {
      await battleshipsGame();
    } else if (choice === 6) {
      logger.success('Exiting Ten Testnet Auto Bot. Goodbye!');
      break;
    }
  }
}

main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
