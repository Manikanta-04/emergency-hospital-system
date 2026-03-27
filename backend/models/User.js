const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String, required: true, unique: true,
      lowercase: true, trim: true,
    },

    password: { type: String, required: true, minlength: 6 },

    // 3 roles: dispatcher | hospital | admin
    role: {
      type: String,
      enum: ["dispatcher", "hospital", "admin"],
      default: "dispatcher",
    },

    // Only for hospital staff — which hospital they belong to
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },
    hospitalName: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
