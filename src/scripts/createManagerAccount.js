const mongoose = require('mongoose');
// Force .env values to override OS environment variables (e.g., Windows USERNAME)
require('dotenv').config({ override: true });

// Import User model
const User = require('../models/user');

// Connect to MongoDB
async function connectToDatabase() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGOOSE_URI;
        const dbName = process.env.DB_NAME;

        if (!uri) {
            throw new Error('MONGO_URI (or MONGOOSE_URI) is not set');
        }

        if (dbName) {
            await mongoose.connect(uri, { dbName });
            console.log(`✅ Connected to MongoDB database: ${dbName}`);
        } else {
            await mongoose.connect(uri);
            console.log('✅ Connected to MongoDB (no DB_NAME provided; using database from URI or default)');
        }
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

// Create manager account
async function createManagerAccount(username, password, email = null, company = null) {
    try {
        console.log(`🔧 Creating manager account for: ${username}`);
        
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.log('❌ User already exists with this username');
            return { success: false, message: 'User already exists' };
        }
        
        // Create new manager user (password will be hashed by the model's pre-save hook)
        const managerUser = new User({
            username: username,
            password: password, // Don't hash here - the model will do it
            email: email,
            role: 'manager',
            company: company,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        // Save to database
        await managerUser.save();
        console.log('🗃️ User persisted to database with _id:', managerUser._id.toString());
        
        console.log('✅ Manager account created successfully');
        console.log('📋 Account details:');
        console.log(`   Username: ${username}`);
        console.log(`   Role: ${managerUser.role}`);
        console.log(`   Site: Not required for manager`);
        console.log(`   Company: ${company || 'Not specified'}`);
        console.log(`   Email: ${email || 'Not specified'}`);
        
        return { 
            success: true, 
            message: 'Manager account created successfully',
            user: {
                username: managerUser.username,
                role: managerUser.role,
                site: managerUser.site,
                company: managerUser.company,
                email: managerUser.email
            }
        };
        
    } catch (error) {
        console.error('❌ Error creating manager account:', error);
        return { success: false, message: error.message };
    }
}

// Main function to create manager accounts
async function main() {
    try {
        await connectToDatabase();
        // Read credentials from .env
        const {
            MANAGER_USERNAME,
            MANAGER_PASSWORD,
            MANAGER_EMAIL,
            MANAGER_COMPANY,
            USERNAME,
            PASSWORD,
            EMAIL,
            COMPANY
        } = process.env;

        // Prefer MANAGER_* vars to avoid OS env collisions; fallback to unprefixed
        const finalUsername = MANAGER_USERNAME || USERNAME;
        const finalPassword = MANAGER_PASSWORD || PASSWORD;
        const finalEmail = MANAGER_EMAIL || EMAIL || null;
        const finalCompany = MANAGER_COMPANY || COMPANY || null;

        if (!finalUsername || !finalPassword) {
            console.error('❌ Missing USERNAME or PASSWORD in .env');
            console.error('   Please add USERNAME and PASSWORD (and optionally COMPANY, EMAIL) to your .env file.');
            return;
        }

        console.log('🚀 Creating manager account from .env ...\n');
        console.log('📋 From .env (resolved):', {
            USERNAME: finalUsername,
            PASSWORD: '***',
            EMAIL: finalEmail || '(none)',
            COMPANY: finalCompany || '(none)'
        });

        const result = await createManagerAccount(finalUsername, finalPassword, finalEmail, finalCompany);

        if (result.success) {
            console.log('✅ Manager account creation succeeded.');
        } else {
            console.log(`❌ Manager account creation failed: ${result.message}`);
        }

        console.log('🎉 Manager account creation completed!');
        
    } catch (error) {
        console.error('❌ Error in main function:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { createManagerAccount }; 