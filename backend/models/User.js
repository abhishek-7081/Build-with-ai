import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['citizen', 'department', 'admin'],
    default: 'citizen'
  },
  department: {
    type: String,
    default: null // e.g., 'MCD', 'PWD', 'DJB', 'Traffic', 'Electricity', 'SuperAdmin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
