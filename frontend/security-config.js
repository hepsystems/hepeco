/**
 * Enhanced Frontend Security Configuration
 * Protects against number hijacking, fraud, and endpoint attacks
 */

class EnhancedSecurityConfig {
    constructor() {
        this.verifiedNumbers = {
            whatsapp: '2650991268040',
            phone: '+265991268040',
            mpamba: '0991268040',
            airtel: '0991268040',
            bank: '1001268040'
        };
        
        this.securityTokens = new Map();
        this.fraudPatterns = [];
        this.init();
    }
    
    init() {
        this.setupNumberProtection();
        this.setupEndpointSecurity();
        this.setupFraudDetection();
        this.setupCommunicationEncryption();
        this.setupSessionProtection();
        this.monitorForHijacking();
    }
    
    setupNumberProtection() {
        // Override window.open to validate WhatsApp URLs
        const originalOpen = window.open;
        window.open = function(url, target, features) {
            if (url && url.includes('wa.me') || url.includes('whatsapp.com')) {
                const verifiedNumber = '2650991268040';
                if (!url.includes(verifiedNumber)) {
                    console.error('Security: WhatsApp number mismatch detected!');
                    
                    // Show warning to user
                    const warning = document.createElement('div');
                    warning.className = 'hijack-warning';
                    warning.innerHTML = `
                        <div class="warning-content">
                            <i class="fas fa-exclamation-triangle"></i>
                            <div>
                                <h4>Security Alert</h4>
                                <p>Always verify you're communicating with Hepeco Digital at <strong>+265 99 126 8040</strong></p>
                                <button onclick="this.closeWarning()">I Understand</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(warning);
                    
                    // Redirect to verified number
                    url = url.replace(/wa\.me\/\d+/, `wa.me/${verifiedNumber}`);
                }
            }
            return originalOpen.call(this, url, target, features);
        };
        
        // Protect phone number elements from being changed
        this.protectPhoneElements();
    }
    
    protectPhoneElements() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 3 && node.textContent.includes('099') || node.textContent.includes('+265')) {
                        // Check if number is correct
                        const text = node.textContent;
                        if (!text.includes('0991268040') && !text.includes('+265991268040')) {
                            console.warn('Security: Phone number tampering detected');
                            node.textContent = node.textContent.replace(/\d{9,12}/g, '0991268040');
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }
    
    setupEndpointSecurity() {
        // Secure all API endpoints
        const originalFetch = window.fetch;
        window.fetch = function(resource, init = {}) {
            // Add security headers
            init.headers = init.headers || {};
            init.headers['X-Security-Token'] = this.generateEndpointToken();
            init.headers['X-Request-ID'] = this.generateRequestId();
            init.headers['X-Timestamp'] = Date.now();
            
            // Validate URLs for payment endpoints
            if (typeof resource === 'string' && resource.includes('/api/payment')) {
                if (!this.validatePaymentEndpoint(resource)) {
                    return Promise.reject(new Error('Invalid payment endpoint'));
                }
            }
            
            return originalFetch.call(this, resource, init);
        }.bind(this);
    }
    
    generateEndpointToken() {
        const timestamp = Math.floor(Date.now() / 60000); // Change every minute
        const secret = 'hepeco_secure_' + this.verifiedNumbers.whatsapp;
        let hash = 0;
        for (let i = 0; i < secret.length; i++) {
            const char = secret.charCodeAt(i);
            hash = ((hash << 5) - hash) + char + timestamp;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    generateRequestId() {
        return 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    validatePaymentEndpoint(url) {
        // Ensure payment endpoints are secure
        const allowedDomains = [
            'hepeco-backend.onrender.com',
            'localhost:5000',
            '127.0.0.1:5000'
        ];
        
        try {
            const urlObj = new URL(url);
            return allowedDomains.includes(urlObj.hostname) || urlObj.protocol === 'https:';
        } catch {
            return url.startsWith('/api/') || url.startsWith('./');
        }
    }
    
    setupFraudDetection() {
        // Detect common fraud patterns
        this.fraudPatterns = [
            { pattern: /999999|1000000|5000000/, type: 'suspicious_amount' },
            { pattern: /(\d)\1{5,}/, type: 'repeated_digits' },
            { pattern: /123456|654321/, type: 'sequential_pattern' },
            { pattern: /admin|root|system/i, type: 'suspicious_name' }
        ];
        
        // Monitor form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            if (this.detectFraud(data)) {
                e.preventDefault();
                this.handleFraudAttempt(data);
            }
        });
    }
    
    detectFraud(data) {
        for (const [key, value] of Object.entries(data)) {
            for (const fraudPattern of this.fraudPatterns) {
                if (fraudPattern.pattern.test(value)) {
                    console.warn(`Fraud detected: ${fraudPattern.type} in ${key}`);
                    return true;
                }
            }
        }
        
        // Check for too many submissions
        const submissions = JSON.parse(localStorage.getItem('form_submissions') || '[]');
        const recentSubmissions = submissions.filter(s => Date.now() - s.timestamp < 60000);
        if (recentSubmissions.length > 5) {
            console.warn('Too many form submissions detected');
            return true;
        }
        
        // Log submission
        submissions.push({ timestamp: Date.now(), data: this.sanitizeForLog(data) });
        localStorage.setItem('form_submissions', JSON.stringify(submissions.slice(-100)));
        
        return false;
    }
    
    handleFraudAttempt(data) {
        // Show warning to user
        const warning = document.createElement('div');
        warning.className = 'fraud-warning';
        warning.innerHTML = `
            <div class="warning-content">
                <i class="fas fa-shield-alt"></i>
                <div>
                    <h4>Security Check Required</h4>
                    <p>Please verify your information or contact support.</p>
                    <p>Call: +265 99 126 8040</p>
                </div>
            </div>
        `;
        document.body.appendChild(warning);
        
        // Log fraud attempt
        this.logSecurityEvent('fraud_attempt', data);
        
        // Remove warning after 10 seconds
        setTimeout(() => warning.remove(), 10000);
    }
    
    setupCommunicationEncryption() {
        // Encrypt sensitive data before transmission
        window.encryptForTransmission = function(data) {
            const timestamp = Date.now();
            const nonce = Math.random().toString(36).substr(2, 9);
            
            const payload = {
                data: data,
                timestamp: timestamp,
                nonce: nonce,
                version: '1.0'
            };
            
            // Simple XOR encryption for demo (use proper encryption in production)
            const key = this.verifiedNumbers.whatsapp;
            const encrypted = this.xorEncrypt(JSON.stringify(payload), key);
            
            return {
                encrypted: btoa(encrypted),
                checksum: this.generateChecksum(payload),
                timestamp: timestamp
            };
        }.bind(this);
        
        window.decryptFromTransmission = function(encryptedData) {
            try {
                const decrypted = this.xorDecrypt(atob(encryptedData.encrypted), this.verifiedNumbers.whatsapp);
                const payload = JSON.parse(decrypted);
                
                // Verify checksum
                if (this.generateChecksum(payload) !== encryptedData.checksum) {
                    throw new Error('Checksum verification failed');
                }
                
                // Verify timestamp (within 5 minutes)
                if (Date.now() - payload.timestamp > 300000) {
                    throw new Error('Data expired');
                }
                
                return payload.data;
            } catch (error) {
                console.error('Decryption failed:', error);
                return null;
            }
        }.bind(this);
    }
    
    xorEncrypt(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    }
    
    xorDecrypt(text, key) {
        return this.xorEncrypt(text, key); // XOR is symmetric
    }
    
    generateChecksum(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    setupSessionProtection() {
        // Protect against session hijacking
        let sessionToken = this.generateSessionToken();
        
        // Store token in multiple places for verification
        sessionStorage.setItem('session_token', sessionToken);
        localStorage.setItem('session_verify', sessionToken);
        
        // Verify session periodically
        setInterval(() => {
            this.verifySession();
        }, 30000);
        
        // Detect tab/window duplication
        window.addEventListener('storage', (e) => {
            if (e.key === 'session_token' && e.newValue !== sessionToken) {
                console.warn('Session duplication detected');
                this.handleSessionConflict();
            }
        });
        
        // Generate new token every hour
        setInterval(() => {
            sessionToken = this.generateSessionToken();
            sessionStorage.setItem('session_token', sessionToken);
            localStorage.setItem('session_verify', sessionToken);
        }, 3600000);
    }
    
    generateSessionToken() {
        const timestamp = Date.now();
        const random = window.crypto.getRandomValues(new Uint8Array(16));
        const base = btoa(String.fromCharCode(...random)).replace(/[+/=]/g, '');
        return `sess_${timestamp}_${base}`;
    }
    
    verifySession() {
        const sessionToken = sessionStorage.getItem('session_token');
        const verifyToken = localStorage.getItem('session_verify');
        
        if (sessionToken !== verifyToken) {
            console.error('Session verification failed');
            this.handleSessionMismatch();
        }
    }
    
    handleSessionMismatch() {
        // Clear sensitive data
        sessionStorage.clear();
        localStorage.removeItem('session_verify');
        
        // Show message to user
        alert('Session security issue detected. Please refresh the page.');
        window.location.reload();
    }
    
    handleSessionConflict() {
        // Only allow one active session
        if (confirm('Another tab is using this site. Continue here?')) {
            // This tab becomes primary
            const sessionToken = this.generateSessionToken();
            sessionStorage.setItem('session_token', sessionToken);
            localStorage.setItem('session_verify', sessionToken);
        } else {
            window.close();
        }
    }
    
    monitorForHijacking() {
        // Monitor for number hijacking attempts
        const hijackingPatterns = [
            { selector: 'a[href*="wa.me"]', attr: 'href' },
            { selector: 'a[href^="tel:"]', attr: 'href' },
            { selector: '.whatsapp-btn', attr: 'href' }
        ];
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        hijackingPatterns.forEach(pattern => {
                            const elements = node.querySelectorAll?.(pattern.selector) || [];
                            elements.forEach(el => {
                                this.verifyContactElement(el, pattern.attr);
                            });
                        });
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Initial check
        hijackingPatterns.forEach(pattern => {
            document.querySelectorAll(pattern.selector).forEach(el => {
                this.verifyContactElement(el, pattern.attr);
            });
        });
    }
    
    verifyContactElement(element, attribute) {
        const value = element.getAttribute(attribute);
        if (!value) return;
        
        const verifiedNumbers = Object.values(this.verifiedNumbers);
        let isVerified = false;
        
        for (const number of verifiedNumbers) {
            if (value.includes(number.replace(/\D/g, '')) || 
                value.includes(number.replace('+', '')) ||
                value.includes(number.replace('265', '0'))) {
                isVerified = true;
                break;
            }
        }
        
        if (!isVerified) {
            console.error('Hijacking detected:', element, value);
            element.style.border = '2px solid red';
            element.title = 'WARNING: Verify this number with Hepeco Digital';
            
            // Add click warning
            element.addEventListener('click', (e) => {
                if (!confirm('This contact link may not be verified. Always use +265 99 126 8040. Continue?')) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);
        }
    }
    
    logSecurityEvent(type, data) {
        const event = {
            type,
            data: this.sanitizeForLog(data),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        const events = JSON.parse(localStorage.getItem('security_events') || '[]');
        events.push(event);
        localStorage.setItem('security_events', JSON.stringify(events.slice(-1000)));
        
        // Send to server in production
        if (window.fetch && typeof window.fetch === 'function') {
            fetch('/api/security/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            }).catch(console.error);
        }
    }
    
    sanitizeForLog(data) {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('number')) {
                    sanitized[key] = value.replace(/\d(?=\d{4})/g, '*');
                } else if (key.toLowerCase().includes('email')) {
                    const [user, domain] = value.split('@');
                    sanitized[key] = user?.[0] + '***@' + domain;
                } else {
                    sanitized[key] = value.substring(0, 100); // Limit length
                }
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    
    closeWarning() {
        document.querySelector('.hijack-warning')?.remove();
    }
}

// Enhanced Security Utilities
class EnhancedSecurityUtils {
    static sanitizeHTML(input) {
        if (typeof input !== 'string') return input;
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
    
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Enhanced sanitization
        return input
            .replace(/[<>"'`]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .replace(/data:/gi, '')
            .replace(/vbscript:/gi, '')
            .trim();
    }
    
    static validateEmail(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(email);
    }
    
    static validateMalawiPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        const re = /^(0|265)?(88|99|98|77)\d{7}$/;
        return re.test(cleaned);
    }
    
    static validateAmount(amount) {
        return typeof amount === 'number' && amount > 0 && amount <= 10000000; // 10 million MK max
    }
    
    static generateSecureId() {
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    static encryptSensitive(data) {
        try {
            // For production, use Web Crypto API
            const text = JSON.stringify(data);
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(text);
            
            // Simple base64 encoding for demo
            let binary = '';
            const bytes = new Uint8Array(dataBuffer);
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            
            return btoa(binary);
        } catch (error) {
            console.error('Encryption error:', error);
            return null;
        }
    }
    
    static decryptSensitive(encrypted) {
        try {
            const binary = atob(encrypted);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(bytes));
        } catch (error) {
            console.error('Decryption error:', error);
            return null;
        }
    }
}

// Payment Security with fraud prevention
class EnhancedPaymentSecurity {
    static validatePaymentRequest(paymentData) {
        const requiredFields = ['amount', 'phone', 'method', 'reference'];
        
        // Check required fields
        for (const field of requiredFields) {
            if (!paymentData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        // Validate amount
        if (!EnhancedSecurityUtils.validateAmount(paymentData.amount)) {
            throw new Error('Invalid amount');
        }
        
        // Validate Malawi phone number
        if (!EnhancedSecurityUtils.validateMalawiPhone(paymentData.phone)) {
            throw new Error('Invalid Malawi phone number');
        }
        
        // Validate reference format
        if (!/^[A-Z0-9]{10,20}$/.test(paymentData.reference)) {
            throw new Error('Invalid reference format');
        }
        
        // Check for suspicious patterns
        if (this.detectSuspiciousPayment(paymentData)) {
            throw new Error('Security check failed. Please contact support.');
        }
        
        return true;
    }
    
    static detectSuspiciousPayment(paymentData) {
        // Check for round numbers (common in fraud)
        if (paymentData.amount % 100000 === 0 && paymentData.amount > 500000) {
            return true;
        }
        
        // Check for repeated digits in phone
        if (/(\d)\1{5,}/.test(paymentData.phone.replace(/\D/g, ''))) {
            return true;
        }
        
        // Check reference pattern
        if (/123456|654321|000000/.test(paymentData.reference)) {
            return true;
        }
        
        return false;
    }
    
    static encryptPaymentData(paymentData) {
        const timestamp = Date.now();
        const sessionId = sessionStorage.getItem('session_token') || 'unknown';
        
        const dataToEncrypt = {
            ...paymentData,
            timestamp,
            sessionId,
            nonce: EnhancedSecurityUtils.generateSecureId(),
            version: '2.0'
        };
        
        const encrypted = EnhancedSecurityUtils.encryptSensitive(dataToEncrypt);
        const signature = this.generateSignature(dataToEncrypt);
        
        return {
            encrypted,
            signature,
            timestamp,
            sessionId
        };
    }
    
    static generateSignature(data) {
        const str = JSON.stringify(data) + 'hepeco_secure_salt';
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
}

// Enhanced Session Security
class EnhancedSessionSecurity {
    constructor() {
        this.sessionTimeout = 15 * 60 * 1000; // 15 minutes for payment sites
        this.fingerprint = null;
        this.init();
    }
    
    init() {
        this.generateFingerprint();
        this.startSecureSession();
        this.setupActivityMonitoring();
        this.setupTabProtection();
    }
    
    generateFingerprint() {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.colorDepth,
            screen.width,
            screen.height,
            new Date().getTimezoneOffset(),
            !!navigator.cookieEnabled,
            !!navigator.javaEnabled(),
            typeof navigator.pdfViewerEnabled
        ].join('|');
        
        let hash = 0;
        for (let i = 0; i < components.length; i++) {
            const char = components.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        this.fingerprint = hash.toString(36);
    }
    
    startSecureSession() {
        const sessionId = this.generateSecureSessionId();
        const sessionData = {
            id: sessionId,
            fingerprint: this.fingerprint,
            startTime: Date.now(),
            lastActivity: Date.now(),
            ip: this.getClientInfo(),
            userAgent: navigator.userAgent,
            page: window.location.pathname
        };
        
        // Encrypt session data
        const encryptedData = EnhancedSecurityUtils.encryptSensitive(sessionData);
        sessionStorage.setItem('secure_session', encryptedData);
        
        // Set secure cookie
        this.setSecureCookie('session_id', sessionId);
        
        // Send to server in production
        this.logSessionStart(sessionData);
    }
    
    generateSecureSessionId() {
        const timestamp = Date.now();
        const random = window.crypto.getRandomValues(new Uint32Array(4));
        const randomStr = Array.from(random, num => num.toString(36)).join('');
        return `secure_${timestamp}_${randomStr}`;
    }
    
    getClientInfo() {
        // Note: Real IP should come from server
        return {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform
        };
    }
    
    setSecureCookie(name, value) {
        const expires = new Date(Date.now() + this.sessionTimeout).toUTCString();
        const cookie = `${name}=${value}; expires=${expires}; path=/; Secure; SameSite=Strict; HttpOnly`;
        document.cookie = cookie;
    }
    
    setupActivityMonitoring() {
        const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity();
            }, { passive: true });
        });
        
        // Periodic session validation
        setInterval(() => {
            this.validateSession();
        }, 60000); // Every minute
    }
    
    updateActivity() {
        const sessionData = this.getSessionData();
        if (sessionData) {
            sessionData.lastActivity = Date.now();
            this.saveSessionData(sessionData);
        }
    }
    
    validateSession() {
        const sessionData = this.getSessionData();
        if (!sessionData) {
            this.startSecureSession();
            return;
        }
        
        const inactiveTime = Date.now() - sessionData.lastActivity;
        
        if (inactiveTime > this.sessionTimeout) {
            this.endSession();
            this.showSessionTimeout();
        } else if (inactiveTime > (this.sessionTimeout / 2)) {
            this.refreshSession();
        }
        
        // Verify fingerprint hasn't changed
        if (sessionData.fingerprint !== this.fingerprint) {
            console.warn('Session fingerprint mismatch');
            this.handleSuspiciousActivity();
        }
    }
    
    getSessionData() {
        const encrypted = sessionStorage.getItem('secure_session');
        if (!encrypted) return null;
        
        try {
            return EnhancedSecurityUtils.decryptSensitive(encrypted);
        } catch (error) {
            console.error('Failed to decrypt session:', error);
            return null;
        }
    }
    
    saveSessionData(data) {
        const encrypted = EnhancedSecurityUtils.encryptSensitive(data);
        sessionStorage.setItem('secure_session', encrypted);
    }
    
    refreshSession() {
        const sessionData = this.getSessionData();
        if (sessionData) {
            sessionData.lastActivity = Date.now();
            this.saveSessionData(sessionData);
            this.setSecureCookie('session_id', sessionData.id);
        }
    }
    
    endSession() {
        sessionStorage.removeItem('secure_session');
        document.cookie = 'session_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        this.logSessionEnd();
    }
    
    showSessionTimeout() {
        // Show timeout warning
        const warning = document.createElement('div');
        warning.className = 'session-timeout';
        warning.innerHTML = `
            <div class="timeout-content">
                <i class="fas fa-clock"></i>
                <div>
                    <h4>Session Expired</h4>
                    <p>Your session has expired for security reasons.</p>
                    <button onclick="window.location.reload()">Refresh Page</button>
                </div>
            </div>
        `;
        document.body.appendChild(warning);
    }
    
    setupTabProtection() {
        // Only allow one active tab
        const tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('tab_id', tabId);
        
        window.addEventListener('storage', (e) => {
            if (e.key === 'active_tab' && e.newValue !== tabId) {
                // Another tab is now active
                this.handleMultipleTabs();
            }
        });
        
        // Announce this tab as active
        localStorage.setItem('active_tab', tabId);
        
        // Clear on unload
        window.addEventListener('beforeunload', () => {
            if (localStorage.getItem('active_tab') === tabId) {
                localStorage.removeItem('active_tab');
            }
        });
    }
    
    handleMultipleTabs() {
        // In a payment site, we might want to allow multiple tabs
        // but warn the user
        if (!sessionStorage.getItem('multiple_tabs_warned')) {
            console.warn('Multiple tabs detected');
            sessionStorage.setItem('multiple_tabs_warned', 'true');
        }
    }
    
    handleSuspiciousActivity() {
        // Clear sensitive data
        sessionStorage.clear();
        localStorage.removeItem('payment_activities');
        
        // Show security message
        alert('Security anomaly detected. Please refresh the page.');
        window.location.reload();
    }
    
    logSessionStart(data) {
        const log = {
            type: 'session_start',
            timestamp: new Date().toISOString(),
            data: EnhancedSecurityUtils.sanitizeForLog(data)
        };
        
        const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
        logs.push(log);
        localStorage.setItem('security_logs', JSON.stringify(logs.slice(-100)));
    }
    
    logSessionEnd() {
        const log = {
            type: 'session_end',
            timestamp: new Date().toISOString()
        };
        
        const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
        logs.push(log);
        localStorage.setItem('security_logs', JSON.stringify(logs.slice(-100)));
    }
}

// Initialize enhanced security
document.addEventListener('DOMContentLoaded', () => {
    // Initialize security modules
    const securityConfig = new EnhancedSecurityConfig();
    const sessionSecurity = new EnhancedSessionSecurity();
    
    // Make utilities globally available
    window.SecurityUtils = EnhancedSecurityUtils;
    window.PaymentSecurity = EnhancedPaymentSecurity;
    window.SessionSecurity = sessionSecurity;
    window.SecurityConfig = securityConfig;
    
    // Add security badge
    const securityBadge = document.createElement('div');
    securityBadge.className = 'security-badge';
    securityBadge.innerHTML = `
        <i class="fas fa-shield-alt"></i>
        <span>Protected by Hepeco Security</span>
    `;
    document.body.appendChild(securityBadge);
    
    console.log('Enhanced security systems initialized');
});

// Helper function for security logging
EnhancedSecurityUtils.sanitizeForLog = function(data) {
    if (typeof data !== 'object' || data === null) return data;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
            if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('number')) {
                sanitized[key] = value.replace(/\d(?=\d{4})/g, '*');
            } else if (key.toLowerCase().includes('email')) {
                const [user, domain] = value.split('@');
                sanitized[key] = user?.[0] + '***@' + domain;
            } else if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
                sanitized[key] = '***REDACTED***';
            } else {
                sanitized[key] = value.substring(0, 50);
            }
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
};
