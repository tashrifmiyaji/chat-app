import User from '../../models/User.js';

export const searchUserRecords = (query) =>
    User.find(query).select('name userId _id').limit(15);

export const findUserById = (id) => User.findById(id);

export const deleteUserById = (id) => User.deleteOne({ _id: id });
