const express = require('express');
const cors = require('cors');
const axios = require('axios');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store for payments and quotes
const payments = new Map();
const quotes = new Map();

// WhatsApp Client (optional - for automated responses)
let whatsappClient = null;

// Initialize WhatsApp if credentials are provided
if (process.env.WHATSAPP_ENABLED === 'true') {
    whatsappClient = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    whatsappClient.on('qr', (qr) => {
        console.log('WhatsApp QR Code generated');
        // Store QR for admin panel if needed
    });

    whatsappClient.on('ready', () => {
        console.log('WhatsApp Client is ready!');
    });

    whatsappClient.initialize();
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Hepeco Digital API',
        whatsapp: whatsappClient ? 'connected' : 'disabled',
        timestamp: new Date().toISOString()
    });
});

// Generate Payment Reference
app.post('/api/payment/generate', (req, res) => {
    try {
        const { amount, phone, method } = req.body;
        
        if (!amount || !phone) {
            return res.status(400).json({ error: 'Amount and phone number are required' });
        }
        
        const reference = `HEP${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const payment = {
            id: reference,
            amount: parseInt(amount),
            phone,
            method,
            status: 'pending',
            createdAt: new Date().toISOString(),
            verified: false
        };
        
        payments.set(reference, payment);
        
        // Generate QR code data
        let qrData = '';
        switch(method) {
            case 'mpamba':
                qrData = `mpamba:*444*1*0991234567*${amount}*${reference}#`;
                break;
            case 'airtel':
                qrData = `airtel:*555*1*0881234567*${amount}*${reference}#`;
                break;
            case 'bank':
                qrData = `bank:National Bank\nAcc: 1001234567\nAmount: ${amount}\nRef: ${reference}`;
                break;
            default:
                qrData = reference;
        }
        
        // Generate QR code
        QRCode.toDataURL(qrData, (err, qrUrl) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to generate QR code' });
            }
            
            res.json({
                success: true,
                reference,
                qrCode: qrUrl,
                payment,
                instructions: getPaymentInstructions(method, reference)
            });
        });
        
    } catch (error) {
        console.error('Payment generation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function getPaymentInstructions(method, reference) {
    const instructions = {
        mpamba: [
            'Dial *444#',
            'Select "Send Money"',
            'Enter number: 099 123 4567',
            'Enter the amount',
            `Enter reference: ${reference}`
        ],
        airtel: [
            'Dial *555#',
            'Select "Send Money"',
            'Enter number: 088 123 4567',
            'Enter the amount',
            `Enter reference: ${reference}`
        ],
        bank: [
            'Bank: National Bank',
            'Account: Hepeco Digital Systems',
            'Account No: 1001234567',
            'Branch: Lilongwe',
            `Reference: ${reference}`
        ]
    };
    
    return instructions[method] || [];
}

// Verify Payment
app.post('/api/payment/verify', async (req, res) => {
    try {
        const { reference, phone } = req.body;
        
        if (!reference) {
            return res.status(400).json({ error: 'Reference number is required' });
        }
        
        const payment = payments.get(reference);
        
        if (!payment) {
            return res.status(404).json({ 
                success: false, 
                message: 'Payment not found' 
            });
        }
        
        // In production, integrate with mobile money API
        // This is a simulation - implement real API integration here
        
        const isVerified = await simulatePaymentVerification(payment);
        
        if (isVerified) {
            payment.status = 'verified';
            payment.verifiedAt = new Date().toISOString();
            payments.set(reference, payment);
            
            // Send WhatsApp confirmation if client is available
            if (whatsappClient && phone) {
                sendWhatsAppConfirmation(phone, payment);
            }
            
            // Create invoice
            const invoice = generateInvoice(payment);
            
            res.json({
                success: true,
                message: 'Payment verified successfully',
                payment,
                invoice
            });
        } else {
            res.json({
                success: false,
                message: 'Payment not yet received. Please try again in a few minutes.'
            });
        }
        
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Simulate payment verification (Replace with real API calls)
async function simulatePaymentVerification(payment) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate verification logic (70% success rate for demo)
    const isVerified = Math.random() > 0.3;
    
    // In production, integrate with:
    // 1. Mpamba API
    // 2. Airtel Money API
    // 3. Bank API (via Fintech platform)
    
    return isVerified;
}

// Send WhatsApp confirmation
async function sendWhatsAppConfirmation(phone, payment) {
    try {
        const formattedPhone = phone.replace(/\D/g, '');
        const chatId = `${formattedPhone}@c.us`;
        
        const message = `
✅ *Payment Confirmed!*
        
Thank you for your payment to Hepeco Digital Systems.
        
*Payment Details:*
📊 Reference: ${payment.id}
💰 Amount: MK ${payment.amount.toLocaleString()}
💳 Method: ${payment.method}
📅 Date: ${new Date(payment.createdAt).toLocaleDateString()}
        
We'll start working on your project immediately. Our team will contact you within 24 hours.
        
For any questions, reply to this message or call +265 991 234 567.
        
Thank you for choosing Hepeco Digital!
        `;
        
        await whatsappClient.sendMessage(chatId, message);
        console.log(`WhatsApp confirmation sent to ${phone}`);
        
    } catch (error) {
        console.error('Failed to send WhatsApp confirmation:', error);
    }
}

// Generate invoice
function generateInvoice(payment) {
    return {
        invoiceNumber: `INV-${payment.id}`,
        date: new Date().toISOString().split('T')[0],
        items: [
            {
                description: 'Website Development Service',
                amount: payment.amount
            }
        ],
        subtotal: payment.amount,
        tax: 0,
        total: payment.amount,
        paymentMethod: payment.method,
        status: 'paid'
    };
}

// Save Quote Request
app.post('/api/quote/save', (req, res) => {
    try {
        const { name, email, phone, service, timeline, budget, message } = req.body;
        
        if (!name || !phone || !service) {
            return res.status(400).json({ error: 'Name, phone, and service are required' });
        }
        
        const quoteId = `QUOTE${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const quote = {
            id: quoteId,
            name,
            email: email || '',
            phone,
            service,
            timeline: timeline || '14 days',
            budget: budget || 0,
            message: message || '',
            status: 'new',
            createdAt: new Date().toISOString(),
            estimatedPrice: calculateEstimate(service, timeline)
        };
        
        quotes.set(quoteId, quote);
        
        // Send WhatsApp notification to admin
        if (whatsappClient) {
            sendQuoteNotification(quote);
        }
        
        res.json({
            success: true,
            quoteId,
            message: 'Quote saved successfully',
            quote
        });
        
    } catch (error) {
        console.error('Quote save error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

function calculateEstimate(service, timeline) {
    const prices = {
        'basic_website': 250000,
        'business_website': 450000,
        'ecommerce_store': 750000,
        'marketing_package': 300000
    };
    
    const basePrice = prices[service] || 300000;
    let multiplier = 1;
    
    if (timeline === '7 days') multiplier = 1.25;
    if (timeline === '3 days') multiplier = 1.5;
    
    return Math.round(basePrice * multiplier);
}

async function sendQuoteNotification(quote) {
    try {
        const adminPhone = process.env.ADMIN_PHONE;
        if (!adminPhone || !whatsappClient) return;
        
        const chatId = `${adminPhone.replace(/\D/g, '')}@c.us`;
        
        const message = `
📋 *New Quote Request*
        
*Customer Details:*
👤 Name: ${quote.name}
📞 Phone: ${quote.phone}
📧 Email: ${quote.email || 'Not provided'}
        
*Project Details:*
🛠️ Service: ${quote.service}
⏱️ Timeline: ${quote.timeline}
💰 Budget: MK ${quote.budget?.toLocaleString() || 'Not specified'}
💵 Estimate: MK ${quote.estimatedPrice.toLocaleString()}
        
*Message:*
${quote.message || 'No additional message'}
        
*Quote ID:* ${quote.id}
        `;
        
        await whatsappClient.sendMessage(chatId, message);
        console.log(`Quote notification sent for ${quote.id}`);
        
    } catch (error) {
        console.error('Failed to send quote notification:', error);
    }
}

// Get Payment Status
app.get('/api/payment/:reference', (req, res) => {
    const { reference } = req.params;
    const payment = payments.get(reference);
    
    if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json({
        success: true,
        payment
    });
});

// Webhook for mobile money notifications (for production)
app.post('/api/webhook/mobile-money', (req, res) => {
    // This endpoint would receive real-time notifications from
    // mobile money providers when payments are made
    
    const { transactionId, amount, phone, reference, status } = req.body;
    
    console.log('Mobile Money Webhook:', {
        transactionId,
        amount,
        phone,
        reference,
        status
    });
    
    // Update payment status in database
    if (payments.has(reference)) {
        const payment = payments.get(reference);
        payment.status = status === 'successful' ? 'verified' : 'failed';
        payment.transactionId = transactionId;
        payment.verifiedAt = new Date().toISOString();
        payments.set(reference, payment);
        
        // Send confirmation
        sendPaymentConfirmation(payment);
    }
    
    res.json({ received: true });
});

// Get all payments (admin only - add authentication in production)
app.get('/api/admin/payments', (req, res) => {
    const allPayments = Array.from(payments.values());
    res.json({
        success: true,
        count: allPayments.length,
        payments: allPayments
    });
});

// Get all quotes (admin only)
app.get('/api/admin/quotes', (req, res) => {
    const allQuotes = Array.from(quotes.values());
    res.json({
        success: true,
        count: allQuotes.length,
        quotes: allQuotes
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
