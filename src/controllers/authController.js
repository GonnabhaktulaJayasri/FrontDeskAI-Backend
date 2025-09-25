import Hospital from "../models/Hospital.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { isEmailValid, isPasswordValid, isNameValid, isUSPhoneValid, isPhoneValid } from "../utils/validators.js";
import { convertToObjectId } from "../utils/helpers.js";

export const signup = async (req, res) => {
    try {
        const { name, email, password, phonenumber, hospitalAddress, hospitalWebsite, weekdayHours, weekendHours } = req.body;

        // Backend validation
        if (!name || !email || !password || !phonenumber || !hospitalAddress || !hospitalWebsite || !weekdayHours || !weekendHours)
            return res.status(400).json({ message: "All fields are required" });

        if (!isNameValid(name))
            return res.status(400).json({ message: "Hospital name must be at least 2 letters and contain only letters and spaces" });

        if (!isEmailValid(email))
            return res.status(400).json({ message: "Invalid email address" });

        if (!isPasswordValid(password))
            return res.status(400).json({ message: "Password must be at least 8 characters, include uppercase, lowercase, number, and special character" });

        if (!isUSPhoneValid(phonenumber))
            return res.status(400).json({ message: "Please enter a valid phone number" });

        const exists = await Hospital.findOne({ email });
        if (exists)
            return res.status(400).json({ message: "Hospital already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const hospital = await Hospital.create({
            name,
            email,
            password: hashedPassword,
            phonenumber,
            hospitalAddress,
            hospitalWebsite,
            weekdayHours,
            weekendHours
        });

        // Set saasid = _id
        hospital.saasId = hospital._id;
        await hospital.save();

        res.json({ message: "Signup successful", hospital });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ message: "Email and password are required" });

        if (!isEmailValid(email))
            return res.status(400).json({ message: "Invalid email address" });

        const hospital = await Hospital.findOne({ email });
        if (!hospital)
            return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, hospital.password);
        if (!isMatch)
            return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: hospital._id }, process.env.JWT_SECRET, { expiresIn: "2d" });

        res.json({ token, hospital });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const logout = async (req, res) => {
    try {
        const auth = req.hospital;

        const hospital = await Hospital.findOne({
            _id: convertToObjectId(auth._id || auth.id),
        });


        if (!hospital) {
            return res.status(400).json({
                status: false,
                message: "Invalid or expired token",
            });
        }

        hospital.logoutAt = new Date();
        await hospital.save();

        return res.json({
            status: true,
            message: "Logged out successfully",
        });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            status: false,
            message: "Something went wrong",
        });
    }
};

