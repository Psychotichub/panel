const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const envPath = path.resolve(__dirname, '../../.env');

// Verify .env file exists before loading
if (!fs.existsSync(envPath)) {
    console.error('\n❌ .env file not found!');
    console.error(`   Expected location: ${envPath}`);
    console.error('\n📝 Please create a .env file in the project root with the required variables.');
    process.exit(1);
}

// Clear any existing environment variables to ensure fresh load
// This prevents cached values from interfering
delete process.env.MANAGER_USERNAME;
delete process.env.MANAGER_PASSWORD;
delete process.env.MANAGER_EMAIL;
delete process.env.MANAGER_COMPANY;
delete process.env.USERNAME;
delete process.env.PASSWORD;
delete process.env.EMAIL;
delete process.env.COMPANY;

// Load environment variables from .env file
const envResult = require('dotenv').config({ path: envPath, override: true });

if (envResult.error) {
    console.error('\n❌ Error loading .env file:', envResult.error.message);
    process.exit(1);
}

console.log(`✅ Loaded .env file from: ${envPath}`);

// Debug: Show raw values read from .env file
if (envResult.parsed) {
    console.log('\n📄 Raw values read from .env file:');
    if (envResult.parsed.MANAGER_USERNAME) {
        console.log(`   MANAGER_USERNAME: "${envResult.parsed.MANAGER_USERNAME}" (length: ${envResult.parsed.MANAGER_USERNAME.length})`);
    }
    if (envResult.parsed.MANAGER_PASSWORD) {
        console.log(`   MANAGER_PASSWORD: "${'*'.repeat(envResult.parsed.MANAGER_PASSWORD.length)}" (length: ${envResult.parsed.MANAGER_PASSWORD.length})`);
    }
    if (envResult.parsed.MANAGER_EMAIL) {
        console.log(`   MANAGER_EMAIL: "${envResult.parsed.MANAGER_EMAIL}"`);
    }
    if (envResult.parsed.MANAGER_COMPANY) {
        console.log(`   MANAGER_COMPANY: "${envResult.parsed.MANAGER_COMPANY}"`);
    }
}

// Import User model
const User = require('../models/user');

// Connect to MongoDB
async function connectToDatabase() {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGOOSE_URI;
        const dbName = process.env.DB_NAME;

        if (!uri) {
            console.error('\n❌ MONGO_URI (or MONGOOSE_URI) is not set');
            console.error('\n📝 To fix this, create a .env file in the project root with:');
            console.error('   MONGO_URI=mongodb://localhost:27017');
            console.error('   DB_NAME=your_database_name (optional)');
            console.error('   MANAGER_USERNAME=admin');
            console.error('   MANAGER_PASSWORD=your_secure_password');
            console.error('   MANAGER_EMAIL=admin@example.com (optional)');
            console.error('   MANAGER_COMPANY=Your Company Name (optional)');
            console.error('\n💡 Example .env file location: D:\\panel-main\\panel-main\\.env\n');
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
            email: email || undefined, // Optional email field
            role: 'manager',
            company: company || undefined, // Optional for managers, but can be set if provided
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
        console.log(`   Active: ${managerUser.isActive}`);
        
        return { 
            success: true, 
            message: 'Manager account created successfully',
            user: {
                username: managerUser.username,
                role: managerUser.role,
                site: managerUser.site,
                company: managerUser.company,
                email: managerUser.email,
                isActive: managerUser.isActive
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
        
        // Read credentials from .env file
        console.log('\n📖 Reading account credentials from process.env...');
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

        // Log what was found with actual values (for debugging)
        console.log('🔍 Environment variables in process.env:');
        console.log(`   MANAGER_USERNAME: ${MANAGER_USERNAME ? `"${MANAGER_USERNAME}" (✓ Set)` : '✗ Not set'}`);
        console.log(`   MANAGER_PASSWORD: ${MANAGER_PASSWORD ? `"${'*'.repeat(MANAGER_PASSWORD.length)}" (✓ Set, ${MANAGER_PASSWORD.length} chars)` : '✗ Not set'}`);
        console.log(`   MANAGER_EMAIL: ${MANAGER_EMAIL ? `"${MANAGER_EMAIL}" (✓ Set)` : '✗ Not set'}`);
        console.log(`   MANAGER_COMPANY: ${MANAGER_COMPANY ? `"${MANAGER_COMPANY}" (✓ Set)` : '✗ Not set'}`);
        if (!MANAGER_USERNAME && !MANAGER_PASSWORD) {
            console.log(`   USERNAME (fallback): ${USERNAME ? `"${USERNAME}" (✓ Set)` : '✗ Not set'}`);
            console.log(`   PASSWORD (fallback): ${PASSWORD ? `"${'*'.repeat(PASSWORD.length)}" (✓ Set)` : '✗ Not set'}`);
        }

        // Prefer MANAGER_* vars to avoid OS env collisions; fallback to unprefixed
        const finalUsername = MANAGER_USERNAME || USERNAME;
        const finalPassword = MANAGER_PASSWORD || PASSWORD;
        const finalEmail = MANAGER_EMAIL || EMAIL || null;
        const finalCompany = MANAGER_COMPANY || COMPANY || null;

        // Validate required fields from .env
        if (!finalUsername || !finalPassword) {
            console.error('\n❌ Missing required credentials in .env file!');
            console.error('   Required variables:');
            console.error('     - MANAGER_USERNAME (or USERNAME as fallback)');
            console.error('     - MANAGER_PASSWORD (or PASSWORD as fallback)');
            console.error('\n   Optional variables:');
            console.error('     - MANAGER_EMAIL (or EMAIL as fallback)');
            console.error('     - MANAGER_COMPANY (or COMPANY as fallback)');
            console.error('\n💡 Tip: Use MANAGER_* prefix to avoid conflicts with OS environment variables.');
            process.exit(1);
        }

        // Validate password is not empty or default
        if (finalPassword.trim() === '' || finalPassword === 'change_this_password') {
            console.error('\n❌ Invalid password in .env file!');
            console.error('   Please set MANAGER_PASSWORD to a secure password (not empty or default).');
            process.exit(1);
        }

        console.log('\n🚀 Creating manager account from .env file values...\n');
        console.log('📋 Account details from .env:');
        console.log(`   Username: ${finalUsername}`);
        console.log(`   Password: ${'*'.repeat(finalPassword.length)} (${finalPassword.length} characters)`);
        console.log(`   Email: ${finalEmail || '(not specified)'}`);
        console.log(`   Company: ${finalCompany || '(not specified)'}`);
        console.log('');

        const result = await createManagerAccount(finalUsername, finalPassword, finalEmail, finalCompany);

        if (result.success) {
            console.log('\n✅ Manager account creation succeeded!');
            console.log('🎉 Account created from .env file values.');
        } else {
            console.log(`\n❌ Manager account creation failed: ${result.message}`);
            if (result.message === 'User already exists') {
                console.log('\n💡 Tip: The username already exists in the database.');
                console.log('   Update MANAGER_USERNAME in your .env file to create a different account.');
            }
            process.exit(1);
        }

        console.log('\n🎉 Manager account creation completed!');
        
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