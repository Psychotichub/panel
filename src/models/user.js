const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  site: {
    type: String,
    required: function() {
      // Only required for regular users, not for managers/admins
      return this.role === 'user';
    },
    trim: true
  },
  company: {
    type: String,
    required: function() {
      // Only required for regular users, not for managers/admins
      return this.role === 'user';
    },
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user'],
    default: 'user'
  },
  createdBy: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, default: null },
    role: { type: String, default: null }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index for username + site + company to ensure uniqueness
// Only for regular users (managers/admins can have same username without site/company)
userSchema.index({ username: 1, site: 1, company: 1 }, { 
  unique: true,
  partialFilterExpression: { role: 'user' }
});

// Create a unique index for username for managers/admins
userSchema.index({ username: 1 }, { 
  unique: true,
  partialFilterExpression: { role: { $in: ['manager', 'admin'] } }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User; 