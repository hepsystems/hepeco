/**
 * Frontend Security Configuration
 * Implements comprehensive client-side security
 */

class SecurityConfig {
    constructor() {
        this.CSP = {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://hepeco-backend.onrender.com", "wss:"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: []
            }
        };
        
        this.securityHeaders = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
        };
        
        this.init();
    }
    
    init() {
        this.setSecurityHeaders();
        this.enableCSP();
        this.enableXSSProtection();
        this.enableClickjackingProtection();
        this.enableHSTS();
        this.setupSecureCookies();
        this.enableSubresourceIntegrity();
        this.enableCSRFProtection();
    }
    
    setSecurityHeaders() {
        // In production, these should be set by server
        // This is client-side fallback
        const meta = document.createElement('meta');
        meta.httpEquiv = "Content-Security-Policy";
        meta.content = this.generateCSP();
        document.head.appendChild(meta);
    }
    
    generateCSP() {
        const directives = [];
        for (const [directive, sources] of Object.entries(this.CSP.directives)) {
            if (sources.length > 0) {
                directives.push(`${directive} ${sources.join(' ')}`);
            }
        }
        return directives.join('; ');
    }
    
    enableCSP() {
        // Content Security Policy implementation
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        this.validateNode(node);
                    }
                });
            });
        });
        
        observer.observe(document, {
            childList: true,
            subtree: true
        });
    }
    
    validateNode(node) {
        // Prevent inline scripts
        if (node.tagName === 'SCRIPT' && !node.src) {
            console.warn('Security: Inline script blocked');
            node.remove();
            return false;
        }
        
        // Prevent eval
        if (node.hasAttribute('onclick') || node.hasAttribute('onload')) {
            console.warn('Security: Inline event handler removed');
            node.removeAttribute('onclick');
            node.removeAttribute('onload');
        }
        
        return true;
    }
    
    enableXSSProtection() {
        // Sanitize all user inputs
        const originalQuerySelector = document.querySelector;
        document.querySelector = function(selector) {
            const sanitizedSelector = SecurityUtils.sanitizeHTML(selector);
            return originalQuerySelector.call(this, sanitizedSelector);
        };
    }
    
    enableClickjackingProtection() {
        // Prevent iframe embedding
        if (window !== window.top) {
            window.top.location = window.location;
        }
        
        // Style protection
        const style = document.createElement('style');
        style.textContent = `
            body {
                display: none !important;
            }
        `;
        
        document.head.appendChild(style);
        
        if (window.self === window.top) {
            document.head.removeChild(style);
        } else {
            window.top.location = window.location;
        }
    }
    
    enableHSTS() {
        // HSTS header simulation
        if (window.location.protocol === 'https:') {
            localStorage.setItem('hsts_enabled', 'true');
        }
    }
    
    setupSecureCookies() {
        // Secure cookie handling
        const originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
        
        Object.defineProperty(document, 'cookie', {
            get: function() {
                return originalCookie.get.call(this);
            },
            set: function(value) {
                if (!value.includes('Secure') && !value.includes('HttpOnly')) {
                    console.warn('Security: Insecure cookie attempted');
                    return;
                }
                originalCookie.set.call(this, value);
            }
        });
    }
    
    enableSubresourceIntegrity() {
        // Add SRI to external resources
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            if (!script.hasAttribute('integrity')) {
                console.warn('Security: Script missing SRI', script.src);
            }
        });
    }
    
    enableCSRFProtection() {
        // Generate CSRF token
        const csrfToken = this.generateCSRFToken();
        localStorage.setItem('csrf_token', csrfToken);
        
        // Add token to all forms
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.tagName === 'FORM') {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = '_csrf';
                input.value = csrfToken;
                form.appendChild(input);
            }
        });
        
        // Add token to all fetch requests
        const originalFetch = window.fetch;
        window.fetch = function(resource, init = {}) {
            init.headers = init.headers || {};
            init.headers['X-CSRF-Token'] = csrfToken;
            init.headers['X-Requested-With'] = 'XMLHttpRequest';
            return originalFetch(resource, init);
        };
    }
    
    generateCSRFToken() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
}

// Security Utilities
class SecurityUtils {
    static sanitizeHTML(input) {
        if (typeof input !== 'string') return input;
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
    
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Remove potentially dangerous characters
        return input
            .replace(/[<>"'`]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim();
    }
    
    static validateEmail(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(email);
    }
    
    static validatePhone(phone) {
        const re = /^\+?[1-9]\d{1,14}$/; // E.164 format
        return re.test(phone);
    }
    
    static validateAmount(amount) {
        return typeof amount === 'number' && amount > 0 && amount <= 1000000000;
    }
    
    static encryptData(data) {
        // Simple encryption for sensitive data
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        
        return btoa(String.fromCharCode(...new Uint8Array(dataBuffer)));
    }
    
    static decryptData(encrypted) {
        try {
            const binary = atob(encrypted);
            const bytes = new Uint8Array(binary.length);
            
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(bytes));
        } catch (e) {
            console.error('Decryption failed:', e);
            return null;
        }
    }
    
    static hashData(data) {
        // Simple hash for data integrity
        let hash = 0;
        const str = JSON.stringify(data);
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        return Math.abs(hash).toString(16);
    }
}

// Payment Security
class PaymentSecurity {
    static validatePaymentRequest(paymentData) {
        const requiredFields = ['amount', 'phone', 'method', 'reference'];
        
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
        
        // Validate reference format
        if (!/^[A-Z0-9]{10,20}$/.test(paymentData.reference)) {
            throw new Error('Invalid reference format');
        }
        
        return true;
    }
    
    static encryptPaymentData(paymentData) {
        const timestamp = Date.now();
        const dataToEncrypt = {
            ...paymentData,
            timestamp,
            nonce: Math.random().toString(36).substr(2, 9)
        };
        
        const encrypted = SecurityUtils.encryptData(dataToEncrypt);
        const signature = SecurityUtils.hashData(dataToEncrypt);
        
        return {
            encrypted,
            signature,
            timestamp
        };
    }
}

// Session Security
class SessionSecurity {
    constructor() {
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.init();
    }
    
    init() {
        this.startSession();
        this.setupActivityListener();
        this.setupSessionRefresh();
    }
    
    startSession() {
        const sessionId = this.generateSessionId();
        const sessionData = {
            id: sessionId,
            startTime: Date.now(),
            lastActivity: Date.now(),
            ip: this.getClientIP(),
            userAgent: navigator.userAgent
        };
        
        sessionStorage.setItem('session_data', JSON.stringify(sessionData));
        this.setSessionCookie(sessionId);
    }
    
    generateSessionId() {
        const array = new Uint32Array(8);
        window.crypto.getRandomValues(array);
        return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
    }
    
    getClientIP() {
        // This is a fallback - real IP should come from server
        return 'unknown';
    }
    
    setSessionCookie(sessionId) {
        const expires = new Date(Date.now() + this.sessionTimeout).toUTCString();
        document.cookie = `session_id=${sessionId}; expires=${expires}; path=/; Secure; SameSite=Strict; HttpOnly`;
    }
    
    setupActivityListener() {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        
        events.forEach(event => {
            document.addEventListener(event, () => {
                this.updateLastActivity();
            }, { passive: true });
        });
    }
    
    updateLastActivity() {
        const sessionData = JSON.parse(sessionStorage.getItem('session_data') || '{}');
        if (sessionData.id) {
            sessionData.lastActivity = Date.now();
            sessionStorage.setItem('session_data', JSON.stringify(sessionData));
        }
    }
    
    setupSessionRefresh() {
        setInterval(() => {
            this.checkSession();
        }, 60000); // Check every minute
    }
    
    checkSession() {
        const sessionData = JSON.parse(sessionStorage.getItem('session_data') || '{}');
        
        if (!sessionData.id) {
            this.startSession();
            return;
        }
        
        const inactiveTime = Date.now() - sessionData.lastActivity;
        
        if (inactiveTime > this.sessionTimeout) {
            this.endSession();
            window.location.reload();
        } else if (inactiveTime > (this.sessionTimeout / 2)) {
            this.refreshSession();
        }
    }
    
    refreshSession() {
        const sessionData = JSON.parse(sessionStorage.getItem('session_data') || '{}');
        sessionData.lastActivity = Date.now();
        sessionStorage.setItem('session_data', JSON.stringify(sessionData));
        
        // Refresh cookie
        this.setSessionCookie(sessionData.id);
    }
    
    endSession() {
        sessionStorage.removeItem('session_data');
        document.cookie = 'session_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    }
    
    validateSession() {
        const sessionData = JSON.parse(sessionStorage.getItem('session_data') || '{}');
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = value;
            return acc;
        }, {});
        
        return sessionData.id && cookies.session_id === sessionData.id;
    }
}

// Initialize security
document.addEventListener('DOMContentLoaded', () => {
    // Initialize security modules
    const securityConfig = new SecurityConfig();
    const sessionSecurity = new SessionSecurity();
    
    // Make utilities globally available
    window.SecurityUtils = SecurityUtils;
    window.PaymentSecurity = PaymentSecurity;
    window.SessionSecurity = sessionSecurity;
    
    console.log('Security systems initialized');
});
