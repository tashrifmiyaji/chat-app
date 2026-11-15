import Message from '../../models/Message.js';

export const findMessagesBetweenUsers = (userId, otherUserId) =>
    Message.find({
        $or: [
            { sender: userId, receiver: otherUserId },
            { sender: otherUserId, receiver: userId },
        ],
    })
        .populate('sender', 'name username userId _id')
        .sort({ createdAt: 1 });

export const deleteMessagesBetweenUsers = (userId, otherUserId) =>
    Message.deleteMany({
        $or: [
            { sender: userId, receiver: otherUserId },
            { sender: otherUserId, receiver: userId },
        ],
    });

export const findMessageById = (messageId) => Message.findById(messageId);

export const deleteMessageById = (messageId) => Message.deleteOne({ _id: messageId });

export const deleteMessagesByIdsSentByUser = (messageIds, userId) =>
    Message.deleteMany({
        _id: { $in: messageIds },
        sender: userId,
    });

export const findRecentConversations = (userId) =>
    Message.aggregate([
        { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: {
                    $cond: { if: { $eq: ['$sender', userId] }, then: '$receiver', else: '$sender' }
                },
                lastMessage: { $first: '$$ROOT' },
                unreadCount: {
                    $sum: {
                        $cond: [
                            { $and: [{ $eq: ['$receiver', userId] }, { $eq: ['$read', false] }] },
                            1,
                            0
                        ]
                    }
                }
            },
        },
        { $sort: { 'lastMessage.createdAt': -1 } },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'participantInfo',
                pipeline: [
                    { $project: { _id: 1, name: 1, username: 1, userId: 1 } }
                ]
            },
        },
        { $unwind: { path: '$participantInfo', preserveNullAndEmptyArrays: false } },
        {
            $project: {
                _id: 0,
                participant: '$participantInfo',
                lastMessage: {
                    _id: '$lastMessage._id',
                    content: '$lastMessage.content',
                    sender: '$lastMessage.sender',
                    receiver: '$lastMessage.receiver',
                    read: '$lastMessage.read',
                    createdAt: '$lastMessage.createdAt',
                },
                unreadCount: '$unreadCount'
            },
        },
    ]).exec();
