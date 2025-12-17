// ================================
// SECURITY CONFIGURATION
// ================================

// Security utility functions
const SecurityUtils = {
    sanitizeInput: function(input) {
        if (typeof input !== 'string') return input;
        
        // Remove potential harmful characters
        return input
            .replace(/[<>"'`]/g, '') // Remove HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    },
    
    validateEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    validatePhone: function(phone) {
        // Simple phone validation - adjust based on your country
        const phoneRegex = /^[\d\s\-\+\(\)]{8,15}$/;
        return phoneRegex.test(phone);
    },
    
    validateAmount: function(amount) {
        return !isNaN(amount) && amount > 0 && amount <= 100000000; // Max 100 million
    },
    
    generateCSRFToken: function() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
};

// Payment security class
class PaymentSecurity {
    static validatePaymentRequest(paymentData) {
        const requiredFields = ['amount', 'phone', 'method'];
        
        for (const field of requiredFields) {
            if (!paymentData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        if (!SecurityUtils.validateAmount(paymentData.amount)) {
            throw new Error('Invalid amount');
        }
        
        if (!SecurityUtils.validatePhone(paymentData.phone)) {
            throw new Error('Invalid phone number');
        }
        
        const validMethods = ['mpamba', 'airtel', 'bank'];
        if (!validMethods.includes(paymentData.method)) {
            throw new Error('Invalid payment method');
        }
        
        return true;
    }
    
    static encryptPaymentData(paymentData) {
        // In production, use proper encryption
        // This is a simplified version for demonstration
        const encrypted = {
            ...paymentData,
            timestamp: Date.now(),
            signature: this.generateSignature(paymentData)
        };
        
        return encrypted;
    }
    
    static generateSignature(data) {
        // Generate a simple signature for data integrity
        const str = JSON.stringify(data) + localStorage.getItem('security_token');
        let hash = 0;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return hash.toString(16);
    }
}

// Session security
const SessionSecurity = {
    validateSession: function() {
        const token = localStorage.getItem('security_token');
        const timestamp = localStorage.getItem('session_timestamp');
        
        if (!token || !timestamp) {
            return false;
        }
        
        const now = Date.now();
        const sessionAge = now - parseInt(timestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (sessionAge > maxAge) {
            this.clearSession();
            return false;
        }
        
        return true;
    },
    
    createSession: function(token) {
        localStorage.setItem('security_token', token);
        localStorage.setItem('session_timestamp', Date.now().toString());
        localStorage.setItem('csrf_token', SecurityUtils.generateCSRFToken());
    },
    
    clearSession: function() {
        localStorage.removeItem('security_token');
        localStorage.removeItem('session_timestamp');
        localStorage.removeItem('csrf_token');
    },
    
    refreshSession: function() {
        const timestamp = localStorage.getItem('session_timestamp');
        if (timestamp) {
            localStorage.setItem('session_timestamp', Date.now().toString());
        }
    }
};

// ================================
// MAIN SECURE PAYMENT MANAGER
// ================================

class SecurePaymentManager {
    constructor() {
        this.baseURL = 'https://hepeco-backend.onrender.com';
        this.paymentQueue = [];
        this.isProcessing = false;
        this.servicePrices = {
            basic_website: 250000,
            business_website: 450000,
            ecommerce_store: 750000,
            marketing_package: 300000
        };
        this.selectedMethod = 'mpamba';
        this.currentAmount = 0;
        this.referenceNumber = this.generateReference();
        this.defaultWhatsAppNumber = '265991234567';
        this.init();
    }
    
    async init() {
        // Initialize security first
        if (!SessionSecurity.validateSession()) {
            console.warn('Invalid session detected, creating new session');
            SessionSecurity.createSession(this.generateSessionToken());
        }
        
        this.setupSecureEventListeners();
        await this.initializeSecurityHandshake();
        this.startPaymentProcessor();
        this.setupPaymentOptions();
        this.setupQuoteCalculator();
        this.setupPaymentForm();
        this.setupWhatsAppButtons();
    }
    
    generateSessionToken() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    generateReference() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `HEPECO${timestamp}${random}`;
    }
    
    // ================================
    // SECURITY METHODS
    // ================================
    
    async initializeSecurityHandshake() {
        try {
            const response = await fetch(`${this.baseURL}/api/security/handshake`, {
                method: 'POST',
                headers: this.getSecureHeaders(),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                SessionSecurity.createSession(data.token);
                this.sessionId = data.sessionId;
                console.log('Security handshake successful');
            }
        } catch (error) {
            console.error('Security handshake failed:', error);
        }
    }
    
    getSecureHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': localStorage.getItem('csrf_token') || '',
            'X-Session-ID': this.sessionId || '',
            'X-Client-Version': '1.0.0',
            'X-Timestamp': Date.now().toString()
        };
        
        const securityToken = localStorage.getItem('security_token');
        if (securityToken) {
            headers['Authorization'] = `Bearer ${securityToken}`;
        }
        
        return headers;
    }
    
    // ================================
    // PAYMENT PROCESSING
    // ================================
    
    async processPayment(paymentData) {
        try {
            // Validate input
            PaymentSecurity.validatePaymentRequest(paymentData);
            
            // Encrypt payment data
            const encryptedData = PaymentSecurity.encryptPaymentData(paymentData);
            
            // Add to queue
            this.paymentQueue.push({
                data: encryptedData,
                timestamp: Date.now(),
                retryCount: 0
            });
            
            return this.processQueue();
            
        } catch (error) {
            console.error('Payment processing error:', error);
            this.showErrorMessage(error.message);
            throw error;
        }
    }
    
    async processQueue() {
        if (this.isProcessing || this.paymentQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        while (this.paymentQueue.length > 0) {
            const payment = this.paymentQueue.shift();
            
            try {
                const response = await this.sendPaymentRequest(payment);
                
                if (response.success) {
                    this.logPaymentSuccess(payment, response);
                } else {
                    this.handlePaymentError(payment, response);
                }
            } catch (error) {
                console.error('Queue processing error:', error);
                this.handlePaymentError(payment, { error: error.message });
            }
        }
        
        this.isProcessing = false;
    }
    
    async sendPaymentRequest(payment) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
            const response = await fetch(`${this.baseURL}/api/payments/secure`, {
                method: 'POST',
                headers: this.getSecureHeaders(),
                body: JSON.stringify(payment.data),
                signal: controller.signal,
                credentials: 'include',
                mode: 'cors',
                cache: 'no-cache',
                referrerPolicy: 'strict-origin-when-cross-origin'
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    // ================================
    // UI AND FORM HANDLING
    // ================================
    
    setupPaymentOptions() {
        const options = document.querySelectorAll('.payment-option');
        
        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                this.selectedMethod = option.dataset.method;
                this.updatePaymentInstructions();
            });
        });
    }
    
    setupQuoteCalculator() {
        const serviceSelect = document.getElementById('serviceType');
        const timelineSelect = document.getElementById('timeline');
        
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
        };
        
        if (serviceSelect) {
            serviceSelect.addEventListener('change', calculateQuote);
        }
        
        if (timelineSelect) {
            timelineSelect.addEventListener('change', calculateQuote);
        }
        
        // Proceed to payment button
        const proceedBtn = document.getElementById('proceedPayment');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => {
                if (this.currentAmount === 0) {
                    this.showErrorMessage('Please select a service first.');
                    return;
                }
                
                const quoteSection = document.getElementById('quote');
                if (quoteSection) {
                    quoteSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
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
        const generateBtn = document.getElementById('generatePayment');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                const phoneInput = document.getElementById('phoneNumber');
                if (!phoneInput || !phoneInput.value) {
                    this.showErrorMessage('Please enter your phone number.');
                    return;
                }
                
                if (!SecurityUtils.validatePhone(phoneInput.value)) {
                    this.showErrorMessage('Please enter a valid phone number.');
                    return;
                }
                
                this.showQRCode();
            });
        }
        
        // Verify payment button
        const verifyBtn = document.getElementById('verifyPayment');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => {
                this.verifyPayment();
            });
        }
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
        if (!modal) return;
        
        const amount = this.currentAmount;
        const method = this.selectedMethod;
        
        // Generate QR code data
        let accountNumber = '';
        
        switch(method) {
            case 'mpamba':
                accountNumber = '099 123 4567';
                break;
            case 'airtel':
                accountNumber = '088 123 4567';
                break;
            case 'bank':
                accountNumber = '1001234567';
                break;
        }
        
        // Display details in modal
        const modalAmount = document.getElementById('modalAmount');
        const modalRef = document.getElementById('modalRef');
        const modalAccount = document.getElementById('modalAccount');
        
        if (modalAmount) modalAmount.textContent = `MK ${amount.toLocaleString()}`;
        if (modalRef) modalRef.textContent = this.referenceNumber;
        if (modalAccount) modalAccount.textContent = accountNumber;
        
        // Generate QR code (simulated)
        const qrcodeDiv = document.getElementById('qrcode');
        if (qrcodeDiv) {
            qrcodeDiv.innerHTML = `
                <div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 8px;">
                    <div style="text-align: center;">
                        <i class="fas fa-qrcode" style="font-size: 60px; color: #666;"></i>
                        <p style="margin-top: 10px; font-size: 0.9rem;">${this.selectedMethod.toUpperCase()}</p>
                    </div>
                </div>
            `;
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Close modal
        const closeBtn = document.querySelector('.close-modal');
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
    
    async verifyPayment() {
        const statusDiv = document.getElementById('paymentStatus');
        if (!statusDiv) return;
        
        statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying payment...';
        statusDiv.className = '';
        
        // Simulate API call (replace with actual backend call)
        setTimeout(() => {
            // Mock verification
            const isSuccess = Math.random() > 0.3;
            
            if (isSuccess) {
                statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Payment verified successfully! We\'ll contact you shortly.';
                statusDiv.className = 'success';
                
                // Send WhatsApp confirmation
                const phoneInput = document.getElementById('phoneNumber');
                if (phoneInput && phoneInput.value) {
                    const message = `Payment confirmed! Reference: ${this.referenceNumber}. Thank you for choosing Hepeco Digital. We'll start your project soon.`;
                    this.openWhatsAppChat(message);
                }
                
            } else {
                statusDiv.innerHTML = '<i class="fas fa-times-circle"></i> Payment not found. Please try again or contact support.';
                statusDiv.className = 'error';
            }
        }, 2000);
    }
    
    // ================================
    // WHATSAPP INTEGRATION
    // ================================
    
    setupWhatsAppButtons() {
        // WhatsApp chat button
        const whatsappChatBtn = document.getElementById('whatsappChat');
        if (whatsappChatBtn) {
            whatsappChatBtn.addEventListener('click', () => {
                this.openWhatsAppChat("Hello! I'm interested in your services.");
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
                
                this.openWhatsAppChat(message);
            });
        });
        
        // Send via WhatsApp button
        const sendWhatsAppBtn = document.getElementById('sendWhatsApp');
        if (sendWhatsAppBtn) {
            sendWhatsAppBtn.addEventListener('click', () => {
                this.sendQuickMessage();
            });
        }
        
        // Send email button
        const sendEmailBtn = document.getElementById('sendEmail');
        if (sendEmailBtn) {
            sendEmailBtn.addEventListener('click', () => {
                this.sendEmail();
            });
        }
    }
    
    openWhatsAppChat(message = '') {
        const encodedMessage = encodeURIComponent(SecurityUtils.sanitizeInput(message));
        window.open(`https://wa.me/${this.defaultWhatsAppNumber}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');
    }
    
    sendQuickMessage() {
        const name = document.getElementById('quickName')?.value.trim() || '';
        const phone = document.getElementById('quickPhone')?.value.trim() || '';
        const service = document.getElementById('quickService')?.value || '';
        const message = document.getElementById('quickMessage')?.value.trim() || '';
        
        if (!name || !phone) {
            this.showErrorMessage('Please enter your name and phone number.');
            return;
        }
        
        if (!SecurityUtils.validatePhone(phone)) {
            this.showErrorMessage('Please enter a valid phone number.');
            return;
        }
        
        let fullMessage = `New Inquiry from ${SecurityUtils.sanitizeInput(name)}\n`;
        fullMessage += `Phone: ${SecurityUtils.sanitizeInput(phone)}\n`;
        
        if (service) {
            const serviceSelect = document.getElementById('quickService');
            const serviceText = serviceSelect.options[serviceSelect.selectedIndex].text;
            fullMessage += `Service: ${SecurityUtils.sanitizeInput(serviceText)}\n`;
        }
        
        if (message) {
            fullMessage += `Message: ${SecurityUtils.sanitizeInput(message)}`;
        }
        
        this.openWhatsAppChat(fullMessage);
        
        // Clear form
        const quickName = document.getElementById('quickName');
        const quickPhone = document.getElementById('quickPhone');
        const quickService = document.getElementById('quickService');
        const quickMessage = document.getElementById('quickMessage');
        
        if (quickName) quickName.value = '';
        if (quickPhone) quickPhone.value = '';
        if (quickService) quickService.selectedIndex = 0;
        if (quickMessage) quickMessage.value = '';
    }
    
    sendEmail() {
        const name = document.getElementById('quickName')?.value.trim() || '';
        const phone = document.getElementById('quickPhone')?.value.trim() || '';
        const service = document.getElementById('quickService')?.value || '';
        const message = document.getElementById('quickMessage')?.value.trim() || '';
        
        let subject = 'New Inquiry from Website';
        let body = `Name: ${SecurityUtils.sanitizeInput(name) || 'Not provided'}\n`;
        body += `Phone: ${SecurityUtils.sanitizeInput(phone) || 'Not provided'}\n`;
        
        if (service) {
            const serviceSelect = document.getElementById('quickService');
            const serviceText = serviceSelect.options[serviceSelect.selectedIndex].text;
            body += `Service: ${SecurityUtils.sanitizeInput(serviceText)}\n`;
        }
        
        if (message) {
            body += `\nMessage:\n${SecurityUtils.sanitizeInput(message)}`;
        }
        
        const mailtoLink = `mailto:info@hepecodigital.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    }
    
    // ================================
    // EVENT LISTENERS AND VALIDATION
    // ================================
    
    setupSecureEventListeners() {
        // Secure all form submissions
        document.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const form = e.target;
            if (!this.validateForm(form)) {
                return;
            }
            
            const formData = this.collectFormData(form);
            const sanitizedData = this.sanitizeFormData(formData);
            
            await this.submitForm(form, sanitizedData);
        });
        
        // Input sanitization
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea, select')) {
                this.sanitizeInput(e.target);
            }
        });
        
        // Setup payment buttons
        document.querySelectorAll('[data-payment]').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                
                const paymentData = {
                    amount: parseFloat(button.dataset.amount),
                    phone: SecurityUtils.sanitizeInput(button.dataset.phone),
                    method: SecurityUtils.sanitizeInput(button.dataset.method),
                    reference: SecurityUtils.sanitizeInput(button.dataset.reference)
                };
                
                try {
                    await this.processPayment(paymentData);
                } catch (error) {
                    console.error('Payment failed:', error);
                }
            });
        });
        
        // Setup quick quote button
        const showQuoteBtn = document.getElementById('showQuote');
        if (showQuoteBtn) {
            showQuoteBtn.addEventListener('click', () => {
                const quoteSection = document.getElementById('quote');
                if (quoteSection) {
                    quoteSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        
        // Setup mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                const navbar = document.querySelector('.navbar .container');
                if (navbar) {
                    navbar.classList.toggle('menu-open');
                }
            });
        }
        
        // Phone call buttons
        document.querySelectorAll('[data-phone]').forEach(button => {
            button.addEventListener('click', (e) => {
                const phone = SecurityUtils.sanitizeInput(button.dataset.phone);
                window.location.href = `tel:${phone}`;
            });
        });
        
        // Email buttons
        document.querySelectorAll('[data-email]').forEach(button => {
            button.addEventListener('click', (e) => {
                const email = SecurityUtils.sanitizeInput(button.dataset.email);
                const subject = SecurityUtils.sanitizeInput(button.dataset.subject || '');
                const body = SecurityUtils.sanitizeInput(button.dataset.body || '');
                
                const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.location.href = mailto;
            });
        });
    }
    
    validateForm(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.highlightError(field, 'This field is required');
                isValid = false;
            } else {
                this.removeError(field);
            }
        });
        
        return isValid;
    }
    
    collectFormData(form) {
        const formData = {};
        const elements = form.elements;
        
        for (let element of elements) {
            if (element.name && !element.disabled) {
                if (element.type === 'checkbox' || element.type === 'radio') {
                    if (element.checked) {
                        formData[element.name] = element.value;
                    }
                } else {
                    formData[element.name] = element.value;
                }
            }
        }
        
        return formData;
    }
    
    sanitizeFormData(formData) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(formData)) {
            if (typeof value === 'string') {
                sanitized[key] = SecurityUtils.sanitizeInput(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }
    
    sanitizeInput(input) {
        const originalValue = input.value;
        const sanitized = SecurityUtils.sanitizeInput(originalValue);
        
        if (originalValue !== sanitized) {
            input.value = sanitized;
            this.highlightWarning(input, 'Input sanitized for security');
        }
    }
    
    async submitForm(form, data) {
        const submitButton = form.querySelector('button[type="submit"]');
        if (!submitButton) return;
        
        const originalText = submitButton.textContent;
        
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        try {
            const response = await fetch(form.action || `${this.baseURL}/api/${form.dataset.endpoint}`, {
                method: form.method || 'POST',
                headers: this.getSecureHeaders(),
                body: JSON.stringify(data),
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.handleFormSuccess(form, result);
            } else {
                throw new Error(result.message || 'Form submission failed');
            }
        } catch (error) {
            this.handleFormError(form, error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }
    
    handleFormSuccess(form, result) {
        // Reset form
        form.reset();
        
        // Show success message
        this.showSuccessMessage(result.message || 'Form submitted successfully');
        
        // Refresh session
        SessionSecurity.refreshSession();
        
        // Redirect if needed
        if (result.redirect) {
            setTimeout(() => {
                window.location.href = result.redirect;
            }, 2000);
        }
    }
    
    handleFormError(form, error) {
        this.showErrorMessage(error.message || 'An error occurred. Please try again.');
        
        // Log error
        this.sendAuditLog({
            type: 'form_error',
            form: form.id || form.name,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
    
    // ================================
    // UI UTILITIES
    // ================================
    
    highlightError(element, message) {
        element.style.borderColor = '#ef4444';
        
        let errorSpan = element.nextElementSibling;
        if (!errorSpan || !errorSpan.classList.contains('error-message')) {
            errorSpan = document.createElement('span');
            errorSpan.className = 'error-message';
            errorSpan.style.cssText = `
                color: #ef4444;
                font-size: 0.875rem;
                margin-top: 0.25rem;
                display: block;
            `;
            element.parentNode.appendChild(errorSpan);
        }
        
        errorSpan.textContent = message;
    }
    
    highlightWarning(element, message) {
        element.style.borderColor = '#f59e0b';
        
        let warningSpan = element.nextElementSibling;
        if (!warningSpan || !warningSpan.classList.contains('warning-message')) {
            warningSpan = document.createElement('span');
            warningSpan.className = 'warning-message';
            warningSpan.style.cssText = `
                color: #f59e0b;
                font-size: 0.875rem;
                margin-top: 0.25rem;
                display: block;
            `;
            element.parentNode.appendChild(warningSpan);
        }
        
        warningSpan.textContent = message;
    }
    
    removeError(element) {
        element.style.borderColor = '';
        
        const errorSpan = element.nextElementSibling;
        if (errorSpan && errorSpan.classList.contains('error-message')) {
            errorSpan.remove();
        }
        
        const warningSpan = element.nextElementSibling;
        if (warningSpan && warningSpan.classList.contains('warning-message')) {
            warningSpan.remove();
        }
    }
    
    showSuccessMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'secure-message success';
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                messageDiv.remove();
            }, 300);
        }, 5000);
    }
    
    showErrorMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'secure-message error';
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                messageDiv.remove();
            }, 300);
        }, 5000);
    }
    
    // ================================
    // AUDIT AND LOGGING
    // ================================
    
    logPaymentSuccess(payment, response) {
        const logEntry = {
            type: 'payment_success',
            paymentId: response.paymentId,
            amount: payment.data.amount,
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId
        };
        
        this.sendAuditLog(logEntry);
        this.showSuccessMessage(response.message || 'Payment successful!');
    }
    
    handlePaymentError(payment, errorResponse) {
        if (payment.retryCount < 3) {
            payment.retryCount++;
            this.paymentQueue.unshift(payment);
            console.log(`Retrying payment (attempt ${payment.retryCount})`);
        } else {
            this.logPaymentFailure(payment, errorResponse);
            this.showErrorMessage('Payment failed. Please try again or contact support.');
        }
    }
    
    logPaymentFailure(payment, errorResponse) {
        const logEntry = {
            type: 'payment_failure',
            error: errorResponse.error || 'Unknown error',
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            retryCount: payment.retryCount
        };
        
        this.sendAuditLog(logEntry);
    }
    
    async sendAuditLog(logEntry) {
        try {
            await fetch(`${this.baseURL}/api/audit/log`, {
                method: 'POST',
                headers: this.getSecureHeaders(),
                body: JSON.stringify(logEntry),
                credentials: 'include'
            });
        } catch (error) {
            console.error('Failed to send audit log:', error);
        }
    }
    
    // ================================
    // BACKGROUND PROCESSING
    // ================================
    
    startPaymentProcessor() {
        setInterval(() => {
            this.processQueue();
        }, 5000);
    }
}

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if session is valid
    if (!SessionSecurity.validateSession()) {
        console.warn('Invalid session detected, reloading page');
        window.location.reload();
        return;
    }
    
    try {
        // Initialize secure payment manager
        const paymentManager = new SecurePaymentManager();
        window.SecurePaymentManager = paymentManager;
        
        console.log('Secure payment system initialized');
        
        // Update reference number every hour
        setInterval(() => {
            if (window.SecurePaymentManager) {
                window.SecurePaymentManager.referenceNumber = 
                    window.SecurePaymentManager.generateReference();
                window.SecurePaymentManager.updatePaymentInstructions();
            }
        }, 3600000);
        
    } catch (error) {
        console.error('Failed to initialize payment system:', error);
    }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .hidden {
        display: none !important;
    }
    
    .secure-message {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 500;
    }
    
    .success {
        background: #10b981 !important;
    }
    
    .error {
        background: #ef4444 !important;
    }
`;
document.head.appendChild(style);
