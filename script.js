const API_BASE_URL = 'https://lb-fullnode-alephium.notrustverify.ch';
const BLOCKS_ENDPOINT = `${API_BASE_URL}/blockflow/blocks`;
const GAS_PRICE_DIVISOR = Math.pow(10, 18); // 10^18
let TIME_INTERVAL_MINUTES = 15; // Default to 15 minutes
const REFRESH_INTERVAL = 10 * 60 * 1000; // Refresh every 1 minute

// Track the last fetch timestamp and stats
let lastFetchTimestamp = null;
let totalFee = BigInt(0);
let totalTransactions = 0;
let totalBlocks = 0;
let totalTransactionsNonCoinbase = 0;
let isInitialLoad = true;
let isManualRefresh = false;
let allFees = [];
let autoRefreshInterval;
let currentController = null; // Store the current AbortController

function changeTimeInterval(minutes) {
    TIME_INTERVAL_MINUTES = parseInt(minutes);
    // Store the selection in localStorage
    localStorage.setItem('timeInterval', minutes);
    // Update active button state
    document.querySelectorAll('.interval-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === minutes.toString());
    });
    // Cancel any pending request
    if (currentController) {
        currentController.abort();
    }
    // Fetch data immediately with new interval
    fetchData(true);
}

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
    // Cancel any pending request
    if (currentController) {
        currentController.abort();
    }
    
    // Create new AbortController for this request
    currentController = new AbortController();
    
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
        
        const response = await fetch(url, {
            signal: currentController.signal
        });
        
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
        // Only show error if it's not an abort error
        if (error.name !== 'AbortError') {
            console.error('Error fetching data:', error);
            showError(`Error fetching data: ${error.message}`);
        }
    } finally {
        currentController = null;
        showLoading(false);
    }
}

// Theme switching functionality
function toggleTheme() {
    const root = document.documentElement;
    const isDark = !root.classList.contains('light-theme');
    const darkIcon = document.querySelector('.dark-icon');
    const lightIcon = document.querySelector('.light-icon');
    const themeText = document.querySelector('.theme-text');
    
    root.classList.toggle('light-theme');
    darkIcon.style.display = isDark ? 'none' : 'block';
    lightIcon.style.display = isDark ? 'block' : 'none';
    themeText.textContent = isDark ? 'Dark Theme' : 'Light Theme';
    
    // Save theme preference
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    // Setup theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        toggleTheme();
    }
    document.getElementById('themeSwitch').addEventListener('click', toggleTheme);

    // Setup interval buttons
    document.querySelectorAll('.interval-btn').forEach(btn => {
        btn.addEventListener('click', () => changeTimeInterval(btn.dataset.value));
    });

    // Restore saved time interval if any
    const savedInterval = localStorage.getItem('timeInterval') || '15';
    TIME_INTERVAL_MINUTES = parseInt(savedInterval);
    document.querySelectorAll('.interval-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === savedInterval);
    });
    
    fetchData(false);
    
    // Clear any existing interval and set new one
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    autoRefreshInterval = setInterval(() => {
        // Only start a new fetch if there isn't one in progress
        if (!currentController) {
            fetchData(false);
        }
    }, REFRESH_INTERVAL);
});

// Auto-refresh every 30 seconds
setInterval(() => fetchData(false), 30 * 1000); 