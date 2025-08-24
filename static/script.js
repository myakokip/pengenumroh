// EVM Multi Sender JavaScript

class EVMMultiSender {
    constructor() {
        this.wallets = [];
        this.selectedNetwork = null;
        this.balances = [];
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Import private keys
        document.getElementById('importBtn').addEventListener('click', () => {
            this.importPrivateKeys();
        });

        // Network selection
        document.getElementById('networkSelect').addEventListener('change', (e) => {
            this.handleNetworkChange(e.target.value);
        });

        // Load balances
        document.getElementById('loadBalancesBtn').addEventListener('click', () => {
            this.loadBalances();
        });

        // Send transactions
        document.getElementById('sendTransactionsBtn').addEventListener('click', () => {
            this.sendTransactions();
        });

        // Clear session
        document.getElementById('clearSessionBtn').addEventListener('click', () => {
            this.clearSession();
        });
    }

    showLoading(text = 'Processing...') {
        document.getElementById('loadingText').textContent = text;
        const modal = new bootstrap.Modal(document.getElementById('loadingModal'));
        modal.show();
    }

    hideLoading() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('loadingModal'));
        if (modal) {
            modal.hide();
        }
    }

    showAlert(message, type = 'danger') {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Insert at the top of the container
        const container = document.querySelector('.container');
        container.insertAdjacentHTML('afterbegin', alertHtml);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }

    async importPrivateKeys() {
        const fileInput = document.getElementById('privateKeyFile');
        const file = fileInput.files[0];

        if (!file) {
            this.showAlert('Please select a file first.');
            return;
        }

        if (!file.name.endsWith('.txt')) {
            this.showAlert('Please select a .txt file.');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        this.showLoading('Importing private keys...');

        try {
            const response = await fetch('/import_keys', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.wallets = data.wallets;
                this.displayWallets();
                this.showAlert(`Successfully imported ${data.count} wallets!`, 'success');
                document.getElementById('networkSection').style.display = 'block';
            } else {
                this.showAlert(data.error || 'Failed to import private keys.');
            }
        } catch (error) {
            console.error('Error importing keys:', error);
            this.showAlert('Network error occurred while importing keys.');
        } finally {
            this.hideLoading();
        }
    }

    displayWallets() {
        const container = document.getElementById('walletsContainer');
        const walletsList = document.getElementById('walletsList');

        if (this.wallets.length === 0) {
            walletsList.style.display = 'none';
            return;
        }

        const walletsHtml = this.wallets.map((wallet, index) => `
            <div class="wallet-item">
                <small class="text-muted">#${index + 1}</small><br>
                ${wallet.address}
            </div>
        `).join('');

        container.innerHTML = walletsHtml;
        walletsList.style.display = 'block';
    }

    handleNetworkChange(networkValue) {
        const customFields = document.getElementById('customNetworkFields');
        
        if (networkValue === 'custom') {
            customFields.style.display = 'block';
        } else {
            customFields.style.display = 'none';
        }

        this.selectedNetwork = networkValue;
    }

    getNetworkConfig() {
        const networkSelect = document.getElementById('networkSelect');
        const selectedValue = networkSelect.value;

        if (!selectedValue) {
            throw new Error('Please select a network first.');
        }

        const predefinedNetworks = {
            'ethereum': {
                name: 'Ethereum Mainnet',
                rpc_url: 'https://eth.llamarpc.com',
                chain_id: 1,
                symbol: 'ETH',
                explorer: 'https://etherscan.io'
            },
            'sepolia': {
                name: 'Sepolia Testnet',
                rpc_url: 'https://rpc.sepolia.org',
                chain_id: 11155111,
                symbol: 'ETH',
                explorer: 'https://sepolia.etherscan.io'
            },
            'holesky': {
                name: 'Holesky Testnet',
                rpc_url: 'https://ethereum-holesky.publicnode.com',
                chain_id: 17000,
                symbol: 'ETH',
                explorer: 'https://holesky.etherscan.io'
            },
            'monad': {
                name: 'Monad Testnet',
                rpc_url: 'https://testnet-rpc.monad.xyz',
                chain_id: 41454,
                symbol: 'MON',
                explorer: 'https://testnet-explorer.monad.xyz'
            }
        };

        if (selectedValue === 'custom') {
            const rpcUrl = document.getElementById('customRpc').value.trim();
            const chainId = parseInt(document.getElementById('customChainId').value);
            const symbol = document.getElementById('customSymbol').value.trim();
            const explorer = document.getElementById('customExplorer').value.trim();

            if (!rpcUrl || !chainId || !symbol) {
                throw new Error('Please fill in all required custom network fields.');
            }

            return {
                name: 'Custom Network',
                rpc_url: rpcUrl,
                chain_id: chainId,
                symbol: symbol,
                explorer: explorer || ''
            };
        }

        return predefinedNetworks[selectedValue];
    }

    async loadBalances() {
        if (this.wallets.length === 0) {
            this.showAlert('Please import wallets first.');
            return;
        }

        try {
            const networkConfig = this.getNetworkConfig();
            this.showLoading('Loading wallet balances...');

            const response = await fetch('/get_balances', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    network: networkConfig
                })
            });

            const data = await response.json();

            if (data.success) {
                this.balances = data.balances;
                this.displayBalances(networkConfig.symbol);
                this.showAlert('Balances loaded successfully!', 'success');
                document.getElementById('transferSection').style.display = 'block';
            } else {
                this.showAlert(data.error || 'Failed to load balances.');
            }
        } catch (error) {
            console.error('Error loading balances:', error);
            this.showAlert(error.message || 'Error loading balances.');
        } finally {
            this.hideLoading();
        }
    }

    displayBalances(symbol) {
        const container = document.getElementById('balancesContainer');
        const balancesList = document.getElementById('balancesList');

        if (this.balances.length === 0) {
            balancesList.style.display = 'none';
            return;
        }

        const balancesHtml = this.balances.map((balance, index) => `
            <div class="balance-item ${balance.error ? 'text-danger' : ''}">
                <div class="balance-address">
                    <small class="text-muted">#${index + 1}</small><br>
                    ${balance.address}
                    ${balance.error ? `<div class="error-text">${balance.error}</div>` : ''}
                </div>
                <div class="balance-amount">
                    ${balance.balance_formatted} ${symbol}
                </div>
            </div>
        `).join('');

        container.innerHTML = balancesHtml;
        balancesList.style.display = 'block';
    }

    async sendTransactions() {
        if (this.wallets.length === 0) {
            this.showAlert('Please import wallets first.');
            return;
        }

        if (this.balances.length === 0) {
            this.showAlert('Please load balances first.');
            return;
        }

        const recipientAddress = document.getElementById('recipientAddress').value.trim();
        if (!recipientAddress) {
            this.showAlert('Please enter a recipient address.');
            return;
        }

        // Validate Ethereum address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
            this.showAlert('Please enter a valid Ethereum address.');
            return;
        }

        const selectedPercentage = document.querySelector('input[name="percentage"]:checked');
        if (!selectedPercentage) {
            this.showAlert('Please select an amount percentage.');
            return;
        }

        const percentage = parseInt(selectedPercentage.value);

        try {
            const networkConfig = this.getNetworkConfig();
            
            const confirmed = confirm(
                `Are you sure you want to send ${percentage === 100 ? 'MAX' : percentage + '%'} ` +
                `of each wallet's balance to ${recipientAddress}?\n\n` +
                `This will affect ${this.wallets.length} wallets on ${networkConfig.name}.`
            );

            if (!confirmed) {
                return;
            }

            this.showLoading('Sending transactions... This may take a while.');

            const response = await fetch('/send_transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    network: networkConfig,
                    percentage: percentage,
                    recipient_address: recipientAddress
                })
            });

            const data = await response.json();

            if (data.success) {
                this.displayResults(data.results, networkConfig.symbol);
                this.showAlert('Transactions completed! Check results below.', 'info');
                document.getElementById('resultsSection').style.display = 'block';
            } else {
                this.showAlert(data.error || 'Failed to send transactions.');
            }
        } catch (error) {
            console.error('Error sending transactions:', error);
            this.showAlert(error.message || 'Error sending transactions.');
        } finally {
            this.hideLoading();
        }
    }

    displayResults(results, symbol) {
        const container = document.getElementById('resultsContainer');
        
        const successCount = results.filter(r => r.status === 'success').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        const summaryHtml = `
            <div class="alert alert-info mb-3">
                <h6 class="mb-2">Transaction Summary</h6>
                <p class="mb-0">
                    <strong>Total:</strong> ${results.length} transactions |
                    <strong class="text-success">Success:</strong> ${successCount} |
                    <strong class="text-danger">Failed:</strong> ${failedCount}
                </p>
            </div>
        `;

        const resultsHtml = results.map((result, index) => `
            <div class="result-item ${result.status === 'success' ? 'result-success' : 'result-failed'}">
                <div class="result-wallet">
                    <small class="text-muted">#${index + 1}</small><br>
                    ${result.wallet}
                </div>
                <div class="result-details">
                    <div>
                        <span class="status-badge ${result.status === 'success' ? 'status-success' : 'status-failed'}">
                            ${result.status}
                        </span>
                    </div>
                    <div class="result-amount">
                        ${result.amount} ${symbol}
                    </div>
                    <div>
                        ${result.tx_hash ? 
                            `<a href="${result.explorer_url || '#'}" target="_blank" class="tx-hash-link">
                                <i class="fas fa-external-link-alt me-1"></i>
                                ${result.tx_hash.substring(0, 16)}...
                            </a>` : 
                            '<span class="text-muted">No TX Hash</span>'
                        }
                    </div>
                </div>
                ${result.error ? `<div class="error-text mt-2">${result.error}</div>` : ''}
            </div>
        `).join('');

        container.innerHTML = summaryHtml + resultsHtml;
    }

    async clearSession() {
        const confirmed = confirm('Are you sure you want to clear all data and start over?');
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch('/clear_session', {
                method: 'POST'
            });

            if (response.ok) {
                // Reset UI
                this.wallets = [];
                this.balances = [];
                this.selectedNetwork = null;

                document.getElementById('privateKeyFile').value = '';
                document.getElementById('networkSelect').value = '';
                document.getElementById('recipientAddress').value = '';
                document.querySelectorAll('input[name="percentage"]').forEach(radio => {
                    radio.checked = false;
                });

                document.getElementById('walletsList').style.display = 'none';
                document.getElementById('networkSection').style.display = 'none';
                document.getElementById('transferSection').style.display = 'none';
                document.getElementById('resultsSection').style.display = 'none';
                document.getElementById('customNetworkFields').style.display = 'none';

                this.showAlert('Session cleared successfully!', 'success');
            }
        } catch (error) {
            console.error('Error clearing session:', error);
            this.showAlert('Error clearing session.');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EVMMultiSender();
});
