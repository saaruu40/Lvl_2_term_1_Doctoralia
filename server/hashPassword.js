const bcrypt = require("bcrypt");

async function generate() {
  const hash = await bcrypt.hash("sara", 10);
  console.log(hash);
}

generate();