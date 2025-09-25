import jwt from "jsonwebtoken";
import Hospital from "../models/Hospital.js";

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.hospital = await Hospital.findById(decoded.id).select("-password");
    
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
};

export default authMiddleware;
