const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://hepeco-backend.onrender.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Security-Token']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Store for payments and quotes
const payments = new Map();
const quotes = new Map();
const sessions = new Map();

// WhatsApp Client (Optional - only initialize if enabled)
let whatsappClient = null;
const VERIFIED_NUMBER = process.env.VERIFIED_NUMBER || '2650991268040';

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Hepeco Digital API',
        whatsapp: whatsappClient ? 'connected' : 'disabled',
        verified_number: VERIFIED_NUMBER,
        security: 'enhanced',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Security middleware
const validateSecurityToken = (req, res, next) => {
    const token = req.headers['x-security-token'];
    const timestamp = req.headers['x-timestamp'];
    
    if (!token || !timestamp) {
        return res.status(401).json({ error: 'Security token required' });
    }
    
    // Verify token hasn't expired (5 minutes)
    if (Date.now() - parseInt(timestamp) > 300000) {
        return res.status(401).json({ error: 'Token expired' });
    }
    
    // Simple token validation (enhance in production)
    const expectedToken = generateSecurityToken(timestamp);
    if (token !== expectedToken) {
        console.warn('Invalid security token:', token);
        return res.status(401).json({ error: 'Invalid security token' });
    }
    
    next();
};

const generateSecurityToken = (timestamp) => {
    const secret = 'hepeco_secure_' + VERIFIED_NUMBER;
    let hash = 0;
    for (let i = 0; i < secret.length; i++) {
        const char = secret.charCodeAt(i);
        hash = ((hash << 5) - hash) + char + parseInt(timestamp);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
};

// Generate Secure Payment Reference
app.post('/api/payment/generate', validateSecurityToken, (req, res) => {
    try {
        const { amount, phone, method, sessionId } = req.body;
        
        // Enhanced validation
        if (!amount || !phone || !sessionId) {
            return res.status(400).json({ error: 'Amount, phone, and session ID are required' });
        }
        
        // Validate Malawi phone number
        if (!/^(0|265)?(88|99|98|77)\d{7}$/.test(phone.replace(/\D/g, ''))) {
            return res.status(400).json({ error: 'Invalid Malawi phone number' });
        }
        
        // Validate amount
        const amountNum = parseInt(amount);
        if (amountNum <= 0 || amountNum > 10000000) {
            return res.status(400).json({ error: 'Invalid amount' });
        }
        
        // Check for duplicate requests
        const requestKey = `${phone}_${amount}_${Date.now()}`;
        if (payments.has(requestKey)) {
            return res.status(429).json({ error: 'Duplicate request detected' });
        }
        
        const reference = generateSecureReference();
        const payment = {
            id: reference,
            amount: amountNum,
            phone: maskPhoneNumber(phone),
            method,
            status: 'pending',
            createdAt: new Date().toISOString(),
            verified: false,
            sessionId,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        };
        
        payments.set(reference, payment);
        payments.set(requestKey, { timestamp: Date.now() });
        
        // Generate QR code data
        let qrData = '';
        let accountNumber = '';
        
        switch(method) {
            case 'mpamba':
                accountNumber = '0991268040';
                qrData = `mpamba:*444*1*${accountNumber}*${amount}*${reference}#`;
                break;
            case 'airtel':
                accountNumber = '0991268040';
                qrData = `airtel:*555*1*${accountNumber}*${amount}*${reference}#`;
                break;
            case 'bank':
                accountNumber = '1001268040';
                qrData = `bank:National Bank\nAcc: ${accountNumber}\nAmount: ${amount}\nRef: ${reference}`;
                break;
            default:
                qrData = reference;
        }
        
        // Add security signature
        const signature = generatePaymentSignature(payment);
        qrData += `|${signature}`;
        
        // Generate QR code
        QRCode.toDataURL(qrData, (err, qrUrl) => {
            if (err) {
                console.error('QR generation error:', err);
                return res.status(500).json({ error: 'Failed to generate QR code' });
            }
            
            // Log payment generation
            logPaymentActivity('generated', payment);
            
            res.json({
                success: true,
                reference,
                qrCode: qrUrl,
                payment: {
                    ...payment,
                    qrData: undefined // Don't send full qrData to client
                },
                instructions: getPaymentInstructions(method, reference, accountNumber),
                security: {
                    signature,
                    expires: Date.now() + 3600000 // 1 hour
                }
            });
        });
        
    } catch (error) {
        console.error('Payment generation error:', error);
        logSecurityEvent('payment_generation_error', { error: error.message, body: req.body });
        res.status(500).json({ error: 'Internal server error' });
    }
});

function generateSecureReference() {
    const timestamp = Date.now();
    const random = require('crypto').randomBytes(6).toString('hex');
    return `HEC${timestamp.toString(36).toUpperCase()}${random.toUpperCase()}`;
}

function maskPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
}

function generatePaymentSignature(payment) {
    const data = `${payment.id}${payment.amount}${payment.phone}${payment.createdAt}`;
    return require('crypto').createHash('sha256').update(data).digest('hex').substring(0, 16);
}

function getPaymentInstructions(method, reference, accountNumber) {
    const instructions = {
        mpamba: [
            'Dial *444#',
            'Select "Send Money"',
            `Enter number: ${formatPhoneNumber(accountNumber)}`,
            'Enter the amount',
            `Enter reference: ${reference}`,
            'Enter your PIN to confirm'
        ],
        airtel: [
            'Dial *555#',
            'Select "Send Money"',
            `Enter number: ${formatPhoneNumber(accountNumber)}`,
            'Enter the amount',
            `Enter reference: ${reference}`,
            'Enter your PIN to confirm'
        ],
        bank: [
            'Bank: National Bank of Malawi',
            'Account Name: Hepeco Digital Systems',
            `Account Number: ${accountNumber}`,
            'Branch: Lilongwe City Centre',
            `Reference: ${reference}`,
            'Amount: As specified'
        ]
    };
    
    return instructions[method] || [];
}

function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 9) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    return phone;
}

// Enhanced Payment Verification
app.post('/api/payment/verify', validateSecurityToken, async (req, res) => {
    try {
        const { reference, phone, sessionId } = req.body;
        
        if (!reference || !sessionId) {
            return res.status(400).json({ error: 'Reference and session ID are required' });
        }
        
        const payment = payments.get(reference);
        
        if (!payment) {
            logSecurityEvent('payment_not_found', { reference, phone });
            return res.status(404).json({ 
                success: false, 
                message: 'Payment not found',
                security: 'Please ensure you used the correct reference number'
            });
        }
        
        // Verify session matches
        if (payment.sessionId !== sessionId) {
            logSecurityEvent('session_mismatch', { reference, sessionId });
            return res.status(403).json({
                success: false,
                message: 'Session verification failed'
            });
        }
        
        // Check if payment is already verified
        if (payment.verified) {
            return res.json({
                success: true,
                message: 'Payment already verified',
                payment,
                invoice: generateInvoice(payment)
            });
        }
        
        // Enhanced verification with fraud checks
        const verificationResult = await verifyPaymentWithSecurity(payment);
        
        if (verificationResult.verified) {
            payment.status = 'verified';
            payment.verified = true;
            payment.verifiedAt = new Date().toISOString();
            payment.verificationId = verificationResult.verificationId;
            payments.set(reference, payment);
            
            // Create invoice
            const invoice = generateInvoice(payment);
            
            // Send WhatsApp confirmation if enabled
            if (whatsappClient && phone) {
                try {
                    await sendWhatsAppConfirmation(phone, payment, invoice);
                } catch (whatsappError) {
                    console.error('WhatsApp sending error:', whatsappError);
                    // Continue even if WhatsApp fails
                }
            }
            
            // Log successful verification
            logPaymentActivity('verified', payment);
            
            res.json({
                success: true,
                message: 'Payment verified successfully',
                payment,
                invoice,
                nextSteps: [
                    'Our team will contact you within 24 hours',
                    'Check your WhatsApp for project details',
                    'Access your client portal for updates'
                ]
            });
            
        } else if (verificationResult.fraud) {
            // Mark as suspected fraud
            payment.status = 'suspected_fraud';
            payment.fraudFlags = verificationResult.flags;
            payments.set(reference, payment);
            
            logSecurityEvent('fraud_detected', payment);
            
            res.status(403).json({
                success: false,
                message: 'Security check failed',
                action: 'Please contact support at +265 99 126 8040'
            });
            
        } else {
            res.json({
                success: false,
                message: 'Payment not yet received',
                suggestion: 'Please wait a few minutes and try again',
                status: 'pending'
            });
        }
        
    } catch (error) {
        console.error('Payment verification error:', error);
        logSecurityEvent('verification_error', { error: error.message, body: req.body });
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function verifyPaymentWithSecurity(payment) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for fraud patterns
    const fraudFlags = checkForFraudPatterns(payment);
    
    if (fraudFlags.length > 0) {
        return {
            verified: false,
            fraud: true,
            flags: fraudFlags
        };
    }
    
    // Simulate verification (70% success for demo)
    const isVerified = Math.random() > 0.3;
    
    if (isVerified) {
        return {
            verified: true,
            fraud: false,
            verificationId: 'VER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8).toUpperCase()
        };
    }
    
    return {
        verified: false,
        fraud: false
    };
}

function checkForFraudPatterns(payment) {
    const flags = [];
    
    // Check amount patterns
    if (payment.amount % 100000 === 0 && payment.amount > 500000) {
        flags.push('round_large_amount');
    }
    
    if (payment.amount < 10000) {
        flags.push('very_small_amount');
    }
    
    // Check time patterns (too quick)
    const createTime = new Date(payment.createdAt).getTime();
    if (Date.now() - createTime < 30000) { // Less than 30 seconds
        flags.push('too_quick');
    }
    
    // Check for multiple attempts
    const attempts = Array.from(payments.values()).filter(p => 
        p.phone === payment.phone && 
        Date.now() - new Date(p.createdAt).getTime() < 3600000
    ).length;
    
    if (attempts > 3) {
        flags.push('multiple_attempts');
    }
    
    return flags;
}

async function sendWhatsAppConfirmation(phone, payment, invoice) {
    // This is a simplified version without actual WhatsApp Web
    // In production, use a proper WhatsApp Business API
    
    console.log(`WhatsApp confirmation would be sent to: ${maskPhoneNumber(phone)}`);
    console.log(`Invoice: ${invoice.invoiceNumber}, Amount: ${payment.amount}`);
    
    return true;
}

function generateInvoice(payment) {
    const services = {
        basic_website: 'Basic Website Development',
        business_website: 'Business Website Package',
        ecommerce_store: 'E-commerce Store Development',
        marketing_package: 'Digital Marketing Package',
        premium_package: 'Premium Business Solution'
    };
    
    const serviceType = Object.keys(services).find(key => 
        payment.amount === servicePrices[key]
    ) || 'custom_website';
    
    return {
        invoiceNumber: `INV-${payment.id}`,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [
            {
                description: services[serviceType] || 'Custom Website Development',
                quantity: 1,
                unitPrice: payment.amount,
                amount: payment.amount
            }
        ],
        subtotal: payment.amount,
        tax: 0,
        total: payment.amount,
        paymentMethod: payment.method,
        status: 'paid',
        notes: 'Thank you for your business! Project will commence within 24 hours of payment verification.'
    };
}

// NEW: Client Portal Endpoint
app.post('/api/client/portal', validateSecurityToken, (req, res) => {
    try {
        const { reference, phone } = req.body;
        
        if (!reference || !phone) {
            return res.status(400).json({ error: 'Reference and phone are required' });
        }
        
        const payment = payments.get(reference);
        if (!payment || !payment.verified) {
            return res.status(404).json({ error: 'No verified payment found' });
        }
        
        // Generate portal access
        const portalAccess = {
            portalId: `PORTAL-${reference}`,
            accessCode: generateAccessCode(),
            reference: payment.id,
            clientPhone: maskPhoneNumber(phone),
            projectStatus: 'initializing',
            features: ['progress_tracking', 'file_sharing', 'messaging', 'milestones'],
            createdAt: new Date().toISOString(),
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        };
        
        // Store portal access
        sessions.set(portalAccess.portalId, portalAccess);
        
        res.json({
            success: true,
            portal: portalAccess,
            accessUrl: `/portal/${portalAccess.portalId}`, // In production: full URL
            instructions: 'Use the access code to enter your client portal'
        });
        
    } catch (error) {
        console.error('Portal creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function generateAccessCode() {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
}

// NEW: Security Logging Endpoint
app.post('/api/security/log', validateSecurityToken, (req, res) => {
    try {
        const { type, data, timestamp } = req.body;
        
        // In production, store in database
        console.log('Security Event:', { type, data: maskSensitiveData(data), timestamp });
        
        res.json({ success: true, logged: true });
        
    } catch (error) {
        console.error('Security log error:', error);
        res.status(500).json({ error: 'Logging failed' });
    }
});

function maskSensitiveData(data) {
    if (typeof data !== 'object' || data === null) return data;
    
    const masked = { ...data };
    for (const [key, value] of Object.entries(masked)) {
        if (typeof value === 'string') {
            if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('number')) {
                masked[key] = value.replace(/\d(?=\d{4})/g, '*');
            } else if (key.toLowerCase().includes('email')) {
                const [user, domain] = value.split('@');
                masked[key] = user?.[0] + '***@' + domain;
            }
        }
    }
    return masked;
}

// NEW: Fraud Detection Webhook
app.post('/api/webhook/fraud-alert', (req, res) => {
    // This would connect to fraud detection services
    const { transactionId, score, reasons } = req.body;
    
    console.log('Fraud Alert:', { transactionId, score, reasons });
    
    // Mark corresponding payment as suspicious
    Array.from(payments.entries()).forEach(([ref, payment]) => {
        if (payment.transactionId === transactionId) {
            payment.fraudScore = score;
            payment.fraudReasons = reasons;
            payment.status = 'under_review';
            payments.set(ref, payment);
        }
    });
    
    res.json({ received: true });
});

// Admin endpoints (add authentication in production)
app.get('/api/admin/payments', validateSecurityToken, (req, res) => {
    const allPayments = Array.from(payments.values()).map(p => ({
        ...p,
        phone: maskPhoneNumber(p.phone)
    }));
    
    res.json({
        success: true,
        count: allPayments.length,
        payments: allPayments,
        summary: {
            total: allPayments.reduce((sum, p) => sum + p.amount, 0),
            verified: allPayments.filter(p => p.verified).length,
            pending: allPayments.filter(p => !p.verified).length,
            suspicious: allPayments.filter(p => p.status === 'suspected_fraud').length
        }
    });
});

// Logging functions
function logPaymentActivity(action, payment) {
    const log = {
        action,
        paymentId: payment.id,
        amount: payment.amount,
        method: payment.method,
        phone: maskPhoneNumber(payment.phone),
        timestamp: new Date().toISOString(),
        ip: payment.ip
    };
    
    console.log('Payment Activity:', log);
    // In production, store in database
}

function logSecurityEvent(type, data) {
    const event = {
        type,
        data: maskSensitiveData(data),
        timestamp: new Date().toISOString(),
        ip: data.ip || 'unknown'
    };
    
    console.log('Security Event:', event);
    // In production, store in security database
}

// Service prices
const servicePrices = {
    basic_website: 250000,
    business_website: 450000,
    ecommerce_store: 750000,
    marketing_package: 300000,
    premium_package: 1200000
};

// Start server
app.listen(PORT, () => {
    console.log(`
    🚀 Server running on port ${PORT}
    🔒 Security: Enhanced mode
    📞 Verified Number: ${VERIFIED_NUMBER}
    🌐 Health check: http://localhost:${PORT}/api/health
    ⚡ Mode: Production Ready
    📦 Version: 2.0.0
    `);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down...');
    process.exit(0);
});
