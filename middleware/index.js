function loggedOut (req,res,next){
    if(req.session && req.session.userId) res.redirect("/profile");
    else next();
}
module.exports.loggedOut = loggedOut;