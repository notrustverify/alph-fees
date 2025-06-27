# Alephium Fees Display

A simple web application that displays average transaction fees for the Alephium blockchain by fetching data from the Alephium API, with real-time USD price conversion.

## Features

- **Real-time Data**: Fetches the latest block data from the Alephium API
- **Live Price Integration**: Gets current ALPH price from [diadata.org](https://api.diadata.org/v1/assetQuotation/Alephium/tgx7VNFoP9DJiFMFgXXtafQZkUvyEdDHT9ryamHJYrjq)
- **Dual Currency Display**: Shows fees in both ALPH and USD
- **Average Fee Calculation**: Calculates average transaction fees using gas amount and gas price
- **5-Minute Time Window**: Analyzes blocks from the last 5 minutes for accurate averages
- **Fast Auto-refresh**: Automatically updates data every 30 seconds
- **Modern UI**: Clean, responsive design with liquid glass effects and glassmorphism
- **Error Handling**: Displays user-friendly error messages if API calls fail
- **Modular Structure**: Separated HTML, CSS, and JavaScript files for better maintainability

## File Structure

```
fees-displayer/
├── index.html      # Main HTML file
├── styles.css      # CSS styles and liquid glass effects
├── script.js       # JavaScript functionality and API integration
└── README.md       # This documentation
```

## How to Use

1. **Open the Website**: Simply open `index.html` in any modern web browser
2. **View Statistics**: The page displays:
   - Average transaction fee in ALPH and USD
   - Total number of transactions analyzed
   - Number of blocks processed
   - Time range (5 minutes)
3. **Manual Refresh**: Click the "Refresh Data" button to fetch the latest data
4. **Auto-refresh**: Data automatically refreshes every 30 seconds

## Technical Details

### Fee Calculation
The application calculates transaction fees using the formula:
```
Fee = (gasAmount × gasPrice) ÷ 10^18
```

Where:
- `gasAmount` is typically 20000 for standard transactions
- `gasPrice` is the gas price in attoALPH (divided by 10^18 to convert to ALPH)

### USD Conversion
Fees are converted to USD using real-time price data from:
```
https://api.diadata.org/v1/assetQuotation/Alephium/tgx7VNFoP9DJiFMFgXXtafQZkUvyEdDHT9ryamHJYrjq
```

### API Endpoints
The application fetches data from:
- **Block Data**: `https://lb-fullnode-alephium.notrustverify.ch/blockflow/blocks?fromTs={start}&toTs={end}`
- **Price Data**: `https://api.diadata.org/v1/assetQuotation/Alephium/tgx7VNFoP9DJiFMFgXXtafQZkUvyEdDHT9ryamHJYrjq`

### Time Window
- **Analysis Window**: 5 minutes
- **Auto-refresh**: Every 30 seconds
- **Timestamp Range**: Dynamically calculated based on current time

## Data Processing

The application:
1. Fetches current ALPH price from diadata.org API
2. Fetches block data for the last 5 minutes
3. Iterates through all blocks and their transactions
4. Extracts `gasAmount` and `gasPrice` from each transaction
5. Calculates individual transaction fees
6. Computes the average fee across all transactions
7. Converts average fee to USD using current price
8. Displays statistics in a user-friendly format

## Code Organization

### HTML (`index.html`)
- Clean, semantic HTML structure
- Links to external CSS and JavaScript files
- Responsive design elements

### CSS (`styles.css`)
- Liquid glass effects with glassmorphism
- Animated gradient backgrounds
- Responsive grid layout
- Smooth animations and transitions
- Mobile-friendly design

### JavaScript (`script.js`)
- Dual API integration (blocks + price)
- Fee calculation logic
- USD conversion functionality
- UI state management
- Error handling and user feedback
- 30-second auto-refresh timer

## Browser Compatibility

This application works in all modern browsers that support:
- ES6+ JavaScript features
- Fetch API
- CSS Grid and Flexbox
- CSS Custom Properties
- Backdrop-filter (for glass effects)

## Local Development

To run this locally:
1. Download or clone the repository
2. Open `index.html` in a web browser
3. The application will automatically start fetching data

No build process or server setup required - it's a pure HTML/JavaScript application.

## Customization

### Modifying Styles
Edit `styles.css` to change the appearance:
- Colors and gradients
- Layout and spacing
- Typography
- Animations
- Glass effects

### Modifying Functionality
Edit `script.js` to change behavior:
- API endpoints
- Time intervals
- Fee calculation logic
- Data processing
- Auto-refresh frequency

## Troubleshooting

If you encounter issues:
1. Check the browser console for error messages
2. Ensure you have an internet connection
3. Verify the API endpoints are accessible
4. Try refreshing the page manually
5. Make sure all files (`index.html`, `styles.css`, `script.js`) are in the same directory

The application includes comprehensive error handling and will display helpful error messages if something goes wrong. If the price API fails, it will use a fallback price of $0.33 per ALPH. 