import User from '../../models/User.js';
import generateUniqueUserId from '../../utils/generateUniqueId.js';

export const findUserByUsername = (username) =>
    User.findOne({ username: username.toLowerCase() });

export const createRegisteredUser = async ({ name, username, password }) => {
    const userId = await generateUniqueUserId();
    return User.create({ name, username, userId, password });
};

export const findUserForLogin = async (identifier) => {
    const userById = await User.findOne({ userId: identifier }).select('+password');
    if (userById) return userById;
    return User.findOne({ username: identifier.toLowerCase() }).select('+password');
};

export const findUserForPasswordReset = (username, userId) =>
    User.findOne({ username: username.trim().toLowerCase(), userId: userId.trim() });

export const findUserById = (id) => User.findById(id);

export const saveUser = (user) => user.save();
