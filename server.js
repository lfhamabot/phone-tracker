const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// In-memory session store (use Redis in production)
const sessions = {};
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Simple session middleware
function sessionMiddleware(req, res, next) {
    const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
    
    if (sessionId && sessions[sessionId]) {
        if (Date.now() - sessions[sessionId].createdAt < SESSION_TIMEOUT) {
            req.session = sessions[sessionId];
        } else {
            delete sessions[sessionId];
        }
    }
    
    req.createSession = (userId) => {
        const newSessionId = crypto.randomBytes(32).toString('hex');
        sessions[newSessionId] = { userId, createdAt: Date.now() };
        res.setHeader('Set-Cookie', `sessionId=${newSessionId}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`);
        return newSessionId;
    };
    
    req.destroySession = () => {
        if (sessionId) delete sessions[sessionId];
        res.setHeader('Set-Cookie', 'sessionId=; HttpOnly; Path=/; Max-Age=0');
    };
    
    next();
}

app.use(sessionMiddleware);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Auth middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

// User credentials
const VALID_USERS = {
    'Columbus': 'Morocco'
};

// Public routes (login page and auth endpoints)
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (VALID_USERS[username] && VALID_USERS[username] === password) {
        req.createSession(username);
        res.json({ success: true, username });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/logout', (req, res) => {
    req.destroySession();
    res.json({ success: true });
});

// Check auth status
app.get('/api/check-auth', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ authenticated: true, user: req.session.userId });
    } else {
        res.json({ authenticated: false });
    }
});

// Public static files (logo, favicon)
app.get('/logo.jpg', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logo.jpg'));
});
app.get('/logo-lg.jpg', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logo-lg.jpg'));
});

// Redirect root to login if not authenticated, else to app
app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

// Protect all API routes
app.use('/api', requireAuth);

// Database setup
const db = new sqlite3.Database('./phones.db', (err) => {
    if (err) {
        console.error('Database error:', err);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

// Initialize database tables
function initDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS phones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            imei TEXT UNIQUE NOT NULL,
            model TEXT NOT NULL,
            storage TEXT,
            color TEXT,
            condition TEXT NOT NULL,
            unlocked BOOLEAN,
            icloud BOOLEAN,
            carrier TEXT,
            battery INTEGER,
            costPrice REAL NOT NULL,
            listedPrice REAL,
            notes TEXT,
            photos TEXT,
            status TEXT DEFAULT 'received',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phoneId INTEGER NOT NULL,
            platform TEXT NOT NULL,
            listedPrice REAL NOT NULL,
            listedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (phoneId) REFERENCES phones(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phoneId INTEGER NOT NULL,
            sellingPrice REAL NOT NULL,
            platform TEXT NOT NULL,
            buyerName TEXT,
            soldDate DATETIME,
            paymentMethod TEXT,
            platformFee REAL DEFAULT 0,
            shippingCost REAL DEFAULT 0,
            netProfit REAL,
            notes TEXT,
            soldAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (phoneId) REFERENCES phones(id)
        )
    `);
}

// Get all phones
app.get('/api/phones', (req, res) => {
    db.all(`
        SELECT p.*, 
               l.platform as listedPlatform,
               l.listedAt,
               l.listedPrice as currentListedPrice,
               s.sellingPrice,
               s.netProfit
        FROM phones p
        LEFT JOIN (
            SELECT phoneId, platform, listedAt, listedPrice
            FROM listings
            WHERE id IN (
                SELECT MAX(id) FROM listings GROUP BY phoneId
            )
        ) l ON p.id = l.phoneId
        LEFT JOIN sales s ON p.id = s.phoneId
        ORDER BY p.createdAt DESC
    `, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Parse photos JSON
        rows.forEach(row => {
            if (row.photos) {
                try {
                    row.photos = JSON.parse(row.photos);
                } catch {
                    row.photos = [];
                }
            } else {
                row.photos = [];
            }
        });
        
        res.json(rows);
    });
});

// Get single phone
app.get('/api/phones/:id', (req, res) => {
    const sql = `
        SELECT 
            p.*,
            s.sellingPrice, s.platform as salePlatform, s.buyerName,
            s.soldDate, s.paymentMethod, s.platformFee, s.shippingCost,
            s.netProfit, s.soldAt, s.notes as saleNotes
        FROM phones p
        LEFT JOIN sales s ON p.id = s.phoneId
        WHERE p.id = ?
    `;
    
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Phone not found' });
            return;
        }
        
        if (row.photos) {
            try {
                row.photos = JSON.parse(row.photos);
            } catch {
                row.photos = [];
            }
        }
        
        res.json(row);
    });
});

// Add new phone
app.post('/api/phones', (req, res) => {
    const {
        imei, model, storage, color, condition,
        unlocked, icloud, carrier, battery,
        costPrice, listedPrice, notes, photos
    } = req.body;

    const sql = `
        INSERT INTO phones (
            imei, model, storage, color, condition,
            unlocked, icloud, carrier, battery,
            costPrice, listedPrice, notes, photos
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [
        imei, model, storage, color, condition,
        unlocked, icloud, carrier, battery,
        costPrice, listedPrice, notes, JSON.stringify(photos || [])
    ], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(409).json({ error: 'Phone with this IMEI already exists' });
            } else {
                res.status(500).json({ error: err.message });
            }
            return;
        }
        
        res.json({ 
            id: this.lastID,
            message: 'Phone added successfully'
        });
    });
});

// Update phone
app.put('/api/phones/:id', (req, res) => {
    const {
        model, storage, color, condition,
        unlocked, icloud, carrier, battery,
        costPrice, listedPrice, notes, photos, status
    } = req.body;

    // Build dynamic SQL - only update status if explicitly provided
    let fields = [
        'model = ?', 'storage = ?', 'color = ?', 'condition = ?',
        'unlocked = ?', 'icloud = ?', 'carrier = ?', 'battery = ?',
        'costPrice = ?', 'listedPrice = ?', 'notes = ?', 'photos = ?'
    ];
    let values = [
        model, storage, color, condition,
        unlocked, icloud, carrier, battery,
        costPrice, listedPrice, notes, JSON.stringify(photos || [])
    ];

    if (status !== undefined) {
        fields.push('status = ?');
        values.push(status);
    }

    values.push(req.params.id);

    const sql = `UPDATE phones SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;

    db.run(sql, values, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Phone updated successfully' });
    });
});

// Delete phone
app.delete('/api/phones/:id', (req, res) => {
    db.run('DELETE FROM phones WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({ message: 'Phone deleted successfully' });
    });
});

// List phone for sale
app.post('/api/phones/:id/list', (req, res) => {
    const { platform, listedPrice } = req.body;
    const phoneId = req.params.id;

    db.run(
        'INSERT INTO listings (phoneId, platform, listedPrice) VALUES (?, ?, ?)',
        [phoneId, platform, listedPrice],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            // Update phone status to listed
            db.run(
                "UPDATE phones SET status = 'listed' WHERE id = ?",
                [phoneId],
                function(err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    
                    res.json({ 
                        listingId: this.lastID,
                        message: 'Phone listed successfully'
                    });
                }
            );
        }
    );
});

// Update existing listing
app.post('/api/phones/:id/update-listing', (req, res) => {
    const { platform, listedPrice } = req.body;
    const phoneId = req.params.id;

    // First, find the most recent active listing ID (phone not sold yet)
    db.get(
        `SELECT l.id FROM listings l 
         JOIN phones p ON l.phoneId = p.id 
         WHERE l.phoneId = ? AND p.status != 'sold' 
         ORDER BY l.id DESC LIMIT 1`,
        [phoneId],
        (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (!row) {
                // No active listing found, create new one
                db.run(
                    'INSERT INTO listings (phoneId, platform, listedPrice) VALUES (?, ?, ?)',
                    [phoneId, platform, listedPrice],
                    function(err) {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        res.json({ 
                            listingId: this.lastID,
                            message: 'Listing created successfully'
                        });
                    }
                );
            } else {
                // Update the found listing
                db.run(
                    'UPDATE listings SET platform = ?, listedPrice = ?, listedAt = CURRENT_TIMESTAMP WHERE id = ?',
                    [platform, listedPrice, row.id],
                    function(err) {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        res.json({ 
                            changes: this.changes,
                            message: 'Listing updated successfully'
                        });
                    }
                );
            }
        }
    );
});

// Mark as sold
app.post('/api/phones/:id/sell', (req, res) => {
    const {
        sellingPrice, platform, buyerName, soldDate,
        paymentMethod, platformFee, shippingCost, notes
    } = req.body;
    const phoneId = req.params.id;

    // Get cost price to calculate profit
    db.get('SELECT costPrice FROM phones WHERE id = ?', [phoneId], (err, row) => {
        if (err || !row) {
            res.status(500).json({ error: err ? err.message : 'Phone not found' });
            return;
        }

        const netProfit = sellingPrice - row.costPrice - (platformFee || 0) - (shippingCost || 0);

        db.run(
            `INSERT INTO sales (phoneId, sellingPrice, platform, buyerName, soldDate,
                              paymentMethod, platformFee, shippingCost, netProfit, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [phoneId, sellingPrice, platform, buyerName, soldDate,
             paymentMethod, platformFee, shippingCost, netProfit, notes],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                // Update phone status to sold
                db.run(
                    "UPDATE phones SET status = 'sold' WHERE id = ?",
                    [phoneId],
                    function(err) {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        
                        res.json({ 
                            saleId: this.lastID,
                            netProfit,
                            message: 'Phone marked as sold'
                        });
                    }
                );
            }
        );
    });
});

// Get dashboard stats
app.get('/api/stats', (req, res) => {
    db.get(`
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
            SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN status = 'listed' THEN 1 ELSE 0 END) as pending,
            COALESCE(SUM(CASE WHEN status = 'sold' THEN (SELECT netProfit FROM sales WHERE sales.phoneId = phones.id) ELSE 0 END), 0) as totalProfit
        FROM phones
    `, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        res.json(row);
    });
});

// Get sold history with full details
app.get('/api/sold-history', (req, res) => {
    db.all(`
        SELECT
            p.id, p.imei, p.model, p.storage, p.color, p.condition,
            p.costPrice, p.createdAt,
            l.platform as listedPlatform, l.listedAt,
            s.sellingPrice, s.platform as salePlatform, s.buyerName,
            s.soldDate, s.paymentMethod, s.platformFee, s.shippingCost,
            s.netProfit, s.soldAt
        FROM phones p
        JOIN sales s ON p.id = s.phoneId
        LEFT JOIN (
            SELECT phoneId, platform, listedAt
            FROM listings
            WHERE id IN (SELECT MAX(id) FROM listings GROUP BY phoneId)
        ) l ON p.id = l.phoneId
        WHERE p.status = 'sold'
        ORDER BY s.soldAt DESC
    `, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Phone Tracker API running on port ${PORT}`);
    console.log(`Database: phones.db`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed');
        process.exit(0);
    });
});