// WhatsApp Integration
class WhatsAppManager {
    constructor() {
        this.defaultNumber = '2650991268040'; // Updated number
        this.companyName = 'Hepeco Digital';
        this.setupWhatsAppButtons();
        this.validateWhatsAppSession();
    }
    
    setupWhatsAppButtons() {
        // WhatsApp chat button
        const whatsappChatBtn = document.getElementById('whatsappChat');
        if (whatsappChatBtn) {
            whatsappChatBtn.addEventListener('click', () => {
                this.openChat("Hello! I'm interested in your services.");
            });
        }
        
        // Service WhatsApp buttons
        document.querySelectorAll('.service-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const service = e.target.dataset.service;
                let message = `Hello! I need help with ${service} service.`;
                
                if (service === 'website') message = "Hello! I need a website for my business.";
                if (service === 'ecommerce') message = "Hello! I need an online store.";
                if (service === 'marketing') message = "Hello! I need digital marketing services.";
                
                // Add security token to prevent hijacking
                const token = this.generateSecurityToken();
                message += `\n\nSecurity Code: ${token}`;
                
                this.openChat(message);
                this.logWhatsAppInteraction(service, token);
            });
        });
        
        // Send via WhatsApp button
        const sendWhatsAppBtn = document.getElementById('sendWhatsApp');
        if (sendWhatsAppBtn) {
            sendWhatsAppBtn.addEventListener('click', () => {
                this.sendQuickMessage();
            });
        }
    }
    
    generateSecurityToken() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `HEC${timestamp}${random}`;
    }
    
    logWhatsAppInteraction(service, token) {
        const logData = {
            service,
            token,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ip: 'client-side'
        };
        
        // Store in localStorage for tracking
        const logs = JSON.parse(localStorage.getItem('whatsapp_logs') || '[]');
        logs.push(logData);
        localStorage.setItem('whatsapp_logs', JSON.stringify(logs.slice(-50))); // Keep last 50 logs
    }
    
    validateWhatsAppSession() {
        // Verify WhatsApp number hasn't been hijacked
        const storedNumber = localStorage.getItem('verified_whatsapp_number');
        if (storedNumber && storedNumber !== this.defaultNumber) {
            console.warn('WhatsApp number mismatch detected!');
            this.showSecurityAlert();
        }
        localStorage.setItem('verified_whatsapp_number', this.defaultNumber);
    }
    
    showSecurityAlert() {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'security-alert';
        alertDiv.innerHTML = `
            <i class="fas fa-shield-alt"></i>
            <span>Security Verification: Only communicate with ${this.companyName} at +${this.defaultNumber}</span>
        `;
        document.body.prepend(alertDiv);
        
        setTimeout(() => alertDiv.remove(), 10000);
    }
    
    openChat(message = '') {
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${this.defaultNumber}?text=${encodedMessage}`, '_blank');
    }
    
    sendQuickMessage() {
        const name = document.getElementById('quickName')?.value.trim();
        const phone = document.getElementById('quickPhone')?.value.trim();
        const service = document.getElementById('quickService')?.value;
        const message = document.getElementById('quickMessage')?.value.trim();
        
        if (!name || !phone) {
            alert('Please enter your name and phone number.');
            return;
        }
        
        let fullMessage = `New Inquiry from ${name}\n`;
        fullMessage += `Phone: ${phone}\n`;
        
        if (service) {
            const serviceSelect = document.getElementById('quickService');
            const serviceText = serviceSelect.options[serviceSelect.selectedIndex].text;
            fullMessage += `Service: ${serviceText}\n`;
        }
        
        if (message) {
            fullMessage += `Message: ${message}`;
        }
        
        // Add security verification
        const securityCode = this.generateSecurityToken();
        fullMessage += `\n\nVerification Code: ${securityCode}`;
        
        this.openChat(fullMessage);
        
        // Clear form
        const quickName = document.getElementById('quickName');
        const quickPhone = document.getElementById('quickPhone');
        const quickService = document.getElementById('quickService');
        const quickMessage = document.getElementById('quickMessage');
        
        if (quickName) quickName.value = '';
        if (quickPhone) quickPhone.value = '';
        if (quickService) quickService.selectedIndex = 0;
        if (quickMessage) quickMessage.value = '';
        
        // Show confirmation
        this.showMessageSentConfirmation(securityCode);
    }
    
    showMessageSentConfirmation(code) {
        const confirmation = document.createElement('div');
        confirmation.className = 'confirmation-message';
        confirmation.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <div>
                <strong>Message Sent Successfully!</strong>
                <p>Security Code: <code>${code}</code></p>
                <small>Keep this code for verification</small>
            </div>
        `;
        
        document.body.appendChild(confirmation);
        setTimeout(() => confirmation.remove(), 5000);
    }
}

// Payment Integration
class PaymentManager {
    constructor() {
        this.servicePrices = {
            basic_website: 250000,
            business_website: 450000,
            ecommerce_store: 750000,
            marketing_package: 300000,
            premium_package: 1200000
        };
        
        this.selectedMethod = 'mpamba';
        this.currentAmount = 0;
        this.referenceNumber = this.generateSecureReference();
        this.sessionId = this.generateSessionId();
        
        this.init();
    }
    
    generateSecureReference() {
        const timestamp = Date.now().toString();
        const random = window.crypto?.getRandomValues ? 
            window.crypto.getRandomValues(new Uint32Array(2))[0].toString(36) :
            Math.random().toString(36).substr(2, 9);
        const hash = btoa(timestamp + random).replace(/[+/=]/g, '').slice(0, 12);
        return `HEC${hash.toUpperCase()}`;
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    init() {
        this.setupPaymentOptions();
        this.setupQuoteCalculator();
        this.setupPaymentForm();
        this.setupPaymentDashboard();
        this.setupInvoiceSystem();
    }
    
    setupPaymentOptions() {
        const options = document.querySelectorAll('.payment-option');
        
        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                this.selectedMethod = option.dataset.method;
                this.updatePaymentInstructions();
                
                // Log payment method selection
                this.logPaymentActivity('method_selected', { method: this.selectedMethod });
            });
        });
    }
    
    // NEW FEATURE 1: Real-time Payment Dashboard
    setupPaymentDashboard() {
        // Create dashboard element if it doesn't exist
        if (!document.getElementById('paymentDashboard')) {
            const dashboard = document.createElement('div');
            dashboard.id = 'paymentDashboard';
            dashboard.className = 'payment-dashboard';
            dashboard.innerHTML = `
                <div class="dashboard-header">
                    <h4><i class="fas fa-chart-line"></i> Payment Status</h4>
                    <span class="dashboard-status" id="dashboardStatus">Active</span>
                </div>
                <div class="dashboard-content">
                    <div class="dashboard-item">
                        <span>Reference:</span>
                        <strong id="dashboardRef">${this.referenceNumber}</strong>
                    </div>
                    <div class="dashboard-item">
                        <span>Amount:</span>
                        <strong id="dashboardAmount">MK 0</strong>
                    </div>
                    <div class="dashboard-item">
                        <span>Status:</span>
                        <span class="status-badge pending" id="dashboardPaymentStatus">Pending</span>
                    </div>
                    <div class="dashboard-item">
                        <span>Last Check:</span>
                        <span id="dashboardLastCheck">Just now</span>
                    </div>
                </div>
            `;
            
            // Add to payment section
            const paymentSection = document.querySelector('.payment-form');
            if (paymentSection) {
                paymentSection.parentNode.insertBefore(dashboard, paymentSection.nextSibling);
            }
        }
        
        this.dashboardUpdateInterval = setInterval(() => {
            this.updatePaymentStatus();
        }, 30000); // Update every 30 seconds
    }
    
    updatePaymentStatus() {
        const lastCheck = document.getElementById('dashboardLastCheck');
        const status = document.getElementById('dashboardPaymentStatus');
        
        if (lastCheck) {
            lastCheck.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // Simulate status updates
        if (Math.random() > 0.7 && status && status.textContent === 'Pending') {
            status.textContent = 'Verified';
            status.className = 'status-badge verified';
            this.showPaymentSuccessNotification();
        }
    }
    
    showPaymentSuccessNotification() {
        const notification = document.createElement('div');
        notification.className = 'payment-notification success';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <div>
                <strong>Payment Verified!</strong>
                <p>Your payment has been confirmed. We'll contact you shortly.</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
    
    // NEW FEATURE 2: Automated Invoice Generation
    setupInvoiceSystem() {
        const invoiceBtn = document.createElement('button');
        invoiceBtn.className = 'btn-secondary invoice-btn';
        invoiceBtn.innerHTML = '<i class="fas fa-file-invoice"></i> Generate Invoice';
        invoiceBtn.onclick = () => this.generateInvoice();
        
        const paymentActions = document.querySelector('.payment-actions');
        if (paymentActions) {
            paymentActions.appendChild(invoiceBtn);
        }
    }
    
    generateInvoice() {
        if (this.currentAmount === 0) {
            alert('Please calculate a quote first.');
            return;
        }
        
        const serviceSelect = document.getElementById('serviceType');
        const timelineSelect = document.getElementById('timeline');
        
        if (!serviceSelect || !timelineSelect) {
            alert('Please select a service first.');
            return;
        }
        
        const serviceText = serviceSelect.options[serviceSelect.selectedIndex].text;
        const timelineText = timelineSelect.options[timelineSelect.selectedIndex].text;
        
        const invoiceData = {
            invoiceNumber: `INV-${this.referenceNumber}`,
            date: new Date().toLocaleDateString(),
            company: 'Hepeco Digital Systems',
            client: document.getElementById('phoneNumber')?.value || 'Client',
            items: [
                {
                    description: serviceText,
                    quantity: 1,
                    price: this.currentAmount
                }
            ],
            subtotal: this.currentAmount,
            tax: 0,
            total: this.currentAmount,
            paymentMethod: this.selectedMethod,
            terms: '50% deposit, 50% on completion'
        };
        
        this.displayInvoice(invoiceData);
        this.logPaymentActivity('invoice_generated', invoiceData);
    }
    
    displayInvoice(data) {
        const modal = document.getElementById('qrModal');
        if (!modal) return;
        
        const modalBody = modal.querySelector('.modal-body');
        if (!modalBody) return;
        
        modalBody.innerHTML = `
            <div class="invoice">
                <div class="invoice-header">
                    <h3><i class="fas fa-file-invoice"></i> Invoice ${data.invoiceNumber}</h3>
                    <p>Date: ${data.date}</p>
                </div>
                <div class="invoice-details">
                    <div class="invoice-row">
                        <span>From:</span>
                        <strong>${data.company}</strong>
                    </div>
                    <div class="invoice-row">
                        <span>To:</span>
                        <span>${data.client}</span>
                    </div>
                    <div class="invoice-row">
                        <span>Payment Method:</span>
                        <span>${data.paymentMethod}</span>
                    </div>
                </div>
                <table class="invoice-items">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.items.map(item => `
                            <tr>
                                <td>${item.description}</td>
                                <td>MK ${item.price.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="invoice-total">
                    <div class="total-row">
                        <span>Total:</span>
                        <strong>MK ${data.total.toLocaleString()}</strong>
                    </div>
                </div>
                <div class="invoice-actions">
                    <button class="btn-primary" onclick="window.print()">
                        <i class="fas fa-print"></i> Print Invoice
                    </button>
                    <button class="btn-secondary" onclick="this.downloadInvoice('${encodeURIComponent(JSON.stringify(data))}')">
                        <i class="fas fa-download"></i> Download PDF
                    </button>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
        
        // Close modal functionality
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        // Close when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
    
    downloadInvoice(data) {
        // In production, generate actual PDF
        alert('PDF invoice would be generated here. In production, connect to PDF generation service.');
    }
    
    setupQuoteCalculator() {
        const serviceSelect = document.getElementById('serviceType');
        const timelineSelect = document.getElementById('timeline');
        
        if (!serviceSelect || !timelineSelect) return;
        
        const calculateQuote = () => {
            const service = serviceSelect.value;
            const timeline = parseInt(timelineSelect.value);
            
            if (!service) {
                this.updateQuoteDisplay(0, 0, 0);
                return;
            }
            
            let basePrice = this.servicePrices[service] || 0;
            let timelineMultiplier = 1;
            
            if (timeline === 7) timelineMultiplier = 1.25;
            if (timeline === 3) timelineMultiplier = 1.5;
            
            const timelineFee = basePrice * (timelineMultiplier - 1);
            const total = basePrice * timelineMultiplier;
            
            this.updateQuoteDisplay(basePrice, timelineFee, total);
            this.currentAmount = total;
            
            // Update payment form amount
            const amountInput = document.getElementById('amount');
            if (amountInput) {
                amountInput.value = total.toLocaleString();
            }
            
            // Update dashboard
            const dashboardAmount = document.getElementById('dashboardAmount');
            const dashboardRef = document.getElementById('dashboardRef');
            
            if (dashboardAmount) dashboardAmount.textContent = `MK ${total.toLocaleString()}`;
            if (dashboardRef) dashboardRef.textContent = this.referenceNumber;
            
            this.logPaymentActivity('quote_calculated', { service, timeline, amount: total });
        };
        
        serviceSelect.addEventListener('change', calculateQuote);
        timelineSelect.addEventListener('change', calculateQuote);
        
        // Proceed to payment button
        const proceedPaymentBtn = document.getElementById('proceedPayment');
        if (proceedPaymentBtn) {
            proceedPaymentBtn.addEventListener('click', () => {
                if (this.currentAmount === 0) {
                    alert('Please select a service first.');
                    return;
                }
                
                const quoteSection = document.getElementById('quote');
                if (quoteSection) {
                    quoteSection.scrollIntoView({ behavior: 'smooth' });
                }
                this.showPaymentOptions();
            });
        }
        
        // Initialize calculation
        calculateQuote();
    }
    
    showPaymentOptions() {
        const paymentSection = document.querySelector('.payment-methods');
        if (paymentSection) {
            paymentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight payment section
            paymentSection.classList.add('highlight-section');
            setTimeout(() => {
                paymentSection.classList.remove('highlight-section');
            }, 2000);
        }
    }
    
    updateQuoteDisplay(serviceCost, timelineFee, total) {
        const serviceCostEl = document.getElementById('serviceCost');
        const timelineFeeEl = document.getElementById('timelineFee');
        const totalCostEl = document.getElementById('totalCost');
        
        if (serviceCostEl) serviceCostEl.textContent = `MK ${serviceCost.toLocaleString()}`;
        if (timelineFeeEl) timelineFeeEl.textContent = `MK ${timelineFee.toLocaleString()}`;
        if (totalCostEl) totalCostEl.textContent = `MK ${total.toLocaleString()}`;
    }
    
    setupPaymentForm() {
        // Generate payment button
        const generatePaymentBtn = document.getElementById('generatePayment');
        if (generatePaymentBtn) {
            generatePaymentBtn.addEventListener('click', () => {
                const phoneInput = document.getElementById('phoneNumber');
                const phone = phoneInput?.value.trim();
                
                if (!phone) {
                    alert('Please enter your phone number.');
                    return;
                }
                
                // Validate phone format
                if (!this.validatePhoneNumber(phone)) {
                    alert('Please enter a valid Malawi phone number (e.g., 0991268040)');
                    return;
                }
                
                this.showQRCode();
                this.logPaymentActivity('payment_initiated', { 
                    phone: this.maskPhoneNumber(phone),
                    amount: this.currentAmount,
                    method: this.selectedMethod 
                });
            });
        }
        
        // Verify payment button
        const verifyPaymentBtn = document.getElementById('verifyPayment');
        if (verifyPaymentBtn) {
            verifyPaymentBtn.addEventListener('click', () => {
                this.verifyPayment();
            });
        }
        
        // Add phone validation
        const phoneInput = document.getElementById('phoneNumber');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                this.validatePhoneInput(e.target);
            });
        }
    }
    
    validatePhoneNumber(phone) {
        const malawiRegex = /^(0|265)?(88|99|98|77)\d{7}$/;
        return malawiRegex.test(phone.replace(/\D/g, ''));
    }
    
    validatePhoneInput(input) {
        const value = input.value.replace(/\D/g, '');
        if (value.startsWith('0')) {
            input.value = value;
        } else if (value.startsWith('265')) {
            input.value = '0' + value.substring(3);
        } else if (value.length > 0) {
            input.value = '0' + value;
        }
        
        if (this.validatePhoneNumber(input.value)) {
            input.classList.add('valid');
            input.classList.remove('invalid');
        } else {
            input.classList.add('invalid');
            input.classList.remove('valid');
        }
    }
    
    maskPhoneNumber(phone) {
        // Mask phone number for logging
        return phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
    }
    
    logPaymentActivity(action, data) {
        const activity = {
            action,
            data,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            reference: this.referenceNumber
        };
        
        const activities = JSON.parse(localStorage.getItem('payment_activities') || '[]');
        activities.push(activity);
        localStorage.setItem('payment_activities', JSON.stringify(activities.slice(-100)));
    }
    
    updatePaymentInstructions() {
        // Hide all instructions
        document.querySelectorAll('.instructions').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show selected method instructions
        const method = this.selectedMethod;
        const methodInstructions = document.getElementById(`${method}Instructions`);
        if (methodInstructions) {
            methodInstructions.classList.remove('hidden');
        }
        
        // Update reference numbers
        const ref = this.referenceNumber;
        const mpambaRef = document.getElementById('mpambaRef');
        const airtelRef = document.getElementById('airtelRef');
        const bankRef = document.getElementById('bankRef');
        
        if (mpambaRef) mpambaRef.textContent = ref;
        if (airtelRef) airtelRef.textContent = ref;
        if (bankRef) bankRef.textContent = ref;
    }
    
    showQRCode() {
        const modal = document.getElementById('qrModal');
        const amount = this.currentAmount;
        const method = this.selectedMethod;
        
        if (!modal) return;
        
        // Generate QR code data with security features
        let qrData = '';
        let accountNumber = '';
        
        switch(method) {
            case 'mpamba':
                accountNumber = '0991268040';
                qrData = `mpamba:*444*1*${accountNumber}*${amount}*${this.referenceNumber}#`;
                break;
            case 'airtel':
                accountNumber = '0991268040';
                qrData = `airtel:*555*1*${accountNumber}*${amount}*${this.referenceNumber}#`;
                break;
            case 'bank':
                accountNumber = '1001268040';
                qrData = `bank:National Bank\nAccount: Hepeco Digital\nAcc: ${accountNumber}\nAmount: ${amount}\nRef: ${this.referenceNumber}`;
                break;
        }
        
        // Add timestamp for security
        qrData += `|${Date.now()}|${this.generateSecurityHash()}`;
        
        // Display details in modal
        const modalAmount = document.getElementById('modalAmount');
        const modalRef = document.getElementById('modalRef');
        const modalAccount = document.getElementById('modalAccount');
        
        if (modalAmount) modalAmount.textContent = `MK ${amount.toLocaleString()}`;
        if (modalRef) modalRef.textContent = this.referenceNumber;
        if (modalAccount) modalAccount.textContent = accountNumber;
        
        // Generate QR code
        this.generateQRCodeElement(qrData);
        
        // Show modal
        modal.style.display = 'flex';
        
        // Close modal
        const closeBtn = modal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.style.display = 'none';
            };
        }
        
        // Close when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
    
    generateSecurityHash() {
        const data = this.referenceNumber + this.currentAmount + Date.now();
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).slice(0, 8);
    }
    
    generateQRCodeElement(data) {
        const qrcodeDiv = document.getElementById('qrcode');
        if (!qrcodeDiv) return;
        
        // Clear previous QR
        qrcodeDiv.innerHTML = '';
        
        // Create canvas for QR code
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        qrcodeDiv.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Draw QR code background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 200, 200);
        
        // Draw QR code pattern (simplified version)
        ctx.fillStyle = '#000000';
        
        // Draw corner squares
        ctx.fillRect(20, 20, 40, 40);
        ctx.fillRect(140, 20, 40, 40);
        ctx.fillRect(20, 140, 40, 40);
        
        // Draw pattern
        for (let i = 0; i < data.length; i++) {
            const x = 30 + (i % 14) * 10;
            const y = 30 + Math.floor(i / 14) * 10;
            
            if (data.charCodeAt(i) % 2 === 0) {
                ctx.fillRect(x, y, 6, 6);
            }
        }
        
        // Add company logo in center
        ctx.fillStyle = '#4CAF50';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('H', 100, 112);
        
        // Add method text
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.fillText(this.selectedMethod.toUpperCase(), 100, 180);
    }
    
    async verifyPayment() {
        const statusDiv = document.getElementById('paymentStatus');
        const phoneInput = document.getElementById('phoneNumber');
        const phone = phoneInput?.value.trim();
        
        if (!statusDiv || !phone) {
            alert('Please enter your phone number first.');
            return;
        }
        
        statusDiv.innerHTML = '<div class="verification-loading"><i class="fas fa-spinner fa-spin"></i> Verifying payment securely...</div>';
        statusDiv.className = 'verifying';
        
        // Enhanced verification with security checks
        setTimeout(() => {
            // Check for common fraud patterns
            const isFraudulent = this.checkForFraudPatterns(phone, this.currentAmount);
            
            if (isFraudulent) {
                statusDiv.innerHTML = '<div class="verification-error"><i class="fas fa-shield-alt"></i> Security check failed. Please contact support.</div>';
                statusDiv.className = 'security-alert';
                this.logPaymentActivity('fraud_detected', { phone: this.maskPhoneNumber(phone), amount: this.currentAmount });
                return;
            }
            
            // Mock verification - in real implementation, call secure backend
            const isSuccess = Math.random() > 0.3; // 70% success rate for demo
            
            if (isSuccess) {
                statusDiv.innerHTML = `
                    <div class="verification-success">
                        <i class="fas fa-check-circle"></i>
                        <div>
                            <strong>Payment Verified Successfully!</strong>
                            <p>Reference: ${this.referenceNumber}</p>
                            <p>We'll contact you within 24 hours.</p>
                        </div>
                    </div>
                `;
                statusDiv.className = 'success';
                
                // Update dashboard
                const dashboardStatus = document.getElementById('dashboardPaymentStatus');
                if (dashboardStatus) {
                    dashboardStatus.textContent = 'Verified';
                    dashboardStatus.className = 'status-badge verified';
                }
                
                // Log successful payment
                this.logPaymentActivity('payment_verified', { 
                    phone: this.maskPhoneNumber(phone),
                    amount: this.currentAmount,
                    reference: this.referenceNumber 
                });
                
                // Send secure WhatsApp confirmation
                setTimeout(() => {
                    const message = `✅ Payment confirmed! Ref: ${this.referenceNumber}. We'll start your project soon. Security Code: ${this.generateSecurityHash()}`;
                    const whatsappManager = new WhatsAppManager();
                    whatsappManager.openChat(message);
                }, 1000);
                
                // NEW FEATURE 3: Show Client Portal Access
                setTimeout(() => {
                    this.showClientPortalAccess();
                }, 2000);
                
            } else {
                statusDiv.innerHTML = '<div class="verification-failed"><i class="fas fa-times-circle"></i> Payment not found. Please try again or contact support.</div>';
                statusDiv.className = 'error';
            }
        }, 3000); // Increased delay for realistic verification
    }
    
    checkForFraudPatterns(phone, amount) {
        // Basic fraud detection
        const suspiciousAmounts = [999999, 1000000, 5000000];
        const repeatedAttempts = this.getPaymentAttempts(phone);
        
        return suspiciousAmounts.includes(amount) || repeatedAttempts > 3;
    }
    
    getPaymentAttempts(phone) {
        const activities = JSON.parse(localStorage.getItem('payment_activities') || '[]');
        return activities.filter(act => 
            act.action === 'payment_initiated' && 
            act.data.phone.includes(phone.slice(-4))
        ).length;
    }
    
    // NEW FEATURE 3: Client Project Portal
    showClientPortalAccess() {
        const portalDiv = document.createElement('div');
        portalDiv.className = 'client-portal';
        portalDiv.innerHTML = `
            <div class="portal-header">
                <h4><i class="fas fa-user-shield"></i> Client Portal Access</h4>
            </div>
            <div class="portal-content">
                <p>Your project portal has been created!</p>
                <div class="portal-credentials">
                    <p><strong>Portal ID:</strong> CLIENT-${this.referenceNumber}</p>
                    <p><strong>Access Code:</strong> ${this.generateAccessCode()}</p>
                </div>
                <div class="portal-features-container">
                    <div class="feature">
                        <i class="fas fa-tasks"></i>
                        <span>Track Progress</span>
                    </div>
                    <div class="feature">
                        <i class="fas fa-file-upload"></i>
                        <span>Upload Files</span>
                    </div>
                    <div class="feature">
                        <i class="fas fa-comments"></i>
                        <span>Direct Messaging</span>
                    </div>
                </div>
                <button class="btn-primary" onclick="this.accessClientPortal()">
                    <i class="fas fa-sign-in-alt"></i> Access Portal
                </button>
            </div>
        `;
        
        const paymentStatus = document.getElementById('paymentStatus');
        if (paymentStatus && paymentStatus.parentNode) {
            paymentStatus.parentNode.insertBefore(portalDiv, paymentStatus.nextSibling);
        }
        
        // Log portal creation
        this.logPaymentActivity('portal_created', { reference: this.referenceNumber });
    }
    
    generateAccessCode() {
        return Math.random().toString(36).substr(2, 8).toUpperCase();
    }
    
    accessClientPortal() {
        alert('Client portal would open here. In production, this would connect to your project management system.');
        // In production: window.open(`https://portal.hepecodigital.com/${this.referenceNumber}`);
    }
}

// Quick Quote Feature with enhancements
class QuickQuote {
    constructor() {
        this.init();
    }
    
    init() {
        // Show quote button
        const showQuoteBtn = document.getElementById('showQuote');
        if (showQuoteBtn) {
            showQuoteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const quoteSection = document.getElementById('quote');
                if (quoteSection) {
                    quoteSection.scrollIntoView({ behavior: 'smooth' });
                    this.showQuoteTooltip();
                }
            });
        }
        
        // Initialize default quote
        this.updateDefaultQuote();
        
        // Add quote saving feature
        this.setupQuoteSaving();
    }
    
    showQuoteTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'quote-tooltip';
        tooltip.innerHTML = `
            <i class="fas fa-lightbulb"></i>
            <span>Tip: Select service and timeline for instant pricing</span>
        `;
        
        const quoteSection = document.getElementById('quote');
        if (quoteSection) {
            quoteSection.appendChild(tooltip);
            
            setTimeout(() => {
                if (tooltip.parentNode) {
                    tooltip.remove();
                }
            }, 5000);
        }
    }
    
    setupQuoteSaving() {
        const saveQuoteBtn = document.createElement('button');
        saveQuoteBtn.className = 'btn-secondary save-quote-btn';
        saveQuoteBtn.innerHTML = '<i class="fas fa-save"></i> Save Quote';
        saveQuoteBtn.onclick = () => this.saveCurrentQuote();
        
        const quoteBox = document.querySelector('.quote-box');
        const proceedBtn = document.getElementById('proceedPayment');
        if (quoteBox && proceedBtn) {
            quoteBox.insertBefore(saveQuoteBtn, proceedBtn);
        }
    }
    
    saveCurrentQuote() {
        const serviceSelect = document.getElementById('serviceType');
        const timelineSelect = document.getElementById('timeline');
        
        if (!serviceSelect || !timelineSelect) {
            alert('Please select a service first.');
            return;
        }
        
        const service = serviceSelect.value;
        const timeline = timelineSelect.options[timelineSelect.selectedIndex].text;
        
        if (!service) {
            alert('Please select a service first.');
            return;
        }
        
        const quote = {
            service: serviceSelect.options[serviceSelect.selectedIndex].text,
            timeline,
            amount: document.getElementById('totalCost')?.textContent || 'MK 0',
            date: new Date().toLocaleString(),
            id: 'QUOTE-' + Date.now().toString().slice(-8)
        };
        
        // Save to localStorage
        const savedQuotes = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
        savedQuotes.push(quote);
        localStorage.setItem('saved_quotes', JSON.stringify(savedQuotes.slice(-10))); // Keep last 10
        
        this.showQuoteSavedNotification(quote.id);
    }
    
    showQuoteSavedNotification(quoteId) {
        const notification = document.createElement('div');
        notification.className = 'quote-notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <div>
                <strong>Quote Saved!</strong>
                <p>Quote ID: ${quoteId}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
    
    updateDefaultQuote() {
        // Set default values
        const serviceSelect = document.getElementById('serviceType');
        const timelineSelect = document.getElementById('timeline');
        
        if (serviceSelect && timelineSelect) {
            serviceSelect.selectedIndex = 1;
            timelineSelect.selectedIndex = 0;
            
            // Trigger change event
            if (typeof Event === 'function') {
                serviceSelect.dispatchEvent(new Event('change'));
            }
        }
    }
}

// Main Application with fixed menu functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    new WhatsAppManager();
    new PaymentManager();
    new QuickQuote();
    
    // FIXED: Enhanced mobile menu toggle with proper event handling
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const navbar = document.querySelector('.navbar .container');
    
    // Ensure elements exist
    if (menuToggle && navMenu && navbar) {
        // Toggle menu when hamburger is clicked
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            navMenu.classList.toggle('active');
            menuToggle.classList.toggle('active');
            navbar.classList.toggle('menu-open');
            
            // Update aria-expanded for accessibility
            const isExpanded = navMenu.classList.contains('active');
            menuToggle.setAttribute('aria-expanded', isExpanded);
            
            // Toggle body scroll lock
            if (isExpanded) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navbar.contains(e.target) && !menuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
                menuToggle.classList.remove('active');
                navbar.classList.remove('menu-open');
                menuToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });
        
        // Close menu when clicking a nav link (for single page navigation)
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                menuToggle.classList.remove('active');
                navbar.classList.remove('menu-open');
                menuToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                navMenu.classList.remove('active');
                menuToggle.classList.remove('active');
                navbar.classList.remove('menu-open');
                menuToggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });
        
        // Prevent clicks inside menu from closing it
        navMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // FIXED: Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#" or empty
            if (href === '#' || href === '') return;
            
            e.preventDefault();
            
            const targetElement = document.querySelector(href);
            if (targetElement) {
                // Close mobile menu if open
                if (navMenu && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    menuToggle.classList.remove('active');
                    navbar.classList.remove('menu-open');
                    menuToggle.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                }
                
                // Smooth scroll to target
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Send email button with security
    const sendEmailBtn = document.getElementById('sendEmail');
    if (sendEmailBtn) {
        sendEmailBtn.addEventListener('click', () => {
            const name = document.getElementById('quickName')?.value.trim();
            const phone = document.getElementById('quickPhone')?.value.trim();
            const service = document.getElementById('quickService')?.value;
            const message = document.getElementById('quickMessage')?.value.trim();
            
            // Validate inputs
            if (!name || !phone) {
                alert('Please enter your name and phone number.');
                return;
            }
            
            // Sanitize inputs
            const sanitizedName = window.SecurityUtils ? 
                window.SecurityUtils.sanitizeInput(name) : 
                name.replace(/[<>]/g, '');
                
            const sanitizedPhone = window.SecurityUtils ? 
                window.SecurityUtils.sanitizeInput(phone) : 
                phone.replace(/[<>]/g, '');
                
            const sanitizedMessage = window.SecurityUtils ? 
                window.SecurityUtils.sanitizeInput(message) : 
                message.replace(/[<>]/g, '');
            
            let subject = 'Secure Inquiry - Hepeco Digital';
            let body = `Security Level: Encrypted\n`;
            body += `Timestamp: ${new Date().toISOString()}\n\n`;
            body += `Name: ${sanitizedName}\n`;
            body += `Phone: ${sanitizedPhone}\n`;
            
            if (service) {
                const serviceSelect = document.getElementById('quickService');
                const serviceText = serviceSelect.options[serviceSelect.selectedIndex].text;
                body += `Service: ${serviceText}\n`;
            }
            
            if (sanitizedMessage) {
                body += `\nMessage:\n${sanitizedMessage}`;
            }
            
            // Add security footer
            body += `\n\n---\nThis message was securely sent from Hepeco Digital website\nRef: WEB-${Date.now().toString().slice(-6)}`;
            
            const mailtoLink = `mailto:info@hepecodigital.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailtoLink;
        });
    }
    
    // Update reference number every hour with security
    setInterval(() => {
        try {
            const paymentManager = new PaymentManager();
            paymentManager.referenceNumber = paymentManager.generateSecureReference();
            paymentManager.updatePaymentInstructions();
            
            // Log reference rotation
            console.log('Payment reference rotated for security');
        } catch (error) {
            console.error('Error rotating payment reference:', error);
        }
    }, 3600000);
    
    // Add security warning for suspicious activities
    window.addEventListener('beforeunload', (e) => {
        const hasPendingPayment = document.querySelector('.verifying');
        if (hasPendingPayment) {
            e.preventDefault();
            e.returnValue = 'You have a payment verification in progress. Are you sure you want to leave?';
        }
    });
    
    // Initialize security features
    initializeSecurityFeatures();
});

function initializeSecurityFeatures() {
    // Add security indicators
    const securityIndicator = document.createElement('div');
    securityIndicator.className = 'security-indicator';
    securityIndicator.innerHTML = `
        <i class="fas fa-shield-alt"></i>
        <span>Secure Connection</span>
    `;
    document.body.appendChild(securityIndicator);
    
    // Monitor for suspicious activities
    const activityMonitor = {
        clicks: 0,
        startTime: Date.now(),
        
        incrementClick: function() {
            this.clicks++;
            
            // If too many clicks in short time, show warning
            if (this.clicks > 20 && (Date.now() - this.startTime) < 10000) {
                this.showActivityWarning();
            }
        },
        
        showActivityWarning: function() {
            const warning = document.createElement('div');
            warning.className = 'activity-warning';
            warning.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>Unusual activity detected. Please proceed normally.</span>
            `;
            document.body.appendChild(warning);
            setTimeout(() => {
                if (warning.parentNode) {
                    warning.remove();
                }
            }, 5000);
        }
    };
    
    // Track clicks
    document.addEventListener('click', () => activityMonitor.incrementClick());
}

// Make PaymentManager accessible for interval updates
window.PaymentManager = PaymentManager;

// Helper function for invoice download (needs to be on window)
window.downloadInvoice = function(data) {
    try {
        const invoiceData = JSON.parse(decodeURIComponent(data));
        alert(`Downloading invoice ${invoiceData.invoiceNumber}...\n\nIn production, this would generate a PDF.`);
    } catch (error) {
        console.error('Error downloading invoice:', error);
        alert('Error preparing invoice for download.');
    }
};

// Helper function for client portal access
PaymentManager.prototype.accessClientPortal = function() {
    alert('Client portal would open here. In production, this would connect to your project management system.');
};
