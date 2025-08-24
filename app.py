import os
import logging
import asyncio
from flask import Flask, render_template, request, jsonify, session
from werkzeug.middleware.proxy_fix import ProxyFix
from blockchain import BlockchainService

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Initialize blockchain service
blockchain_service = BlockchainService()

@app.route('/')
def index():
    """Main landing page"""
    return render_template('index.html')

@app.route('/import_keys', methods=['POST'])
def import_keys():
    """Import private keys from uploaded file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read file content
        content = file.read().decode('utf-8')
        private_keys = []
        
        # Parse private keys line by line
        for line in content.strip().split('\n'):
            line = line.strip()
            if line:
                # Remove 0x prefix if present
                if line.startswith('0x'):
                    line = line[2:]
                
                # Validate hex format (64 characters)
                if len(line) == 64 and all(c in '0123456789abcdefABCDEF' for c in line):
                    private_keys.append('0x' + line)
                else:
                    logging.warning(f"Invalid private key format: {line[:10]}...")
        
        if not private_keys:
            return jsonify({'error': 'No valid private keys found in file'}), 400
        
        # Generate wallet addresses
        wallets = []
        for pk in private_keys:
            try:
                address = blockchain_service.get_address_from_private_key(pk)
                wallets.append({
                    'private_key': pk,
                    'address': address
                })
            except Exception as e:
                logging.error(f"Error generating address for private key: {e}")
                continue
        
        # Store in session (temporary, not persistent)
        session['wallets'] = wallets
        
        return jsonify({
            'success': True,
            'wallets': [{'address': w['address']} for w in wallets],
            'count': len(wallets)
        })
        
    except Exception as e:
        logging.error(f"Error importing keys: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/get_balances', methods=['POST'])
def get_balances():
    """Get balances for all wallets on selected network"""
    try:
        data = request.get_json()
        network_config = data.get('network')
        
        if not network_config:
            return jsonify({'error': 'Network configuration required'}), 400
        
        wallets = session.get('wallets', [])
        if not wallets:
            return jsonify({'error': 'No wallets imported'}), 400
        
        # Get balances for all wallets
        balances = asyncio.run(blockchain_service.get_balances_async(
            [w['address'] for w in wallets], 
            network_config
        ))
        
        return jsonify({
            'success': True,
            'balances': balances
        })
        
    except Exception as e:
        logging.error(f"Error getting balances: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/send_transactions', methods=['POST'])
def send_transactions():
    """Send transactions from all wallets"""
    try:
        data = request.get_json()
        network_config = data.get('network')
        percentage = data.get('percentage')
        recipient_address = data.get('recipient_address')
        
        if not all([network_config, percentage, recipient_address]):
            return jsonify({'error': 'Missing required parameters'}), 400
        
        wallets = session.get('wallets', [])
        if not wallets:
            return jsonify({'error': 'No wallets imported'}), 400
        
        # Send transactions
        results = asyncio.run(blockchain_service.send_transactions_async(
            wallets, network_config, percentage, recipient_address
        ))
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logging.error(f"Error sending transactions: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/clear_session', methods=['POST'])
def clear_session():
    """Clear session data (wallets)"""
    session.clear()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
