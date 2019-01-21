const bcrypt = require('bcryptjs');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const _ = require('lodash');
const session = require('express-session');
const mid = require('./middleware');
const joi = require('joi');
const dateFormat = require('dateformat');

const app = express();

app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
    secret: "My Symposium Project!",
    resave: true,
    saveUninitialized: true
}));

// app.use(function(req,res,next){
//     res.locals.currentUser = req.session.userId;
//     next();
// });

mongoose.connect("mongodb://localhost:27017/symposiumProjectDB",{useNewUrlParser: true});


const blogSchema = new mongoose.Schema({
    title: String,
    content: String,
    dateOfCreation: String,
    timeOfCreation: String,
    createDateAndTime: String,
    author: String
});
const Blog = mongoose.model("Blog",blogSchema);



const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    blogList: [blogSchema]
});


userSchema.pre('save',function(next){
    let user = this;
    bcrypt.hash(user.password,10,function(err,hash){
        if(err) next(err);
        else {
            user.password = hash;
            next();
        }
    });
});

const User = mongoose.model("User",userSchema);

app.get("/profile/logout",function(req,res){
    if(req.session && req.session.userId){
        req.session.destroy((err)=>{
            if(err) console.log(err);
            else res.redirect("/");
        });
    }
    else res.render("errorPage",{
        errorMessage: "You cannot logout unless you are logged in.",
        redirectURL: "/",
        redirectInstruction: "go to home page."
    });
});

app.get("/",function(req,res){
    res.render("home");
});

app.get("/about",function(req,res){
    res.render("about");
});

app.get("/contact",function(req,res){
    res.render("contact");
});

app.get("/signUp",function(req,res){
    res.redirect("/");
});
app.post("/signUp",function(req,res){
    if(req.session && req.session.userId) return res.render('errorPage',{
        errorMessage: "A session is already active.First logout.",
        redirectURL: "/profile/logout",
        redirectInstruction: "logout and go to sign up page"
    });
    const first_Name = req.body.inputFirstName;
    const second_Name = req.body.inputSecondName;
    const user_Name = req.body.inputUserName;
    const email_ = req.body.inputEmail;
    const password_ = req.body.inputPassword;

    
    //new change.Added a feature so that duplicate username gets checked and after signing up users are prompted to their profile page.
    async function createUser(){
        const user = new User({
            firstName: first_Name,
            lastName: second_Name, 
            userName: user_Name,
            email: email_,
            password: password_,
            blogList: []
        });
        try{
            const result = await user.save();
            //console.log(result);


            User.findOne({userName:user_Name},function(err,found){
                if(err) console.log(err);
                else
                {
                    if(!found) res.render("errorPage",{
                        errorMessage: "User not found!",
                        redirectURL: "/signIn",
                        redirectInstruction: "to go to sign in page."
                    });
                    else
                    {
                        bcrypt.compare(password_,found.password,function(err,result){
                            if(result===true) 
                            {
                                req.session.userId = found._id;
                                res.render('profile',{name: `${found.firstName} ${found.lastName}`});
                            }
                            else res.render("errorPage",{
                                errorMessage: "Password did not match!",
                                redirectURL: "/signIn",
                                redirectInstruction: "to go to sign in page."
                            });
                        });
                    }
                }
            });
        }
        catch(ex){
            console.log()
            res.render("errorPage",{
                errorMessage: `Username "${user_Name}" already exists! Please sign up again with another username.`,
                redirectURL: "/",
                redirectInstruction: "go to sign up page"
            });
        }
    }
    createUser();
    
    // User.countDocuments({userName: user_Name},function(err,count){
    // if(err) console.log(err);
    // else
    //     {
    //         if(count === 0)
    //         {
    //             console.log("Username is unique!");
    //             const user = new User({
    //                 firstName: first_Name,
    //                 lastName: second_Name,
    //                 userName: user_Name,
    //                 email: email_,
    //                 password: password_,
    //                 blogList: []
    //             });
    //             user.save();
    //             res.redirect("/signIn");
    //         }    
    //         // else
    //         // {
    //         //     res.render("errorPage",{errorMessage: "Oops! Username "+user_Name+" already exists.Try something else please." });
    //         //     //console.log("Oops! Username "+user_Name+" already exists.Try something else please.");
    //         //     //res.redirect("/");
    //         // }
    //     }
    // });
});

app.post("/profile",function(req,res){
    const user_Name = req.body.inputUserName;
    const password_ = req.body.inputPassword;

    //hashing the input password to check if it matches with the hashed password in db
    // bcrypt.compare(password_,10,function(err,hash){
    //     if(err) console.log(err.message);
    //     else {
    //         password_ = hash;
    //         console.log(password_);
    //     }    
    // });

    // User.countDocuments({userName: user_Name , password: password_},function(err,count){
    //     if(count === 0) 
    //     {
    //         console.log("Credentials did not match.Please enter again.");
    //         res.render("signIn");
    //     }
    //     if(count === 1)
    //     {
    //         User.find({userName: user_Name , password: password_},function(err,foundUser){
    //             if(err) console.log(err);
    //             else
    //             {
    //                 console.log(foundUser._id);
    //             }
    //         });
    //     }    
    // });
    User.findOne({userName:user_Name},function(err,found){
        if(err) console.log(err);
        else
        {
            if(!found) res.render("errorPage",{
                errorMessage: "User not found!",
                redirectURL: "/signIn",
                redirectInstruction: "to go to sign in page."
            });
            else
            {
                bcrypt.compare(password_,found.password,function(err,result){
                    if(result===true) 
                    {
                        req.session.userId = found._id;
                        res.render('profile',{name: `${found.firstName} ${found.lastName}`});
                    }
                    else res.render("errorPage",{
                        errorMessage: "Password did not match!",
                        redirectURL: "/signIn",
                        redirectInstruction: "to go to sign in page."
                    });
                });
            }
        }
    });

});

app.get("/profile",function(req,res){
    if(req.session.userId) 
    {
        User.findById(req.session.userId,function(err,found){
            if(err) console.log(err);
            else
            {
                res.render('profile',{name: `${found.firstName} ${found.lastName}`});
            }
        });
    }
    else res.render("errorPage",{
        errorMessage: "You should be logged in to view profile section.",
        redirectURL: "/signIn",
        redirectInstruction: "go to sign in page."
    });
});

app.get("/profile/compose",function(req,res){
    if(req.session.userId) res.render("compose");
    else res.render("errorPage",{
        errorMessage: "You should be logged in to compose.",
        redirectURL: "/signIn",
        redirectInstruction: "go to sign in page."
    });
});

app.post("/profile/compose",function(req,res){
    if(req.session.userId) res.render("compose");
    else res.render("errorPage",{
        errorMessage: "You should be logged in to compose.",
        redirectURL: "/signIn",
        redirectInstruction: "go to sign in page."
    });
});


app.post("/profile/posts",function(req,res){
    if(req.session.userId) 
    {
        User.findById(req.session.userId,function(err,foundUser){
            if(err) console.log(err);
            else res.render("posts",{
                blogList: foundUser.blogList,
                name: `${foundUser.firstName} ${foundUser.lastName}`
            });
        });
        
    }    
    else res.render("errorPage",{
        errorMessage: "You should be logged in to view posts.",
        redirectURL: "/signIn",
        redirectInstruction: "go to sign in page."
    });
});
app.get("/profile/posts",function(req,res){
    if(req.session.userId) 
    {
        User.findById(req.session.userId,function(err,foundUser){
            if(err) console.log(err);
            else 
            {
                res.render("posts",{
                    blogList: foundUser.blogList,
                    name: `${foundUser.firstName} ${foundUser.lastName}`
                });
            }
        });
        
    }    
    else res.render("errorPage",{
        errorMessage: "You should be logged in to view posts.",
        redirectURL: "/signIn",
        redirectInstruction: "go to sign in page."
    });
});

app.post("/profile/alreadyComposed",function(req,res){
    if(req.session.userId) 
    {
        let now = new Date();
        const moment = dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT");
        const currentDate = `${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}`;
        const currentTime = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

        User.findById(req.session.userId,function(err1,foundUser){
            if(err1) console.log(err1);
            else {
                const blogAuthor = `${foundUser.firstName} ${foundUser.lastName}`;

                User.findByIdAndUpdate(req.session.userId,{$push:{blogList:{title: req.body.postTitle,
                    content: req.body.postContent,createDateAndTime: moment,dateOfCreation: currentDate,timeOfCreation: currentTime,author: blogAuthor}}},function(err2,foundList){
                        if(err2) console.log(err2);
                        else res.redirect("/profile/posts");
                });

            }
        });
    }    
    else res.render("errorPage",{
        errorMessage: "You should be logged in to compose.",
        redirectURL: "/signIn",
        redirectInstruction: "go to sign in page."
    });
});

app.get("/profile/alreadyComposed",function(req,res){
    if(req.session.userId) res.redirect("/profile/posts");
    else res.render("errorPage",{
        errorMessage: "You should be logged in to compose.",
        redirectURL: "/signIn",
        redirectInstruction: "go to sign in page."
    });
});


app.get("/profile/dashboard",function(req,res){
    if(req.session.userId) 
    {
        User.find({},function(err,found){
            if(err) console.log(err);
            else
            {
                let allBlogs = [];
                found.forEach(function(user){
                    (user.blogList).forEach(function(blog){
                        // console.log(blog.author,blog.createDateAndTime);
                        allBlogs.push(blog);
                    });
                });
                //console.log("Dashboard:",allBlogs);
                res.render("dashboard",{blogList: allBlogs});
            }
        });

    }

    else res.render("errorPage",{
        errorMessage: "You should be logged in to view dashboard section.",
        redirectURL: "/signIn",
        redirectInstruction: "go to sign in page"
    });
});


app.get("/signIn",mid.loggedOut,function(req,res){
    if(req.session.userId) 
    {
        User.findById(req.session.userId,function(err,found){
            if(err) console.log(err);
            else
            {
                res.render('profile',{name: `${found.firstName} ${found.lastName}`});
            }
        });
    }
    else res.render('signIn');
});




//Setting up port so that it can run locally as well as when it is hosted.
let port = process.env.PORT;
if(port == null || port == ""){
    port = 3000;
}

app.listen(port, function(){
    console.log("Server started successfully!");
});