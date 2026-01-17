require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const PORT = process.env.PORT || 3000;
const moment = require('moment');
const multer = require('./models/multer');
const fs = require('fs');
const connectDB = require('./config/db');

connectDB();
const userModel = require('./models/user');
const imageModel = require('./models/image');
const { appendFileSync } = require('fs');



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));
app.use(flash());

app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// ---------Middleware to check authentication-------
const isLoggedIn = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        req.flash("error", "You must be logged in to access this page.");
        return res.redirect("/");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await userModel.findById(decoded.userId).select("-password");
        if (!user) {
            req.flash("error", "User not found.");
            return res.redirect("/");
        }

        req.user = user;          // full user
        res.locals.user = user;   // available in ALL EJS
        next();

    } catch (err) {
        req.flash("error", "Session expired. Please log in again.");
        return res.redirect("/");
    }
};







app.get('/', (req, res) => {
    res.render('index');
});


// ------------ AUTH ROUTES -----------

// -------------signup route-------------//
app.get('/signup', (req, res) => {
    res.render('index');
});
app.post('/signup', async (req, res) => {
    let { username, email, password } = req.body;
    // console.log(req.body);

    // Validation for existing user
    let user = await userModel.findOne({
        $or: [{ email: email }, { username: username }]
    });
    if (user) {
        if (user.email === email) {
            req.flash("error", "This email is already registered. Please log in.");
        } else if (user.username === username) {
            req.flash("error", "This username is already taken. Please choose another.");
        }
        return res.redirect("/"); // Redirect back to login page
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        user = new userModel({ username, email, password: hashedPassword });
        await user.save();

        req.flash("success", "Registration successful! You can now log in.");
        res.redirect("/"); // Redirect back to login page

    } catch (e) {
        // Handle database or hashing errors
        req.flash("error", "An unexpected error occurred during registration.");
        res.redirect("/");
    }
});

// -------------login route-------------//
app.post('/login', async (req, res) => {
    const { loginIdentifier, password } = req.body;

    try {
        const user = await userModel.findOne({
            $or: [{ email: loginIdentifier }, { username: loginIdentifier }]
        });
        if (!user) {
            req.flash("error", "No account found with this email/username.");
            return res.redirect("/");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash("error", "Incorrect password. Please try again.");
            return res.redirect("/");
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        // Set token in HTTP-only cookie
        res.cookie('token', token, { httpOnly: true, maxAge: 3600000 }); // 1 hour
        req.flash("success", "Login successful!");
        return res.redirect("/gallery");
    } catch (e) {
        req.flash("error", "An unexpected error occurred during login.");
        return res.redirect("/");
    }
})

// console.log(process.env);







//gallery route
app.get('/gallery', isLoggedIn, async (req, res) => {

    try {
        // 1. Fetch all photos belonging to the logged-in user (req.user is set by middleware)
        const photos = await imageModel.find({ userId: req.user._id })
            .sort({ uploadDate: -1 }); // Display newest photos first

        // 2. Render the dashboard, passing the fetched photos and messages
        res.render("gallery", {
            currentPath: '/gallery',

            images: photos, // Pass the real photo data
            moment
        });

    } catch (e) {
        console.error("Error fetching dashboard photos:", e);
        req.flash("error", "Could not load photos. Please try again.");
        res.redirect("/gallery");
    }
});












// upload route
app.get('/upload', isLoggedIn, (req, res) => {
    res.render('upload', {
        activePage: 'upload'
    });
});

// -------------UPLOAD POST ROUTE ----------------//
app.post("/upload", isLoggedIn, multer.array("photos"), async (req, res) => {
    try {
        const files = req.files;
        const description = req.body.description || "";

        if (!files || files.length === 0) {
            req.session.error = "No files selected!";
            return res.redirect("/gallery");
        }

        const user = req.user;
        const imageCount = await imageModel.countDocuments({ userId: user._id });


        //--=Rwstrict free users---//
        if (!user.isPremium && imageCount + files.length > 6) {

            files.forEach(file => {
                fs.unlinkSync(file.path); //  remove files
            });
            req.flash("error", "Free limit reached ! Buy premium to upload more.");
            return res.redirect("/premium");
        }

        // Create and save all image documents
        const uploadPromises = files.map((file) => {
            const newImage = new imageModel({
                userId: req.user._id,
                filePath: `/images/uploads/${file.filename}`,
                description: description,
                fileMimeType: file.mimetype,
                originalFilename: file.originalname
            });
            return newImage.save();
        });

        await Promise.all(uploadPromises);

        req.flash("success", `${files.length} image uploaded successfully!`);
        return res.redirect("/gallery");

    } catch (err) {
        console.error("Error uploading images:", err);
        req.flash("error", "Something went wrong while uploading images!");
        return res.redirect("/gallery");
    }
});





// profile route
app.get('/profile', isLoggedIn, (req, res) => {
    res.render('profile', {
        activePage: 'profile'
    });
});

// -------------------update profile route-----------------//
app.post('/update-profile', isLoggedIn, multer.single("profilepic"), async (req, res) => {
    try {
        let user = await userModel.findById(req.user.id);
        if (!user) return req.flash("error", "User Not found!");
        console.log(req.file);
        user.profilepic = req.file.filename;
        await user.save();

        req.flash("success", "Profile Picture updated successfully!");
        res.redirect("/gallery");
    } catch (err) {
        console.error(err);
        req.flash("error", "Oops!! Server error.");
    }
});

//----------------Gallery Iamge Edit Route -----------------//
// app.post('/edit-image/:id', isLoggedIn, multer.single("imageFile"), async (req, res) => {
//     try {
//         const imageId = req.params.id;
//         const newDescription = req.body.newDescription || "";
//         const image = await imageModel.findOne({ _id: imageId, userId: req.user._id });

//         if (!image) {
//             req.flash("error", "Image not found or you don't have permission to edit it.");
//             return res.redirect("/gallery");
//         }

//         // Update description if provided
//         if (newDescription !== "") {
//             image.description = newDescription;
//         }

//         // Update image file if provided
//         if (req.file) {
//             fs.unlinkSync(image.filePath); // Remove old file
//             image.filePath = `/images/uploads/${req.file.filename}`;
//         }

//         await image.save();
//         req.flash("success", "Image updated successfully!");
//         return res.redirect("/gallery");
//     } catch (err) {
//         console.error(err);
//         req.flash("error", "Something went wrong while editing the image!");
//         return res.redirect("/gallery");
//     }
// });

//----------------Gallery Image Edit Route -----------------//
app.post('/edit-image/:id', isLoggedIn, multer.single("imageFile"), async (req, res) => {
    try {
        const imageId = req.params.id;
        // Use 'description' or 'newDescription' depending on your HTML name attribute
        const newDescription = req.body.newDescription || req.body.description || "";
        const image = await imageModel.findOne({ _id: imageId, userId: req.user._id });

        if (!image) {
            req.flash("error", "Image not found or permission denied.");
            return res.redirect("/gallery");
        }

        if (newDescription !== "") {
            image.description = newDescription;
        }

        if (req.file) {
            // FIX: Construct the correct absolute path to the file
            // __dirname is C:\Users\hp\...\sGram
            // image.filePath is /images/uploads/filename.jpg
            const fullPath = path.join(__dirname, 'public', image.filePath);

            // Check if file exists before trying to delete it to avoid ENOENT error
            if (fs.existsSync(fullPath)) {

                fs.unlinkSync(fullPath);
            } else {
                console.warn("File not found on disk, skipping deletion:", fullPath);
            }

            image.filePath = `/images/uploads/${req.file.filename}`;
        }

        await image.save();
        req.flash("success", "Image updated successfully!");
        return res.redirect("/gallery");
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong while editing the image!");
        return res.redirect("/gallery");
    }
});
// ----------------View Image Route-----------------//
app.get('/view-image/:id', isLoggedIn, async (req, res) => {
    try {
        const imageId = req.params.id;
        const image = await imageModel.findOne({ _id: imageId, userId: req.user._id }); // Ensure user owns the image

        if (!image) {
            req.flash("error", "Image not found or permission denied.");
            return res.redirect("/gallery");
        }
        res.render('view', {
            image,
            moment,
            user: req.user
        });
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong while fetching the image!");
        return res.redirect("/gallery");
    }
});



// --------------------Delete Image Route-----------------//
app.post('/delete-image/:id', isLoggedIn, async (req, res) => {
    try {
        const imageId = req.params.id;
        const image = await imageModel.findOne({ _id: imageId, userId: req.user._id }); // Ensure user owns the image

        if (!image) {
            req.flash("error", "Image not found or permission denied.");
            return res.redirect("/gallery");
        }       

        // Delete the image file from the server
        const fullPath = path.join(__dirname, 'public', image.filePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        await imageModel.deleteOne({ _id: imageId });
        req.flash("success", "Image deleted successfully!");
        return res.redirect("/gallery");
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong while deleting the image!");
        return res.redirect("/gallery");
    }
});



    // premium route
    app.get('/premium', isLoggedIn, (req, res) => {
        res.render('premium');
    });

    // logout route
    app.post('/logout', isLoggedIn, (req, res) => {
        res.clearCookie('token');
        req.flash("success", "You have been logged out successfully.");
        res.redirect("/");
    });

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });