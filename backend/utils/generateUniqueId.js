// utils/generateUniqueId.js
import User from '../models/User.js';

// Function to generate 7-digit random numbers
const generateRandomId = () => {
  const min = 1000000; 
  const max = 9999999;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Checks if the ID is unique and returns the unique ID.
const generateUniqueUserId = async () => {
  let uniqueId;
  let isUnique = false;

  while (!isUnique) {
    uniqueId = generateRandomId().toString();
    const existingUser = await User.findOne({ userId: uniqueId });
    if (!existingUser) {
      isUnique = true; // If not found in the database, then the ID is unique.
    }
    // If the ID is found, the loop will loop again and a new ID will be generated.
  }
  return uniqueId;
};

export default generateUniqueUserId;