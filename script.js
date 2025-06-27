const API_BASE_URL = 'https://lb-fullnode-alephium.notrustverify.ch';
const BLOCKS_ENDPOINT = `${API_BASE_URL}/blockflow/blocks`;
const GAS_PRICE_DIVISOR = Math.pow(10, 18); // 10^18
const TIME_INTERVAL_MINUTES = 60;

// Track the last fetch timestamp and stats
let lastFetchTimestamp = null;
let totalFee = BigInt(0);
let totalTransactions = 0;
let totalBlocks = 0;
let totalTransactionsNonCoinbase = 0;
let isInitialLoad = true;
let isManualRefresh = false;
let allFees = [];

function showLoading(show) {
    const loading = document.getElementById('loading');
    const refreshBtn = document.getElementById('refreshBtn');
    const updateStatus = document.getElementById('updateStatus');
    
    if (show) {
        // Only show the full loading message on initial load and not manual refresh
        if (isInitialLoad && !isManualRefresh) {
            loading.classList.add('show');
        }
        refreshBtn.disabled = true;
        updateStatus.textContent = 'Updating...';
        updateStatus.className = 'update-status show';
    } else {
        loading.classList.remove('show');
        refreshBtn.disabled = false;
        updateStatus.textContent = 'Updated!';
        updateStatus.className = 'update-status show success';
        
        // Hide the success message after 2 seconds
        setTimeout(() => {
            updateStatus.className = 'update-status';
        }, 2000);
        
        // Set isInitialLoad to false after first load completes
        isInitialLoad = false;
        isManualRefresh = false;
    }
}

function showError(message) {
    const error = document.getElementById('error');
    const updateStatus = document.getElementById('updateStatus');
    error.textContent = message;
    error.classList.add('show');
    
    // Show error in status
    updateStatus.textContent = 'Update failed';
    updateStatus.className = 'update-status show error';
}

function hideError() {
    const error = document.getElementById('error');
    error.classList.remove('show');
}

function formatNumber(num, decimals = 6) {
    if (num === null || num === undefined) return '--';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function calculateFee(gasAmount, gasPrice) {
    console.log('Gas Amount:', gasAmount, 'Gas Price:', gasPrice);
    const fee = BigInt(gasAmount) * BigInt(gasPrice);
    console.log('Calculated fee:', fee.toString());
    return fee;
}

function getTimeRange() {
    const now = Date.now();
    // Always get the full time range from now minus the interval
    return { 
        fromTs: now - (TIME_INTERVAL_MINUTES * 60 * 1000), 
        toTs: now 
    };
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function processBlocks(data) {
    allFees = []; // Reset fees array
    data.blocks.forEach(blockGroup => {
        blockGroup.forEach(block => {
            totalBlocks++;
            
            if (block.transactions && block.transactions.length > 0) {
                block.transactions.forEach(tx => {
                    totalTransactions++;
                    if(tx.unsigned && tx.unsigned.gasAmount && tx.unsigned.gasPrice) {
                        console.log('Transaction:', tx.unsigned.gasAmount, tx.unsigned.gasPrice, tx);
                        const fee = calculateFee(tx.unsigned.gasAmount, tx.unsigned.gasPrice);
                        totalFee += fee;
                        // Store individual fee for median calculation
                        allFees.push(Number(fee));
                    }

                    if(tx.unsigned.inputs && tx.unsigned.inputs.length > 0) {
                        totalTransactionsNonCoinbase++;
                    }
                });
            }
        });
    });
}

function calculateMedian(fees) {
    if (fees.length === 0) return 0;
    
    // Sort fees in ascending order
    const sortedFees = fees.sort((a, b) => a - b);
    const middle = Math.floor(sortedFees.length / 2);
    
    if (sortedFees.length % 2 === 0) {
        // If even number of fees, take average of two middle values
        return (sortedFees[middle - 1] + sortedFees[middle]) / 2;
    } else {
        // If odd number of fees, take middle value
        return sortedFees[middle];
    }
}

function updateUI() {
    // Convert from BigInt to number and apply the divisor at the end to maintain precision
    const totalFeeNumber = Number(totalFee) / GAS_PRICE_DIVISOR;
    console.log('Total fee in ALPH:', totalFeeNumber);
    const averageFee = totalTransactions > 0 ? totalFeeNumber / totalTransactions : 0;
    const medianFee = calculateMedian(allFees.map(fee => fee / GAS_PRICE_DIVISOR));
    console.log('Average fee:', averageFee, 'Median fee:', medianFee, 'Total transactions:', totalTransactions);

    // Update UI
    document.getElementById('avgFee').innerHTML = `
        <div style="font-size: 0.9em">
            Avg: ${formatNumber(averageFee)} <span class='alph-label'>ALPH</span><br>
            Med: ${formatNumber(medianFee)} <span class='alph-label'>ALPH</span>
        </div>
    `;
    
    document.getElementById('totalFees').innerHTML = `
        <div style="font-size: 0.9em">${formatNumber(totalFeeNumber)} <span class='alph-label'>ALPH</span></div>
    `;
    
    document.getElementById('totalTxs').textContent = totalTransactionsNonCoinbase.toLocaleString();
    document.getElementById('totalBlocks').textContent = totalBlocks.toLocaleString();
    document.getElementById('timeRange').textContent = TIME_INTERVAL_MINUTES;
    document.getElementById('lastUpdated').textContent = `Last updated: ${formatTimestamp(Date.now())}`;
}

async function fetchData(manual = false) {
    isManualRefresh = manual;
    showLoading(true);
    hideError();

    try {
        // Reset counters before each fetch
        totalFee = BigInt(0);
        totalTransactions = 0;
        totalBlocks = 0;
        totalTransactionsNonCoinbase = 0;

        const timeRange = getTimeRange();
        const url = `${BLOCKS_ENDPOINT}?fromTs=${timeRange.fromTs}&toTs=${timeRange.toTs}`;
        
        console.log('Fetching data from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data);
        
        if (!data.blocks || !Array.isArray(data.blocks)) {
            throw new Error('Invalid data format: blocks array not found');
        }

        processBlocks(data);
        updateUI();
        
        // Update the last fetch timestamp
        lastFetchTimestamp = timeRange.toTs;
        
    } catch (error) {
        console.error('Error fetching data:', error);
        showError(`Error fetching data: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    fetchData(false);  // false indicates not a manual refresh
});

// Auto-refresh every 30 seconds
setInterval(() => fetchData(false), 30 * 1000); 