// src/middlewares/roleMiddleware.js
module.exports = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ msg: "you don't have permission to access this resource" });
        }
        next();
    };
};