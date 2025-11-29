import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const firebaseConfig = {
    apiKey: envVars.VITE_FIREBASE_API_KEY,
    authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: envVars.VITE_FIREBASE_PROJECT_ID,
    storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: envVars.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mock Data
const MOCK_USERS = [
    {
        uid: 'admin-1',
        email: 'admin@globallink.com',
        displayName: 'System Admin',
        role: 'ADMIN',
        password: 'admin123',
        phoneNumber: '+1-555-0100',
        address: 'HQ, Dubai'
    },
    {
        uid: 'china-1',
        email: 'agent.china@globallink.com',
        displayName: 'Li Wei',
        role: 'CHINA_AGENT',
        password: 'china123',
        phoneNumber: '+86-138-0000-0000',
        address: 'Guangzhou, China'
    },
    {
        uid: 'uae-1',
        email: 'agent.uae@globallink.com',
        displayName: 'Ahmed Al-Mansoori',
        role: 'UAE_AGENT',
        password: 'uae123',
        phoneNumber: '+971-50-000-0000',
        address: 'Dubai, UAE'
    },
    {
        uid: 'iran-1',
        email: 'agent.iran@globallink.com',
        displayName: 'Reza Ahmadi',
        role: 'IRAN_AGENT',
        password: 'iran123',
        phoneNumber: '+98-912-000-0000',
        address: 'Tehran, Iran'
    },
    {
        uid: 'cust-1',
        email: 'customer@example.com',
        displayName: 'Sarah Johnson',
        role: 'CUSTOMER',
        password: 'customer123',
        phoneNumber: '+98-912-111-1111',
        address: 'Tehran, Iran'
    }
];

const MOCK_ORDERS = [
    {
        id: 'ORD-2024-001',
        customerId: 'cust-1',
        customerName: 'Sarah Johnson',
        customerPhone: '+98-912-111-1111',
        shippingAddress: 'Tehran, Iran',
        source: '1688',
        createdAt: Date.now() - 86400000 * 7,
        totalItems: 2,
        totalPrice: 450,
        amountPaid: 450,
        balanceDue: 0,
        status: 'RECEIVED_IN_CHINA',
        packages: [
            {
                id: 'PKG-10001',
                orderId: 'ORD-2024-001',
                subOrderId: 'SUB-1',
                weight: 2.5,
                dimensions: '30x20x15',
                currentStatus: 'RECEIVED_IN_CHINA',
                trackingNumber: 'CN123456789',
                description: 'Electronics - Wireless Headphones',
                qrCodeData: 'PKG-10001',
                warehouseBin: 'A-12',
                productLink: 'https://1688.com/product/123',
                price: 250,
                declaredValue: 250
            },
            {
                id: 'PKG-10002',
                orderId: 'ORD-2024-001',
                subOrderId: 'SUB-2',
                weight: 1.2,
                dimensions: '25x15x10',
                currentStatus: 'RECEIVED_IN_CHINA',
                trackingNumber: 'CN123456790',
                description: 'Phone Case Set (10pcs)',
                qrCodeData: 'PKG-10002',
                warehouseBin: 'A-13',
                productLink: 'https://1688.com/product/124',
                price: 200,
                declaredValue: 200
            }
        ]
    },
    {
        id: 'ORD-2024-002',
        customerId: 'cust-1',
        customerName: 'Sarah Johnson',
        customerPhone: '+98-912-111-1111',
        shippingAddress: 'Tehran, Iran',
        source: 'Taobao',
        createdAt: Date.now() - 86400000 * 3,
        totalItems: 1,
        totalPrice: 180,
        amountPaid: 100,
        balanceDue: 80,
        status: 'ARRIVED_UAE',
        packages: [
            {
                id: 'PKG-10003',
                orderId: 'ORD-2024-002',
                subOrderId: 'SUB-1',
                weight: 3.0,
                dimensions: '40x30x20',
                currentStatus: 'ARRIVED_UAE',
                trackingNumber: 'UAE987654321',
                description: 'Fashion - Winter Jacket',
                qrCodeData: 'PKG-10003',
                warehouseBin: 'B-05',
                productLink: 'https://taobao.com/item/456',
                price: 180,
                declaredValue: 180
            }
        ]
    }
];

async function seedDatabase() {
    console.log('🌱 Starting database seeding...');

    try {
        const batch = writeBatch(db);

        // Seed Users
        console.log('📝 Seeding users...');
        MOCK_USERS.forEach(user => {
            const ref = doc(db, 'users', user.uid);
            batch.set(ref, user);
        });

        // Seed Orders & Packages
        console.log('📦 Seeding orders and packages...');
        MOCK_ORDERS.forEach(order => {
            const orderRef = doc(db, 'orders', order.id);
            batch.set(orderRef, order);

            // Also create standalone package docs
            order.packages.forEach(pkg => {
                const pkgRef = doc(db, 'packages', pkg.id);
                batch.set(pkgRef, pkg);
            });
        });

        await batch.commit();
        console.log('✅ Database seeded successfully!');
        console.log(`   - ${MOCK_USERS.length} users created`);
        console.log(`   - ${MOCK_ORDERS.length} orders created`);
        console.log(`   - ${MOCK_ORDERS.reduce((acc, o) => acc + o.packages.length, 0)} packages created`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seedDatabase();
