const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // References the Mongoose model named 'user'
        required: true
    },

    
    filePath: {
        type: String,
        required: true
    },

    // DISPLAY DATA: User-provided description or caption
    description: {
        type: String,
        default: 'No description provided'
    },

    // 4. TECHNICAL DATA: File type for verification/display
    fileMimeType: {
        type: String, // e.g., 'image/jpeg'
        required: true
    },

    // 5. TECHNICAL DATA: Original filename (optional, but helpful)
    originalFilename: {
        type: String,
        required: true
    }
}, {
    timestamps: true // Adds 'createdAt' and 'updatedAt' fields automatically
});

module.exports = mongoose.model('image', imageSchema);