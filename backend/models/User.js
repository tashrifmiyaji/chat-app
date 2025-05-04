import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    name: { // Display name - can be non-unique
      type: String,
      required: [true, 'Please add a display name'],
      trim: true,
    },
    username: { // Unique username for login and identification
      type: String,
      required: [true, 'Please add a username'],
      unique: true, // Ensures this field is unique across the collection
      trim: true,
      lowercase: true, // Store username in lowercase for case-insensitive checks later if needed
      // You might add length validation or character restrictions later
      // minlength: 3,
      // match: /^[a-zA-Z0-9_]+$/, // Example: Allow letters, numbers, underscores
    },
    userId: { // The 7-digit random ID
      type: String,
      required: [true, 'User ID is required'],
      unique: true,
      length: 7,
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to hash password before saving (remains the same)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords (remains the same)
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


const User = mongoose.model('User', userSchema);

export default User;