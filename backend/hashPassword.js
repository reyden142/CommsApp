const bcrypt = require("bcrypt");

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
}

async function main() {
  const plainTextPassword = "reyden";
  const hashed = await hashPassword(plainTextPassword);
  console.log("Hashed password:", hashed);
}

main();
