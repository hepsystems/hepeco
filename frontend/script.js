// WhatsApp Integration
class WhatsAppManager {
    constructor() {
        this.defaultNumber = '265991234567';
        this.setupWhatsAppButtons();
    }
    
    setupWhatsAppButtons() {
        // WhatsApp chat button
        document.getElementById('whatsappChat').addEventListener('click', () => {
            this.openChat("Hello! I'm interested in your services.");
        });
        
        // Service WhatsApp buttons
        document.querySelectorAll('.service-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const service = e.target.dataset.service;
                let message = `Hello! I need help with ${service} service.`;
                
                if (service === 'website') message = "Hello! I need a website for my business.";
                if (service === 'ecommerce') message = "Hello! I need an online store.";
                if (service === 'marketing') message = "Hello! I need digital marketing services.";
                
                this.openChat(message);
            });
        });
        
        // Send via WhatsApp button
        document.getElementById('sendWhatsApp').addEventListener('click', () => {
            this.sendQuickMessage();
        });
    }
    
    openChat(message = '') {
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${this.defaultNumber}?text=${encodedMessage}`, '_blank');
    }
    
    sendQuickMessage() {
        const name = document.getElementById('quickName').value.trim();
        const phone = document.getElementById('quickPhone').value.trim();
        const service = document.getElementById('quickService').value;
        const message = document.getElementById('quickMessage').value.trim();
        
        if (!name || !phone) {
            alert('Please enter your name and phone number.');
            return;
        }
        
        let fullMessage = `New Inquiry from ${name}\n`;
        fullMessage += `Phone: ${phone}\n`;
        
        if (service) {
            const serviceText = document.getElementById('quickService').options[document.getElementById('quickService').selectedIndex].text;
            fullMessage += `Service: ${serviceText}\n`;
        }
        
        if (message) {
            fullMessage += `Message: ${message}`;
        }
        
        this.openChat(fullMessage);
        
        // Clear form
        document.getElementById('quickName').value = '';
        document.getElementById('quickPhone').value = '';
        document.getElementById('quickService').selectedIndex = 0;
        document.getElementById('quickMessage').value = '';
    }
}

// Payment Integration
class PaymentManager {
    constructor() {
        this.servicePrices = {
            basic_website: 250000,
            business_website: 450000,
            ecommerce_store: 750000,
            marketing_package: 300000
        };
        
        this.selectedMethod = 'mpamba';
        this.currentAmount = 0;
        this.referenceNumber = this.generateReference();
        
        this.init();
    }
    
    init() {
        this.setupPaymentOptions();
        this.setupQuoteCalculator();
        this.setupPaymentForm();
    }
    
    generateReference() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `HEPECO${timestamp}${random}`;
    }
    
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
            document.getElementById('amount').value = total.toLocaleString();
        };
        
        serviceSelect.addEventListener('change', calculateQuote);
        timelineSelect.addEventListener('change', calculateQuote);
        
        // Proceed to payment button
        document.getElementById('proceedPayment').addEventListener('click', () => {
            if (this.currentAmount === 0) {
                alert('Please select a service first.');
                return;
            }
            
            document.getElementById('quote').scrollIntoView({ behavior: 'smooth' });
        });
    }
    
    updateQuoteDisplay(serviceCost, timelineFee, total) {
        document.getElementById('serviceCost').textContent = `MK ${serviceCost.toLocaleString()}`;
        document.getElementById('timelineFee').textContent = `MK ${timelineFee.toLocaleString()}`;
        document.getElementById('totalCost').textContent = `MK ${total.toLocaleString()}`;
    }
    
    setupPaymentForm() {
        // Generate payment button
        document.getElementById('generatePayment').addEventListener('click', () => {
            if (!document.getElementById('phoneNumber').value) {
                alert('Please enter your phone number.');
                return;
            }
            
            this.showQRCode();
        });
        
        // Verify payment button
        document.getElementById('verifyPayment').addEventListener('click', () => {
            this.verifyPayment();
        });
    }
    
    updatePaymentInstructions() {
        // Hide all instructions
        document.querySelectorAll('.instructions').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show selected method instructions
        const method = this.selectedMethod;
        document.getElementById(`${method}Instructions`).classList.remove('hidden');
        
        // Update reference numbers
        const ref = this.referenceNumber;
        document.getElementById('mpambaRef').textContent = ref;
        document.getElementById('airtelRef').textContent = ref;
        document.getElementById('bankRef').textContent = ref;
    }
    
    showQRCode() {
        const modal = document.getElementById('qrModal');
        const amount = this.currentAmount;
        const method = this.selectedMethod;
        
        // Generate QR code data
        let qrData = '';
        let accountNumber = '';
        
        switch(method) {
            case 'mpamba':
                accountNumber = '099 123 4567';
                qrData = `mpamba:*444*1*${accountNumber}*${amount}*${this.referenceNumber}#`;
                break;
            case 'airtel':
                accountNumber = '088 123 4567';
                qrData = `airtel:*555*1*${accountNumber}*${amount}*${this.referenceNumber}#`;
                break;
            case 'bank':
                accountNumber = '1001234567';
                qrData = `bank:National Bank\nAccount: ${accountNumber}\nAmount: ${amount}\nRef: ${this.referenceNumber}`;
                break;
        }
        
        // Display details in modal
        document.getElementById('modalAmount').textContent = `MK ${amount.toLocaleString()}`;
        document.getElementById('modalRef').textContent = this.referenceNumber;
        document.getElementById('modalAccount').textContent = accountNumber;
        
        // Generate QR code (simulated)
        const qrcodeDiv = document.getElementById('qrcode');
        qrcodeDiv.innerHTML = `
            <div style="width: 200px; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; margin: 0 auto; border-radius: 8px;">
                <div style="text-align: center;">
                    <i class="fas fa-qrcode" style="font-size: 60px; color: #666;"></i>
                    <p style="margin-top: 10px; font-size: 0.9rem;">${this.selectedMethod.toUpperCase()}</p>
                </div>
            </div>
        `;
        
        // Show modal
        modal.style.display = 'flex';
        
        // Close modal
        document.querySelector('.close-modal').onclick = () => {
            modal.style.display = 'none';
        };
        
        // Close when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };
    }
    
    async verifyPayment() {
        const statusDiv = document.getElementById('paymentStatus');
        statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying payment...';
        statusDiv.className = '';
        
        // Simulate API call
        setTimeout(() => {
            // Mock verification - in real implementation, call your backend
            const isSuccess = Math.random() > 0.3; // 70% success rate for demo
            
            if (isSuccess) {
                statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Payment verified successfully! We\'ll contact you shortly.';
                statusDiv.className = 'success';
                
                // Send WhatsApp confirmation
                const phone = document.getElementById('phoneNumber').value;
                const message = `Payment confirmed! Reference: ${this.referenceNumber}. Thank you for choosing Hepeco Digital. We\'ll start your project soon.`;
                const whatsappManager = new WhatsAppManager();
                setTimeout(() => {
                    whatsappManager.openChat(message);
                }, 1000);
                
            } else {
                statusDiv.innerHTML = '<i class="fas fa-times-circle"></i> Payment not found. Please try again or contact support.';
                statusDiv.className = 'error';
            }
        }, 2000);
    }
}

// Quick Quote Feature
class QuickQuote {
    constructor() {
        document.getElementById('showQuote').addEventListener('click', () => {
            document.getElementById('quote').scrollIntoView({ behavior: 'smooth' });
        });
        
        // Initialize default quote
        this.updateDefaultQuote();
    }
    
    updateDefaultQuote() {
        // Set default values
        document.getElementById('serviceType').selectedIndex = 1;
        document.getElementById('timeline').selectedIndex = 0;
        document.getElementById('serviceType').dispatchEvent(new Event('change'));
    }
}

// Main Application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize managers
    new WhatsAppManager();
    new PaymentManager();
    new QuickQuote();
    
    // Setup mobile menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        const navbar = document.querySelector('.navbar .container');
        navbar.classList.toggle('menu-open');
    });
    
    // Send email button
    document.getElementById('sendEmail').addEventListener('click', () => {
        const name = document.getElementById('quickName').value.trim();
        const phone = document.getElementById('quickPhone').value.trim();
        const service = document.getElementById('quickService').value;
        const message = document.getElementById('quickMessage').value.trim();
        
        let subject = 'New Inquiry from Website';
        let body = `Name: ${name || 'Not provided'}\n`;
        body += `Phone: ${phone || 'Not provided'}\n`;
        
        if (service) {
            const serviceText = document.getElementById('quickService').options[document.getElementById('quickService').selectedIndex].text;
            body += `Service: ${serviceText}\n`;
        }
        
        if (message) {
            body += `\nMessage:\n${message}`;
        }
        
        const mailtoLink = `mailto:info@hepecodigital.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    });
    
    // Update reference number every hour
    setInterval(() => {
        const paymentManager = new PaymentManager();
        paymentManager.referenceNumber = paymentManager.generateReference();
        paymentManager.updatePaymentInstructions();
    }, 3600000);
});
